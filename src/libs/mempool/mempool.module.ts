import { Module } from '@nestjs/common';

import { MempoolService } from './mempool.service';

@Module({
  providers: [MempoolService],
  exports: [MempoolService],
})
export class MempoolModule {}
