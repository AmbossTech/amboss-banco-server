import { Module } from '@nestjs/common';
import { WalletSwapsResolver } from './swaps.resolver';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

@Module({
  imports: [SwapsRepoModule],
  providers: [WalletSwapsResolver],
})
export class SwapsModule {}
