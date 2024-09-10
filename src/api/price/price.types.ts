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

  @Field({ nullable: true })
  value?: number;

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
  id: string;

  @Field()
  historical: PriceHistorical;
}

@InputType()
export class PriceChartInput {
  @Field()
  @IsDateString()
  from_date: string;
}

export type PricePointParent = { date: Date | null; currency: PriceCurrency };

export type PriceHistoricalParent = {
  /**
   * null to fetch current price
   */
  dates: (Date | null)[];
  interval: PriceInterval;
};
