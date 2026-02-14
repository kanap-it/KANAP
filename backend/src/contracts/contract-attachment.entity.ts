import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('contract_attachments')
export class ContractAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  contract_id!: string;

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

  @Column('timestamptz', { default: () => 'now()' })
  uploaded_at!: Date;
}
