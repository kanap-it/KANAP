import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_applications')
@Index(['tenant_id', 'application_id'])
@Index(['document_id', 'application_id'], { unique: true })
export class DocumentApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
