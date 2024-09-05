import { Injectable } from '@nestjs/common';
import { differenceInDays, isAfter, subMinutes } from 'date-fns';
import { getSHA256Hash } from 'src/utils/crypto/crypto';

import { RedisService } from '../redis/redis.service';
import { CoingeckoApiService } from './coingecko/coingecko.service';
import { mapDayPricesResult } from './fiat.helpers';

@Injectable()
export class FiatService {
  constructor(
    private coingecko: CoingeckoApiService,
    private redis: RedisService,
  ) {}

  async getLatestBtcPrice(): Promise<number | undefined> {
    const key = `FiatService-getLatestBtcPrice`;

    const cached = await this.redis.get<number>(key);
    if (cached) return cached;

    const price = await this.coingecko.getLatestBtcPrice();

    if (!price) return;

    await this.redis.set(key, price, { ttl: 60 });

    return price;
  }

  async getChartPrices(dates: Date[]): Promise<(number | undefined)[]> {
    // we need a copy of the input array since the dataloader depends in the indices
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

    const earliestDate = sortedDates[0];
    const latestDate = sortedDates.at(-1) || new Date();

    const key = `getDayPrice-${getSHA256Hash(sortedDates.toString())}`;

    const cached = await this.redis.get<number[][]>(key);
    if (cached) {
      return mapDayPricesResult(dates, cached);
    }

    const currentPrice: number[][] = [];

    if (isAfter(latestDate, subMinutes(new Date(), 1))) {
      const price = await this.getLatestBtcPrice();
      if (price) currentPrice.push([latestDate.getTime(), price]);
    }

    // +1 to add today
    const daysToQuery = differenceInDays(new Date(), earliestDate) + 1;

    const chartData = await this.coingecko.getChartData(daysToQuery);
    if (!chartData) return [];

    if (currentPrice[0]) chartData.push(currentPrice[0]);

    await this.redis.set(key, chartData, { ttl: 60 * 60 });

    return mapDayPricesResult(dates, chartData);
  }
}
