import { Module } from '@nestjs/common';

import { EventsController } from './sse.controller';
import { EventsService } from './sse.service';

@Module({
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
