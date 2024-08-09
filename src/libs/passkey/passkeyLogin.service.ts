import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { AccountRepo } from 'src/repo/account/account.repo';
import { PasskeyRepository } from 'src/repo/passkey/passkey.repo';
import {
  base64urlToUint8Array,
  uint8ArrayToBase64url,
} from 'src/utils/crypto/crypto';

import { ConfigSchemaType } from '../config/validation';
import { CustomLogger, Logger } from '../logging';
import { RedisService } from '../redis/redis.service';
import {
  getLoginAuthenticationKey,
  getLoginRegistrationKey,
  getPasskeyId,
  REGISTRATION_TIMEOUT_IN_MS,
} from './passkey.utils';

@Injectable()
export class PasskeyLoginService {
  private rpName: string;
  private rpID: string;
  private origin: string;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private accountRepo: AccountRepo,
    private passkeyRepo: PasskeyRepository,
    @Logger(PasskeyLoginService.name) private logger: CustomLogger,
  ) {
    const webauthn =
      this.config.getOrThrow<ConfigSchemaType['webauthn']>('webauthn');

    this.rpName = webauthn.name;
    this.rpID = webauthn.id;
    this.origin = webauthn.origin;
  }

  async generateRegistrationOptions(account_id: string): Promise<string> {
    const account = await this.accountRepo.findOneByIdWithPasskeys(account_id);

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
        excludeCredentials: account.account_passkey.map((p) => {
          return { id: p.payload.id, transports: p.payload.transports };
        }),
        authenticatorSelection: {
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: REGISTRATION_TIMEOUT_IN_MS,
      });

    await this.redis.set(getLoginRegistrationKey(account_id), options, {
      ttl: (options.timeout || REGISTRATION_TIMEOUT_IN_MS) / 1000,
    });

    return JSON.stringify(options);
  }

  async generateAuthenticationOptions(account_id: string, passkey_id: string) {
    const account = await this.accountRepo.findOneByIdWithPasskeys(account_id);

    if (!account) {
      throw new GraphQLError('Account not found');
    }

    const filtered = account.account_passkey.filter((p) => p.id === passkey_id);

    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({
        rpID: this.rpID,
        allowCredentials: filtered.map((p) => {
          return { id: p.payload.id, transports: p.payload.transports };
        }),
      });

    await this.redis.set(getLoginAuthenticationKey(account_id), options, {
      ttl: (options.timeout || REGISTRATION_TIMEOUT_IN_MS) / 1000,
    });

    return JSON.stringify(options);
  }

  async generateLoginAuthenticationOptions(session_id: string) {
    const options: PublicKeyCredentialRequestOptionsJSON =
      await generateAuthenticationOptions({ rpID: this.rpID });

    await this.redis.set(getLoginAuthenticationKey(session_id), options, {
      ttl: (options.timeout || REGISTRATION_TIMEOUT_IN_MS) / 1000,
    });

    return JSON.stringify(options);
  }

  async verifyRegistrationOptions(
    account_id: string,
    options: RegistrationResponseJSON,
  ) {
    const key = getLoginRegistrationKey(account_id);

    const savedOptions =
      await this.redis.get<PublicKeyCredentialCreationOptionsJSON>(key);

    if (!savedOptions) {
      throw new GraphQLError(
        'Unknown passkey authentication info. Please try to add the passkey again.',
      );
    }

    await this.redis.delete(key);

    const hasPRFCapabilities =
      (options.clientExtensionResults as any)?.prf?.enabled || false;

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

      await this.passkeyRepo.add({
        id: getPasskeyId(credentialID), // Turn into uuid so that we can query easily
        account_id,
        encryption_available: hasPRFCapabilities,
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
    options: AuthenticationResponseJSON,
  ): Promise<boolean> {
    const userHandle = options.response.userHandle;

    if (!userHandle) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const passkey = await this.passkeyRepo.getPasskeyByUserHandle(userHandle);

    if (!passkey) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const key = getLoginAuthenticationKey(passkey.account_id);

    const savedOptions =
      await this.redis.get<PublicKeyCredentialCreationOptionsJSON>(key);

    if (!savedOptions) {
      throw new GraphQLError(
        'Unknown passkey authentication info. Please try to login again.',
      );
    }

    await this.redis.delete(key);

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
        await this.passkeyRepo.updatePasskeyCounter(
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

  async verifyLoginAuthenticationOptions(
    session_id: string,
    options: AuthenticationResponseJSON,
  ): Promise<boolean> {
    const userHandle = options.response.userHandle;

    if (!userHandle) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const passkey = await this.passkeyRepo.getPasskeyByUserHandle(userHandle);

    if (!passkey) {
      throw new GraphQLError('Unknown user for authentication');
    }

    const key = getLoginAuthenticationKey(session_id);

    const savedOptions =
      await this.redis.get<PublicKeyCredentialCreationOptionsJSON>(key);

    if (!savedOptions) {
      throw new GraphQLError(
        'Unknown passkey authentication info. Please try to login again.',
      );
    }

    await this.redis.delete(key);

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
        await this.passkeyRepo.updatePasskeyCounter(
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
