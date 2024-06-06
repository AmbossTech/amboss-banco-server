import { Module } from '@nestjs/common';
import {
  ContactMutationsResolver,
  MainContactResolver,
  WalletContactResolver,
  WalletContactsResolver,
} from './contact.resolver';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { ContactServiceModule } from 'src/libs/contact/contact.module';

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
  ],
})
export class ContactModule {}
