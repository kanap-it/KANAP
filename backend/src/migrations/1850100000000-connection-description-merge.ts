import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionDescriptionMerge1850100000000 implements MigrationInterface {
  name = 'ConnectionDescriptionMerge1850100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE connections
      ADD COLUMN IF NOT EXISTS description text
    `);

    // Backfill: concat purpose + notes with a blank line separator, skipping NULL/empty parts.
    await queryRunner.query(`
      UPDATE connections
      SET description = NULLIF(
        btrim(
          concat_ws(
            E'\n\n',
            NULLIF(btrim(purpose), ''),
            NULLIF(btrim(notes), '')
          )
        ),
        ''
      )
      WHERE description IS NULL
        AND (
          NULLIF(btrim(purpose), '') IS NOT NULL
          OR NULLIF(btrim(notes), '') IS NOT NULL
        )
    `);

    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS purpose`);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS notes`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS purpose text`);
    await queryRunner.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS notes text`);
    // Best-effort: stash the merged description into purpose so users do not lose content.
    await queryRunner.query(`
      UPDATE connections
      SET purpose = description
      WHERE purpose IS NULL AND description IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS description`);
  }
}
