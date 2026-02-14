import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreezeState } from './freeze-state.entity';
import { FreezeService } from './freeze.service';
import { FreezeController } from './freeze.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { CurrencyModule } from '../currency/currency.module';
import { SpendVersion } from '../spend/spend-version.entity';
import { CapexVersion } from '../capex/capex-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FreezeState, SpendVersion, CapexVersion]),
    PermissionsModule,
    forwardRef(() => UsersModule),
    CurrencyModule,
  ],
  providers: [FreezeService],
  controllers: [FreezeController],
  exports: [FreezeService],
})
export class FreezeModule {}
