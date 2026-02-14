import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionLegsProtocolArray1770501000000 implements MigrationInterface {
  name = 'ConnectionLegsProtocolArray1770501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new array column
    await queryRunner.query(`ALTER TABLE connection_legs ADD COLUMN IF NOT EXISTS protocol_codes text[] NOT NULL DEFAULT '{}'::text[];`);

    // Backfill from legacy protocol_code if present
    await queryRunner.query(`
      UPDATE connection_legs
      SET protocol_codes = CASE
        WHEN protocol_code IS NULL THEN '{}'
        ELSE ARRAY[protocol_code]
      END
      WHERE protocol_codes = '{}'::text[]
         OR protocol_codes IS NULL
    `);

    // Drop old single column if it exists
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS protocol_code;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE connection_legs ADD COLUMN IF NOT EXISTS protocol_code text NULL;`);
    await queryRunner.query(`
      UPDATE connection_legs
      SET protocol_code = protocol_codes[1]
      WHERE protocol_codes IS NOT NULL AND array_length(protocol_codes, 1) > 0;
    `);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS protocol_codes;`);
  }
}
