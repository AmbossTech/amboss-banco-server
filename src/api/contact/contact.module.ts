import { Module } from '@nestjs/common';
import {
  ContactMutationsResolver,
  MainContactResolver,
} from './contact.resolver';
import { ContactRepoModule } from 'src/repo/contact/contact.module';

@Module({
  imports: [ContactRepoModule],
  providers: [MainContactResolver, ContactMutationsResolver],
})
export class ContactModule {}
