import { Args, Context, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { Response } from 'express';
import { GraphQLError } from 'graphql';
import { AccountService } from 'src/api/account/account.service';
import { TwoFactorPasskeyLoginMutations } from 'src/api/account/account.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { TwoFactorSession } from 'src/libs/2fa/2fa.types';
import { PasskeyTwoFactorService } from 'src/libs/passkey/passkeyTwoFactor.service';
import { RedisService } from 'src/libs/redis/redis.service';
import { toWithErrorSync } from 'src/utils/async';

import {
  TwoFactorPasskeyAuthInput,
  TwoFactorPasskeyAuthLoginInput,
  TwoFactorPasskeyMutations,
} from '../2fa.types';
import { twoFactorSessionKey } from '../2fa.utils';

@Resolver(TwoFactorPasskeyMutations)
export class TwoFactorPasskeyMutationsResolver {
  constructor(private passkeyService: PasskeyTwoFactorService) {}

  @ResolveField()
  async add(@CurrentUser() { user_id }: any) {
    const options =
      await this.passkeyService.generateRegistrationOptions(user_id);
    return { options };
  }

  @ResolveField()
  async verify(
    @Args('options') options: string,
    @CurrentUser() { user_id }: any,
  ) {
    const [parsedOptions, error] = toWithErrorSync(
      () => JSON.parse(options) as RegistrationResponseJSON,
    );

    if (error) {
      throw new GraphQLError('Invalid registration response');
    }

    return this.passkeyService.verifyRegistrationOptions(
      user_id,
      parsedOptions,
    );
  }
}

@Resolver(TwoFactorPasskeyLoginMutations)
export class TwoFactorPasskeyLoginMutationsResolver {
  constructor(
    private redisService: RedisService,
    private accountService: AccountService,
    private passkeyService: PasskeyTwoFactorService,
  ) {}

  @ResolveField()
  async options(@Args('input') input: TwoFactorPasskeyAuthInput) {
    const session = await this.redisService.get<TwoFactorSession>(
      twoFactorSessionKey(input.session_id),
    );

    if (!session) {
      throw new GraphQLError(`Could not verify`);
    }

    const { accountId } = session;

    return this.passkeyService.generateAuthenticationOptions(accountId);
  }

  @ResolveField()
  async login(
    @Args('input') input: TwoFactorPasskeyAuthLoginInput,
    @Context() { res }: { res: Response },
  ) {
    const session = await this.redisService.get<TwoFactorSession>(
      twoFactorSessionKey(input.session_id),
    );

    if (!session) {
      throw new GraphQLError(`Could not verify`);
    }

    const { accountId, accessToken, refreshToken } = session;

    const [parsedOptions, error] = toWithErrorSync(
      () => JSON.parse(input.options) as AuthenticationResponseJSON,
    );

    if (error) {
      throw new GraphQLError('Invalid registration response');
    }

    const verified = await this.passkeyService.verifyAuthenticationOptions(
      accountId,
      parsedOptions,
    );

    if (!verified) {
      throw new GraphQLError('Invalid authentication. Please try again.');
    }

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
