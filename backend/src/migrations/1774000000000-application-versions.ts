import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationVersions1774000000000 implements MigrationInterface {
  name = 'ApplicationVersions1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add version fields to applications table
    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS version text NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS end_of_support_date date NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS go_live_date date NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS predecessor_id uuid NULL;
    `);

    // Add foreign key constraint for predecessor (self-referential)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_applications_predecessor'
        ) THEN
          ALTER TABLE applications
          ADD CONSTRAINT fk_applications_predecessor
          FOREIGN KEY (predecessor_id) REFERENCES applications(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Add index for efficient successor queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_predecessor
      ON applications(tenant_id, predecessor_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_predecessor;`);
    await queryRunner.query(`ALTER TABLE applications DROP CONSTRAINT IF EXISTS fk_applications_predecessor;`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS predecessor_id;`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS go_live_date;`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS end_of_support_date;`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS version;`);
  }
}
