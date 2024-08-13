import { Secp256k1ZKP } from '@vulpemventures/secp256k1-zkp';
import { Transaction } from 'bitcoinjs-lib';
import { Musig, TaprootUtils } from 'boltz-core';
import { LiquidSwapTree, SwapTree } from 'boltz-core/dist/lib/consts/Types';
import { TaprootUtils as LiquidTaprootUtils } from 'boltz-core/dist/lib/liquid';
import { randomBytes } from 'crypto';
import { ECPairInterface } from 'ecpair';
import { Transaction as LiquidTransaction } from 'liquidjs-lib';

export const setupMusig = (
  zkp: Secp256k1ZKP,
  key: ECPairInterface,
  pubkeys: Buffer[],
): Musig => new Musig(zkp, key, randomBytes(32), pubkeys);

export const getTweakedKey = (
  musig: Musig,
  swapTree: SwapTree | LiquidSwapTree,
  isLiquid = false,
): Buffer => {
  if (isLiquid) {
    return LiquidTaprootUtils.tweakMusig(musig, swapTree.tree);
  }
  return TaprootUtils.tweakMusig(musig, swapTree.tree);
};

export const applyBoltzSigLiquid = (
  musig: Musig,
  tx: LiquidTransaction,
  swapOutput: {
    script: Buffer;
    value: Buffer;
    asset: Buffer;
  },
  boltzPublicKey: Buffer,
  boltzSig: {
    pubNonce: string;
    partialSignature: string;
  },
  genesisBlockHash: Buffer,
) => {
  // Aggregate the nonces
  musig.aggregateNonces([
    [boltzPublicKey, Buffer.from(boltzSig.pubNonce, 'hex')],
  ]);

  // Initialize the session to sign the claim transaction
  musig.initializeSession(
    tx.hashForWitnessV1(
      0,
      [swapOutput.script],
      [{ value: swapOutput.value, asset: swapOutput.asset }],
      Transaction.SIGHASH_DEFAULT,
      genesisBlockHash,
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
  tx.ins[0].witness = [musig.aggregatePartials()];

  return tx;
};

export const applyBoltzSig = (
  musig: Musig,
  tx: Transaction,
  swapOutput: {
    script: Buffer;
    value: number;
  },
  boltzPublicKey: Buffer,
  boltzSig: {
    pubNonce: string;
    partialSignature: string;
  },
) => {
  // Aggregate the nonces
  musig.aggregateNonces([
    [boltzPublicKey, Buffer.from(boltzSig.pubNonce, 'hex')],
  ]);

  // Initialize the session to sign the claim transaction
  musig.initializeSession(
    tx.hashForWitnessV1(
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
  tx.ins[0].witness = [musig.aggregatePartials()];

  return tx;
};
