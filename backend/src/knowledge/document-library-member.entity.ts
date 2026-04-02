import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_library_members')
@Index(['tenant_id', 'library_id'])
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'library_id', 'user_id'], { unique: true })
export class DocumentLibraryMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  library_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  access_level!: 'reader' | 'writer';

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
