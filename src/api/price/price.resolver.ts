import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { differenceInDays, startOfDay, startOfMinute, subDays } from 'date-fns';
import { Public } from 'src/auth/auth.decorators';
import { ContextType } from 'src/libs/graphql/context.type';
import { v5 as uuidv5 } from 'uuid';

import { getChartInterval } from './price.helpers';
import {
  PriceChartInput,
  PriceCurrency,
  PriceHistorical,
  PriceHistoricalParent,
  PricePoint,
  PricePointParent,
  PriceQueries,
} from './price.types';

@Resolver(PricePoint)
export class PricePointResolver {
  @ResolveField()
  id(@Parent() { date, currency }: PricePointParent) {
    return uuidv5(`${date.toISOString()}-${currency}`, uuidv5.URL);
  }

  @ResolveField()
  date(@Parent() { date }: PricePointParent) {
    return date.toISOString();
  }

  @ResolveField()
  async value(
    @Parent() { date }: PricePointParent,
    @Context() { loaders }: ContextType,
  ) {
    return loaders.priceApiLoader.load(date);
  }
}

@Resolver(PriceHistorical)
export class PriceHistoricalResolver {
  @ResolveField()
  id(@Parent() { dates }: PriceHistoricalParent) {
    return uuidv5(JSON.stringify(dates), uuidv5.URL);
  }

  @ResolveField()
  points(@Parent() { dates }: PriceHistoricalParent): PricePointParent[] {
    return dates.map(
      (date): PricePointParent => ({
        date,
        currency: PriceCurrency.USD,
      }),
    );
  }

  @ResolveField()
  interval(@Parent() { interval }: PriceHistoricalParent) {
    return interval;
  }
}

@Resolver(PriceQueries)
export class PriceQueriesResolver {
  @ResolveField()
  historical(
    @Args('input') { from_date }: PriceChartInput,
  ): PriceHistoricalParent {
    const fromDate = new Date(from_date);
    const daysToQuery = differenceInDays(new Date(), fromDate);

    const now = new Date();
    const dates = [startOfMinute(now)];

    for (let day = 0; day <= daysToQuery; day++) {
      const date = startOfDay(subDays(now, day));
      dates.push(date);
    }

    return { dates, interval: getChartInterval(daysToQuery) };
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
