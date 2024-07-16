import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  Mutation,
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
import { RedlockService } from 'src/libs/redlock/redlock.service';
import { SideShiftService } from 'src/libs/sideshift/sideshift.service';
import { WalletService } from 'src/libs/wallet/wallet.service';
import { AccountRepo } from 'src/repo/account/account.repo';

import { AccountService } from './account.service';
import {
  AmbossInfo,
  LoginInput,
  NewAccount,
  ReferralCode,
  RefreshToken,
  SignUpInput,
  User,
  UserSwapInfo,
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
  amboss() {
    const ambossConfig = this.config.get('amboss');

    if (!ambossConfig) return;

    return {};
  }
}

@Resolver(AmbossInfo)
export class AmbossInfoResolver {
  constructor(
    private ambossService: AmbossService,
    private accountRepo: AccountRepo,
  ) {}

  @ResolveField()
  id(@CurrentUser() { user_id }: any) {
    return user_id;
  }

  @ResolveField()
  async referral_codes(
    @CurrentUser() { user_id }: any,
  ): Promise<ReferralCode[] | void> {
    const account = await this.accountRepo.findOneById(user_id);

    if (!account) return [];

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
    const account = await this.accountRepo.findOne(input.email);

    if (!account) {
      throw new GraphQLError('Invalid email or password.');
    }

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
  async checkPassword(
    @Args('password') password: string,
    @CurrentUser() { user_id }: any,
  ) {
    const account = await this.accountRepo.findOneById(user_id);

    if (!account) {
      throw new GraphQLError('Error validating account.');
    }

    const verified = await this.cryptoService.argon2Verify(
      account.master_password_hash,
      password,
    );

    if (!verified) {
      throw new GraphQLError('Invalid password.');
    }

    return true;
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
    const { can_signup, using_referral_code } =
      await this.ambossService.canSignup(input.email, input.referral_code);

    if (!can_signup && input.referral_code) {
      throw new GraphQLError(`Invalid referral code`);
    } else if (!can_signup) {
      throw new GraphQLError(`You are not subscribed`);
    }

    let newAccount: account | undefined;

    if (using_referral_code && input.referral_code) {
      newAccount = await this.createAccountWithReferralCode(
        input.referral_code,
        input,
      );
    } else {
      newAccount = await this.accountService.signUp(input);
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

  private async createAccountWithReferralCode(
    referralCode: string,
    input: SignUpInput,
  ) {
    return this.redlockService.using<account>(
      referralCode,
      async () => {
        const account = await this.accountService.signUp(input);

        await this.ambossService.useRefferalCode(referralCode, input.email);

        return account;
      },
      'Please try again later',
    );
  }
}
