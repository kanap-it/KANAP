import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationContactRoleNullable1765006100000 implements MigrationInterface {
  name = 'LocationContactRoleNullable1765006100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE location_user_contacts ALTER COLUMN role DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE location_contacts ALTER COLUMN role DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE location_contacts SET role = '' WHERE role IS NULL`);
    await queryRunner.query(`UPDATE location_user_contacts SET role = '' WHERE role IS NULL`);
    await queryRunner.query(`ALTER TABLE location_contacts ALTER COLUMN role SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE location_user_contacts ALTER COLUMN role SET NOT NULL`);
  }
}

