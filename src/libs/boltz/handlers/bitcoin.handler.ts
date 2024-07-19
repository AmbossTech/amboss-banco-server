import { wallet_account_swap } from '@prisma/client';
import zkpInit, { Secp256k1ZKP } from '@vulpemventures/secp256k1-zkp';
import { address, crypto, networks, Transaction } from 'bitcoinjs-lib';
import bolt11 from 'bolt11';
import {
  constructClaimTransaction,
  detectSwap,
  Musig,
  OutputType,
  SwapTreeSerializer,
  TaprootUtils,
  targetFee,
} from 'boltz-core';
import { TaprootUtils as LiquidTaprootUtils } from 'boltz-core/dist/lib/liquid';
import { randomBytes } from 'crypto';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { toWithError } from 'src/utils/async';
import * as ecc from 'tiny-secp256k1';

import { BoltzRestApi } from '../boltz.rest';
import { BoltzChainSwapResponseType } from '../boltz.types';
import { BoltzPendingTransactionInterface } from './handler.interface';

export class BoltzPendingBitcoinHandler
  implements BoltzPendingTransactionInterface
{
  private network = networks.bitcoin;
  private zkp: Secp256k1ZKP;

  constructor(
    private boltzRest: BoltzRestApi,
    @Logger(BoltzPendingBitcoinHandler.name) private logger: CustomLogger,
  ) {}

  async onModuleInit() {
    this.zkp = await zkpInit();
  }

  async handleChain(swap: wallet_account_swap, arg: any) {
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
    });

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
        [claimDetails.swapOutput.value],
        Transaction.SIGHASH_DEFAULT,
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
    await this.boltzRest.broadcastTx(claimDetails.transaction.toHex(), 'BTC');
  }

  async handleReverseSwap(swap: wallet_account_swap, arg: any) {
    this.logger.debug(`Handling reverse swap`, {
      arg: { ...arg, transaction: { hex: arg.transaction.hex.slice(0, 40) } },
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
    // Create a claim transaction to be signed cooperatively via a key path spend

    // TODO: get bitcoin fee
    const claimTx = targetFee(8, (fee) =>
      constructClaimTransaction(
        [
          {
            ...swapOutput,
            keys,
            preimage,
            cooperative: true,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
          },
        ],
        address.toOutputScript(destinationAddress, this.network),
        fee,
      ),
    );

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
        [swapOutput.value],
        Transaction.SIGHASH_DEFAULT,
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
    const serverClaimDetails = await this.boltzRest.getChainClaimInfo(
      responsePayload.id,
    );

    // Sign the claim transaction of the server
    const boltzPublicKey = Buffer.from(
      responsePayload.lockupDetails.serverPublicKey,
      'hex',
    );

    const musig = new Musig(this.zkp, refundKeys, randomBytes(32), [
      boltzPublicKey,
      refundKeys.publicKey,
    ]);
    LiquidTaprootUtils.tweakMusig(
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
    const boltzPartialSig = await this.boltzRest.getSigChainSwap(
      responsePayload.id,
      preimage,
      partialSig,
      musig,
      claimTransaction,
      claimPubNonce,
    );
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
  }: {
    responsePayload: BoltzChainSwapResponseType;
    claimKeys: ECPairInterface;
    preimage: Buffer;
    lockupTransactionHex: string;
    destinationAddress: string;
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
    // TODO: get fee estimation
    const claimTx = targetFee(8, (fee) =>
      constructClaimTransaction(
        [
          {
            ...swapOutput,
            preimage,
            keys: claimKeys,
            cooperative: true,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
          },
        ],
        address.toOutputScript(destinationAddress, this.network),
        fee,
      ),
    );
    return { musig, transaction: claimTx, swapOutput, boltzPublicKey };
  }
}
