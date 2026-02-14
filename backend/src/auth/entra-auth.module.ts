import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntraAuthService } from './entra-auth.service';

@Module({
  imports: [ConfigModule],
  providers: [EntraAuthService],
  exports: [EntraAuthService],
})
export class EntraAuthModule {}

