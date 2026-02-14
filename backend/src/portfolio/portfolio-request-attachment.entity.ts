import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_attachments')
@Index(['request_id'])
export class PortfolioRequestAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('text')
  original_filename!: string;

  @Column('text')
  stored_filename!: string;

  @Column('text', { nullable: true })
  mime_type!: string | null;

  @Column('int')
  size!: number;

  @Column('text')
  storage_path!: string;

  // NULL = explicit file upload, non-null = inline image from rich text field
  @Column('text', { nullable: true })
  source_field!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
