import { Module } from '@nestjs/common';
import { CoingeckoApiService } from './coingecko/coingecko.service';
import { FiatService } from './fiat.service';

@Module({
  providers: [CoingeckoApiService, FiatService],
  exports: [FiatService],
})
export class FiatModule {}
