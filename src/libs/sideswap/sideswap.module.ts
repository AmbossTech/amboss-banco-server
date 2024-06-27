import { Module } from '@nestjs/common';
import { SideSwapRestApi } from './sideswap.rest';
import { SideSwapService } from './sideswap.service';

@Module({
  providers: [SideSwapRestApi, SideSwapService],
  exports: [SideSwapService],
})
export class SideSwapModule {}
