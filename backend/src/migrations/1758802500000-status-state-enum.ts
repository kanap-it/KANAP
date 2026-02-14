import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatusStateEnum1758802500000 implements MigrationInterface {
  name = 'StatusStateEnum1758802500000';

  private readonly tables = [
    'analytics_categories',
    'accounts',
    'suppliers',
    'contracts',
    'companies',
    'departments',
    'spend_items',
    'capex_items',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_state') THEN
          CREATE TYPE status_state AS ENUM ('enabled', 'disabled');
        END IF;
      END $$;
    `);

    for (const table of this.tables) {
      await queryRunner.query(`
        UPDATE ${table}
        SET status = 'enabled'
        WHERE status IS NULL OR status NOT IN ('enabled', 'disabled');
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status DROP DEFAULT;
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status TYPE status_state
          USING (
            CASE
              WHEN status = 'disabled' THEN 'disabled'::status_state
              ELSE 'enabled'::status_state
            END
          );
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status SET DEFAULT 'enabled';
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS disabled_at timestamptz NULL;
      `);

      await queryRunner.query(`
        UPDATE ${table}
        SET disabled_at = COALESCE(disabled_at, now())
        WHERE status = 'disabled'::status_state AND disabled_at IS NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        UPDATE ${table}
        SET status = (CASE WHEN status::text = 'disabled' THEN 'disabled' ELSE 'enabled' END);
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status DROP DEFAULT;
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status TYPE text
          USING status::text;
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN status SET DEFAULT 'enabled';
      `);

      await queryRunner.query(`
        ALTER TABLE ${table}
          DROP COLUMN IF EXISTS disabled_at;
      `);
    }

    await queryRunner.query(`
      DROP TYPE IF EXISTS status_state;
    `);
  }
}
