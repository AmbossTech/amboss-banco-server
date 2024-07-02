import { z } from 'zod';

export enum SideShiftCoin {
  BTC = 'BTC',
  USDT = 'USDT',
}

export enum SideShiftNetwork {
  bitcoin = 'bitcoin',
  liquid = 'liquid',
  tron = 'tron',
  ethereum = 'ethereum',
}

export type BaseSideShiftInput = {
  affiliateId?: string;
};

export type SideShiftFixedSwapInput = BaseSideShiftInput & {
  settleAddress: string;
  refundAddress?: string;
  quoteId: string;
};

export type SideShiftVariableSwapInput = BaseSideShiftInput & {
  settleAddress: string;
  refundAddress?: string;
  depositCoin: SideShiftCoin;
  settleCoin: SideShiftCoin;
  depositNetwork: SideShiftNetwork;
  settleNetwork: SideShiftNetwork;
};

export type SideShiftQuoteInput = BaseSideShiftInput & {
  depositCoin: SideShiftCoin;
  depositNetwork: SideShiftNetwork;
  settleCoin: SideShiftCoin;
  settleNetwork: SideShiftNetwork;
  settleAmount: string;
};

export const sideShiftQuoteOutput = z.object({
  id: z.string(),
  createdAt: z.string(),
  depositCoin: z.string(),
  settleCoin: z.string(),
  depositNetwork: z.string(),
  settleNetwork: z.string(),
  expiresAt: z.string(),
  depositAmount: z.string(),
  settleAmount: z.string(),
  rate: z.string(),
});

export type SideShiftQuote = z.infer<typeof sideShiftQuoteOutput>;

export const sideShiftVariableSwapOutput = z.object({
  id: z.string(),
  createdAt: z.string(),
  depositCoin: z.string(),
  settleCoin: z.string(),
  depositNetwork: z.string(),
  settleNetwork: z.string(),
  depositAddress: z.string(),
  settleAddress: z.string(),
  depositMin: z.string(),
  depositMax: z.string(),
  type: z.string(),
  expiresAt: z.string(),
  status: z.string(),
  averageShiftSeconds: z.string(),
  settleCoinNetworkFee: z.string(),
  networkFeeUsd: z.string(),
});

export type SideShiftVariableSwap = z.infer<typeof sideShiftVariableSwapOutput>;

export const sideShiftFixedSwapOutput = z.object({
  id: z.string(),
  createdAt: z.string(),
  depositCoin: z.string(),
  settleCoin: z.string(),
  depositNetwork: z.string(),
  settleNetwork: z.string(),
  depositAddress: z.string(),
  settleAddress: z.string(),
  depositMin: z.string(),
  depositMax: z.string(),
  type: z.string(),
  quoteId: z.string(),
  depositAmount: z.string(),
  settleAmount: z.string(),
  expiresAt: z.string(),
  status: z.string(),
  averageShiftSeconds: z.string(),
});

export type SideShiftFixedSwap = z.infer<typeof sideShiftFixedSwapOutput>;
