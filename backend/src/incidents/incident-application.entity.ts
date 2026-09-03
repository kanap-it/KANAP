import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('incident_applications')
@Index(['tenant_id', 'application_id'])
export class IncidentApplication {
  @Column('uuid')
  tenant_id!: string;

  @PrimaryColumn('uuid')
  incident_id!: string;

  @PrimaryColumn('uuid')
  application_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
