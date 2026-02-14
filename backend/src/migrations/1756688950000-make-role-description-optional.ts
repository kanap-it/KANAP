import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeRoleDescriptionOptional1756688950000 implements MigrationInterface {
  name = 'MakeRoleDescriptionOptional1756688950000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles ALTER COLUMN role_description DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles ALTER COLUMN role_description SET NOT NULL;
    `);
  }
}
