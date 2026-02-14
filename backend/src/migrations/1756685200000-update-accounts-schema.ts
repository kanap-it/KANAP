import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAccountsSchema1756685200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, rename the 'name' column to 'account_name'
    await queryRunner.query(`ALTER TABLE "accounts" RENAME COLUMN "name" TO "account_name"`);

    // Change account_number from text to integer
    await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "account_number" TYPE INTEGER USING account_number::integer`);

    // Remove classification_id column
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "classification_id"`);

    // Add consolidation fields
    await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN "consolidation_account_number" INTEGER`);
    await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN "consolidation_account_name" TEXT`);
    await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN "consolidation_account_description" TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "consolidation_account_description"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "consolidation_account_name"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "consolidation_account_number"`);

    // Add back classification_id
    await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN "classification_id" UUID`);

    // Change account_number back to text
    await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "account_number" TYPE TEXT`);

    // Rename account_name back to name
    await queryRunner.query(`ALTER TABLE "accounts" RENAME COLUMN "account_name" TO "name"`);
  }
}
