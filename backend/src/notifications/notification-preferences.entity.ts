import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { WorkspaceSettings } from './notifications.constants';

@Entity('user_notification_preferences')
@Index(['tenant_id', 'user_id'], { unique: true })
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('boolean', { default: true })
  emails_enabled!: boolean;

  @Column('jsonb', { default: '{}' })
  workspace_settings!: WorkspaceSettings;

  @Column('boolean', { default: true })
  weekly_review_enabled!: boolean;

  @Column('int', { default: 1 })
  weekly_review_day!: number;

  @Column('int', { default: 8 })
  weekly_review_hour!: number;

  @Column('varchar', { length: 50, default: 'Europe/Paris' })
  timezone!: string;

  @Column('timestamptz', { nullable: true })
  weekly_review_last_sent_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
