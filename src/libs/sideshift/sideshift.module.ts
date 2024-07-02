import { Module } from '@nestjs/common';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

import { SideShiftRestService } from './sideshift.rest';
import { SideShiftService } from './sideshift.service';

@Module({
  imports: [SwapsRepoModule],
  providers: [SideShiftService, SideShiftRestService],
  exports: [SideShiftService],
})
export class SideShiftModule {}
