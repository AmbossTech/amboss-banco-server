import { Module } from '@nestjs/common';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { MailService } from './mail.service';

@Module({
  imports: [AccountRepoModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
