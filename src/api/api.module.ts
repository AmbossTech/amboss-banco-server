import { Module } from '@nestjs/common';

import { AccountModule } from './account/account.module';
import { ContactModule } from './contact/contact.module';
import { GeneralModule } from './general/general.module';
import { LnUrlModule } from './lnurl/lnurl.module';
import { PayModule } from './pay/pay.module';
import { EventsModule } from './sse/sse.module';
import { SwapsModule } from './swaps/swaps.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    GeneralModule,
    AccountModule,
    WalletModule,
    LnUrlModule,
    ContactModule,
    SwapsModule,
    PayModule,
    EventsModule,
  ],
})
export class ApiModule {}
