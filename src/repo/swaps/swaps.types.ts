import {
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
}

export enum SideShiftSwapType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
}

export type BoltzSubmarineRequestType = {
  from: string;
  to: string;
  invoice: string;
  //   preimageHash: string;
  refundPublicKey: string;
  //   pairHash: string;
  referralId?: string;
};

export type BoltzReverseRequestType = {
  from: string;
  to: string;
  preimageHash: string;
  claimPublicKey: string;
  claimAddress: string;
  invoiceAmount: 0;
  onchainAmount: 0;
  pairHash: string;
  referralId: string;
  address: string;
  addressSignature: string;
  claimCovenant: false;
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
      payload: BoltzReverseRequestType;
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.VARIABLE;
      payload: SideShiftVariableSwapInput;
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
        blindingKey: string;
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
        blindingKey: string;
      };
    }
  | {
      provider: SwapProvider.SIDESHIFT;
      type: SideShiftSwapType.VARIABLE;
      payload: SideShiftVariableSwap;
    };
