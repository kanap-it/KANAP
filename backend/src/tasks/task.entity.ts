import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export type TaskRelatedObjectType = 'spend_item' | 'contract' | 'capex_item' | 'project' | null;
export type TaskPriorityLevel = 'blocker' | 'high' | 'normal' | 'low' | 'optional';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export const PRIORITY_LEVELS: Record<TaskPriorityLevel, { label: string; adjustment: number }> = {
  blocker:  { label: 'Blocker',  adjustment: 10 },
  high:     { label: 'High',     adjustment: 5  },
  normal:   { label: 'Normal',   adjustment: 0  },
  low:      { label: 'Low',      adjustment: -5  },
  optional: { label: 'Optional', adjustment: -10 },
};

@Entity('tasks')
// Note: Partial indexes for related object queries are managed via migration
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'assignee_user_id'])
@Index(['tenant_id', 'due_date'])
@Index(['tenant_id', 'item_number'], { unique: true })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('int')
  item_number!: number;

  @Column('text')
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { default: 'open' })
  status!: TaskStatus;

  @Column('date', { nullable: true })
  due_date!: string | null;

  @Column('uuid', { nullable: true })
  assignee_user_id!: string | null;

  @Column('text', { nullable: true })
  related_object_type!: TaskRelatedObjectType;

  @Column('uuid', { nullable: true })
  related_object_id!: string | null;

  // Task type (FK to portfolio_task_types)
  @Column('uuid', { nullable: true })
  task_type_id!: string | null;

  // Classification fields for standalone tasks
  @Column('uuid', { nullable: true })
  source_id!: string | null;

  @Column('uuid', { nullable: true })
  company_id!: string | null;

  // Fields for project tasks
  @Column('uuid', { nullable: true })
  phase_id!: string | null;

  @Column('text', { default: 'normal' })
  priority_level!: TaskPriorityLevel;

  @Column('date', { nullable: true })
  start_date!: string | null;

  @Column('jsonb', { default: '[]' })
  labels!: string[];

  @Column('uuid', { nullable: true })
  category_id!: string | null;

  @Column('uuid', { nullable: true })
  stream_id!: string | null;

  @Column('uuid', { nullable: true })
  creator_id!: string | null;

  @Column('jsonb', { default: '[]' })
  owner_ids!: string[];

  @Column('jsonb', { default: '[]' })
  viewer_ids!: string[];

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
