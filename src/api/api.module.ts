import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GqlThrottlerGuard } from 'src/libs/graphql/graphql.throttler';

import { TwoFactorModule } from './2fa/2fa.module';
import { AccountModule } from './account/account.module';
import { ContactModule } from './contact/contact.module';
import { GeneralModule } from './general/general.module';
import { LnUrlModule } from './lnurl/lnurl.module';
import { PasskeyModule } from './passkey/passkey.module';
import { PayModule } from './pay/pay.module';
import { PriceModule } from './price/price.module';
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
    TwoFactorModule,
    PasskeyModule,
    PriceModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: GqlThrottlerGuard }],
})
export class ApiModule {}
