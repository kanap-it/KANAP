import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_incidents')
@Index(['tenant_id', 'incident_id'])
@Index(['document_id', 'incident_id'], { unique: true })
export class DocumentIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  incident_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
