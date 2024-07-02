import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hexToBytes } from '@noble/hashes/utils';
import { hash, verify } from '@node-rs/argon2';
import { nip44 } from 'nostr-tools';

import { ConfigSchemaType } from '../config/validation';
import { CustomLogger, Logger } from '../logging';
import { ARGON_DEFAULTS } from './crypto.utils';

@Injectable()
export class CryptoService {
  encryptionKey;

  constructor(
    private config: ConfigService,
    @Logger('CryptoService') private logger: CustomLogger,
  ) {
    this.encryptionKey = this.config.getOrThrow<
      ConfigSchemaType['server']['encryptionKey']
    >('server.encryptionKey');
  }

  async argon2Hash(password: string): Promise<string> {
    return hash(password, {
      memoryCost: ARGON_DEFAULTS.memory,
      timeCost: ARGON_DEFAULTS.iterations,
      outputLen: ARGON_DEFAULTS.hash_length,
      parallelism: ARGON_DEFAULTS.parallelism,
    });
  }

  async argon2Verify(hash: string, password: string): Promise<boolean> {
    return verify(hash, password);
  }

  encryptString(str: string): string {
    try {
      return nip44.v2.encrypt(str, hexToBytes(this.encryptionKey));
    } catch (error) {
      this.logger.error('Error encrypting string', { error });
      return '';
    }
  }

  decryptString(str: string): string {
    try {
      return nip44.v2.decrypt(str, hexToBytes(this.encryptionKey));
    } catch (error) {
      this.logger.error('Error decrypting string', { error });
      return '';
    }
  }
}
