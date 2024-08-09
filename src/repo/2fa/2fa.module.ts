import { Module } from '@nestjs/common';

import { TwoFactorRepository } from './2fa.repo';

@Module({
  providers: [TwoFactorRepository],
  exports: [TwoFactorRepository],
})
export class TwoFactorRepoModule {}
