import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSeatLimitNullable1817000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN seat_limit DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE subscriptions SET seat_limit = 5 WHERE seat_limit IS NULL`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN seat_limit SET NOT NULL`);
  }
}
