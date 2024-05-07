import { Module } from '@nestjs/common';

import { LiquidService } from './liquid.service';

@Module({
  providers: [LiquidService],
  exports: [LiquidService],
})
export class LiquidModule {}
