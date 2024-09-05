import { Module } from '@nestjs/common';

import {
  PriceChartResolver,
  PricePointResolver,
  PriceQueriesResolver,
  PriceResolver,
} from './price.resolver';

@Module({
  providers: [
    PriceResolver,
    PriceQueriesResolver,
    PriceChartResolver,
    PricePointResolver,
  ],
})
export class PriceModule {}
