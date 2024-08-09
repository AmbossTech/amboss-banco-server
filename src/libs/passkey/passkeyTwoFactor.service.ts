import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { two_fa_method } from '@prisma/client';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { GraphQLError } from 'graphql';
import { TwoFactorRepository } from 'src/repo/2fa/2fa.repo';
import { AccountRepo } from 'src/repo/account/account.repo';
import {
  base64urlToUint8Array,
  uint8ArrayToBase64url,
} from 'src/utils/crypto/crypto';
import { fetch } from 'undici';

import { ConfigSchemaType } from '../config/validation';
import { CustomLogger, Logger } from '../logging';
import { RedisService } from '../redis/redis.service';
import {
  AAGUID_JSON_URL,
  getPasskeyId,
  getTwoFactorAuthenticationKey,
  getTwoFactorRegistrationKey,
  REGISTRATION_TIMEOUT_IN_MS,
} from './passkey.utils';

@Injectable()
export class PasskeyTwoFactorService implements OnModuleInit {
  private rpName: string;
  private rpID: string;
  private origin: string;
  private aaguidJson: { [key: string]: { name: string } } = {};

  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private accountRepo: AccountRepo,
    private twoFactorRepo: TwoFactorRepository,
    @Logger(PasskeyTwoFactorService.name) private logger: CustomLogger,
  ) {
    const webauthn =
      this.config.getOrThrow<ConfigSchemaType['webauthn']>('webauthn');

    this.rpName = webauthn.name;
    this.rpID = webauthn.id;
    this.origin = webauthn.origin;
  }

  async onModuleInit() {
    const isProduction = this.config.get<boolean>('isProduction');
    if (!isProduction) return;

    try {
      this.aaguidJson = await fetch(AAGUID_JSON_URL).then(
        (res) => res.json() as any,
      );
    } catch (error) {
      this.logger.error('Error fetching AAGUID JSON array');
    }
  }

  async getPasskeyInfo(aaguid: string | undefined) {
    return this.aaguidJson[aaguid || ''] || { name: 'Passkey' };
  }

  async generateRegistrationOptions(account_id: string): Promise<string> {
    const account = await this.accountRepo.findOneByIdWithTwoFactor(account_id);

    if (!account) {
      throw new GraphQLError('Account not found');
    }

    const options: PublicKeyCredentialCreationOptionsJSON =
      await generateRegistrationOptions({
        rpName: this.rpName,
        rpID: this.rpID,
        userDisplayName: account.email.toLowerCase(),
        userName: account.email.toLowerCase(),
        attestationType: 'direct',
        excludeCredentials: account.account_2fa.reduce((p, t) => {
          if (t.payload.type !== 'PASSKEY') return p;
          return [...p, { id: t.payload.id, transports: t.payload.transports }];
        }, []),
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'required',
        },
        // {
        //     requireResidentKey: true,
        //     residentKey: 'required',
        //     userVerification: 'required',
        //   },
        timeout: REGISTRATION_TIMEOUT_IN_MS,
      });

    await this.redis.set(getTwoFactorRegistrationKey(account_id), options, {
      ttl: (options.timeout || REGISTRATION_TIMEOUT_IN_MS) / 1000,
    });

    return JSON.stringify(options);
  }

  async generateAuthenticationOptions(account_id: string) {
    const account = await this.accountRepo.findOneByIdWithTwoFactor(account_id);

    if (!account) {
      throw new GraphQLError('Account not found');
    }

    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID: this.rpID,
        allowCredentials: account.account_2fa.reduce((p, t) => {
          if (t.payload.type !== 'PASSKEY') return p;
          return [...p, { id: t.payload.id, transports: t.payload.transports }];
        }, []),
      });

    await this.redis.set(getTwoFactorAuthenticationKey(account_id), options, {
      ttl: (options.timeout || REGISTRATION_TIMEOUT_IN_MS) / 1000,
    });

    return JSON.stringify(options);
  }

  async verifyRegistrationOptions(
    account_id: string,
    options: RegistrationResponseJSON,
  ) {
    const key = getTwoFactorRegistrationKey(account_id);

    const savedOptions =
      await this.redis.get<PublicKeyCredentialCreationOptionsJSON>(key);

    await this.redis.delete(key);

    if (!savedOptions) {
      throw new GraphQLError(
        'Unknown passkey authentication info. Please try to add the passkey again.',
      );
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: options,
        expectedChallenge: savedOptions.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new GraphQLError(
          'Unable to authenticate passkey. Please try to add the passkey again.',
        );
      }

      const {
        credentialID,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp,
        aaguid,
      } = verification.registrationInfo;

      await this.twoFactorRepo.add({
        id: getPasskeyId(credentialID), // Turn into uuid so that we can query easily
        account_id,
        method: two_fa_method.PASSKEY,
        payload: {
          type: 'PASSKEY',
          id: credentialID,
          aaguid,
          webAuthnUserID: savedOptions.user.id,
          publicKey: uint8ArrayToBase64url(credentialPublicKey),
          counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: options.response.transports,
        },
      });

      return verification.verified;
    } catch (error) {
      this.logger.debug('Error verifying passkey', { error });
      throw new GraphQLError(
        'Invalid passkey authentication. Please try to add the passkey again.',
      );
    }
  }

  async verifyAuthenticationOptions(
    account_id: string,
    options: AuthenticationResponseJSON,
  ): Promise<boolean> {
    const key = getTwoFactorAuthenticationKey(account_id);

    const savedOptions =
      await this.redis.get<PublicKeyCredentialCreationOptionsJSON>(key);

    await this.redis.delete(key);

    if (!savedOptions) {
      throw new GraphQLError(
        'Unknown passkey authentication info. Please try to login again.',
      );
    }

    const passkey = await this.twoFactorRepo.getPasskeyById(
      getPasskeyId(options.id),
    );

    if (!passkey) {
      throw new GraphQLError('Unknown passkey. Please try to login again.');
    }

    if (passkey.payload.type !== 'PASSKEY') {
      throw new GraphQLError('Unknown passkey. Please try to login again.');
    }

    const { publicKey, counter, transports } = passkey.payload;

    try {
      const verification = await verifyAuthenticationResponse({
        response: options,
        expectedChallenge: savedOptions.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: passkey.payload.id,
          credentialPublicKey: base64urlToUint8Array(publicKey),
          counter,
          transports,
        },
      });

      if (verification.verified) {
        await this.twoFactorRepo.updatePasskeyCounter(
          passkey.id,
          verification.authenticationInfo.newCounter,
        );
      }

      return verification.verified;
    } catch (error) {
      this.logger.debug('Error verifying passkey', { error });
      throw new GraphQLError(
        'Invalid passkey authentication. Please try to add the passkey again.',
      );
    }
  }
}
