import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_edit_locks')
@Index(['tenant_id', 'document_id'], { unique: true })
export class DocumentEditLock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  holder_user_id!: string;

  @Column('text')
  lock_token_hash!: string;

  @Column('timestamptz', { default: () => 'now()' })
  acquired_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  heartbeat_at!: Date;

  @Column('timestamptz')
  expires_at!: Date;
}
