import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { PasskeyTwoFactorService } from './passkeyTwoFactor.service';

@Module({
  imports: [AccountRepoModule, TwoFactorRepoModule],
  providers: [PasskeyTwoFactorService],
  exports: [PasskeyTwoFactorService],
})
export class PasskeyModule {}
