import { Injectable } from '@nestjs/common';
import { account, two_fa_method } from '@prisma/client';
import { auto } from 'async';
import { GraphQLError } from 'graphql';
import { Secret, TOTP } from 'otpauth';
import { generateOtpSecret } from 'src/libs/crypto/crypto.utils';
import { RedisService } from 'src/libs/redis/redis.service';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';

import { OTPVerifyAuto, TwoFactorPendingVerify } from './2fa.types';
import { twoFactorPendingKey } from './2fa.utils';

export const baseTotp = {
  issuer: 'BancoLibre',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
};

@Injectable()
export class TwoFactorService {
  constructor(
    private twoFactorRepo: TwoFactorRepository,
    private redisService: RedisService,
  ) {}

  async validOTP(
    accountId: string,
    token: string,
    secret?: string,
  ): Promise<boolean> {
    return auto<OTPVerifyAuto>({
      getSecret: async (): Promise<OTPVerifyAuto['getSecret']> => {
        if (secret) return secret;

        const otp = await this.twoFactorRepo.get(accountId, two_fa_method.OTP);

        if (!otp) {
          throw new GraphQLError(`Could not verify token`);
        }

        const { payload } = otp;
        if (payload.type !== 'OTP') {
          throw new GraphQLError(`Could not verify token`);
        }

        return payload.otpSecret;
      },
      verifyToken: [
        'getSecret',
        async ({
          getSecret,
        }: Pick<OTPVerifyAuto, 'getSecret'>): Promise<
          OTPVerifyAuto['verifyToken']
        > => {
          const totp = new TOTP({
            secret: Secret.fromBase32(getSecret),
            ...baseTotp,
          });

          const delta = totp.validate({ token });

          return delta != null ? true : false;
        },
      ],
    }).then((res) => res.verifyToken);
  }

  async setupOTP(
    account: account,
  ): Promise<{ secret: string; authUrl: string }> {
    const methods = await this.twoFactorRepo.getMethodsByAccount(account.id);

    const otpRecord = methods.find((f) => f.method === two_fa_method.OTP);

    if (otpRecord && !otpRecord.enabled) {
      throw new GraphQLError(`OTP is already created`);
    }
    if (otpRecord && otpRecord.enabled) {
      throw new GraphQLError(`OTP is already enabled`);
    }

    const cached = await this.redisService.get<TwoFactorPendingVerify>(
      twoFactorPendingKey(account.id, 'OTP'),
    );

    if (!!cached) {
      if (cached.type === 'OTP') {
        return {
          secret: cached.secret,
          authUrl: cached.url,
        };
      }
    }

    const secret = generateOtpSecret();

    const totp = new TOTP({
      label: account.email,
      secret: Secret.fromHex(secret),
      ...baseTotp,
    });

    const base32Secret = totp.secret.base32;

    const payload = { secret: base32Secret, url: totp.toString() };

    await this.redisService.set<TwoFactorPendingVerify>(
      twoFactorPendingKey(account.id, 'OTP'),
      {
        type: 'OTP',
        ...payload,
      },
      { ttl: 10 * 60 },
    );

    return { secret: payload.secret, authUrl: payload.url };
  }
}
