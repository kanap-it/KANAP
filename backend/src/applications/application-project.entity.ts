import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_projects')
@Index(['application_id', 'project_id'], { unique: true })
export class ApplicationProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
