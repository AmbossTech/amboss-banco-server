import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { startOfDay, startOfMinute, subDays } from 'date-fns';
import { Public } from 'src/auth/auth.decorators';
import { ContextType } from 'src/libs/graphql/context.type';
import { v5 as uuidv5 } from 'uuid';

import { getChartInterval } from './price.helpers';
import {
  PriceChart,
  PriceChartInput,
  PriceChartParent,
  PriceCurrency,
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

@Resolver(PriceChart)
export class PriceChartResolver {
  @ResolveField()
  id(@Parent() { dates }: PriceChartParent) {
    return uuidv5(JSON.stringify(dates), uuidv5.URL);
  }

  @ResolveField()
  points(@Parent() { dates }: PriceChartParent): PricePointParent[] {
    return dates.map(
      (date): PricePointParent => ({
        date,
        currency: PriceCurrency.USD,
      }),
    );
  }

  @ResolveField()
  interval(@Parent() { interval }: PriceChartParent) {
    return interval;
  }
}

@Resolver(PriceQueries)
export class PriceQueriesResolver {
  @ResolveField()
  chart(@Args('input') { days }: PriceChartInput): PriceChartParent {
    const now = new Date();
    const dates = [startOfMinute(now)];

    for (let day = 0; day < days; day++) {
      const date = startOfDay(subDays(now, day));
      dates.push(date);
    }

    return { dates, interval: getChartInterval(days) };
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
