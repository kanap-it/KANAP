import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoaTemplate } from './coa-template.entity';
import { AdminCoaTemplatesService } from './admin-coa-templates.service';
import { AdminCoaTemplatesController } from './admin-coa-templates.controller';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([CoaTemplate]), AuditModule],
  providers: [AdminCoaTemplatesService, PlatformAdminGuard],
  controllers: [AdminCoaTemplatesController],
  exports: [TypeOrmModule],
})
export class AdminCoaTemplatesModule {}
