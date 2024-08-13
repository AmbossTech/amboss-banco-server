import { Field, InputType, ObjectType } from '@nestjs/graphql';

import { Login } from '../account/account.types';

@ObjectType()
export class PasskeyMutations {
  @Field()
  add: string;

  @Field()
  verify: boolean;

  @Field()
  init_authenticate: string;

  @Field()
  authenticate: boolean;
}

@ObjectType()
export class SimplePasskey {
  @Field()
  id: string;

  @Field()
  created_at: string;

  @Field()
  name: string;

  @Field()
  encryption_available: boolean;

  @Field()
  encryption_enabled: boolean;
}

@ObjectType()
export class PasskeyQueries {
  @Field(() => [SimplePasskey])
  find_many: SimplePasskey[];
}

@InputType()
export class PasskeyAuthenticateInput {
  @Field({ nullable: true })
  protected_symmetric_key?: string;

  @Field()
  options: string;
}

@InputType()
export class PasskeyLoginInput {
  @Field()
  session_id: string;

  @Field()
  options: string;
}

@ObjectType()
export class PasskeyLoginInit {
  @Field()
  options: string;

  @Field()
  session_id: string;
}

@ObjectType()
export class PasskeyLoginMutations {
  @Field(() => PasskeyLoginInit)
  init: PasskeyLoginInit;

  @Field(() => Login)
  login: Login;
}
