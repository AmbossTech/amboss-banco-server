import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum PriceCurrency {
  USD = 'USD',
}

registerEnumType(PriceCurrency, { name: 'PriceCurrency' });

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
