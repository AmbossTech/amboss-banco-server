import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreateContact {
  @Field()
  id: string;
}

@ObjectType()
export class ContactMutations {
  @Field(() => CreateContact)
  create: CreateContact;
}

@InputType()
export class CreateContactInput {
  @Field()
  wallet_id: string;

  @Field()
  lightning_address: string;
}
