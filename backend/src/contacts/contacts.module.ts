import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalContact } from './external-contact.entity';
import { SupplierContactLink } from './supplier-contact.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { ContactsDeleteService } from './contacts-delete.service';
import { AuditModule } from '../audit/audit.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalContact, SupplierContactLink, Supplier]), PermissionsModule, forwardRef(() => UsersModule), forwardRef(() => AuditModule), forwardRef(() => SuppliersModule)],
  providers: [ContactsService, ContactsDeleteService],
  controllers: [ContactsController],
  exports: [ContactsService, TypeOrmModule],
})
export class ContactsModule {}
