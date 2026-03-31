import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ai_builtin_usage')
export class AiBuiltinUsage {
  @PrimaryColumn('uuid')
  tenant_id!: string;

  @PrimaryColumn('varchar', { length: 7 })
  year_month!: string;

  @Column('integer', { default: 0 })
  user_message_count!: number;

  @Column('timestamptz', { default: () => 'now()' })
  last_updated_at!: Date;
}
