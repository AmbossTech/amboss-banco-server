import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { account } from '@prisma/client';

import { CreateWalletInput } from '../wallet/wallet.types';

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
export class User {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  default_wallet_id: string | null;

  @Field(() => UserSwapInfo)
  swap_info: UserSwapInfo;

  @Field(() => AmbossInfo, { nullable: true })
  amboss: AmbossInfo;
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

  @Field()
  access_token: string;

  @Field()
  refresh_token: string;
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

export type PasswordParentType = {
  account: account;
};
