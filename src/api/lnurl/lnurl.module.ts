import { Module } from '@nestjs/common';
import {
  LnUrlController,
  MessageController,
  WellKnownController,
} from './lnurl.controller';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { ContactRepoModule } from 'src/repo/contact/contact.module';

@Module({
  imports: [WalletRepoModule, BoltzRestModule, LnurlModule, ContactRepoModule],
  controllers: [WellKnownController, LnUrlController, MessageController],
})
export class LnUrlModule {}
