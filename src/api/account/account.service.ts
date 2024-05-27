import { Injectable } from '@nestjs/common';
import { SignUpInput } from './account.types';
import { AccountRepo } from 'src/repo/account/account.repo';
import { GraphQLError } from 'graphql';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { NewAccountType } from 'src/repo/account/account.types';
import { CustomLogger, Logger } from 'src/libs/logging';

@Injectable()
export class AccountService {
  constructor(
    private accountRepo: AccountRepo,
    private cryptoService: CryptoService,
    @Logger('AccountService') private logger: CustomLogger,
  ) {}

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
      symmetric_key_iv: input.symmetric_key_iv,
      protected_symmetric_key: input.protected_symmetric_key,
      secp256k1_key_pair: {
        public_key: input.secp256k1_key_pair.public_key,
        protected_private_key: input.secp256k1_key_pair.protected_private_key,
      },
    };

    const newAccount = await this.accountRepo.create(accountInfo);

    this.logger.debug('New account created', { accountInfo });

    return newAccount;
  }
}
