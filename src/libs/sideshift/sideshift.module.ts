import { Module } from '@nestjs/common';
import { SideShiftService } from './sideshift.service';
import { SideShiftRestService } from './sideshift.rest';
import { SwapsRepoModule } from 'src/repo/swaps/swaps.module';

@Module({
  imports: [SwapsRepoModule],
  providers: [SideShiftService, SideShiftRestService],
  exports: [SideShiftService],
})
export class SideShiftModule {}
