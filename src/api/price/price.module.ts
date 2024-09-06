import { Module } from '@nestjs/common';

import {
  PriceHistoricalResolver,
  PricePointResolver,
  PriceQueriesResolver,
  PriceResolver,
} from './price.resolver';

@Module({
  providers: [
    PriceResolver,
    PriceQueriesResolver,
    PriceHistoricalResolver,
    PricePointResolver,
  ],
})
export class PriceModule {}
