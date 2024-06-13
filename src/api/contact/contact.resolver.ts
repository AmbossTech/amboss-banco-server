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
  LnUrlInfo,
  LnUrlInfoParent,
  SendMessageInput,
  WalletContact,
  WalletContactParent,
  WalletContacts,
  WalletContactsParent,
  moneyAddressType,
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
import { toWithError } from 'src/utils/async';
import { v5 } from 'uuid';
import { CustomLogger, Logger } from 'src/libs/logging';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';

@Resolver(LnUrlInfo)
export class LnUrlInfoResolver {
  @ResolveField()
  id(@Parent() parent: LnUrlInfoParent) {
    return v5(JSON.stringify(parent), v5.URL);
  }

  @ResolveField()
  async min_sendable(@Parent() parent: LnUrlInfoParent) {
    const minSats = Math.floor(parent.lnUrlInfo.minSendable / 1000);

    if (!parent.boltzInfo) return minSats;

    return Math.max(parent.boltzInfo['L-BTC'].BTC.limits.minimal, minSats);
  }

  @ResolveField()
  async max_sendable(@Parent() parent: LnUrlInfoParent) {
    const maxSats = Math.ceil(parent.lnUrlInfo.maxSendable / 1000);

    if (!parent.boltzInfo) return maxSats;

    return Math.min(parent.boltzInfo['L-BTC'].BTC.limits.maximal, maxSats);
  }

  @ResolveField()
  async variable_fee_percentage(@Parent() parent: LnUrlInfoParent) {
    return parent.boltzInfo?.['L-BTC'].BTC.fees.percentage || '0';
  }

  @ResolveField()
  async fixed_fee(@Parent() parent: LnUrlInfoParent) {
    const boltzFee = parent.boltzInfo?.['L-BTC'].BTC.fees.minerFees || 0;
    return boltzFee + 300;
  }
}

@Resolver(WalletContact)
export class WalletContactResolver {
  constructor(
    private boltzRest: BoltzRestApi,
    private lnurlService: LnurlService,
    private contactsRepo: ContactRepoService,
    @Logger('WalletContactResolver') private logger: CustomLogger,
  ) {}

  @ResolveField()
  async encryption_pubkey(@Parent() parent: WalletContactParent) {
    if (!parent.money_address) return null;
    return this.lnurlService.getAddressPublicKey(parent.money_address);
  }

  @ResolveField()
  async messages(@Parent() parent: WalletContactParent) {
    return this.contactsRepo.getContactMessages(parent.id);
  }

  @ResolveField()
  async lnurl_info(
    @Parent() { money_address }: WalletContactParent,
  ): Promise<LnUrlInfoParent | null> {
    if (!money_address) return null;
    const [lnUrlInfo, error] = await toWithError(
      this.lnurlService.getAddressInfo(money_address),
    );

    if (error) return null;

    const [boltzInfo] = await toWithError(
      this.boltzRest.getSubmarineSwapInfo(),
    );

    this.logger.debug('LNURL Info', { lnUrlInfo, boltzInfo });

    return { lnUrlInfo, boltzInfo };
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
      const result = moneyAddressType.safeParse(input.money_address);

      if (!result.success) {
        throw new GraphQLError(result.error.issues[0].message);
      }
    }

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = input.money_address.split('@');

    if (serverDomain === domain) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) {
        throw new GraphQLError('Contact not found');
      }
    } else {
      try {
        const rawInfo = await fetch(lightningAddressToUrl(input.money_address));

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
      input.money_address,
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
