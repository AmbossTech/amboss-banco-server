import { Module } from '@nestjs/common';

import { PasskeyRepository } from './passkey.repo';

@Module({
  providers: [PasskeyRepository],
  exports: [PasskeyRepository],
})
export class PasskeyRepoModule {}
