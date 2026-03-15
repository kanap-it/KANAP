import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPreferencesOptInDefaults1844000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
      ALTER COLUMN emails_enabled SET DEFAULT false,
      ALTER COLUMN workspace_settings SET DEFAULT '{
        "portfolio": {
          "enabled": false,
          "status_changes": false,
          "team_additions": false,
          "team_changes_as_lead": false,
          "comments": false
        },
        "tasks": {
          "enabled": false,
          "as_assignee": false,
          "as_requestor": false,
          "as_viewer": false,
          "status_changes": false,
          "comments": false
        },
        "budget": {
          "enabled": false,
          "expiration_warnings": false,
          "status_changes": false,
          "comments": false
        }
      }'::jsonb,
      ALTER COLUMN weekly_review_enabled SET DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
      ALTER COLUMN emails_enabled SET DEFAULT true,
      ALTER COLUMN workspace_settings SET DEFAULT '{
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
      ALTER COLUMN weekly_review_enabled SET DEFAULT true;
    `);
  }
}
