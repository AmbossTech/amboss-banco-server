import { Module } from '@nestjs/common';
import { BoltzRestApi } from './boltz.rest';
import { BoltzWsService } from './boltz.service';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';
import { TransactionClaimPendingService } from './handlers/transactionClaimPending';

@Module({
  imports: [SwapsRepoModule],
  providers: [BoltzRestApi, BoltzWsService, TransactionClaimPendingService],
  exports: [BoltzRestApi, BoltzWsService],
})
export class BoltzRestModule {}
