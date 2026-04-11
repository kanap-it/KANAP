import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('integrated_document_bindings')
@Index(['tenant_id', 'source_entity_type', 'source_entity_id'], { unique: false })
@Index(['tenant_id', 'source_entity_type', 'source_entity_id', 'slot_key'], { unique: true })
@Index(['document_id'], { unique: true })
export class IntegratedDocumentBinding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  source_entity_type!: 'requests' | 'projects' | 'interfaces' | 'applications' | 'assets';

  @Column('uuid')
  source_entity_id!: string;

  @Column('text')
  slot_key!: string;

  @Column('uuid')
  document_id!: string;

  @Column('boolean', { default: true })
  hidden_from_entity_knowledge!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
