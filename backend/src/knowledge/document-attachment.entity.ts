import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_attachments')
@Index(['tenant_id', 'document_id'])
export class DocumentAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

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

  @Column('text', { nullable: true })
  source_field!: string | null;

  @Column('uuid', { nullable: true })
  uploaded_by_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  uploaded_at!: Date;
}
