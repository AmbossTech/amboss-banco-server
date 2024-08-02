import { Args, Context, ResolveField, Resolver } from '@nestjs/graphql';
import { Response } from 'express';
import { GraphQLError } from 'graphql';
import { AccountService } from 'src/api/account/account.service';
import { CurrentUser } from 'src/auth/auth.decorators';
import { TwoFactorSession } from 'src/libs/2fa/2fa.types';
import { RedisService } from 'src/libs/redis/redis.service';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';
import { AccountRepo } from 'src/repo/account/account.repo';

import {
  twoFactorPendingKey,
  TwoFactorPendingVerify,
  twoFactorSessionKey,
} from '../2fa.resolver';
import { TwoFactorService } from '../2fa.service';
import {
  CreateTwoFactorOTP,
  TwoFactorOTPLogin,
  TwoFactorOTPMutations,
  TwoFactorOTPVerifyInput,
} from '../2fa.types';

@Resolver(TwoFactorOTPMutations)
export class TwoFactorOTPMutationsResolver {
  constructor(
    private accountRepo: AccountRepo,
    private accountService: AccountService,
    private twoFactorService: TwoFactorService,
    private twoFactorRepo: TwoFactorRepository,
    private redisService: RedisService,
  ) {}

  @ResolveField()
  id(@CurrentUser() { user_id }: any) {
    return user_id;
  }

  @ResolveField()
  async add(@CurrentUser() { user_id }: any): Promise<CreateTwoFactorOTP> {
    const account = await this.accountRepo.findOneById(user_id);
    if (!account) throw new GraphQLError(`Account not found`);

    const { authUrl, secret } = await this.twoFactorService.setupOTP(account);
    return { otp_secret: secret, otp_url: authUrl };
  }

  @ResolveField()
  async verify(
    @CurrentUser() { user_id }: any,
    @Args('input') input: TwoFactorOTPVerifyInput,
  ) {
    const key = twoFactorPendingKey(user_id, 'OTP');
    const pending = await this.redisService.get<TwoFactorPendingVerify>(key);

    if (!pending || pending.type !== 'OTP') {
      throw new GraphQLError(`Could not verify`);
    }

    const { secret, url } = pending;

    const isValid = await this.twoFactorService.validOTP(
      user_id,
      input.code,
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
    @Args('input') input: TwoFactorOTPLogin,
    @Context() { res }: { res: Response },
  ) {
    const session = await this.redisService.get<TwoFactorSession>(
      twoFactorSessionKey(input.session_id),
    );

    if (!session) {
      throw new GraphQLError(`Could not verify`);
    }
    const { accountId, accessToken, refreshToken } = session;

    const isValid = await this.twoFactorService.validOTP(accountId, input.code);
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
}
