import { PriceInterval } from './price.types';

export const getChartInterval = (days: number): PriceInterval => {
  if (days > 1) return PriceInterval.DAILY;

  return PriceInterval.DAILY;
};
