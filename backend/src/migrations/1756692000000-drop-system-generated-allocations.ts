import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSystemGeneratedAllocations1756692000000 implements MigrationInterface {
  name = 'DropSystemGeneratedAllocations1756692000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "spend_allocations" WHERE "is_system_generated" = true`);
  }

  public async down(): Promise<void> {
    // No safe rollback for deleted system-generated rows
  }
}
