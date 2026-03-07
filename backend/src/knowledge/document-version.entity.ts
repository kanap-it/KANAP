import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_versions')
@Index(['tenant_id', 'document_id'])
@Index(['document_id', 'version_number'], { unique: true })
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('int')
  version_number!: number;

  @Column('text')
  title!: string;

  @Column('text', { nullable: true })
  summary!: string | null;

  @Column('text', { default: '' })
  content_markdown!: string;

  @Column('text', { default: '' })
  content_plain!: string;

  @Column('text', { nullable: true })
  change_note!: string | null;

  @Column('uuid', { nullable: true })
  created_by!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
