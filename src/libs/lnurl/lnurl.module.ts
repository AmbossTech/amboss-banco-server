import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { BoltzRestModule } from '../boltz/boltz.module';
import { LiquidModule } from '../liquid/liquid.module';
import { LnUrlIsomorphicService } from './handlers/isomorphic.service';
import { LnUrlLocalService } from './handlers/local.service';
import { LnUrlRemoteService } from './handlers/remote.service';

@Module({
  imports: [WalletRepoModule, BoltzRestModule, LiquidModule],
  providers: [LnUrlLocalService, LnUrlRemoteService, LnUrlIsomorphicService],
  exports: [LnUrlLocalService, LnUrlRemoteService, LnUrlIsomorphicService],
})
export class LnurlModule {}
