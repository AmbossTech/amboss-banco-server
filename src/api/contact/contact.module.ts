import { Module } from '@nestjs/common';
import { ContactServiceModule } from 'src/libs/contact/contact.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import {
  ContactMessageResolver,
  ContactMutationsResolver,
  LnUrlCurrencyResolver,
  MainContactResolver,
  WalletContactResolver,
  WalletContactsResolver,
} from './contact.resolver';

@Module({
  imports: [
    ContactServiceModule,
    ContactRepoModule,
    WalletRepoModule,
    LnurlModule,
  ],
  providers: [
    MainContactResolver,
    ContactMutationsResolver,
    WalletContactsResolver,
    WalletContactResolver,
    LnUrlCurrencyResolver,
    ContactMessageResolver,
  ],
})
export class ContactModule {}
