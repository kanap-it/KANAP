import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('scheduled_task_runs')
export class ScheduledTaskRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  task_name!: string;

  @Column('text')
  status!: string;

  @Column('timestamptz')
  started_at!: Date;

  @Column('timestamptz', { nullable: true })
  finished_at!: Date | null;

  @Column('integer', { nullable: true })
  duration_ms!: number | null;

  @Column('jsonb', { nullable: true })
  summary!: Record<string, any> | null;

  @Column('text', { nullable: true })
  error!: string | null;
}
