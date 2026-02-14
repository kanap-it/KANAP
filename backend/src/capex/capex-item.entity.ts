import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StatusState } from '../common/status';

@Entity('capex_items')
export class CapexItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  paying_company_id!: string | null;

  @Column('uuid', { nullable: true })
  account_id!: string | null;

  @Column('uuid', { nullable: true })
  supplier_id!: string | null;

  @Column('text')
  description!: string;

  @Column({ type: 'enum', enum: ['hardware', 'software'], enumName: 'ppe_type' })
  ppe_type!: 'hardware' | 'software';

  @Column({ type: 'enum', enum: ['replacement','capacity','productivity','security','conformity','business_growth','other'], enumName: 'capex_investment_type' })
  investment_type!: 'replacement' | 'capacity' | 'productivity' | 'security' | 'conformity' | 'business_growth' | 'other';

  @Column({ type: 'enum', enum: ['mandatory','high','medium','low'], enumName: 'priority_level' })
  priority!: 'mandatory' | 'high' | 'medium' | 'low';

  @Column('char', { length: 3 })
  currency!: string;

  @Column('date')
  effective_start!: string;

  @Column('date', { nullable: true })
  effective_end!: string | null;

  @Column({
    type: 'enum',
    enum: StatusState,
    enumName: 'status_state',
    default: StatusState.ENABLED,
  })
  status!: StatusState;

  @Column('timestamptz', { nullable: true })
  disabled_at!: Date | null;

  @Column('uuid', { nullable: true })
  project_id!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
