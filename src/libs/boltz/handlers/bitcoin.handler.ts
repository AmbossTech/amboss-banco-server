import { ConfigService } from '@nestjs/config';
import { wallet_account_swap } from '@prisma/client';
import zkpInit, { Secp256k1ZKP } from '@vulpemventures/secp256k1-zkp';
import {
  address,
  crypto,
  initEccLib,
  networks,
  Transaction,
} from 'bitcoinjs-lib';
import bolt11 from 'bolt11';
import {
  constructClaimTransaction,
  constructRefundTransaction,
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
import { ConfigSchemaType } from 'src/libs/config/validation';
import { CustomLogger, Logger } from 'src/libs/logging';
import { MempoolService } from 'src/libs/mempool/mempool.service';
import { RedisService } from 'src/libs/redis/redis.service';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { toWithError } from 'src/utils/async';
import * as ecc from 'tiny-secp256k1';

import { BoltzRestApi } from '../boltz.rest';
import { getClaimFeeKey } from '../boltz.service';
import { BoltzChainSwapResponseType } from '../boltz.types';
import { applyBoltzSig, getTweakedKey, setupMusig } from './boltz.helpers';
import { BoltzPendingTransactionInterface } from './handler.interface';

export class BoltzPendingBitcoinHandler
  implements BoltzPendingTransactionInterface
{
  private network = networks.bitcoin;
  private zkp: Secp256k1ZKP;

  constructor(
    private boltzRest: BoltzRestApi,
    private mempoolService: MempoolService,
    private redisService: RedisService,
    private configService: ConfigService,
    @Logger(BoltzPendingBitcoinHandler.name) private logger: CustomLogger,
  ) {
    const network = this.configService.get<
      ConfigSchemaType['server']['boltz']['network']
    >('server.boltz.network');

    if (network && network == 'regtest') {
      this.network = networks.regtest;
    }
  }

  async onModuleInit() {
    this.zkp = await zkpInit();
  }

  async handleChain(swap: wallet_account_swap, arg: any, cooperative = true) {
    this.logger.debug(`Handling chain swap`, {
      swap: swap.id,
    });
    initEccLib(ecc);

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

    const { musig, transaction, boltzPublicKey, swapOutput } =
      await this.createClaimTransaction({
        swapId: swap.response.payload.id,
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
      await this.boltzRest.broadcastTx(transaction.toHex(), 'BTC');

      return;
    }

    // Get the partial signature from Boltz
    const boltzPartialSig = await this.getBoltzPartialSignature({
      refundKeys,
      preimage,
      claimPubNonce: Buffer.from(musig.getPublicNonce()),
      claimTransaction: transaction,
      responsePayload,
    });

    const signedTx = applyBoltzSig(
      musig,
      transaction,
      swapOutput,
      boltzPublicKey,
      boltzPartialSig,
    );

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(signedTx.toHex(), 'BTC');
  }

  async handleReverseSwap(
    swap: wallet_account_swap,
    arg: any,
    cooperative = true,
  ) {
    this.logger.debug(`Handling reverse swap`, {
      arg: { ...arg, transaction: { id: arg.transaction.id } },
    });
    initEccLib(ecc);

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

    const { halfHourFee } = await this.mempoolService.getRecommendedFees();

    if (!cooperative) {
      this.logger.debug(`Non cooperative spend`);
      const claimTx = targetFee(halfHourFee, (fee) => {
        return constructClaimTransaction(
          [
            {
              ...swapOutput,
              keys,
              preimage,
              cooperative: false,
              type: OutputType.Taproot,
              txHash: lockupTx.getHash(),
              swapTree: SwapTreeSerializer.deserializeSwapTree(
                responsePayload.swapTree,
              ),
              internalKey: musig.getAggregatedPublicKey(),
            },
          ],
          address.toOutputScript(destinationAddress, this.network),
          fee,
        );
      });

      // Broadcast the finalized transaction
      await this.boltzRest.broadcastTx(claimTx.toHex(), 'BTC');

      return;
    }

    // Create a claim transaction to be signed cooperatively via a key path spend
    const claimTx = targetFee(halfHourFee, (fee) =>
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

    const signedTx = applyBoltzSig(
      musig,
      claimTx,
      swapOutput,
      boltzPublicKey,
      boltzSig,
    );

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(signedTx.toHex(), 'BTC');
  }

  async handleSubmarineSwap(swap: wallet_account_swap) {
    this.logger.info('Creating cooperative claim transaction');

    const { request, response } = swap;
    if (
      request.type !== BoltzSwapType.SUBMARINE ||
      response.type !== BoltzSwapType.SUBMARINE
    ) {
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
    const musig = setupMusig(this.zkp, keys, [boltzPublicKey, keys.publicKey]);
    const swapTree = SwapTreeSerializer.deserializeSwapTree(
      response.payload.swapTree,
    );

    // Tweak that musig with the Taptree of the swap scripts
    TaprootUtils.tweakMusig(musig, swapTree.tree);

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

  async handleSubmarineRefund(
    swap: wallet_account_swap,
    arg: any,
    refundAddress: string,
  ) {
    this.logger.debug(`Handling submarine refund`, {
      arg: { ...arg },
    });

    const { response, request } = swap;
    if (
      response.type !== BoltzSwapType.SUBMARINE ||
      request.type !== BoltzSwapType.SUBMARINE
    ) {
      return;
    }
    const { payload: responsePayload } = response;
    const { payload: requestPayload } = request;

    const keys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(requestPayload.privateKey, 'hex'),
    );
    const boltzPublicKey = Buffer.from(responsePayload.claimPublicKey, 'hex');

    // // Create a musig signing session and tweak it with the Taptree of the swap scripts
    const musig = setupMusig(this.zkp, keys, [boltzPublicKey, keys.publicKey]);

    const swapTree = SwapTreeSerializer.deserializeSwapTree(
      responsePayload.swapTree,
    );
    const tweakedKey = getTweakedKey(musig, swapTree);

    const lockupTransaction =
      await this.boltzRest.getSubmarineLockupTransaction(responsePayload.id);

    // Parse the lockup transaction and find the output relevant for the swap
    const lockupTx = Transaction.fromHex(lockupTransaction.hex);

    const swapOutput = detectSwap(tweakedKey, lockupTx);
    if (swapOutput === undefined) {
      this.logger.error('No swap output found in lockup transaction');
      return;
    }

    const { halfHourFee } = await this.mempoolService.getRecommendedFees();

    // Create a claim transaction to be signed cooperatively via a key path spend
    const refundTx = targetFee(halfHourFee, (fee) => {
      return constructRefundTransaction(
        [
          {
            ...swapOutput,
            txHash: lockupTx.getHash(),
            cooperative: true,
            type: OutputType.Taproot,
            keys,
          },
        ],
        address.toOutputScript(refundAddress, this.network),
        0,
        fee,
        false,
      );
    });
    // Get the partial signature from Boltz
    const boltzSig = await this.boltzRest.postSubmarineRefundInfo(
      responsePayload.id,
      musig,
      refundTx.toHex(),
    );

    const signedTx = applyBoltzSig(
      musig,
      refundTx,
      swapOutput,
      boltzPublicKey,
      boltzSig,
    );

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(signedTx.toHex(), 'BTC');
    return;
  }

  async handleChainRefund(
    swap: wallet_account_swap,
    arg: any,
    refundAddress: string,
  ) {
    this.logger.debug(`Handling chain refund`, {
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

    const boltzPublicKey = Buffer.from(
      responsePayload.lockupDetails.serverPublicKey,
      'hex',
    );

    // Set some variables
    const refundKeys = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(requestPayload.refundPrivateKey, 'hex'),
    );

    const musig = setupMusig(this.zkp, refundKeys, [
      boltzPublicKey,
      refundKeys.publicKey,
    ]);

    const swapTree = SwapTreeSerializer.deserializeSwapTree(
      responsePayload.lockupDetails.swapTree,
    );

    const tweakedKey = getTweakedKey(musig, swapTree);

    const { userLock } = await this.boltzRest.getChainTransactions(
      responsePayload.id,
    );

    if (!userLock) {
      this.logger.error(`No user lock tx found`, { swap });
      throw new Error(`No user lock tx found`);
    }

    // Parse the lockup transaction and find the output relevant for the swap
    const lockupTx = Transaction.fromHex(userLock.transaction.hex);
    const swapOutput = detectSwap(tweakedKey, lockupTx);
    if (swapOutput === undefined) {
      throw 'No swap output found in lockup transaction';
    }

    const { halfHourFee } = await this.mempoolService.getRecommendedFees();

    // Create a claim transaction to be signed cooperatively via a key path spend
    const refundTx = targetFee(halfHourFee, (fee) => {
      return constructRefundTransaction(
        [
          {
            ...swapOutput,
            keys: refundKeys,
            cooperative: true,
            type: OutputType.Taproot,
            txHash: lockupTx.getHash(),
            swapTree,
            internalKey: musig.getAggregatedPublicKey(),
          },
        ],
        address.toOutputScript(refundAddress, this.network),
        0,
        fee,
        true,
      );
    });
    // Get the partial signature from Boltz
    const boltzSig = await this.boltzRest.postChainRefundInfo(
      responsePayload.id,
      musig,
      refundTx.toHex(),
    );

    const signedTx = applyBoltzSig(
      musig,
      refundTx,
      swapOutput,
      boltzPublicKey,
      boltzSig,
    );

    // Broadcast the finalized transaction
    await this.boltzRest.broadcastTx(signedTx.toHex(), 'BTC');

    return;
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
      const { partialSignature, pubNonce } =
        await this.boltzRest.getSigChainSwap({
          swapId: responsePayload.id,
          claimTransaction,
          claimPubNonce,
        });
      return {
        pubNonce,
        partialSignature,
      };
    }

    // Sign the claim transaction of the server
    const boltzPublicKey = Buffer.from(
      responsePayload.lockupDetails.serverPublicKey,
      'hex',
    );

    const musig = setupMusig(this.zkp, refundKeys, [
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
    const { partialSignature, pubNonce } = await this.boltzRest.getSigChainSwap(
      {
        swapId: responsePayload.id,
        preimage,
        claimTransaction,
        claimPubNonce,
        signature: { musig, partialSig },
      },
    );
    return {
      pubNonce,
      partialSignature,
    };
  }

  async createClaimTransaction({
    swapId,
    claimKeys,
    destinationAddress,
    lockupTransactionHex,
    preimage,
    responsePayload,
    cooperative = true,
  }: {
    swapId: string;
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
    const musig = setupMusig(this.zkp, claimKeys, [
      boltzPublicKey,
      claimKeys.publicKey,
    ]);
    const swapTree = SwapTreeSerializer.deserializeSwapTree(
      responsePayload.claimDetails.swapTree,
    );
    const tweakedKey = getTweakedKey(musig, swapTree);

    // Parse the lockup transaction and find the output relevant for the swap
    const lockupTx = Transaction.fromHex(lockupTransactionHex);
    const swapOutput = detectSwap(tweakedKey, lockupTx);
    if (swapOutput === undefined) {
      throw 'No swap output found in lockup transaction';
    }

    let claimFee = await this.redisService.get<number>(getClaimFeeKey(swapId));
    if (!claimFee) {
      claimFee = (await this.mempoolService.getRecommendedFees()).halfHourFee;
    }

    // Create a claim transaction to be signed cooperatively via a key path spend
    const claimTx = constructClaimTransaction(
      [
        {
          ...swapOutput,
          preimage,
          keys: claimKeys,
          cooperative,
          type: OutputType.Taproot,
          txHash: lockupTx.getHash(),
          ...(!cooperative && {
            swapTree: SwapTreeSerializer.deserializeSwapTree(
              responsePayload.claimDetails.swapTree,
            ),
            internalKey: musig.getAggregatedPublicKey(),
          }),
        },
      ],
      address.toOutputScript(destinationAddress, this.network),
      claimFee,
    );
    return { musig, transaction: claimTx, swapOutput, boltzPublicKey };
  }
}
