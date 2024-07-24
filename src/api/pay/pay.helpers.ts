import { PaySwapCurrency, PaySwapNetwork } from './pay.types';

export const isCurrencyCompatible = (
  network: PaySwapNetwork,
  currency: PaySwapCurrency,
): boolean => {
  switch (network) {
    case PaySwapNetwork.BITCOIN:
      return currency == PaySwapCurrency.BTC;
  }
};
