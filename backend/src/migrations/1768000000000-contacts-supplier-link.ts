import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactsSupplierLink1768000000000 implements MigrationInterface {
  name = 'ContactsSupplierLink1768000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supplier_id uuid NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_supplier ON contacts(tenant_id, supplier_id)`);
    await queryRunner.query(`ALTER TABLE contacts ADD CONSTRAINT fk_contacts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contacts DROP CONSTRAINT IF EXISTS fk_contacts_supplier`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_supplier`);
    await queryRunner.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS supplier_id`);
  }
}
