import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_assets')
@Index(['tenant_id', 'task_id'])
@Index(['tenant_id', 'asset_id'])
@Index(['task_id', 'asset_id'], { unique: true })
export class TaskAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  task_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @ManyToOne(() => Task, (task) => task.asset_links, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}
