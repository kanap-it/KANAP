import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_companies')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'interface_id', 'company_id'], { unique: true })
export class InterfaceCompany {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

