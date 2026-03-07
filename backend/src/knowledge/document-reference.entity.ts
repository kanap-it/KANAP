import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_references')
@Index(['tenant_id', 'target_document_id'])
@Index(['source_document_id', 'target_document_id'], { unique: true })
export class DocumentReference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  source_document_id!: string;

  @Column('uuid')
  target_document_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
