import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('integrated_document_slot_settings')
@Index(['tenant_id', 'source_entity_type', 'slot_key'], { unique: true })
@Index(['tenant_id', 'source_entity_type'], { unique: false })
export class IntegratedDocumentSlotSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  source_entity_type!: 'requests' | 'projects' | 'applications' | 'assets';

  @Column('text')
  slot_key!: string;

  @Column('text')
  display_name!: string;

  @Column('uuid')
  folder_id!: string;

  @Column('uuid')
  document_type_id!: string;

  @Column('uuid', { nullable: true })
  template_document_id!: string | null;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
