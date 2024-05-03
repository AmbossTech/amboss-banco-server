import { Module } from '@nestjs/common';
import { GeneralResolvers } from './general.resolver';

@Module({
  providers: [GeneralResolvers],
})
export class GeneralModule {}
