import { Injectable, OnModuleInit } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import zkpInit, { Secp256k1ZKP } from '@vulpemventures/secp256k1-zkp';
import bolt11 from 'bolt11';
import {
  detectSwap,
  Musig,
  OutputType,
  SwapTreeSerializer,
  TaprootUtils as BitcoinTaprootUtils,
  targetFee,
} from 'boltz-core';
import {
  constructClaimTransaction,
  init,
  TaprootUtils,
} from 'boltz-core/dist/lib/liquid';
import { randomBytes } from 'crypto';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { address, crypto, networks, Transaction } from 'liquidjs-lib';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { toWithError } from 'src/utils/async';
import * as ecc from 'tiny-secp256k1';

import { BoltzRestApi } from '../boltz.rest';
import { BoltzChainSwapResponseType } from '../boltz.types';
import { BoltzPendingTransactionInterface } from './handler.interface';

const BOLTZ_SAT_VBYTE = 0.01;

@Injectable()
export class BoltzPendingLiquidHandler
  implements BoltzPendingTransactionInterface, OnModuleInit
{
  private network = networks.liquid;
  private zkp: Secp256k1ZKP;

  constructor(
    private boltzRest: BoltzRestApi,
    @Logger(BoltzPendingLiquidHandler.name) private logger: CustomLogger,
  ) {}

  async onModuleInit() {
    this.zkp = await zkpInit();
    init(this.zkp);
  }

  async handleChain(swap: wallet_account_swap, arg: any, cooperative = true) {
    this.logger.debug(`Handling chain swap`, {
      swap: swap.id,
    });
    const { response, request } = swap;

    if (
      response.type !== BoltzSwapType.CHAIN ||
      request.type !== BoltzSwapType.CHAIN
    ) {
      return;
    }

    const { payload: responsePayload } = response;
    const { payload: requestPayload } = request;

    // Set some variables
    const claimKeys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(requestPayload.claimPrivateKey, 'hex'),
    );
    const refundKeys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(requestPayload.refundPrivateKey, 'hex'),
    );
    const preimage = Buffer.from(requestPayload.preimage, 'hex');

    const claimDetails = await this.createClaimTransaction({
      claimKeys,
      preimage,
      destinationAddress: requestPayload.claimAddress,
      lockupTransactionHex: arg.transaction.hex,
      responsePayload: response.payload,
      cooperative,
    });

    if (!cooperative) {
      this.logger.debug(`Non cooperative spend`);
      // Broadcast the finalized transaction
      await this.boltzRest.broadcastTx(
        claimDetails.transaction.toHex(),
        'L-BTC',
      );

      return;
    }

    // Get the partial signature from Boltz
    const boltzPartialSig = await this.getBoltzPartialSignature({
      refundKeys,
      preimage,
      claimPubNonce: Buffer.from(claimDetails.musig.getPublicNonce()),
      claimTransaction: claimDetails.transaction,
      responsePayload,
    });

    // Aggregate the nonces
    claimDetails.musig.aggregateNonces([
      [claimDetails.boltzPublicKey, boltzPartialSig.pubNonce],
    ]);

    // Initialize the session to sign the claim transaction
    claimDetails.musig.initializeSession(
      claimDetails.transaction.hashForWitnessV1(
        0,
        [claimDetails.swapOutput.script],
        [
          {
            value: claimDetails.swapOutput.value,
            asset: claimDetails.swapOutput.asset,
          },
        ],
        Transaction.SIGHASH_DEFAULT,
        this.network.genesisBlockHash,
      ),
    );

    // Add the partial signature from Boltz
    claimDetails.musig.addPartial(
      claimDetails.boltzPublicKey,
      boltzPartialSig.partialSignature,
    );

    // Create our partial signature
    claimDetails.musig.signPartial();

    // Witness of the input to the aggregated signature
    claimDetails.transaction.ins[0].witness = [
      claimDetails.musig.aggregatePartials(),
    ];

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(claimDetails.transaction.toHex(), 'L-BTC');
  }

  async handleReverseSwap(
    swap: wallet_account_swap,
    arg: any,
    cooperative = true,
  ) {
    this.logger.debug(`Handling reverse swap`, {
      arg: { ...arg, transaction: { id: arg.transaction.id } },
      cooperative,
    });

    const { response, request } = swap;

    if (
      response.type !== BoltzSwapType.REVERSE ||
      request.type !== BoltzSwapType.REVERSE
    ) {
      return;
    }

    const { payload: responsePayload } = response;
    const { payload: requestPayload } = request;

    const destinationAddress = requestPayload.address;

    const keys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(requestPayload.privateKey, 'hex'),
    );
    const preimage = Buffer.from(requestPayload.preimage, 'hex');
    const boltzPublicKey = Buffer.from(responsePayload.refundPublicKey, 'hex');

    // Create a musig signing session and tweak it with the Taptree of the swap scripts
    const musig = new Musig(this.zkp, keys, randomBytes(32), [
      boltzPublicKey,
      keys.publicKey,
    ]);
    const tweakedKey = TaprootUtils.tweakMusig(
      musig,
      SwapTreeSerializer.deserializeSwapTree(responsePayload.swapTree).tree,
    );

    // Parse the lockup transaction and find the output relevant for the swap
    const lockupTx = Transaction.fromHex(arg.transaction.hex);

    const swapOutput = detectSwap(tweakedKey, lockupTx);
    if (swapOutput === undefined) {
      this.logger.error('No swap output found in lockup transaction');
      return;
    }

    if (!cooperative) {
      this.logger.debug(`Non cooperative spend`);
      const claimTx = targetFee(BOLTZ_SAT_VBYTE, (fee) => {
        if (!responsePayload.blindingKey) {
          throw new Error(`Cannot create claim tx without blinding key`);
        }
        return constructClaimTransaction(
          [
            {
              ...swapOutput,
              keys,
              preimage,
              cooperative: false,
              type: OutputType.Taproot,
              txHash: lockupTx.getHash(),
              blindingPrivateKey: Buffer.from(
                responsePayload.blindingKey,
                'hex',
              ),
              swapTree: SwapTreeSerializer.deserializeSwapTree(
                responsePayload.swapTree,
              ),
              internalKey: musig.getAggregatedPublicKey(),
            },
          ],
          address.toOutputScript(destinationAddress, this.network),
          fee,
          false,
          this.network,
          address.fromConfidential(destinationAddress).blindingKey,
        );
      });

      // Broadcast the finalized transaction
      await this.boltzRest.broadcastTx(claimTx.toHex(), 'L-BTC');

      return;
    }

    // Create a claim transaction to be signed cooperatively via a key path spend

    const claimTx = targetFee(BOLTZ_SAT_VBYTE, (fee) => {
      if (!responsePayload.blindingKey) {
        throw new Error(`Cannot create claim tx without blinding key`);
      }
      return constructClaimTransaction(
        [
          {
            ...swapOutput,
            keys,
            preimage,
            cooperative: true,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
            blindingPrivateKey: Buffer.from(responsePayload.blindingKey, 'hex'),
          },
        ],
        address.toOutputScript(destinationAddress, this.network),
        fee,
        false,
        this.network,
        address.fromConfidential(destinationAddress).blindingKey,
      );
    });

    // Get the partial signature from Boltz
    const boltzSig = await this.boltzRest.getSigReverseSwap(
      responsePayload.id,
      claimTx,
      preimage,
      musig,
    );

    // Aggregate the nonces
    musig.aggregateNonces([
      [boltzPublicKey, Buffer.from(boltzSig.pubNonce, 'hex')],
    ]);

    // Initialize the session to sign the claim transaction
    musig.initializeSession(
      claimTx.hashForWitnessV1(
        0,
        [swapOutput.script],
        [{ value: swapOutput.value, asset: swapOutput.asset }],
        Transaction.SIGHASH_DEFAULT,
        this.network.genesisBlockHash,
      ),
    );

    // Add the partial signature from Boltz
    musig.addPartial(
      boltzPublicKey,
      Buffer.from(boltzSig.partialSignature, 'hex'),
    );

    // Create our partial signature
    musig.signPartial();

    // Witness of the input to the aggregated signature
    claimTx.ins[0].witness = [musig.aggregatePartials()];

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(claimTx.toHex(), 'L-BTC');

    return;
  }

  // Same as bitcoin handler
  async handleSubmarineSwap(swap: wallet_account_swap) {
    this.logger.info('Creating cooperative claim transaction');

    const { request, response } = swap;

    if (request.type !== BoltzSwapType.SUBMARINE) {
      throw new Error('Received message for unknown swap');
    }

    if (response.type !== BoltzSwapType.SUBMARINE) {
      throw new Error('Received message for unknown swap');
    }

    // Get the information request to create a partial signature
    const [claimTxDetails, claimTxDetailsError] = await toWithError(
      this.boltzRest.getSubmarineClaimInfo(response.payload.id),
    );

    if (claimTxDetailsError) {
      this.logger.error('Error fetching claim tx details from Boltz', {
        claimTxDetailsError,
      });
      return;
    }

    this.logger.debug('Claim Tx Details', { claimTxDetails });

    // Verify that Boltz actually paid the invoice by comparing the preimage hash
    // of the invoice to the SHA256 hash of the preimage from the response
    const invoicePreimageHash = Buffer.from(
      bolt11
        .decode(request.payload.invoice)
        .tags.find((tag) => tag.tagName === 'payment_hash')!.data as string,
      'hex',
    );

    if (
      !crypto
        .sha256(Buffer.from(claimTxDetails.preimage, 'hex'))
        .equals(invoicePreimageHash)
    ) {
      this.logger.error('Boltz provided invalid preimage');
      return;
    }

    const boltzPublicKey = Buffer.from(response.payload.claimPublicKey, 'hex');

    const keys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(request.payload.privateKey, 'hex'),
    );

    // Create a musig signing instance
    const musig = new Musig(await zkpInit(), keys, randomBytes(32), [
      boltzPublicKey,
      keys.publicKey,
    ]);

    // Tweak that musig with the Taptree of the swap scripts
    TaprootUtils.tweakMusig(
      musig,
      SwapTreeSerializer.deserializeSwapTree(response.payload.swapTree).tree,
    );

    // Aggregate the nonces
    musig.aggregateNonces([
      [boltzPublicKey, Buffer.from(claimTxDetails.pubNonce, 'hex')],
    ]);

    // Initialize the session to sign the transaction hash from the response
    musig.initializeSession(Buffer.from(claimTxDetails.transactionHash, 'hex'));

    // Give our public nonce and the partial signature to Boltz
    const [, postClaimInfoError] = await toWithError(
      this.boltzRest.postSubmarineClaimInfo(response.payload.id, musig),
    );

    if (postClaimInfoError) {
      this.logger.error('Error posting claim tx details to Boltz', {
        postClaimInfoError,
      });
      return;
    }
  }

  private async getBoltzPartialSignature({
    claimPubNonce,
    claimTransaction,
    preimage,
    refundKeys,
    responsePayload,
  }: {
    responsePayload: BoltzChainSwapResponseType;
    refundKeys: ECPairInterface;
    preimage: Buffer;
    claimPubNonce: Buffer;
    claimTransaction: Transaction;
  }) {
    const [serverClaimDetails, error] = await toWithError(
      this.boltzRest.getChainClaimInfo(responsePayload.id),
    );

    // Let's assume for now that Boltz signs it
    if (error) {
      const boltzPartialSig = await this.boltzRest.getSigChainSwap({
        swapId: responsePayload.id,
        claimTransaction,
        claimPubNonce,
      });
      return {
        pubNonce: Buffer.from(boltzPartialSig.pubNonce, 'hex'),
        partialSignature: Buffer.from(boltzPartialSig.partialSignature, 'hex'),
      };
    }

    // Sign the claim transaction of the server
    const boltzPublicKey = Buffer.from(
      responsePayload.lockupDetails.serverPublicKey,
      'hex',
    );

    const musig = new Musig(this.zkp, refundKeys, randomBytes(32), [
      boltzPublicKey,
      refundKeys.publicKey,
    ]);
    BitcoinTaprootUtils.tweakMusig(
      musig,
      SwapTreeSerializer.deserializeSwapTree(
        responsePayload.lockupDetails.swapTree,
      ).tree,
    );

    musig.aggregateNonces([
      [boltzPublicKey, Buffer.from(serverClaimDetails.pubNonce, 'hex')],
    ]);
    musig.initializeSession(
      Buffer.from(serverClaimDetails.transactionHash, 'hex'),
    );
    const partialSig = musig.signPartial();

    // When the server is happy with our signature, we get its partial signature
    // for our transaction in return
    const boltzPartialSig = await this.boltzRest.getSigChainSwap({
      swapId: responsePayload.id,
      preimage,
      signature: { partialSig, musig },
      claimTransaction,
      claimPubNonce,
    });
    return {
      pubNonce: Buffer.from(boltzPartialSig.pubNonce, 'hex'),
      partialSignature: Buffer.from(boltzPartialSig.partialSignature, 'hex'),
    };
  }

  async createClaimTransaction({
    claimKeys,
    destinationAddress,
    lockupTransactionHex,
    preimage,
    responsePayload,
    cooperative = true,
  }: {
    responsePayload: BoltzChainSwapResponseType;
    claimKeys: ECPairInterface;
    preimage: Buffer;
    lockupTransactionHex: string;
    destinationAddress: string;
    cooperative: boolean;
  }) {
    const boltzPublicKey = Buffer.from(
      responsePayload.claimDetails.serverPublicKey,
      'hex',
    );

    // Create a musig signing session and tweak it with the Taptree of the swap scripts
    const musig = new Musig(this.zkp, claimKeys, randomBytes(32), [
      boltzPublicKey,
      claimKeys.publicKey,
    ]);
    const tweakedKey = TaprootUtils.tweakMusig(
      musig,
      SwapTreeSerializer.deserializeSwapTree(
        responsePayload.claimDetails.swapTree,
      ).tree,
    );

    // Parse the lockup transaction and find the output relevant for the swap
    const lockupTx = Transaction.fromHex(lockupTransactionHex);
    const swapOutput = detectSwap(tweakedKey, lockupTx);
    if (swapOutput === undefined) {
      throw 'No swap output found in lockup transaction';
    }

    // Create a claim transaction to be signed cooperatively via a key path spend
    const transaction = targetFee(BOLTZ_SAT_VBYTE, (fee) => {
      if (!responsePayload.claimDetails.blindingKey) {
        throw new Error(`Cannot create claim tx without blinding key`);
      }
      return constructClaimTransaction(
        [
          {
            ...swapOutput,
            preimage,
            keys: claimKeys,
            cooperative,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
            blindingPrivateKey: Buffer.from(
              responsePayload.claimDetails.blindingKey,
              'hex',
            ),
            ...(!cooperative && {
              swapTree: SwapTreeSerializer.deserializeSwapTree(
                responsePayload.claimDetails.swapTree,
              ),
              internalKey: musig.getAggregatedPublicKey(),
            }),
          },
        ],
        address.toOutputScript(destinationAddress, this.network),
        fee,
        false,
        this.network,
        address.fromConfidential(destinationAddress).blindingKey,
      );
    });

    return { musig, transaction, swapOutput, boltzPublicKey };
  }
}
