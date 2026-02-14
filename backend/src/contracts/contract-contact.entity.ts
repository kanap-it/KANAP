import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Contract } from './contract.entity';
import { ExternalContact } from '../contacts/external-contact.entity';
import { SupplierContactRole } from '../contacts/supplier-contact.entity';

export enum ContactOrigin {
  SUPPLIER = 'supplier',
  MANUAL = 'manual',
}

@Entity('contract_contacts')
export class ContractContactLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract;

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

  @Column({ type: 'text', default: ContactOrigin.MANUAL })
  origin!: ContactOrigin;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
