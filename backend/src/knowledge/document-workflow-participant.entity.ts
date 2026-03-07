import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_workflow_participants')
@Index(['tenant_id', 'workflow_id'])
@Index(['workflow_id', 'user_id', 'stage'], { unique: true })
export class DocumentWorkflowParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  workflow_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  stage!: string;

  @Column('text', { default: 'pending' })
  decision!: string;

  @Column('text', { nullable: true })
  comment!: string | null;

  @Column('timestamptz', { nullable: true })
  acted_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
