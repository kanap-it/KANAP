import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_companies')
@Index(['application_id', 'company_id'], { unique: true })
export class ApplicationCompany {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

