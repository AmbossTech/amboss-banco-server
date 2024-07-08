import { Injectable } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import zkpInit from '@vulpemventures/secp256k1-zkp';
import { crypto } from 'bitcoinjs-lib';
import bolt11 from 'bolt11';
import {
  detectSwap,
  Musig,
  OutputType,
  SwapTreeSerializer,
  TaprootUtils,
  targetFee,
} from 'boltz-core';
import {
  constructClaimTransaction as constructLiquidClaimTransaction,
  init,
  TaprootUtils as TaprootUtilsLiquid,
} from 'boltz-core/dist/lib/liquid';
import { randomBytes } from 'crypto';
import { ECPairFactory } from 'ecpair';
import { address, networks, Transaction } from 'liquidjs-lib';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { toWithError } from 'src/utils/async';
import * as ecc from 'tiny-secp256k1';

import { BoltzRestApi } from '../boltz.rest';

const network = networks.liquid;

@Injectable()
export class TransactionClaimPendingService {
  constructor(
    private boltzRest: BoltzRestApi,
    @Logger('Boltz - TransactionClaimPending') private logger: CustomLogger,
  ) {}

  async handle(swap: wallet_account_swap) {
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

  async handleReverse(swap: wallet_account_swap, arg: any) {
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
    const tweakedKey = TaprootUtilsLiquid.tweakMusig(
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

    const claimTx = targetFee(0.01, (fee) =>
      constructLiquidClaimTransaction(
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
        address.toOutputScript(destinationAddress, network),
        fee,
        false,
        network,
        address.fromConfidential(destinationAddress).blindingKey,
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
        [{ value: swapOutput.value, asset: swapOutput.asset }],
        Transaction.SIGHASH_DEFAULT,
        network.genesisBlockHash,
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
    await this.boltzRest.broadcastTx(claimTx, 'L-BTC');
  }
}
