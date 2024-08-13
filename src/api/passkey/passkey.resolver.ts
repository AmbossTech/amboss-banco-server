import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { account_passkey } from '@prisma/client';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { Response } from 'express';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/auth/auth.decorators';
import { AuthService } from 'src/libs/auth/auth.service';
import { PasskeyService } from 'src/libs/passkey/passkey.service';
import { PasskeyLoginService } from 'src/libs/passkey/passkeyLogin.service';
import { PasskeyRepository } from 'src/repo/passkey/passkey.repo';
import { toWithErrorSync } from 'src/utils/async';
import { v4 } from 'uuid';

import { AccountService } from '../account/account.service';
import { LoginType } from '../account/account.types';
import {
  PasskeyAuthenticateInput,
  PasskeyLoginInput,
  PasskeyLoginMutations,
  PasskeyMutations,
  PasskeyQueries,
  SimplePasskey,
} from './passkey.types';

@Resolver(PasskeyMutations)
export class PasskeyMutationsResolver {
  constructor(
    private passkeyService: PasskeyLoginService,
    private passkeyRepo: PasskeyRepository,
  ) {}

  @ResolveField()
  async add(@CurrentUser() { user_id }: any) {
    return this.passkeyService.generateRegistrationOptions(user_id);
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

  @ResolveField()
  async init_authenticate(
    @Args('id') passkey_id: string,
    @CurrentUser() { user_id }: any,
  ) {
    return this.passkeyService.generateAuthenticationOptions(
      user_id,
      passkey_id,
    );
  }

  @ResolveField()
  async authenticate(@Args('input') input: PasskeyAuthenticateInput) {
    const [parsedOptions, error] = toWithErrorSync(
      () => JSON.parse(input.options) as AuthenticationResponseJSON,
    );

    if (error) {
      throw new GraphQLError('Invalid registration response');
    }

    const { userHandle } = parsedOptions.response;

    if (!userHandle) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const passkey = await this.passkeyRepo.getPasskeyByUserHandle(userHandle);

    if (!passkey) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const verified =
      await this.passkeyService.verifyAuthenticationOptions(parsedOptions);

    if (!verified) {
      throw new GraphQLError('Invalid authentication. Please try again.');
    }

    if (!!input.protected_symmetric_key) {
      if (!passkey.encryption_available) {
        throw new GraphQLError('This passkey cannot be used for encryption');
      }

      if (!!passkey.protected_symmetric_key) {
        throw new GraphQLError('This passkey already has encryption enabled.');
      }

      await this.passkeyRepo.updatePasskeySymmetricKey(
        passkey.id,
        input.protected_symmetric_key,
      );
    }

    return verified;
  }
}

@Resolver(SimplePasskey)
export class SimplePasskeyResolver {
  constructor(private passkeyService: PasskeyService) {}

  @ResolveField()
  id(@Parent() passkey: account_passkey) {
    return passkey.id;
  }

  @ResolveField()
  created_at(@Parent() { created_at }: account_passkey) {
    return created_at.toISOString();
  }

  @ResolveField()
  async name(@Parent() { payload }: account_passkey) {
    const info = await this.passkeyService.getPasskeyInfo(payload.aaguid);
    return info.name;
  }

  @ResolveField()
  encryption_enabled(@Parent() { protected_symmetric_key }: account_passkey) {
    return !!protected_symmetric_key;
  }
}

@Resolver(PasskeyQueries)
export class PasskeyQueriesResolver {
  constructor(private passkeyRepo: PasskeyRepository) {}

  @ResolveField()
  async find_many(@CurrentUser() { user_id }: any) {
    return this.passkeyRepo.findAllForAccount(user_id);
  }
}

@Resolver()
export class PasskeyMainMutationResolver {
  @Mutation(() => PasskeyMutations)
  passkey() {
    return {};
  }
}

@Resolver()
export class PasskeyMainQueryResolver {
  @Query(() => PasskeyQueries)
  passkey() {
    return {};
  }
}

@Resolver(PasskeyLoginMutations)
export class PasskeyLoginMutationsResolver {
  constructor(
    private authService: AuthService,
    private passkeyRepo: PasskeyRepository,
    private accountService: AccountService,
    private passkeyService: PasskeyLoginService,
  ) {}

  @ResolveField()
  async init() {
    const session_id = v4();

    const options =
      await this.passkeyService.generateLoginAuthenticationOptions(session_id);

    return { options, session_id };
  }

  @ResolveField()
  async login(
    @Args('input') input: PasskeyLoginInput,
    @Context() { res }: { res: Response },
  ): Promise<LoginType> {
    const [parsedOptions, error] = toWithErrorSync(
      () => JSON.parse(input.options) as AuthenticationResponseJSON,
    );

    if (error) {
      throw new GraphQLError('Invalid registration response');
    }

    const { userHandle } = parsedOptions.response;

    if (!userHandle) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const passkey = await this.passkeyRepo.getPasskeyByUserHandle(userHandle);

    if (!passkey) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const verified = await this.passkeyService.verifyLoginAuthenticationOptions(
      input.session_id,
      parsedOptions,
    );

    if (!verified) {
      throw new GraphQLError('Invalid authentication. Please try again.');
    }

    const { accessToken, refreshToken } = await this.authService.getTokens(
      passkey.account_id,
      passkey.protected_symmetric_key ? { passkeyId: passkey.id } : undefined,
    );

    await this.accountService.setLoginCookies(
      res,
      passkey.account_id,
      accessToken,
      refreshToken,
    );

    return {
      id: passkey.account_id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
