import { Module } from '@nestjs/common';

import { SwapsRepoService } from './swaps.repo';

@Module({
  providers: [SwapsRepoService],
  exports: [SwapsRepoService],
})
export class SwapsRepoModule {}
