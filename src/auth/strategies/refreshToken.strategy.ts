import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAuthToken } from 'src/utils/auth';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => getAuthToken(req),
      secretOrKey: configService.getOrThrow<string>('auth.jwtRefreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const refresh_token =
      req.get('Authorization')?.replace('Bearer', '').trim() || '';

    return { user_id: payload.sub, refresh_token };
  }
}
