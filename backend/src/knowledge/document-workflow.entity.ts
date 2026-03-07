import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_workflows')
@Index(['tenant_id', 'document_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'requested_at'])
export class DocumentWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('text')
  status!: string;

  @Column('int')
  requested_revision!: number;

  @Column('uuid', { nullable: true })
  requested_by!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  requested_at!: Date;

  @Column('timestamptz', { nullable: true })
  completed_at!: Date | null;
}
