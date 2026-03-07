import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_tasks')
@Index(['tenant_id', 'task_id'])
@Index(['document_id', 'task_id'], { unique: true })
export class DocumentTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  task_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
