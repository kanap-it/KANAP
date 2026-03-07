import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_types')
@Index(['tenant_id'])
export class DocumentType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { nullable: true })
  template_content!: string | null;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @Column('boolean', { default: false })
  is_system!: boolean;

  @Column('boolean', { default: false })
  is_default!: boolean;

  @Column('text', { nullable: true })
  system_key!: string | null;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
