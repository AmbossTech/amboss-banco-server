import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NewAccount, SignUpInput } from './account.types';
import { AccountService } from './account.service';

@Resolver()
export class AccountResolver {
  constructor(private accountService: AccountService) {}

  @Mutation(() => NewAccount)
  async signUp(@Args('input') input: SignUpInput) {
    return this.accountService.signUp(input);
  }
}
