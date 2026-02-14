import { MigrationInterface, QueryRunner } from "typeorm";

export class DropSuperuserFromAppRole1756687600000 implements MigrationInterface {
  name = 'DropSuperuserFromAppRole1756687600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
        EXECUTE 'ALTER ROLE app NOSUPERUSER NOBYPASSRLS';
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: do not re-grant superuser in down migration
  }
}
