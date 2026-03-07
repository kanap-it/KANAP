import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_contributors')
@Index(['tenant_id', 'document_id'])
@Index(['document_id', 'user_id', 'role'], { unique: true })
export class DocumentContributor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  role!: string;

  @Column('boolean', { default: false })
  is_primary!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
