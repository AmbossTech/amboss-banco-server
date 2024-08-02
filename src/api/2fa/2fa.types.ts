import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { two_fa_method } from '@prisma/client';

import { Login } from '../account/account.types';

@ObjectType()
export class CreateTwoFactorOTP {
  @Field()
  otp_url: string;

  @Field()
  otp_secret: string;
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
  @Field()
  id: string;

  @Field(() => CreateTwoFactorOTP)
  add: CreateTwoFactorOTP;

  @Field()
  verify: boolean;

  @Field(() => Login)
  login: Login;
}

@ObjectType()
export class TwoFactorMutations {
  @Field()
  id: string;

  @Field(() => TwoFactorOTPMutations)
  otp: TwoFactorOTPMutations;
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
