import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeeklyReviewLastSentAt1820000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
      ADD COLUMN IF NOT EXISTS weekly_review_last_sent_at TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
      DROP COLUMN IF EXISTS weekly_review_last_sent_at;
    `);
  }
}
