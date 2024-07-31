import { Controller, Sse } from '@nestjs/common';
import { CurrentUser } from 'src/auth/auth.decorators';
import { CustomLogger, Logger } from 'src/libs/logging';

import { EventsService } from './sse.service';
import { EventTypes } from './sse.utils';

@Controller('events')
export class EventsController {
  constructor(
    private eventsService: EventsService,
    @Logger('EventsController') private logger: CustomLogger,
  ) {}

  @Sse('contacts')
  events(@CurrentUser() { user_id }: any) {
    this.logger.debug('Subscribing to messages', { user_id });
    return this.eventsService.subscribe(EventTypes.contacts(user_id));
  }

  @Sse('payments')
  payments(@CurrentUser() { user_id }: any) {
    this.logger.debug('Subscribing to payments', { user_id });
    return this.eventsService.subscribe(EventTypes.payments(user_id));
  }
}
