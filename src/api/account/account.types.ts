import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  symmetric_key_iv: string;

  @Field(() => String, { nullable: true })
  default_wallet_id: string | null;
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
  symmetric_key_iv: string;

  @Field()
  protected_symmetric_key: string;

  @Field(() => Secp256k1KeyPairInput)
  secp256k1_key_pair: Secp256k1KeyPairInput;
}
