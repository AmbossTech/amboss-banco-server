import { Module } from '@nestjs/common';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { ContactServiceModule } from 'src/libs/contact/contact.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { MainPayResolver, PayMutationsResolver } from './pay.resolver';
import { PayService } from './pay.service';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';

@Module({
  imports: [
    SwapsRepoModule,
    LnurlModule,
    WalletRepoModule,
    BoltzRestModule,
    LiquidModule,
    ContactServiceModule,
    SideShiftModule,
  ],
  providers: [PayService, MainPayResolver, PayMutationsResolver],
})
export class PayModule {}
