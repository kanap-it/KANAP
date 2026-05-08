import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_applications')
@Index(['tenant_id', 'task_id'])
@Index(['tenant_id', 'application_id'])
@Index(['task_id', 'application_id'], { unique: true })
export class TaskApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  task_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @ManyToOne(() => Task, (task) => task.application_links, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}
