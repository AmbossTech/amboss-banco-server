import { Injectable } from '@nestjs/common';
import { fromEvent } from 'rxjs';
import { EventEmitter } from 'events';

@Injectable()
export class EventsService {
  private readonly emitter = new EventEmitter();

  subscribe(channel: string) {
    return fromEvent(this.emitter, channel);
  }

  emit(channel: string, data?: object) {
    this.emitter.emit(channel, { data });
  }
}
