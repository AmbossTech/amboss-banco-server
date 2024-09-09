import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

import { FiatService } from '../fiat/fiat.service';

export type DataloaderTypes = {
  priceApiLoader: DataLoader<Date, number | undefined>;
};

@Injectable()
export class DataloaderService {
  constructor(private fiatService: FiatService) {}

  createLoaders(): DataloaderTypes {
    const priceApiLoader = new DataLoader<Date, number | undefined>(
      async (dates: readonly Date[]) =>
        this.fiatService.getChartPrices(dates as Date[]),
    );

    return {
      priceApiLoader,
    };
  }
}
