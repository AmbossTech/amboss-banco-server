import { decode } from 'bolt11';
import { SideShiftNetwork } from 'src/libs/sideshift/sideshift.types';
import {
  AccountSwapRequestType,
  AccountSwapResponseType,
  BoltzChain,
  BoltzSwapType,
  SideShiftSwapType,
  SwapProvider,
} from 'src/repo/swaps/swaps.types';

export const getSwapFrom = (
  req: AccountSwapRequestType,
  res: AccountSwapResponseType,
): string => {
  if (req.provider === SwapProvider.BOLTZ) {
    return req.payload.from;
  }

  if (res.provider === SwapProvider.SIDESHIFT) {
    return res.payload.depositCoin;
  }

  return 'unknown';
};

export const getSwapTo = (
  req: AccountSwapRequestType,
  res: AccountSwapResponseType,
): string => {
  if (req.provider === SwapProvider.BOLTZ) {
    return req.payload.to;
  }

  if (res.provider === SwapProvider.SIDESHIFT) {
    return res.payload.settleCoin;
  }

  return 'unknown';
};

export const getSwapDepositAmount = (
  req: AccountSwapRequestType,
  res: AccountSwapResponseType,
): number | string | undefined => {
  if (req.provider === SwapProvider.BOLTZ) {
    if (req.type === BoltzSwapType.CHAIN) {
      return req.payload.userLockAmount;
    }
    if (req.type === BoltzSwapType.REVERSE) {
      return req.payload.invoiceAmount;
    }
    if (req.type === BoltzSwapType.SUBMARINE) {
      const decoded = decode(req.payload.invoice);
      return decoded.satoshis || 0;
    }
  }

  if (res.provider === SwapProvider.SIDESHIFT) {
    return res.payload.depositAmount;
  }
};

export const getSwapSettleAmount = (
  req: AccountSwapRequestType,
  res: AccountSwapResponseType,
): number | string | undefined => {
  if (res.provider === SwapProvider.BOLTZ) {
    if (res.type === BoltzSwapType.CHAIN) {
      return res.payload.claimDetails.amount;
    }
    if (res.type === BoltzSwapType.REVERSE) {
      return res.payload.onchainAmount;
    }
    if (res.type === BoltzSwapType.SUBMARINE) {
      return res.payload.expectedAmount;
    }
  }

  if (res.provider === SwapProvider.SIDESHIFT) {
    return res.payload.settleAmount;
  }
};

export const isSwapOutgoing = (
  req: AccountSwapRequestType,
  res: AccountSwapResponseType,
): boolean => {
  if (req.provider === SwapProvider.BOLTZ) {
    switch (req.type) {
      case BoltzSwapType.CHAIN:
        return req.payload.from == BoltzChain['L-BTC'];
      case BoltzSwapType.REVERSE:
        return req.payload.from == BoltzChain['L-BTC'];
      case BoltzSwapType.SUBMARINE:
        return req.payload.from == BoltzChain['L-BTC'];
    }
  }

  if (res.provider === SwapProvider.SIDESHIFT) {
    switch (res.type) {
      case SideShiftSwapType.VARIABLE:
        return res.payload.depositNetwork == SideShiftNetwork.liquid;
      case SideShiftSwapType.FIXED:
        return res.payload.depositNetwork == SideShiftNetwork.liquid;
    }
  }

  return false;
};
