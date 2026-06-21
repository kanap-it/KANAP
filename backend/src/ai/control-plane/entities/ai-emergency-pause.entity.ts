import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_emergency_pauses')
@Index(['tenant_id', 'active', 'created_at'])
@Index(['tenant_id', 'agent_definition_id', 'active'])
@Index(['tenant_id', 'capability_name', 'active'])
@Index(['tenant_id', 'category', 'active'])
@Index(['tenant_id', 'effect', 'active'])
export class AiEmergencyPause {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  tenant_id!: string | null;

  @Column('text')
  scope!: string;

  @Column('uuid', { nullable: true })
  agent_definition_id!: string | null;

  @Column('text', { nullable: true })
  capability_name!: string | null;

  @Column('text', { nullable: true })
  category!: string | null;

  @Column('text', { nullable: true })
  effect!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;

  @Column('text')
  reason!: string;

  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  @Column('text', { nullable: true })
  actor_label!: string | null;

  @Column('timestamptz', { nullable: true })
  expires_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  revoked_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
