import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { PasskeyService } from './passkey.service';

@Module({
  imports: [AccountRepoModule, TwoFactorRepoModule],
  providers: [PasskeyService],
  exports: [PasskeyService],
})
export class PasskeyModule {}
