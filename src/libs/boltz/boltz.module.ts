import { Module } from '@nestjs/common';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

import { MempoolModule } from '../mempool/mempool.module';
import { BoltzRestApi } from './boltz.rest';
import { BoltzService } from './boltz.service';
import { BoltzWsService } from './boltzWs.service';
import { BoltzPendingBitcoinHandler } from './handlers/bitcoin.handler';
import { BoltzPendingLiquidHandler } from './handlers/liquid.handler';
import { TransactionClaimPendingService } from './handlers/transactionClaimPending';

@Module({
  imports: [SwapsRepoModule, MempoolModule],
  providers: [
    BoltzRestApi,
    BoltzWsService,
    TransactionClaimPendingService,
    BoltzService,
    BoltzPendingBitcoinHandler,
    BoltzPendingLiquidHandler,
  ],
  exports: [BoltzRestApi, BoltzService],
})
export class BoltzRestModule {}
