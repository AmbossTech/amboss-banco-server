import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RSAKeyPairInput {
  @Field()
  public_key: string;

  @Field()
  protected_private_key: string;
}

@InputType()
export class SignUpInput {
  @Field()
  email: string;

  @Field()
  password_hint: string;

  @Field()
  master_password_hash: string;

  @Field()
  symmetric_key_iv: string;

  @Field()
  protected_symmetric_key: string;

  @Field(() => RSAKeyPairInput)
  rsa_key_pair: RSAKeyPairInput;
}
