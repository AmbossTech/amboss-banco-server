import { Module } from '@nestjs/common';
import { FiatModule } from 'src/libs/fiat/fiat.module';

import {
  PriceHistoricalResolver,
  PricePointResolver,
  PriceQueriesResolver,
  PriceResolver,
} from './price.resolver';

@Module({
  imports: [FiatModule],
  providers: [
    PriceResolver,
    PriceQueriesResolver,
    PriceHistoricalResolver,
    PricePointResolver,
  ],
})
export class PriceModule {}
