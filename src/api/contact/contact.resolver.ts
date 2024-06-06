import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  ContactMutations,
  CreateContactInput,
  LightningAddressResponseSchema,
  SendMessageInput,
  WalletContact,
  WalletContactParent,
  WalletContacts,
  WalletContactsParent,
  lightningAddressType,
} from './contact.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { ContactRepoService } from 'src/repo/contact/contact.repo';
import { GraphQLError } from 'graphql';
import { ConfigService } from '@nestjs/config';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { fetch } from 'undici';
import { lightningAddressToUrl } from 'src/utils/lnurl';
import { LnurlService } from 'src/libs/lnurl/lnurl.service';
import { ContactService } from 'src/libs/contact/contact.service';

@Resolver(WalletContact)
export class WalletContactResolver {
  constructor(
    private lnurlService: LnurlService,
    private contactsRepo: ContactRepoService,
  ) {}

  @ResolveField()
  async encryption_pubkey(@Parent() parent: WalletContactParent) {
    if (!parent.lightning_address) return null;
    return this.lnurlService.getAddressPublicKey(parent.lightning_address);
  }

  @ResolveField()
  async messages(@Parent() parent: WalletContactParent) {
    return this.contactsRepo.getContactMessages(parent.id);
  }
}

@Resolver(WalletContacts)
export class WalletContactsResolver {
  constructor(private contactsRepo: ContactRepoService) {}

  @ResolveField()
  id(@Parent() { wallet_id }: WalletContactsParent) {
    return wallet_id;
  }

  @ResolveField()
  async find_many(@Parent() { wallet_id }: WalletContactsParent) {
    const walletInfo = await this.contactsRepo.getContactsForWallet(wallet_id);
    return walletInfo?.contacts || [];
  }

  @ResolveField()
  async find_one(
    @Args('id') id: string,
    @Parent() { wallet_id }: WalletContactsParent,
  ): Promise<WalletContactParent> {
    const contact = await this.contactsRepo.getWalletContact(id, wallet_id);

    if (!contact) {
      throw new GraphQLError('Contact not found');
    }

    return contact;
  }
}

@Resolver(ContactMutations)
export class ContactMutationsResolver {
  constructor(
    private config: ConfigService,
    private walletRepo: WalletRepoService,
    private contactService: ContactService,
    private contactsRepo: ContactRepoService,
  ) {}

  @ResolveField()
  async send_message(
    @Args('input') input: SendMessageInput,
    @CurrentUser() { user_id }: any,
  ) {
    await this.contactService.sendMessage({
      ...input,
      account_id: user_id,
    });

    return { id: '' };
  }

  @ResolveField()
  async create(
    @Args('input') input: CreateContactInput,
    @CurrentUser() { user_id }: any,
  ) {
    const isProd = this.config.getOrThrow('isProduction');

    if (isProd) {
      const result = lightningAddressType.safeParse(input.lightning_address);

      if (!result.success) {
        throw new GraphQLError(result.error.issues[0].message);
      }
    }

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = input.lightning_address.split('@');

    if (serverDomain === domain) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) {
        throw new GraphQLError('Contact not found');
      }
    } else {
      try {
        const rawInfo = await fetch(
          lightningAddressToUrl(input.lightning_address),
        );

        const info = await rawInfo.json();

        const parsed = LightningAddressResponseSchema.safeParse(info);

        if (!parsed.success) {
          throw new GraphQLError('Contact not found');
        }
      } catch (error) {
        throw new GraphQLError('Error checking if contact exists');
      }
    }

    return this.contactsRepo.upsertContactForAccount(
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
