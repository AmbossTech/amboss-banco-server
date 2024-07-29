import { two_fa_method } from '@prisma/client';

export type TwoFactorPayloadType = {
  type: keyof typeof two_fa_method.OTP;
  otpSecret: string;
  otpUrl: string;
};
