import { Module } from '@nestjs/common';
import { GeneralModule } from './general/general.module';
import { AccountModule } from './account/account.module';
import { WalletModule } from './wallet/wallet.module';
import { LnUrlModule } from './lnurl/lnurl.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    GeneralModule,
    AccountModule,
    WalletModule,
    LnUrlModule,
    ContactModule,
  ],
})
export class ApiModule {}
