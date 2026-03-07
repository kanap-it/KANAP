import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_activities')
@Index(['tenant_id', 'document_id'])
@Index(['tenant_id', 'created_at'])
export class DocumentActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid', { nullable: true })
  author_id!: string | null;

  @Column('text')
  type!: string;

  @Column('text', { nullable: true })
  content!: string | null;

  @Column('jsonb', { nullable: true })
  changed_fields!: Record<string, [unknown, unknown]> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { nullable: true })
  updated_at!: Date | null;
}
