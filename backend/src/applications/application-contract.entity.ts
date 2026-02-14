import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_contracts')
@Index(['application_id', 'contract_id'], { unique: true })
export class ApplicationContractLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  contract_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

