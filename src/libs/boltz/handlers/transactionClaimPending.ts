import { Injectable } from '@nestjs/common';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import bolt11 from 'bolt11';
import { Musig, SwapTreeSerializer, TaprootUtils } from 'boltz-core';
import zkpInit from '@vulpemventures/secp256k1-zkp';
import { crypto } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { wallet_account_swap } from '@prisma/client';
import { BoltzRestApi } from '../boltz.rest';
import { CustomLogger, Logger } from 'src/libs/logging';
import { toWithError } from 'src/utils/async';

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
}
