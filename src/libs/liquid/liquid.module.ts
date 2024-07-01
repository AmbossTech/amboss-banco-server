import { Module } from '@nestjs/common';

import { EsploraServiceModule } from '../esplora/esplora.module';
import { LiquidService } from './liquid.service';

@Module({
  imports: [EsploraServiceModule],
  providers: [LiquidService],
  exports: [LiquidService],
})
export class LiquidModule {}
