import { Module } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  providers: [SocialAccountsService],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}