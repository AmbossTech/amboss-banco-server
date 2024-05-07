import { Module } from '@nestjs/common';
import { EsploraLiquidService } from './liquid.service';

@Module({
  providers: [EsploraLiquidService],
  exports: [EsploraLiquidService],
})
export class EsploraServiceModule {}
