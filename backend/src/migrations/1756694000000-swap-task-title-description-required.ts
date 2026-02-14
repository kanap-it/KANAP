import { MigrationInterface, QueryRunner } from "typeorm";

export class SwapTaskTitleDescriptionRequired1756694000000 implements MigrationInterface {
  name = 'SwapTaskTitleDescriptionRequired1756694000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make title NOT NULL and description nullable
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ALTER COLUMN title SET NOT NULL,
      ALTER COLUMN description DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make description NOT NULL and title nullable
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ALTER COLUMN title DROP NOT NULL,
      ALTER COLUMN description SET NOT NULL;
    `);
  }
}