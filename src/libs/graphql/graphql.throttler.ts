import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    if (context.getType() == 'http') {
      const { getRequest, getResponse } = context.switchToHttp();
      return { req: getRequest(), res: getResponse() };
    }

    const gqlCtx = GqlExecutionContext.create(context);
    const { req, res } = gqlCtx.getContext();
    return { req, res };
  }
}
