import { Module } from '@nestjs/common';
import { EventsModule } from 'src/api/sse/sse.module';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { BoltzRestModule } from '../boltz/boltz.module';
import { LnurlModule } from '../lnurl/lnurl.module';
import { ContactService } from './contact.service';

@Module({
  imports: [
    EventsModule,
    LnurlModule,
    ContactRepoModule,
    WalletRepoModule,
    BoltzRestModule,
  ],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactServiceModule {}
