import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { GraphQLError } from 'graphql';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { MailService } from 'src/libs/mail/mail.service';
import { AccountRepo } from 'src/repo/account/account.repo';
import { NewAccountType } from 'src/repo/account/account.types';

import { SignUpInput } from './account.types';

@Injectable()
export class AccountService {
  private domain: string;

  constructor(
    private accountRepo: AccountRepo,
    private cryptoService: CryptoService,
    private config: ConfigService,
    private mailService: MailService,
    @Logger('AccountService') private logger: CustomLogger,
  ) {
    this.domain = this.config.getOrThrow('server.cookies.domain');
  }

  async signUp(input: SignUpInput) {
    const account = await this.accountRepo.findOne(input.email);

    if (!!account) {
      throw new GraphQLError('Account already exists');
    }

    const passwordHash = await this.cryptoService.argon2Hash(
      input.master_password_hash,
    );

    const accountInfo: NewAccountType = {
      email: input.email,
      master_password_hash: passwordHash,
      password_hint: input.password_hint,
      protected_symmetric_key: input.protected_symmetric_key,
      secp256k1_key_pair: {
        public_key: input.secp256k1_key_pair.public_key,
        protected_private_key: input.secp256k1_key_pair.protected_private_key,
      },
    };

    const newAccount = await this.accountRepo.create(accountInfo);

    this.logger.debug('New account created', { accountInfo });

    await this.mailService.sendSignupMail({
      to: accountInfo.email,
      passwordHint: accountInfo.password_hint,
    });

    return newAccount;
  }

  async setLoginCookies(
    res: Response,
    accountId: string,
    accessToken: string,
    refreshToken: string,
  ) {
    const hashedRefreshToken =
      await this.cryptoService.argon2Hash(refreshToken);

    await this.accountRepo.updateRefreshToken(accountId, hashedRefreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: this.domain.includes('localhost') ? undefined : true,
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
  }
}
