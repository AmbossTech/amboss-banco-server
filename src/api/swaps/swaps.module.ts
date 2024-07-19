import { Module } from '@nestjs/common';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

import { SimpleSwapResolver, WalletSwapsResolver } from './swaps.resolver';

@Module({
  imports: [SwapsRepoModule],
  providers: [WalletSwapsResolver, SimpleSwapResolver],
})
export class SwapsModule {}
