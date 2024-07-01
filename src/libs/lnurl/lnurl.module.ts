import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { BoltzRestModule } from '../boltz/boltz.module';
import { LiquidModule } from '../liquid/liquid.module';
import { LnurlService } from './lnurl.service';

@Module({
  imports: [WalletRepoModule, BoltzRestModule, LiquidModule],
  providers: [LnurlService],
  exports: [LnurlService],
})
export class LnurlModule {}
