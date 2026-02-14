import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_data_residency')
@Index(['application_id', 'country_iso'], { unique: true })
export class ApplicationDataResidency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('char', { length: 2 })
  country_iso!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

