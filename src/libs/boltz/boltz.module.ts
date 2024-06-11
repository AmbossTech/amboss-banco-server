import { Module } from '@nestjs/common';
import { BoltzRestApi } from './boltz.rest';
import { BoltzWsService } from './boltzWs.service';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { TransactionClaimPendingService } from './handlers/transactionClaimPending';
import { BoltzService } from './boltz.service';

@Module({
  imports: [SwapsRepoModule],
  providers: [
    BoltzRestApi,
    BoltzWsService,
    TransactionClaimPendingService,
    BoltzService,
  ],
  exports: [BoltzRestApi, BoltzWsService, BoltzService],
})
export class BoltzRestModule {}
