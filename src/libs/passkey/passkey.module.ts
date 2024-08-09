import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';
import { PasskeyRepoModule } from 'src/repo/passkey/passkey.module';

import { PasskeyService } from './passkey.service';
import { PasskeyLoginService } from './passkeyLogin.service';
import { PasskeyTwoFactorService } from './passkeyTwoFactor.service';

@Module({
  imports: [AccountRepoModule, TwoFactorRepoModule, PasskeyRepoModule],
  providers: [PasskeyService, PasskeyTwoFactorService, PasskeyLoginService],
  exports: [PasskeyService, PasskeyTwoFactorService, PasskeyLoginService],
})
export class PasskeyModule {}
