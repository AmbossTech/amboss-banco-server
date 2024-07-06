import { wallet_account_swap } from '@prisma/client';
import { Types } from 'boltz-core';
import { z } from 'zod';

export const swapReverseInfoSchema = z.object({
  BTC: z.object({
    'L-BTC': z.object({
      limits: z.object({
        maximal: z.number(),
        minimal: z.number(),
      }),
      fees: z.object({
        percentage: z.number(),
        minerFees: z.object({
          claim: z.number(),
          lockup: z.number(),
        }),
      }),
    }),
  }),
});

export type SwapReverseInfoType = z.infer<typeof swapReverseInfoSchema>;

export const swapSubmarineInfoSchema = z.object({
  'L-BTC': z.object({
    BTC: z.object({
      limits: z.object({
        maximal: z.number(),
        minimal: z.number(),
      }),
      fees: z.object({
        percentage: z.number(),
        minerFees: z.number(),
      }),
    }),
  }),
});

export type SwapSubmarineInfoType = z.infer<typeof swapSubmarineInfoSchema>;

export const boltzError = z.object({ error: z.string() });

export const boltzSubmarineSwapResponse = z.object({
  id: z.string(),
  bip21: z.string(),
  address: z.string(),
  swapTree: z.object({
    claimLeaf: z.object({
      version: z.number(),
      output: z.string(),
    }),
    refundLeaf: z.object({
      version: z.number(),
      output: z.string(),
    }),
  }),
  claimPublicKey: z.string(),
  timeoutBlockHeight: z.number(),
  acceptZeroConf: z.boolean(),
  expectedAmount: z.number(),
  blindingKey: z.string(),
});

export type BoltzSubmarineSwapResponseType = z.infer<
  typeof boltzSubmarineSwapResponse
>;

export const boltzReverseSwapResponse = z.object({
  id: z.string(),
  invoice: z.string(),
  swapTree: z.object({
    claimLeaf: z.object({
      version: z.number(),
      output: z.string(),
    }),
    refundLeaf: z.object({
      version: z.number(),
      output: z.string(),
    }),
    covenantClaimLeaf: z.object({
      version: z.number(),
      output: z.string(),
    }),
  }),
  lockupAddress: z.string(),
  refundPublicKey: z.string(),
  timeoutBlockHeight: z.number(),
  onchainAmount: z.number(),
  blindingKey: z.string(),
});

export type BoltzReverseSwapResponseType = z.infer<
  typeof boltzReverseSwapResponse
>;

export type BoltzSubscriptionAutoType = {
  getPendingSwaps: wallet_account_swap[];
  websocket: void;
};

export const boltzSubmarineSwapClaimResponse = z.object({
  preimage: z.string(),
  pubNonce: z.string(),
  publicKey: z.string(),
  transactionHash: z.string(),
});

export const boltzMagicRouteHint = z.object({
  bip21: z.string(),
  signature: z.string(),
});

export type BoltzMagicRouteHintType = z.infer<typeof boltzMagicRouteHint>;

export type CovenantParams = {
  claimPublicKey: Buffer;
  refundPublicKey: Buffer;
  preimage: Buffer;
  blindingKey: Buffer;
  address: string;
  tree: Types.SwapTree;
};
