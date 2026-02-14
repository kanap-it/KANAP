import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationSupportContacts1769000000000 implements MigrationInterface {
  name = 'ApplicationSupportContacts1769000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS support_notes text NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_support_contacts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_support_contacts_app ON application_support_contacts(application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_support_contacts_contact ON application_support_contacts(contact_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_support_contacts_contact`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_support_contacts_app`);
    await queryRunner.query(`DROP TABLE IF EXISTS application_support_contacts`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS support_notes`);
  }
}
