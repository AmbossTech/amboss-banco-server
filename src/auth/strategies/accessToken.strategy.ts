import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { getAuthToken } from 'src/utils/auth';

type JwtPayload = {
  sub: string;
  username: string;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => getAuthToken(req),
      secretOrKey: configService.getOrThrow<string>('auth.jwtAccessSecret'),
    });
  }

  validate(payload: JwtPayload) {
    return { user_id: payload.sub };
  }
}
