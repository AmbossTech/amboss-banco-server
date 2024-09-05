import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum PriceCurrency {
  USD = 'USD',
}

export enum PriceInterval {
  DAILY = 'DAILY',
}

registerEnumType(PriceCurrency, { name: 'PriceCurrency' });
registerEnumType(PriceInterval, { name: 'PriceInterval' });

@ObjectType()
export class PricePoint {
  @Field()
  id: string;

  @Field()
  date: string;

  @Field()
  value: number;

  @Field()
  currency: PriceCurrency;
}

@ObjectType()
export class PriceChart {
  @Field()
  id: string;

  @Field()
  interval: PriceInterval;

  @Field(() => [PricePoint])
  points: PricePoint[];
}

@ObjectType()
export class PriceQueries {
  @Field()
  chart: PriceChart;
}

@InputType()
export class PriceChartInput {
  @Field()
  days: number;
}

export type PricePointParent = { date: Date; currency: PriceCurrency };

export type PriceChartParent = { dates: Date[]; interval: PriceInterval };
