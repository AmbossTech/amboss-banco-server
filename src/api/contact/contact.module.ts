import { Module } from '@nestjs/common';
import {
  ContactMutationsResolver,
  LnUrlInfoResolver,
  MainContactResolver,
  WalletContactResolver,
  WalletContactsResolver,
} from './contact.resolver';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { ContactServiceModule } from 'src/libs/contact/contact.module';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';

@Module({
  imports: [
    BoltzRestModule,
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
    LnUrlInfoResolver,
  ],
})
export class ContactModule {}
