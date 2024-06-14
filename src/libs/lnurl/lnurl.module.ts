import { Module } from '@nestjs/common';
import { LnurlService } from './lnurl.service';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { BoltzRestModule } from '../boltz/boltz.module';
import { LiquidModule } from '../liquid/liquid.module';

@Module({
  imports: [WalletRepoModule, BoltzRestModule, LiquidModule],
  providers: [LnurlService],
  exports: [LnurlService],
})
export class LnurlModule {}
