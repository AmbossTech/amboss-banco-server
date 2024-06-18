import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.getOrThrow<string>(
            'server.jwt.accessSecret',
          ),
          expiresIn: '10m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.getOrThrow<string>(
            'server.jwt.refreshSecret',
          ),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
