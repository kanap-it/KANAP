import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PermissionGuard } from './permission.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { BillingModule } from '../billing/billing.module';
import { EmailModule } from '../email/email.module';
import { CurrencyModule } from '../currency/currency.module';
import { TenantsModule } from '../tenants/tenants.module';
import { EntraAuthModule } from './entra-auth.module';
import { EntraController } from './entra.controller';
import { AdminAuthController } from './admin-auth.controller';
import { RefreshToken } from './refresh-token.entity';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
    PermissionsModule,
    BillingModule,
    EmailModule,
    CurrencyModule,
    TenantsModule,
    EntraAuthModule,
  ],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PermissionGuard, RateLimitGuard],
  controllers: [AuthController, EntraController, AdminAuthController],
  exports: [JwtAuthGuard, RolesGuard, PermissionGuard, AuthService],
})
export class AuthModule {}
