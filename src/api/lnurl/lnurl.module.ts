import { Module } from '@nestjs/common';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { LnurlModule } from 'src/libs/lnurl/lnurl.module';
import { ContactRepoModule } from 'src/repo/contact/contact.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { LnUrlController, WellKnownController } from './lnurl.controller';

@Module({
  imports: [
    LiquidModule,
    WalletRepoModule,
    BoltzRestModule,
    LnurlModule,
    ContactRepoModule,
  ],
  controllers: [WellKnownController, LnUrlController],
})
export class LnUrlModule {}
