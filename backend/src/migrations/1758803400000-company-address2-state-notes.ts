import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyAddress2StateNotes1758803400000 implements MigrationInterface {
  name = 'CompanyAddress2StateNotes1758803400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'address'
        ) THEN
          ALTER TABLE companies RENAME COLUMN address TO address1;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS address2 text NULL,
        ADD COLUMN IF NOT EXISTS state text NULL,
        ADD COLUMN IF NOT EXISTS notes text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS state,
        DROP COLUMN IF EXISTS address2;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'address1'
        ) AND NOT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'address'
        ) THEN
          ALTER TABLE companies RENAME COLUMN address1 TO address;
        END IF;
      END $$;
    `);
  }
}

