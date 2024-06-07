import { Module } from '@nestjs/common';
import { BoltzService } from './boltz/boltz.service';
import { SwapsResolver } from './swaps.resolver';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

@Module({
  imports: [BoltzRestModule, SwapsRepoModule],
  providers: [BoltzService, SwapsResolver],
})
export class SwapsModule {}
