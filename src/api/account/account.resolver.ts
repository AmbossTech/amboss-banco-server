import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  LoginInput,
  NewAccount,
  RefreshToken,
  SignUpInput,
  User,
} from './account.types';
import { AccountService } from './account.service';
import { AuthService } from 'src/libs/auth/auth.service';
import { AccountRepo } from 'src/repo/account/account.repo';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { CookieOptions, Response } from 'express';
import { CurrentUser, Public, SkipAccessCheck } from 'src/auth/auth.decorators';
import { UseGuards } from '@nestjs/common';
import { RefreshTokenGuard } from 'src/auth/guards/refreshToken.guard';
import { GraphQLError } from 'graphql';

@Resolver(User)
export class UserResolver {
  constructor(private accountRepo: AccountRepo) {}

  @ResolveField()
  async default_wallet_id(
    @CurrentUser() { user_id }: any,
  ): Promise<string | null> {
    const account = await this.accountRepo.findOneByIdWithWalletIds(user_id);

    if (!account?.wallets.length) return null;

    return account.wallets[0].wallet_id;
  }
}

@Resolver()
export class AccountResolver {
  constructor(
    private accountRepo: AccountRepo,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private accountService: AccountService,
  ) {}

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
    const newAccount = await this.accountService.signUp(input);

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
    };

    res.cookie('amboss_banco_refresh_token', refreshToken, cookieOptions);
    res.cookie('amboss_banco_access_token', accessToken, cookieOptions);

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

    // const hashedRefreshToken =
    //   await this.cryptoService.argon2Hash(refreshToken);

    // await this.accountRepo.updateRefreshToken(user_id, hashedRefreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: true,
    };

    // res.cookie('amboss_banco_refresh_token', refreshToken, cookieOptions);
    res.cookie('amboss_banco_access_token', accessToken, cookieOptions);

    return {
      id: user_id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
