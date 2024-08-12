import { Module } from '@nestjs/common';
import { PasskeyModule } from 'src/libs/passkey/passkey.module';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { AccountModule } from '../account/account.module';
import {
  SimpleTwoFactorResolver,
  TwoFactorLoginMutationsResolver,
  TwoFactorMainMutationResolver,
  TwoFactorMainQueryResolver,
  TwoFactorMutationsResolver,
  TwoFactorQueriesResolver,
} from './2fa.resolver';
import { TwoFactorService } from './2fa.service';
import { TwoFactorOTPMutationsResolver } from './otp/otp.resolver';
import {
  TwoFactorPasskeyLoginMutationsResolver,
  TwoFactorPasskeyMutationsResolver,
} from './passkey/passkey.resolver';

@Module({
  imports: [
    AccountModule,
    TwoFactorRepoModule,
    AccountRepoModule,
    PasskeyModule,
  ],
  providers: [
    TwoFactorMutationsResolver,
    TwoFactorMainMutationResolver,
    TwoFactorMainQueryResolver,
    TwoFactorService,
    TwoFactorQueriesResolver,
    SimpleTwoFactorResolver,
    TwoFactorOTPMutationsResolver,
    TwoFactorLoginMutationsResolver,
    TwoFactorPasskeyMutationsResolver,
    TwoFactorPasskeyLoginMutationsResolver,
  ],
})
export class TwoFactorModule {}
