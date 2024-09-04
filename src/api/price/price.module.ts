import { Module } from '@nestjs/common';
import { FiatModule } from 'src/libs/fiat/fiat.module';

import {
  PriceChartResolver,
  PricePointResolver,
  PriceQueriesResolver,
  PriceResolver,
} from './price.resolver';

@Module({
  imports: [FiatModule],
  providers: [
    PriceResolver,
    PriceQueriesResolver,
    PriceChartResolver,
    PricePointResolver,
  ],
})
export class PriceModule {}
