import { forwardRef, Module } from '@nestjs/common';

import { BoltzRestModule } from '../boltz/boltz.module';
import { LiquidService } from './liquid.service';

@Module({
  imports: [forwardRef(() => BoltzRestModule)],
  providers: [LiquidService],
  exports: [LiquidService],
})
export class LiquidModule {}
