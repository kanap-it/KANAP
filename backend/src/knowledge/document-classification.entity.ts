import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_classifications')
@Index(['tenant_id', 'document_id'])
export class DocumentClassification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  category_id!: string;

  @Column('uuid', { nullable: true })
  stream_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
