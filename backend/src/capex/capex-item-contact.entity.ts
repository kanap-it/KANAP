import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CapexItem } from './capex-item.entity';
import { ExternalContact } from '../contacts/external-contact.entity';
import { SupplierContactRole } from '../contacts/supplier-contact.entity';

export enum ContactOrigin {
  SUPPLIER = 'supplier',
  MANUAL = 'manual',
}

@Entity('capex_item_contacts')
export class CapexItemContactLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  capex_item_id!: string;

  @ManyToOne(() => CapexItem)
  @JoinColumn({ name: 'capex_item_id' })
  capex_item?: CapexItem;

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
