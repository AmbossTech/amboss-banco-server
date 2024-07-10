import { Module } from '@nestjs/common';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { PayService } from './pay.service';
import {
  MainPayMutationsResolver,
  PayMutationsResolver,
} from './resolvers/mutations.resolver';
import {
  MainPayQueriesResolver,
  PayQueriesResolver,
} from './resolvers/queries.resolver';

@Module({
  imports: [
    SwapsRepoModule,
    LnurlModule,
    WalletRepoModule,
    BoltzRestModule,
    LiquidModule,
    SideShiftModule,
  ],
  providers: [
    PayService,
    MainPayMutationsResolver,
    PayMutationsResolver,
    MainPayQueriesResolver,
    PayQueriesResolver,
  ],
})
export class PayModule {}
