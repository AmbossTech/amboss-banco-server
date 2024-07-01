import { Module } from '@nestjs/common';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { ContactServiceModule } from 'src/libs/contact/contact.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { MainPayResolver, PayMutationsResolver } from './pay.resolver';
import { PayService } from './pay.service';

@Module({
  imports: [
    SwapsRepoModule,
    LnurlModule,
    WalletRepoModule,
    BoltzRestModule,
    LiquidModule,
    ContactServiceModule,
  ],
  providers: [PayService, MainPayResolver, PayMutationsResolver],
})
export class PayModule {}
