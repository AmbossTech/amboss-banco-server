import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { IsDateString } from 'class-validator';

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
export class PriceHistorical {
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
  historical: PriceHistorical;
}

@InputType()
export class PriceChartInput {
  @Field()
  @IsDateString()
  from_date: string;
}

export type PricePointParent = { date: Date; currency: PriceCurrency };

export type PriceHistoricalParent = { dates: Date[]; interval: PriceInterval };
