import { Module } from '@nestjs/common';

import { FiatModule } from '../fiat/fiat.module';
import { DataloaderService } from './dataloader.service';

@Module({
  imports: [FiatModule],
  providers: [DataloaderService],
  exports: [DataloaderService],
})
export class DataloaderModule {}
