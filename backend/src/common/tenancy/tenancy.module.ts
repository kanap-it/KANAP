import { Global, Module } from '@nestjs/common';
import { TenancyManager } from './tenancy.manager';

/**
 * Global module that provides the TenancyManager service.
 * This module is marked as global so that TenancyManager can be injected
 * anywhere in the application without explicitly importing this module.
 */
@Global()
@Module({
  providers: [TenancyManager],
  exports: [TenancyManager],
})
export class TenancyModule {}
