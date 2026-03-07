import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_projects')
@Index(['tenant_id', 'project_id'])
@Index(['document_id', 'project_id'], { unique: true })
export class DocumentProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
