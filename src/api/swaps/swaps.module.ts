import { Module } from '@nestjs/common';
import { SwapsResolver, WalletSwapsResolver } from './swaps.resolver';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';

@Module({
  imports: [
    BoltzRestModule,
    SwapsRepoModule,
    SideShiftModule,
    LiquidModule,
    WalletRepoModule,
    SwapsRepoModule,
  ],
  providers: [SwapsResolver, WalletSwapsResolver],
})
export class SwapsModule {}
