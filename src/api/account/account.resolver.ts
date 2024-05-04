import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SignUpInput } from './account.types';

@Resolver()
export class AccountResolver {
  @Mutation(() => Boolean)
  signUp(@Args('input') input: SignUpInput) {
    console.log(input);

    return true;
  }
}
