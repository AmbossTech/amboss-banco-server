export enum WalletAccountType {
  LIQUID = 'LIQUID',
}

const LiquidBitcoinAsset = { code: 'BTC', name: 'Bitcoin', symbol: '₿' };
const LiquidTetherAsset = { code: 'USDT', name: 'Tether', symbol: '$' };

export const LiquidWalletAssets = {
  BTC: LiquidBitcoinAsset,
  USDT: LiquidTetherAsset,
};

export type WalletAccountDetailsType = {
  type: WalletAccountType.LIQUID;
  descriptor: string;
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
