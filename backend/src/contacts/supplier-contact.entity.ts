import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Supplier } from '../suppliers/supplier.entity';
import { ExternalContact } from './external-contact.entity';

export enum SupplierContactRole {
  COMMERCIAL = 'commercial',
  TECHNICAL = 'technical',
  SUPPORT = 'support',
  OTHER = 'other',
}

@Entity('supplier_contacts')
export class SupplierContactLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  supplier_id!: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column('uuid')
  contact_id!: string;

  @ManyToOne(() => ExternalContact)
  @JoinColumn({ name: 'contact_id' })
  contact?: ExternalContact;

  @Column({
    type: 'enum',
    enum: SupplierContactRole,
    enumName: 'supplier_contact_role',
  })
  role!: SupplierContactRole;

  @Column('boolean', { default: false })
  is_primary!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

