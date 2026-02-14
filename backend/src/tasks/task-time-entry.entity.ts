import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TaskTimeEntryCategory = 'it' | 'business';

@Entity('task_time_entries')
@Index(['tenant_id', 'task_id'])
@Index(['tenant_id', 'user_id'])
export class TaskTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  task_id!: string;

  @Column('uuid', { nullable: true })
  user_id!: string | null;

  @Column('decimal', { precision: 5, scale: 2 })
  hours!: number;

  @Column('text', { default: 'it' })
  category!: TaskTimeEntryCategory;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('uuid', { nullable: true })
  logged_by_id!: string | null;

  @Column('timestamptz')
  logged_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
