import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { RedisService } from 'src/libs/redis/redis.service';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';
import { AccountRepo } from 'src/repo/account/account.repo';

import { TwoFactorService } from '../2fa.service';
import {
  CreateTwoFactorOTP,
  TwoFactorOTPMutations,
  TwoFactorOTPVerifyInput,
  TwoFactorPendingVerify,
} from '../2fa.types';
import { twoFactorPendingKey } from '../2fa.utils';

@Resolver(TwoFactorOTPMutations)
export class TwoFactorOTPMutationsResolver {
  constructor(
    private accountRepo: AccountRepo,
    private twoFactorService: TwoFactorService,
    private twoFactorRepo: TwoFactorRepository,
    private redisService: RedisService,
  ) {}

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
}
