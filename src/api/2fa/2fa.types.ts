import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { two_fa_method } from '@prisma/client';

@ObjectType()
export class CreateTwoFactorOTP {
  @Field()
  otp_url: string;

  @Field()
  otp_secret: string;
}

@ObjectType()
export class CreateTwoFactorPasskey {
  @Field()
  options: string;
}

@ObjectType()
export class SimpleTwoFactor {
  @Field()
  id: string;

  @Field()
  created_at: string;

  @Field(() => two_fa_method)
  method: two_fa_method;

  @Field()
  enabled: boolean;

  @Field({ nullable: true })
  passkey_name: string;
}

@ObjectType()
export class TwoFactorQueries {
  @Field()
  id: string;

  @Field(() => [SimpleTwoFactor])
  find_many: SimpleTwoFactor[];
}

@ObjectType()
export class TwoFactorOTPMutations {
  @Field(() => CreateTwoFactorOTP)
  add: CreateTwoFactorOTP;

  @Field()
  verify: boolean;
}

@ObjectType()
export class TwoFactorPasskeyMutations {
  @Field(() => CreateTwoFactorPasskey)
  add: CreateTwoFactorPasskey;

  @Field()
  verify: boolean;
}

@ObjectType()
export class TwoFactorMutations {
  @Field(() => TwoFactorOTPMutations)
  otp: TwoFactorOTPMutations;

  @Field(() => TwoFactorPasskeyMutations)
  passkey: TwoFactorPasskeyMutations;
}

@InputType()
export class TwoFactorOTPVerifyInput {
  @Field()
  code: string;
}

@InputType()
export class TwoFactorOTPLogin {
  @Field()
  session_id: string;

  @Field()
  code: string;
}

@InputType()
export class TwoFactorPasskeyAuthInput {
  @Field()
  session_id: string;
}

@InputType()
export class TwoFactorPasskeyAuthLoginInput {
  @Field()
  session_id: string;

  @Field()
  options: string;
}

@InputType()
export class VerifyTwoFactorInput {
  @Field(() => two_fa_method)
  method: two_fa_method;

  @Field(() => TwoFactorOTPLogin, { nullable: true })
  otp?: TwoFactorOTPLogin;
}

export type OTPVerifyAuto = {
  getSecret: string;
  verifyToken: boolean;
};

export type TwoFactorPendingVerify = {
  type: 'OTP';
  secret: string;
  url: string;
};
