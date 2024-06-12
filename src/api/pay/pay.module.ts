import { Module } from '@nestjs/common';
import { MainPayResolver, PayMutationsResolver } from './pay.resolver';
import { PayService } from './pay.service';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

@Module({
  imports: [
    SwapsRepoModule,
    LnurlModule,
    WalletRepoModule,
    BoltzRestModule,
    LiquidModule,
  ],
  providers: [PayService, MainPayResolver, PayMutationsResolver],
})
export class PayModule {}