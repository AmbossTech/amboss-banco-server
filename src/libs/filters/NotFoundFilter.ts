import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Catch(NotFoundException)
export class NotFoundFilter<T extends NotFoundException>
  implements ExceptionFilter
{
  constructor(private config: ConfigService) {}

  catch(exception: T, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const redirectUrl = this.config.get('server.fallbackRedirectUrl');

    if (!!redirectUrl) {
      response.redirect(redirectUrl);
    } else {
      response.status(exception.getStatus()).send(exception.getResponse());
    }
  }
}
