import { Module } from '@nestjs/common';
import { SideShiftService } from './sideshift.service';
import { SideShiftRestService } from './sideshift.rest';

@Module({
  providers: [SideShiftService, SideShiftRestService],
  exports: [SideShiftService],
})
export class SideShiftModule {}
