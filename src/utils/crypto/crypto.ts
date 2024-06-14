import { createHash } from 'crypto';

export const getSHA256Hash = (
  str: string | Buffer, // String will be expected to be in utf-8 encoding
  encoding: 'hex' | 'base64' = 'hex',
) => createHash('sha256').update(str).digest().toString(encoding);

export enum prefixes {
  xpub = '0488b21e',
  ypub = '049d7cb2',
  Ypub = '0295b43f',
  zpub = '04b24746',
  Zpub = '02aa7ed3',
  tpub = '043587cf',
  upub = '044a5262',
  Upub = '024289ef',
  vpub = '045f1cf6',
  Vpub = '02575483',
}

export const liquidAssetIds = {
  mainnet: {
    bitcoin: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
    tether: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2',
  },
};

export const alwaysPresentAssets = {
  mainnet: [liquidAssetIds.mainnet.bitcoin, liquidAssetIds.mainnet.tether],
};

export const featuredLiquidAssets: {
  mainnet: {
    [key: string]: { precision: number; name: string; ticker: string };
  };
} = {
  mainnet: {
    [liquidAssetIds.mainnet.bitcoin]: {
      precision: 0,
      name: 'Liquid Bitcoin',
      ticker: 'LBTC',
    },
    [liquidAssetIds.mainnet.tether]: {
      precision: 8,
      name: 'Tether USD',
      ticker: 'USDt',
    },
  },
};
