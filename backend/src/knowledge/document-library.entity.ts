import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_libraries')
@Index(['tenant_id', 'slug'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class DocumentLibrary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  slug!: string;

  @Column('boolean', { default: false })
  is_system!: boolean;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('uuid', { nullable: true })
  created_by!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
