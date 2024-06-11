import { Module } from '@nestjs/common';
import { LnurlService } from './lnurl.service';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

@Module({
  imports: [WalletRepoModule],
  providers: [LnurlService],
  exports: [LnurlService],
})
export class LnurlModule {}
