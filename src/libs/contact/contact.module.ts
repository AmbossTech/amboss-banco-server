import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { LnurlModule } from '../lnurl/lnurl.module';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { BoltzRestModule } from '../boltz/boltz.module';

@Module({
  imports: [LnurlModule, ContactRepoModule, WalletRepoModule, BoltzRestModule],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactServiceModule {}
