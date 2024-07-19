import {
  AccountSwapRequestType,
  AccountSwapResponseType,
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
