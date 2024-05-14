export enum WalletAccountType {
  LIQUID = 'LIQUID',
}

export type WalletAccountDetailsType = {
  type: WalletAccountType.LIQUID;
  descriptor: string;
};

export enum WalletType {
  CLIENT_GENERATED = 'CLIENT_GENERATED',
}

export type WalletDetailsType = {
  type: WalletType.CLIENT_GENERATED;
  protected_mnemonic: string;
};
