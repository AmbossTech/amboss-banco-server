import { Module } from '@nestjs/common';
import { LnurlService } from './lnurl.service';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

@Module({
  imports: [ContactRepoModule, WalletRepoModule],
  providers: [LnurlService],
  exports: [LnurlService],
})
export class LnurlModule {}
