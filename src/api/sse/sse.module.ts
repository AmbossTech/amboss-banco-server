import { Module } from '@nestjs/common';
import { EventsService } from './sse.service';
import { EventsController } from './sse.controller';

@Module({
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
