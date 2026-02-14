import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioProjectCapexOpexFix1773000000000 implements MigrationInterface {
  name = 'PortfolioProjectCapexOpexFix1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename columns to match entity definitions
    await queryRunner.query(`ALTER TABLE portfolio_project_capex RENAME COLUMN capex_item_id TO capex_id`);
    await queryRunner.query(`ALTER TABLE portfolio_project_opex RENAME COLUMN spend_item_id TO opex_id`);

    // Drop old unique constraints and create new ones with correct column names
    await queryRunner.query(`ALTER TABLE portfolio_project_capex DROP CONSTRAINT IF EXISTS portfolio_project_capex_project_id_capex_item_id_key`);
    await queryRunner.query(`ALTER TABLE portfolio_project_opex DROP CONSTRAINT IF EXISTS portfolio_project_opex_project_id_spend_item_id_key`);

    await queryRunner.query(`ALTER TABLE portfolio_project_capex ADD CONSTRAINT portfolio_project_capex_project_id_capex_id_key UNIQUE (project_id, capex_id)`);
    await queryRunner.query(`ALTER TABLE portfolio_project_opex ADD CONSTRAINT portfolio_project_opex_project_id_opex_id_key UNIQUE (project_id, opex_id)`);

    // Add foreign key constraints to reference capex_items and spend_items
    await queryRunner.query(`ALTER TABLE portfolio_project_capex ADD CONSTRAINT fk_portfolio_project_capex_capex FOREIGN KEY (capex_id) REFERENCES capex_items(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE portfolio_project_opex ADD CONSTRAINT fk_portfolio_project_opex_opex FOREIGN KEY (opex_id) REFERENCES spend_items(id) ON DELETE CASCADE`);

    // Add indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_project_capex_project ON portfolio_project_capex(project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_project_capex_capex ON portfolio_project_capex(capex_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_project_opex_project ON portfolio_project_opex(project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_project_opex_opex ON portfolio_project_opex(opex_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_project_opex_opex`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_project_opex_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_project_capex_capex`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_project_capex_project`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE portfolio_project_opex DROP CONSTRAINT IF EXISTS fk_portfolio_project_opex_opex`);
    await queryRunner.query(`ALTER TABLE portfolio_project_capex DROP CONSTRAINT IF EXISTS fk_portfolio_project_capex_capex`);

    // Drop new unique constraints and restore old ones
    await queryRunner.query(`ALTER TABLE portfolio_project_opex DROP CONSTRAINT IF EXISTS portfolio_project_opex_project_id_opex_id_key`);
    await queryRunner.query(`ALTER TABLE portfolio_project_capex DROP CONSTRAINT IF EXISTS portfolio_project_capex_project_id_capex_id_key`);

    // Rename columns back
    await queryRunner.query(`ALTER TABLE portfolio_project_opex RENAME COLUMN opex_id TO spend_item_id`);
    await queryRunner.query(`ALTER TABLE portfolio_project_capex RENAME COLUMN capex_id TO capex_item_id`);

    await queryRunner.query(`ALTER TABLE portfolio_project_capex ADD CONSTRAINT portfolio_project_capex_project_id_capex_item_id_key UNIQUE (project_id, capex_item_id)`);
    await queryRunner.query(`ALTER TABLE portfolio_project_opex ADD CONSTRAINT portfolio_project_opex_project_id_spend_item_id_key UNIQUE (project_id, spend_item_id)`);
  }
}
