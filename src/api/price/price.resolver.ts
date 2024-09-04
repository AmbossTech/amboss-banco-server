import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { startOfDay, subDays } from 'date-fns';
import { Public } from 'src/auth/auth.decorators';
import { FiatService } from 'src/libs/fiat/fiat.service';
import { v5 as uuidv5 } from 'uuid';

import {
  PriceChart,
  PriceChartInput,
  PriceCurrency,
  PricePoint,
  PricePointParent,
  PriceQueries,
} from './price.types';

@Resolver(PricePoint)
export class PricePointResolver {
  constructor(private fiatService: FiatService) {}

  @ResolveField()
  id(@Parent() { date, currency }: PricePointParent) {
    return uuidv5(`${date.toISOString()}-${currency}`, uuidv5.URL);
  }

  @ResolveField()
  date(@Parent() { date }: PricePointParent) {
    return date.toISOString();
  }

  @ResolveField()
  async value(@Parent() { date }: PricePointParent) {
    return this.fiatService.getChartPrice(date);
  }
}

@Resolver(PriceChart)
export class PriceChartResolver {
  @ResolveField()
  id(@Parent() dates: Date[]) {
    return uuidv5(JSON.stringify(dates), uuidv5.URL);
  }

  @ResolveField()
  points(@Parent() dates: Date[]): PricePointParent[] {
    return dates.map(
      (date): PricePointParent => ({
        date,
        currency: PriceCurrency.USD,
      }),
    );
  }
}

@Resolver(PriceQueries)
export class PriceQueriesResolver {
  @ResolveField()
  chart(@Args('input') { days }: PriceChartInput) {
    const now = new Date();
    // Add current date to list
    const dates = [now];
    // Add all other dates from 00:00
    for (let day = days - 1; day > 0; day--) {
      const date = startOfDay(subDays(new Date(), day));
      dates.push(date);
    }

    return dates;
  }
}

@Resolver()
export class PriceResolver {
  @Public()
  @Query(() => PriceQueries)
  prices() {
    return {};
  }
}
