import { Module } from '@nestjs/common';
import { ContactRepoService } from './contact.repo';

@Module({
  providers: [ContactRepoService],
  exports: [ContactRepoService],
})
export class ContactRepoModule {}
