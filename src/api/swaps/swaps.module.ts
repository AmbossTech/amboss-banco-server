import { Module } from '@nestjs/common';
import { SwapsResolver } from './swaps.resolver';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';

@Module({
  imports: [
    BoltzRestModule,
    SwapsRepoModule,
    SideShiftModule,
    LiquidModule,
    WalletRepoModule,
  ],
  providers: [SwapsResolver],
})
export class SwapsModule {}
