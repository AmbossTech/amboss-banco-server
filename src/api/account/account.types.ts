import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { account, account_2fa, two_fa_method } from '@prisma/client';

import { SimpleTwoFactor } from '../2fa/2fa.types';
import { CreateWalletInput } from '../wallet/wallet.types';

registerEnumType(two_fa_method, { name: 'TwoFactorMethod' });

@ObjectType()
export class UserSwapInfo {
  @Field()
  id: string;

  @Field()
  shifts_enabled: boolean;
}

@ObjectType()
export class ReferralCode {
  @Field()
  id: string;

  @Field()
  code: string;

  @Field()
  is_available: boolean;

  @Field()
  current_uses: number;

  @Field()
  max_allowed_uses: number;
}

@ObjectType()
export class AmbossInfo {
  @Field()
  id: string;

  @Field(() => [ReferralCode])
  referral_codes: ReferralCode[];
}

@ObjectType()
export class UserWalletInfo {
  @Field()
  id: string;

  @Field()
  wallet_limit: number;
}

@ObjectType()
export class User {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  protected_symmetric_key: string;

  @Field(() => String, { nullable: true })
  default_wallet_id: string | null;

  @Field(() => UserSwapInfo)
  swap_info: UserSwapInfo;

  @Field(() => AmbossInfo, { nullable: true })
  amboss: AmbossInfo;

  @Field()
  wallet: UserWalletInfo;
}

@ObjectType()
export class RefreshToken {
  @Field()
  id: string;

  @Field()
  access_token: string;

  @Field()
  refresh_token: string;
}

@ObjectType()
export class TwoFactorLogin {
  @Field(() => [SimpleTwoFactor])
  methods: SimpleTwoFactor[];

  @Field()
  session_id: string;
}

@ObjectType()
export class NewAccount {
  @Field()
  id: string;

  @Field()
  access_token: string;

  @Field()
  refresh_token: string;
}

@ObjectType()
export class Login {
  @Field()
  id: string;

  @Field({ nullable: true })
  access_token?: string;

  @Field({ nullable: true })
  refresh_token?: string;

  @Field(() => TwoFactorLogin, { nullable: true })
  two_factor?: TwoFactorLogin;
}

@ObjectType()
export class TwoFactorLoginMutations {
  @Field(() => Login)
  otp: Login;
}

@ObjectType()
export class LoginMutations {
  @Field(() => Login)
  initial: Login;

  @Field(() => TwoFactorLoginMutations)
  two_factor: TwoFactorLoginMutations;
}

@InputType()
export class LoginInput {
  @Field()
  email: string;

  @Field()
  master_password_hash: string;
}

@InputType()
export class Secp256k1KeyPairInput {
  @Field()
  public_key: string;

  @Field()
  protected_private_key: string;
}

@InputType()
export class SignUpInput {
  @Field()
  email: string;

  @Field({ nullable: true })
  password_hint: string;

  @Field()
  master_password_hash: string;

  @Field()
  protected_symmetric_key: string;

  @Field(() => Secp256k1KeyPairInput)
  secp256k1_key_pair: Secp256k1KeyPairInput;

  @Field(() => CreateWalletInput, { nullable: true })
  wallet: CreateWalletInput | null;

  @Field({ nullable: true })
  referral_code?: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  current_master_password_hash: string;

  @Field()
  new_master_password_hash: string;

  @Field()
  new_protected_symmetric_key: string;

  @Field({ nullable: true })
  new_password_hint?: string;
}

@ObjectType()
export class PasswordMutations {
  @Field()
  check: boolean;

  @Field()
  change: boolean;
}

@ObjectType()
export class SetupOTP {
  @Field()
  otp_url: string;

  @Field()
  otp_secret: string;
}

@ObjectType()
export class SetupTwoFactor {
  @Field(() => SetupOTP)
  otp: SetupOTP;
}

@ObjectType()
export class TwoFactorMutations {
  @Field()
  setup: SetupOTP;
}

export type PasswordParentType = {
  account: account;
};

export type LoginType =
  | {
      id: string;
      two_factor: {
        methods: account_2fa[];
        session_id: string;
      };
    }
  | {
      id: string;
      access_token: string;
      refresh_token: string;
    };
