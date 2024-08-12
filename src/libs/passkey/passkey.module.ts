import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { PasskeyService } from './passkey.service';
import { PasskeyTwoFactorService } from './passkeyTwoFactor.service';

@Module({
  imports: [AccountRepoModule, TwoFactorRepoModule],
  providers: [PasskeyService, PasskeyTwoFactorService],
  exports: [PasskeyService, PasskeyTwoFactorService],
})
export class PasskeyModule {}
