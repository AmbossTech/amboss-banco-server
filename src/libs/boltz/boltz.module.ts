import { Module } from '@nestjs/common';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

import { RedlockModule } from '../redlock/redlock.module';
import { BoltzRestApi } from './boltz.rest';
import { BoltzService } from './boltz.service';
import { BoltzWsService } from './boltzWs.service';
import { TransactionClaimPendingService } from './handlers/transactionClaimPending';

@Module({
  imports: [SwapsRepoModule, RedlockModule],
  providers: [
    BoltzRestApi,
    BoltzWsService,
    TransactionClaimPendingService,
    BoltzService,
  ],
  exports: [BoltzRestApi, BoltzService],
})
export class BoltzRestModule {}
