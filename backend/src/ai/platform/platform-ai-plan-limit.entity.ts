import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('platform_ai_plan_limits')
export class PlatformAiPlanLimit {
  @PrimaryColumn('text')
  plan_name!: string;

  @Column('integer')
  monthly_message_limit!: number;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
