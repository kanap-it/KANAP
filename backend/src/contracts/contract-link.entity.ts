import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('contract_links')
export class ContractLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  contract_id!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
