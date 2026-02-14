import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationOwnersUniqueByType1821000000000 implements MigrationInterface {
  name = 'ApplicationOwnersUniqueByType1821000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'application_owners'
        ) THEN
          ALTER TABLE application_owners DROP CONSTRAINT IF EXISTS uq_app_owner;
          ALTER TABLE application_owners
            ADD CONSTRAINT uq_app_owner UNIQUE (tenant_id, application_id, user_id, owner_type);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'application_owners'
        ) THEN
          DELETE FROM application_owners ao
          USING (
            SELECT id
            FROM (
              SELECT id,
                     row_number() OVER (
                       PARTITION BY tenant_id, application_id, user_id
                       ORDER BY created_at ASC, id ASC
                     ) AS rn
              FROM application_owners
            ) ranked
            WHERE ranked.rn > 1
          ) dup
          WHERE ao.id = dup.id;

          ALTER TABLE application_owners DROP CONSTRAINT IF EXISTS uq_app_owner;
          ALTER TABLE application_owners
            ADD CONSTRAINT uq_app_owner UNIQUE (tenant_id, application_id, user_id);
        END IF;
      END $$;
    `);
  }
}
