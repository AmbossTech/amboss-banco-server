import { Module } from '@nestjs/common';

import { BoltzRestModule } from '../boltz/boltz.module';
import { LiquidService } from './liquid.service';

@Module({
  imports: [BoltzRestModule],
  providers: [LiquidService],
  exports: [LiquidService],
})
export class LiquidModule {}
