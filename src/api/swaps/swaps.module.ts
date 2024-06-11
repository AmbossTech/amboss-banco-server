import { Module } from '@nestjs/common';
import { SwapsResolver } from './swaps.resolver';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

@Module({
  imports: [BoltzRestModule, SwapsRepoModule],
  providers: [SwapsResolver],
})
export class SwapsModule {}
