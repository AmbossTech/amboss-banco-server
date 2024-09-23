import { Nullable } from 'src/api/api.types';
import { OnchainAddressType } from 'src/api/wallet/wallet.types';
import { getQueryDelimiter } from 'src/utils/string';

export const SATS_IN_BTC = 100_000_000;

export const encodeBip21 = (input: {
  symbol: OnchainAddressType;
  address: string;
  assetId?: Nullable<string>;
  sats?: Nullable<number>;
}): string => {
  const { address, assetId, symbol, sats } = input;

  const prefix = getBip21Prefix(symbol);

  let bip21 = `${prefix}:${address}`;

  if (sats) {
    bip21 += `${getQueryDelimiter(bip21)}amount=${satsToBtc(sats)}`;
  }

  if (assetId && symbol == OnchainAddressType.L_BTC) {
    bip21 += `${getQueryDelimiter(bip21)}assetid=${assetId}`;
  }

  return bip21;
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
