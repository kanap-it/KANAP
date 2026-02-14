import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_suites')
@Index(['application_id', 'suite_id'], { unique: true })
export class ApplicationSuiteLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  // The child application that belongs to a suite
  @Column('uuid')
  application_id!: string;

  // The parent application acting as a suite
  @Column('uuid')
  suite_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

