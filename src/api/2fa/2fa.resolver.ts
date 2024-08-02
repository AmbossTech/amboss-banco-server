import {
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { account_2fa, two_fa_method } from '@prisma/client';
import { CurrentUser } from 'src/auth/auth.decorators';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';

import {
  SimpleTwoFactor,
  TwoFactorMutations,
  TwoFactorQueries,
} from './2fa.types';

export const twoFactorSessionKey = (id: string) => `twoFactorSession-${id}`;
export const twoFactorPendingKey = (accountId: string, method: two_fa_method) =>
  `twoFactorPending-${accountId}-${method}`;

export type TwoFactorPendingVerify = {
  type: 'OTP';
  secret: string;
  url: string;
};

@Resolver(TwoFactorMutations)
export class TwoFactorMutationsResolver {
  @ResolveField()
  otp() {
    return {};
  }
}

@Resolver(SimpleTwoFactor)
export class SimpleTwoFactorResolver {
  @ResolveField()
  created_at(@Parent() { created_at }: account_2fa) {
    return created_at.toISOString();
  }
}

@Resolver(TwoFactorQueries)
export class TwoFactorQueriesResolver {
  constructor(private twoFactorRepo: TwoFactorRepository) {}

  @ResolveField()
  id(@CurrentUser() { user_id }: any) {
    return user_id;
  }

  @ResolveField()
  async find_many(@CurrentUser() { user_id }: any) {
    return this.twoFactorRepo.findAllForAccount(user_id);
  }
}

@Resolver()
export class TwoFactorMainMutationResolver {
  @Mutation(() => TwoFactorMutations)
  async two_factor() {
    return {};
  }
}

@Resolver()
export class TwoFactorMainQueryResolver {
  @Query(() => TwoFactorQueries)
  async two_factor() {
    return {};
  }
}
