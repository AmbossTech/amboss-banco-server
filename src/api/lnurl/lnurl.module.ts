import { Module } from '@nestjs/common';
import { LnUrlController, WellKnownController } from './lnurl.controller';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import { BoltzRestModule } from 'src/libs/boltz/boltz.module';

@Module({
  imports: [WalletRepoModule, BoltzRestModule],
  controllers: [WellKnownController, LnUrlController],
})
export class LnUrlModule {}
