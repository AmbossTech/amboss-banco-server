import {
  Args,
  Context,
  Mutation,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { $Enums, two_fa_method } from '@prisma/client';
import { Response } from 'express';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { TwoFactorSession } from 'src/libs/2fa/2fa.types';
import { RedisService } from 'src/libs/redis/redis.service';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';
import { AccountRepo } from 'src/repo/account/account.repo';

import { AccountService } from '../account/account.service';
import { TwoFactorService } from './2fa.service';
import {
  CreateTwoFactor,
  CreateTwoFactorInput,
  TwoFactorInput,
  TwoFactorMutations,
  VerifyTwoFactorInput,
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
  constructor(
    private redisService: RedisService,
    private twoFactorService: TwoFactorService,
    private accountService: AccountService,
    private twoFactorRepo: TwoFactorRepository,
    private accountRepo: AccountRepo,
  ) {}

  @ResolveField()
  async add(
    @CurrentUser() { user_id }: any,
    @Args('input') input: CreateTwoFactorInput,
  ): Promise<CreateTwoFactor> {
    const account = await this.accountRepo.findOneById(user_id);
    if (!account) throw new GraphQLError(`Account not found`);

    switch (input.method) {
      case $Enums.two_fa_method.OTP:
        const { authUrl, secret } =
          await this.twoFactorService.setupOTP(account);
        return { otp: { otp_secret: secret, otp_url: authUrl } };
    }

    throw new GraphQLError(`Can't create two factor authentication method`);
  }

  @ResolveField()
  async verify(
    @CurrentUser() { user_id }: any,
    @Args('input') input: VerifyTwoFactorInput,
  ) {
    const key = twoFactorPendingKey(user_id, input.method);
    const pending = await this.redisService.get<TwoFactorPendingVerify>(key);
    if (!pending || pending.type !== input.method) {
      throw new GraphQLError(`Could not verify`);
    }

    const { secret, url } = pending;
    if (input.method !== $Enums.two_fa_method.OTP || !input.otp) {
      throw new GraphQLError(`Could not verify`);
    }
    const isValid = await this.twoFactorService.validOTP(
      user_id,
      input.otp.code,
      secret,
    );
    if (!isValid) throw new GraphQLError(`Token invalid`);

    await this.twoFactorRepo.add(user_id, 'OTP', {
      type: 'OTP',
      otpSecret: secret,
      otpUrl: url,
    });

    this.redisService.delete(key);

    return true;
  }

  @ResolveField()
  async login(
    @Args('input') input: TwoFactorInput,
    @Context() { res }: { res: Response },
  ) {
    const session = await this.redisService.get<TwoFactorSession>(
      twoFactorSessionKey(input.session_id),
    );

    if (!session) {
      throw new GraphQLError(`Could not verify`);
    }
    const { accountId, accessToken, refreshToken } = session;

    switch (input.method) {
      case $Enums.two_fa_method.OTP:
        if (!input.otp) {
          throw new GraphQLError(`No OTP provided`);
        }
        const isValid = await this.twoFactorService.validOTP(
          accountId,
          input.otp.code,
        );
        if (!isValid) throw new GraphQLError(`Token invalid`);

        await this.accountService.setLoginCookies(
          res,
          accountId,
          accessToken,
          refreshToken,
        );

        return {
          id: accessToken,
          access_token: accessToken,
          refresh_token: refreshToken,
        };
    }

    throw new GraphQLError(`Could not verify`);
  }
}

@Resolver()
export class TwoFactorResolver {
  @Mutation(() => TwoFactorMutations)
  async two_factor() {
    return {};
  }
}
