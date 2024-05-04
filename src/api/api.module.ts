import { Module } from '@nestjs/common';
import { GeneralModule } from './general/general.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [GeneralModule, AccountModule],
})
export class ApiModule {}
