import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './supplier.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersDeleteService } from './suppliers-delete.service';
import { SuppliersController } from './suppliers.controller';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { forwardRef } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SupplierContactLink } from '../contacts/supplier-contact.entity';
import { ExternalContact } from '../contacts/external-contact.entity';
import { SupplierContactsService } from './supplier-contacts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierContactLink, ExternalContact]), AuditModule, PermissionsModule, forwardRef(() => UsersModule), CommonModule],
  providers: [SuppliersService, SuppliersDeleteService, SupplierContactsService],
  controllers: [SuppliersController],
  exports: [SupplierContactsService],
})
export class SuppliersModule {}
