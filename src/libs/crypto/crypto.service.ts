import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { ARGON_DEFAULTS } from './crypto.utils';

@Injectable()
export class CryptoService {
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
}
