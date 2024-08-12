import {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/types';

export type TwoFactorPayloadOTPType = {
  type: 'OTP';
  otpSecret: string;
  otpUrl: string;
};

export type TwoFactorPayloadPasskeyType = {
  type: 'PASSKEY';
  id: string;
  aaguid: string;
  webAuthnUserID: string;
  publicKey: string; // base64url encoded
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[] | undefined;
};

export type TwoFactorPayloadType =
  | TwoFactorPayloadOTPType
  | TwoFactorPayloadPasskeyType;

export type TwoFactorSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
};
