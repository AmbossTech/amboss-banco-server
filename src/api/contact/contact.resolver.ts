import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import { ContactMutations, CreateContactInput } from './contact.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { ContactRepoService } from 'src/repo/contact/contact.repo';

@Resolver(ContactMutations)
export class ContactMutationsResolver {
  constructor(private contactsRepo: ContactRepoService) {}

  @ResolveField()
  async create(
    @Args('input') input: CreateContactInput,
    @CurrentUser() { user_id }: any,
  ) {
    return this.contactsRepo.createContact(
      user_id,
      input.wallet_id,
      input.lightning_address,
    );
  }
}

@Resolver()
export class MainContactResolver {
  @Mutation(() => ContactMutations)
  async contacts() {
    return {};
  }
}
