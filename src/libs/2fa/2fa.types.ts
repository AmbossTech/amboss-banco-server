export type TwoFactorPayloadType = {
  type: 'OTP';
  otpSecret: string;
  otpUrl: string;
};

export type TwoFactorSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
};
