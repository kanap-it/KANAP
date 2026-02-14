import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationPreferences1815000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the table
    await queryRunner.query(`
      CREATE TABLE user_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,

        -- Global master toggle
        emails_enabled BOOLEAN NOT NULL DEFAULT true,

        -- Per-workspace toggles (JSONB for flexibility)
        workspace_settings JSONB NOT NULL DEFAULT '{
          "portfolio": {
            "enabled": true,
            "status_changes": true,
            "team_additions": true,
            "comments": true
          },
          "tasks": {
            "enabled": true,
            "as_assignee": true,
            "as_requestor": true,
            "as_viewer": false,
            "status_changes": true,
            "comments": true
          },
          "budget": {
            "enabled": true,
            "expiration_warnings": true,
            "status_changes": true,
            "comments": true
          }
        }'::jsonb,

        -- Weekly review settings
        weekly_review_enabled BOOLEAN NOT NULL DEFAULT true,
        weekly_review_day INT NOT NULL DEFAULT 1,
        weekly_review_hour INT NOT NULL DEFAULT 8,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris',

        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        CONSTRAINT uq_notification_prefs_user UNIQUE(tenant_id, user_id)
      );
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policy
    await queryRunner.query(`
      CREATE POLICY user_notification_preferences_tenant_isolation
        ON user_notification_preferences
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant());
    `);

    // Index for weekly review cron job
    await queryRunner.query(`
      CREATE INDEX idx_notification_prefs_weekly
        ON user_notification_preferences(weekly_review_enabled, weekly_review_day, weekly_review_hour)
        WHERE weekly_review_enabled = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_notification_preferences;`);
  }
}
