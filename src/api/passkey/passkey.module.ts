import { Module } from '@nestjs/common';
import { AuthModule } from 'src/libs/auth/auth.module';
import { PasskeyModule as PasskeyServiceModule } from 'src/libs/passkey/passkey.module';
import { PasskeyRepoModule } from 'src/repo/passkey/passkey.module';

import { AccountModule } from '../account/account.module';
import {
  PasskeyLoginMutationsResolver,
  PasskeyMainMutationResolver,
  PasskeyMainQueryResolver,
  PasskeyMutationsResolver,
  PasskeyQueriesResolver,
  SimplePasskeyResolver,
} from './passkey.resolver';

@Module({
  imports: [PasskeyRepoModule, PasskeyServiceModule, AuthModule, AccountModule],
  providers: [
    PasskeyMainMutationResolver,
    PasskeyMutationsResolver,
    PasskeyMainQueryResolver,
    PasskeyQueriesResolver,
    SimplePasskeyResolver,
    PasskeyLoginMutationsResolver,
  ],
})
export class PasskeyModule {}
