import { Module } from '@nestjs/common';

import { LiquidService } from './liquid.service';
import { EsploraServiceModule } from '../esplora/esplora.module';

@Module({
  imports: [EsploraServiceModule],
  providers: [LiquidService],
  exports: [LiquidService],
})
export class LiquidModule {}
