import { Controller, Get, Header } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/auth/auth.decorators';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Content-Type', 'application/json')
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.prismaHealth.pingCheck('prisma', this.prisma),
    ]);
  }
}
