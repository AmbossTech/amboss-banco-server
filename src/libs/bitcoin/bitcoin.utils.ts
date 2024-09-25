import { Nullable } from 'src/api/api.types';
import { OnchainAddressType } from 'src/api/wallet/wallet.types';

export const SATS_IN_BTC = 100_000_000;

export const encodeBip21 = (input: {
  symbol: OnchainAddressType;
  address: string;
  assetId?: Nullable<string>;
  sats?: Nullable<number>;
}): string => {
  const { address, assetId, symbol, sats } = input;

  const prefix = getBip21Prefix(symbol);

  const bip21 = new URL(`${prefix}:${address}`);

  if (sats) {
    bip21.searchParams.append('amount', satsToBtc(sats).toString());
  }

  if (assetId && symbol == OnchainAddressType.L_BTC) {
    bip21.searchParams.append('assetid', assetId);
  }

  return bip21.toString();
};

const getBip21Prefix = (symbol: OnchainAddressType): string => {
  switch (symbol) {
    case OnchainAddressType.BTC:
      return 'bitcoin';
    case OnchainAddressType.L_BTC:
      return 'liquidnetwork';
  }
};

export const satsToBtc = (sats: number): number => sats / SATS_IN_BTC;
