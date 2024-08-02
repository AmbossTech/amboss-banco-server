import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { account } from '@prisma/client';
import { CookieOptions, Response } from 'express';
import { GraphQLError } from 'graphql';
import { CurrentUser, Public, SkipAccessCheck } from 'src/auth/auth.decorators';
import { RefreshTokenGuard } from 'src/auth/guards/refreshToken.guard';
import { AmbossService } from 'src/libs/amboss/amboss.service';
import { AuthService } from 'src/libs/auth/auth.service';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { ContextType } from 'src/libs/graphql/context.type';
import { CustomLogger, Logger } from 'src/libs/logging';
import { RedlockService } from 'src/libs/redlock/redlock.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { WalletService } from 'src/libs/wallet/wallet.service';
import { AccountRepo } from 'src/repo/account/account.repo';

import { AccountService } from './account.service';
import {
  AmbossInfo,
  ChangePasswordInput,
  LoginInput,
  NewAccount,
  PasswordMutations,
  PasswordParentType,
  ReferralCode,
  RefreshToken,
  SignUpInput,
  User,
  UserSwapInfo,
  UserWalletInfo,
} from './account.types';

@Resolver(UserSwapInfo)
export class UserSwapInfoResolver {
  constructor(private sideshiftService: SideShiftService) {}

  @ResolveField()
  id(@CurrentUser() { user_id }: any) {
    return user_id;
  }

  @ResolveField()
  async shifts_enabled(@Context() { ip }: ContextType) {
    return this.sideshiftService.isAllowedToSwap(ip);
  }
}

@Resolver(User)
export class UserResolver {
  constructor(
    private accountRepo: AccountRepo,
    private config: ConfigService,
  ) {}

  @ResolveField()
  async default_wallet_id(
    @CurrentUser() { user_id }: any,
  ): Promise<string | null> {
    const account = await this.accountRepo.findOneByIdWithWalletIds(user_id);

    if (!account?.wallets.length) return null;

    return account.wallets[0].wallet_id;
  }

  @ResolveField()
  async swap_info() {
    return {};
  }

  @ResolveField()
  amboss(@Parent() account: account) {
    const ambossConfig = this.config.get('amboss');

    if (!ambossConfig) return;

    return account;
  }

  @ResolveField()
  wallet(@Parent() account: account) {
    return account;
  }
}

@Resolver(UserWalletInfo)
export class UserWalletInfoResolver {
  @ResolveField()
  id(@Parent() account: account) {
    return account.id;
  }

  @ResolveField()
  async wallet_limit() {
    return 2;
  }
}

@Resolver(AmbossInfo)
export class AmbossInfoResolver {
  constructor(private ambossService: AmbossService) {}

  @ResolveField()
  id(@Parent() account: account) {
    return account.id;
  }

  @ResolveField()
  async referral_codes(
    @Parent() account: account,
  ): Promise<ReferralCode[] | void> {
    return this.ambossService.getReferralCodes(account.email);
  }
}

@Resolver()
export class AccountResolver {
  domain: string;

  constructor(
    private config: ConfigService,
    private accountRepo: AccountRepo,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private accountService: AccountService,
    private walletService: WalletService,
    private ambossService: AmbossService,
    private redlockService: RedlockService,
    @Logger(AccountResolver.name) private logger: CustomLogger,
  ) {
    this.domain = config.getOrThrow('server.cookies.domain');
  }

  @Query(() => User)
  async user(@CurrentUser() { user_id }: any) {
    const account = await this.accountRepo.findOneById(user_id);

    if (!account) {
      throw new GraphQLError('Error getting account.');
    }

    return account;
  }

  @Public()
  @Mutation(() => NewAccount)
  async login(
    @Args('input') input: LoginInput,
    @Context() { res }: { res: Response },
  ) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const account = await this.accountRepo.findOne(normalizedEmail);

    if (!account) {
      throw new GraphQLError('Invalid email or password.');
    }

    this.logger.debug(`check password`, {
      account,
      input: input.master_password_hash,
    });

    const verified = await this.cryptoService.argon2Verify(
      account.master_password_hash,
      input.master_password_hash,
    );

    if (!verified) {
      throw new GraphQLError('Invalid email or password.');
    }

    const { accessToken, refreshToken } = await this.authService.getTokens(
      account.id,
    );

    const hashedRefreshToken =
      await this.cryptoService.argon2Hash(refreshToken);

    await this.accountRepo.updateRefreshToken(account.id, hashedRefreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: true,
      domain: this.domain.includes('localhost') ? undefined : this.domain,
    };

    res.cookie('amboss_banco_refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.cookie('amboss_banco_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 10,
    });

    return {
      id: account.id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  @Mutation(() => Boolean)
  async logout(
    @CurrentUser() { user_id }: any,
    @Context() { res }: { res: Response },
  ) {
    const account = await this.accountRepo.findOneById(user_id);

    if (!account) {
      throw new GraphQLError('No account found.');
    }

    await this.accountRepo.updateRefreshToken(user_id, null);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: true,
      domain: this.domain,
      maxAge: 1,
    };

    res.cookie('amboss_banco_refresh_token', '', cookieOptions);
    res.cookie('amboss_banco_access_token', '', cookieOptions);

    return true;
  }

  @Public()
  @Mutation(() => NewAccount)
  async signUp(
    @Args('input') input: SignUpInput,
    @Context() { res }: { res: Response },
  ) {
    let newAccount: account | undefined;

    const { email, referral_code } = input;

    const normalizedEmail = email.trim().toLowerCase();

    if (referral_code) {
      newAccount = await this.redlockService.using<account>(
        referral_code,
        async () => {
          const { can_signup, using_referral_code } =
            await this.ambossService.canSignup(normalizedEmail, referral_code);

          if (!can_signup) {
            throw new GraphQLError(`Invalid referral code`);
          }

          const account = await this.accountService.signUp({
            ...input,
            email: normalizedEmail,
          });

          if (using_referral_code) {
            await this.ambossService.useRefferalCode(
              referral_code,
              normalizedEmail,
            );
          }

          return account;
        },
        'Please try again later',
      );
    } else {
      const { can_signup } =
        await this.ambossService.canSignup(normalizedEmail);

      if (!can_signup) {
        throw new GraphQLError(`You are not subscribed`);
      }

      newAccount = await this.accountService.signUp({
        ...input,
        email: normalizedEmail,
      });
    }

    const { accessToken, refreshToken } = await this.authService.getTokens(
      newAccount.id,
    );

    const hashedRefreshToken =
      await this.cryptoService.argon2Hash(refreshToken);

    await this.accountRepo.updateRefreshToken(
      newAccount.id,
      hashedRefreshToken,
    );

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: true,
      domain: this.domain,
    };

    res.cookie('amboss_banco_refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.cookie('amboss_banco_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 10,
    });

    if (!!input.wallet) {
      await this.walletService.createWallet(newAccount.id, input.wallet);
    }

    return {
      id: newAccount.id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  @SkipAccessCheck()
  @UseGuards(RefreshTokenGuard)
  @Mutation(() => RefreshToken)
  async refreshToken(
    @CurrentUser() { user_id, refresh_token }: any,
    @Context() { res }: { res: Response },
  ) {
    const account = await this.accountRepo.findOneById(user_id);

    if (!account?.refresh_token_hash) {
      throw new GraphQLError('User not found');
    }

    const verified = await this.cryptoService.argon2Verify(
      account.refresh_token_hash,
      refresh_token,
    );

    if (!verified) {
      throw new GraphQLError('Invalid authentication');
    }

    const { accessToken, refreshToken } =
      await this.authService.getTokens(user_id);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: true,
      domain: this.domain,
    };

    res.cookie('amboss_banco_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 10,
    });

    return {
      id: user_id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  @Mutation(() => PasswordMutations)
  async password(@CurrentUser() { user_id }: any): Promise<PasswordParentType> {
    const account = await this.accountRepo.findOneById(user_id);
    if (!account) {
      throw new GraphQLError(`Account not found`);
    }

    return {
      account,
    };
  }
}

@Resolver(PasswordMutations)
export class PasswordMutationsResolver {
  constructor(
    private cryptoService: CryptoService,
    private accountRepo: AccountRepo,
    @Logger(PasswordMutationsResolver.name) private logger: CustomLogger,
  ) {}

  @ResolveField()
  async change(
    @Args('input')
    {
      current_master_password_hash,
      new_master_password_hash,
      new_protected_symmetric_key,
      new_password_hint,
    }: ChangePasswordInput,
    @Parent() { account }: PasswordParentType,
  ) {
    const verified = await this.cryptoService.argon2Verify(
      account.master_password_hash,
      current_master_password_hash,
    );

    if (!verified) {
      throw new GraphQLError('Invalid password.');
    }

    const passwordHash = await this.cryptoService.argon2Hash(
      new_master_password_hash,
    );

    await this.accountRepo.updateCredentials({
      account_id: account.id,
      master_password_hash: passwordHash,
      protected_symmetric_key: new_protected_symmetric_key,
      password_hint: new_password_hint,
    });

    return true;
  }

  @ResolveField()
  async check(
    @Args('password') password: string,
    @Parent() { account }: PasswordParentType,
  ) {
    this.logger.debug(`check password`, {
      account,
      input: password,
    });

    return this.cryptoService.argon2Verify(
      account.master_password_hash,
      password,
    );
  }
}
