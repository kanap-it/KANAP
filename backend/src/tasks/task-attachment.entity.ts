import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('task_attachments')
@Index(['tenant_id', 'task_id'])
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  task_id!: string;

  @Column('text')
  original_filename!: string;

  @Column('text')
  stored_filename!: string;

  @Column('text', { nullable: true })
  mime_type!: string | null;

  @Column('int', { default: 0 })
  size!: number;

  @Column('text')
  storage_path!: string;

  // NULL = explicit file upload, non-null = inline image from rich text field
  @Column('text', { nullable: true })
  source_field!: string | null;

  @Column('uuid', { nullable: true })
  uploaded_by_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  uploaded_at!: Date;
}
