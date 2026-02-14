import { MigrationInterface, QueryRunner } from "typeorm";

export class applicationCategoryDataFix1805000000001 implements MigrationInterface {
  name = 'applicationCategoryDataFix1805000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix data migration: convert old catalog_type values to new category values
    // This runs as a separate migration because the original migration (1805000000000)
    // may have already executed without properly updating the data
    await queryRunner.query(`UPDATE applications SET category = 'line_of_business' WHERE category = 'application'`);
    await queryRunner.query(`UPDATE applications SET category = 'infrastructure' WHERE category = 'service'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to old values
    await queryRunner.query(`UPDATE applications SET category = 'application' WHERE category = 'line_of_business'`);
    await queryRunner.query(`UPDATE applications SET category = 'service' WHERE category = 'infrastructure'`);
  }
}
