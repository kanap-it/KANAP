import { MigrationInterface, QueryRunner } from "typeorm";

export class DropSuperuserFromAppRole1756687600000 implements MigrationInterface {
  name = 'DropSuperuserFromAppRole1756687600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
        IF current_user = 'app' THEN
          RAISE NOTICE 'Skipping legacy app role hardening because current_user is app; generic runtime role hardening handles this case.';
        ELSE
          BEGIN
            EXECUTE 'ALTER ROLE app NOSUPERUSER NOBYPASSRLS';
          EXCEPTION
            WHEN insufficient_privilege OR feature_not_supported THEN
              RAISE NOTICE 'Skipping legacy app role hardening: %', SQLERRM;
          END;
        END IF;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: do not re-grant superuser in down migration
  }
}
