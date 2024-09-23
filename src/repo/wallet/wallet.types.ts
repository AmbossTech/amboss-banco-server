import { liquidAssetIds } from 'src/utils/crypto/crypto';

export enum WalletAccountType {
  LIQUID = 'LIQUID',
}

const LiquidBitcoinAsset = {
  code: 'BTC',
  name: 'Bitcoin',
  symbol: '₿',
  id: liquidAssetIds.mainnet.bitcoin,
};
const LiquidTetherAsset = {
  code: 'USDT',
  name: 'Tether',
  symbol: '$',
  id: liquidAssetIds.mainnet.tether,
};

export enum LiquidAssetEnum {
  BTC = 'BTC',
  USDT = 'USDT',
}

export const LiquidWalletAssets = {
  [LiquidAssetEnum.BTC]: LiquidBitcoinAsset,
  [LiquidAssetEnum.USDT]: LiquidTetherAsset,
};

export type WalletAccountDetailsType = {
  type: WalletAccountType.LIQUID;
  descriptor_hash: string;
  local_protected_descriptor: string;
};

export enum WalletType {
  CLIENT_GENERATED = 'CLIENT_GENERATED',
}

export type WalletDetailsType = {
  type: WalletType.CLIENT_GENERATED;
  protected_mnemonic: string;
};
