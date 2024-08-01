import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { two_fa_method } from '@prisma/client';

import { Login } from '../account/account.types';

@InputType()
export class CreateTwoFactorInput {
  @Field(() => two_fa_method)
  method: two_fa_method;
}

@ObjectType()
export class CreateTwoFactorOTP {
  @Field()
  otp_url: string;

  @Field()
  otp_secret: string;
}

@ObjectType()
export class CreateTwoFactor {
  @Field({ nullable: true })
  otp?: CreateTwoFactorOTP;
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
export class TwoFactorMutations {
  @Field()
  id: string;

  @Field(() => CreateTwoFactor)
  add: CreateTwoFactor;

  @Field()
  verify: boolean;

  @Field(() => Login)
  login: Login;
}

@InputType()
export class TwoFactorOTPLogin {
  @Field()
  code: string;
}

@InputType()
export class TwoFactorInput {
  @Field()
  session_id: string;

  @Field(() => two_fa_method)
  method: two_fa_method;

  @Field(() => TwoFactorOTPLogin, { nullable: true })
  otp?: TwoFactorOTPLogin;
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
