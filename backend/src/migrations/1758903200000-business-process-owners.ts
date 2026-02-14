import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessProcessOwners1758903200000 implements MigrationInterface {
  name = 'BusinessProcessOwners1758903200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD COLUMN IF NOT EXISTS it_owner_user_id uuid NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD CONSTRAINT business_processes_owner_user_fk
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD CONSTRAINT business_processes_it_owner_user_fk
      FOREIGN KEY (it_owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_processes_owner_user
      ON business_processes(owner_user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_processes_it_owner_user
      ON business_processes(it_owner_user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_processes
      DROP CONSTRAINT IF EXISTS business_processes_owner_user_fk;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      DROP CONSTRAINT IF EXISTS business_processes_it_owner_user_fk;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_business_processes_owner_user;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_business_processes_it_owner_user;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      DROP COLUMN IF EXISTS owner_user_id;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      DROP COLUMN IF EXISTS it_owner_user_id;
    `);
  }
}

