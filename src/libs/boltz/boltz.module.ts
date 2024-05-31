import { Module } from '@nestjs/common';
import { BoltzRestApi } from './boltz.rest';

@Module({
  providers: [BoltzRestApi],
  exports: [BoltzRestApi],
})
export class BoltzRestModule {}
