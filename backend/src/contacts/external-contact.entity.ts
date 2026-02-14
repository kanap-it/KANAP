import { Column, Entity, Index, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { Supplier } from '../suppliers/supplier.entity';

@Entity('contacts')
export class ExternalContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text', { nullable: true })
  first_name!: string | null;

  @Column('text', { nullable: true })
  last_name!: string | null;

  @Column('text', { nullable: true })
  job_title!: string | null;

  @Index()
  @Column('text')
  email!: string; // unique per tenant (lowercased)

  @Column('text', { nullable: true })
  phone!: string | null;

  @Column('text', { nullable: true })
  mobile!: string | null;

  @Column('char', { length: 2, nullable: true })
  country!: string | null; // ISO 3166-1 alpha-2

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;

  @Index()
  @Column('uuid', { nullable: true })
  supplier_id!: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
