import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets Forecast be frozen like the other OPEX / CAPEX budget columns: widens
 * the column CHECK of freeze_states. No data changes on the way up.
 */
export class FreezeStatesForecastColumn1853610000000 implements MigrationInterface {
  name = 'FreezeStatesForecastColumn1853610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE freeze_states DROP CONSTRAINT IF EXISTS chk_freeze_states_column`);
    await queryRunner.query(`
      ALTER TABLE freeze_states
      ADD CONSTRAINT chk_freeze_states_column CHECK (
        (scope IN ('opex','capex') AND column_key IN ('budget','revision','forecast','actual','landing')) OR
        (scope IN ('companies','departments') AND column_key = '__all__')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The original constraint cannot hold Forecast rows, so down() deletes every
    // tenant's Forecast freeze state. Migrations run without app.current_tenant
    // and freeze_states forces RLS, hence the RLS toggle around the delete.
    await queryRunner.query(`ALTER TABLE freeze_states DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM freeze_states WHERE column_key = 'forecast'`);
    await queryRunner.query(`ALTER TABLE freeze_states ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE freeze_states FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE freeze_states DROP CONSTRAINT IF EXISTS chk_freeze_states_column`);
    await queryRunner.query(`
      ALTER TABLE freeze_states
      ADD CONSTRAINT chk_freeze_states_column CHECK (
        (scope IN ('opex','capex') AND column_key IN ('budget','revision','actual','landing')) OR
        (scope IN ('companies','departments') AND column_key = '__all__')
      )
    `);
  }
}
