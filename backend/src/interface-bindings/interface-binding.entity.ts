import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_bindings')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'interface_leg_id', 'environment'], { unique: true })
export class InterfaceBinding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  interface_leg_id!: string;

  @Column('text')
  environment!: string;

  @Column('uuid')
  source_instance_id!: string;

  @Column('uuid')
  target_instance_id!: string;

  @Column('text', { nullable: true })
  source_endpoint!: string | null;

  @Column('text', { nullable: true })
  target_endpoint!: string | null;

  @Column('text', { nullable: true })
  trigger_details!: string | null;

  @Column('text', { nullable: true })
  env_job_name!: string | null;

  @Column('text', { nullable: true })
  authentication_mode!: string | null;

  @Column('text', { nullable: true })
  monitoring_url!: string | null;

  @Column('text', { nullable: true })
  env_notes!: string | null;

  @Column('text', { default: 'proposed' })
  status!: string;

  @Column('uuid', { nullable: true })
  integration_tool_application_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
