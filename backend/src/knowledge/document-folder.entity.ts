import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_folders')
@Index(['tenant_id', 'parent_id'])
@Index(['tenant_id', 'library_id'])
export class DocumentFolder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('uuid', { nullable: true })
  parent_id!: string | null;

  @Column('uuid')
  library_id!: string;

  @Column('text', { nullable: true })
  system_key!: string | null;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('uuid', { nullable: true })
  created_by!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
