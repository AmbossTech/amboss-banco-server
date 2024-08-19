import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { MailModule } from '../mail/mail.module';
import { WalletService } from './wallet.service';

@Module({
  imports: [WalletRepoModule, MailModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletServiceModule {}
