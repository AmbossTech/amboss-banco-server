import { BoltzChainSwapResponseType } from 'src/libs/boltz/boltz.types';
import {
  SideShiftFixedSwap,
  SideShiftFixedSwapInput,
  SideShiftVariableSwap,
  SideShiftVariableSwapInput,
} from 'src/libs/sideshift/sideshift.types';

export enum SwapProvider {
  BOLTZ = 'BOLTZ',
  SIDESHIFT = 'SIDESHIFT',
}

export enum BoltzSwapType {
  SUBMARINE = 'SUBMARINE',
  REVERSE = 'REVERSE',
  CHAIN = 'CHAIN',
}

export enum BoltzChain {
  'BTC' = 'BTC',
  'L-BTC' = 'L-BTC',
}

export enum SideShiftSwapType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
}

export type BoltzSubmarineRequestType = {
  from: BoltzChain;
  to: BoltzChain;
  invoice: string;
  //   preimageHash: string;
  refundPublicKey: string;
  //   pairHash: string;
  referralId?: string;
};

export type BoltzReverseRequestType = {
  from: BoltzChain;
  to: BoltzChain;
  preimageHash: string;
  claimPublicKey: string;
  invoiceAmount: number;
  referralId: string;
  address: string;
  claimCovenant: boolean;
  description: string;
  addressSignature?: string;
};

export type BoltzChainSwapRequestType = {
  userLockAmount: number;
  from: BoltzChain;
  to: BoltzChain;
  claimAddress: string;
  preimageHash: string;
  claimPublicKey: string;
  refundPublicKey: string;
  referralId: string;
};

export type AccountSwapRequestType =
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.SUBMARINE;
      payload: BoltzSubmarineRequestType & {
        privateKey: string;
      };
    }
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.REVERSE;
      payload: BoltzReverseRequestType & {
        preimage: string;
        privateKey: string;
      };
    }
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.CHAIN;
      payload: BoltzChainSwapRequestType & {
        preimage: string;
        claimPrivateKey: string;
        refundPrivateKey: string;
      };
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.VARIABLE;
      payload: SideShiftVariableSwapInput;
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.FIXED;
      payload: SideShiftFixedSwapInput;
    };

export type AccountSwapResponseType =
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.SUBMARINE;
      payload: {
        id: string;
        bip21: string;
        address: string;
        swapTree: {
          claimLeaf: {
            version: number;
            output: string;
          };
          refundLeaf: {
            version: number;
            output: string;
          };
        };
        claimPublicKey: string;
        timeoutBlockHeight: number;
        acceptZeroConf: boolean;
        expectedAmount: number;
        blindingKey?: string;
      };
    }
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.REVERSE;
      payload: {
        id: string;
        invoice: string;
        swapTree: {
          claimLeaf: {
            version: number;
            output: string;
          };
          refundLeaf: {
            version: number;
            output: string;
          };
        };
        lockupAddress: string;
        refundPublicKey: string;
        timeoutBlockHeight: number;
        onchainAmount: number;
        blindingKey?: string;
      };
    }
  | {
      provider: SwapProvider.BOLTZ;
      type: BoltzSwapType.CHAIN;
      payload: BoltzChainSwapResponseType;
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.VARIABLE;
      payload: SideShiftVariableSwap;
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.FIXED;
      payload: SideShiftFixedSwap;
    };

export type SwapDetailsType = {
  provider: SwapProvider.BOLTZ;
  refunded: boolean;
};
