import { Module } from '@nestjs/common';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

import { WalletSwapsResolver } from './swaps.resolver';

@Module({
  imports: [SwapsRepoModule],
  providers: [WalletSwapsResolver],
})
export class SwapsModule {}
