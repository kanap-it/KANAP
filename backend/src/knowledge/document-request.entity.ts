import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_requests')
@Index(['tenant_id', 'request_id'])
@Index(['document_id', 'request_id'], { unique: true })
export class DocumentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
