import { Injectable, OnModuleInit } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import zkpInit, { Secp256k1ZKP } from '@vulpemventures/secp256k1-zkp';
import {
  detectSwap,
  Musig,
  OutputType,
  SwapTreeSerializer,
  targetFee,
} from 'boltz-core';
import {
  constructClaimTransaction,
  init,
  TaprootUtils,
} from 'boltz-core/dist/lib/liquid';
import { randomBytes } from 'crypto';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { address, networks, Transaction } from 'liquidjs-lib';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import * as ecc from 'tiny-secp256k1';

import { BoltzRestApi } from '../boltz.rest';
import { BoltzChainSwapResponse } from '../boltz.types';
import { BoltzPendingTransactionInterface } from './handler.interface';

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

  async handleChain(swap: wallet_account_swap, arg: any) {
    this.logger.debug(`Handling chain swap`, {
      arg: { ...arg, transaction: { hex: arg.transaction.hex.slice(0, 40) } },
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

  async handleReverseSwap(swap: wallet_account_swap, arg: any) {
    this.logger.debug(`Handling reverse swap`, {
      arg: { ...arg, transaction: { hex: arg.transaction.hex.slice(0, 40) } },
    });
    const { response, request } = swap;

    const zkp = await zkpInit();
    init(zkp);

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
    const musig = new Musig(zkp, keys, randomBytes(32), [
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

    const claimTx = targetFee(0.01, (fee) => {
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
  async handleSubmarineSwap() {
    return;
  }

  private async getBoltzPartialSignature({
    claimPubNonce,
    claimTransaction,
    preimage,
    refundKeys,
    responsePayload,
  }: {
    responsePayload: BoltzChainSwapResponse;
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
    TaprootUtils.tweakMusig(
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
    responsePayload: BoltzChainSwapResponse;
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
    const transaction = targetFee(2, (fee) =>
      constructClaimTransaction(
        [
          {
            ...swapOutput,
            preimage,
            keys: claimKeys,
            cooperative: true,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
            blindingPrivateKey: Buffer.from(
              responsePayload.claimDetails.blindingKey,
              'hex',
            ),
          },
        ],
        address.toOutputScript(destinationAddress, this.network),
        fee,
        false,
        this.network,
        address.fromConfidential(destinationAddress).blindingKey,
      ),
    );

    return { musig, transaction, swapOutput, boltzPublicKey };
  }
}
