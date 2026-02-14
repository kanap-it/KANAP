import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionsRiskFields1769700000000 implements MigrationInterface {
  name = 'ConnectionsRiskFields1769700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE connections ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'medium';`,
    );
    await queryRunner.query(
      `ALTER TABLE connections ADD COLUMN IF NOT EXISTS data_class text NOT NULL DEFAULT 'internal';`,
    );
    await queryRunner.query(
      `ALTER TABLE connections ADD COLUMN IF NOT EXISTS contains_pii boolean NOT NULL DEFAULT false;`,
    );
    await queryRunner.query(
      `ALTER TABLE connections ADD COLUMN IF NOT EXISTS risk_mode text NOT NULL DEFAULT 'manual';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS risk_mode;`);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS contains_pii;`);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS data_class;`);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS criticality;`);
  }
}
