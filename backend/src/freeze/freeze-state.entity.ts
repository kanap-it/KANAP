import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type FreezeScope = 'opex' | 'capex' | 'companies' | 'departments';

@Entity('freeze_states')
@Index('uniq_freeze_states_scope', ['tenant_id', 'budget_year', 'scope', 'columnKey'], { unique: true })
export class FreezeState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('integer')
  budget_year!: number;

  @Column({ type: 'text' })
  scope!: FreezeScope;

  @Column({ type: 'text', name: 'column_key' })
  columnKey!: string;

  @Column('boolean', { default: true })
  is_frozen!: boolean;

  @Column('uuid', { nullable: true })
  frozen_by!: string | null;

  @Column('timestamptz', { nullable: true })
  frozen_at!: Date | null;

  @Column('uuid', { nullable: true })
  unfrozen_by!: string | null;

  @Column('timestamptz', { nullable: true })
  unfrozen_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
