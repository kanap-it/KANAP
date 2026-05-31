import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'ai_live_test_targets';

async function addConstraintIfMissing(queryRunner: QueryRunner, name: string, checkSql: string): Promise<void> {
  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${name}'
      ) THEN
        ALTER TABLE ${TABLE}
        ADD CONSTRAINT ${name}
        CHECK (${checkSql});
      END IF;
    END $$;
  `);
}

export class AiLiveReadinessHardening1852300000000 implements MigrationInterface {
  name = 'AiLiveReadinessHardening1852300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addConstraintIfMissing(
      queryRunner,
      'chk_ai_live_test_targets_metadata_object',
      `metadata_json IS NULL OR jsonb_typeof(metadata_json) = 'object'`,
    );
    await addConstraintIfMissing(
      queryRunner,
      'chk_ai_live_test_targets_metadata_no_secret_text',
      `metadata_json IS NULL
       OR metadata_json::text !~* '(api[-_]?key|token|secret|password|authorization|cookie|session|client_secret|credential|Bearer[[:space:]]+[A-Za-z0-9._~+/=-]{12,})'`,
    );
    await addConstraintIfMissing(
      queryRunner,
      'chk_ai_live_test_targets_awx_selector_safe',
      `provider_kind <> 'automation'
       OR allowed_effect <> 'dry_run'
       OR target_kind <> 'awx_job'
       OR (
         COALESCE(jsonb_typeof(metadata_json) = 'object', false)
         AND COALESCE(jsonb_typeof(metadata_json #> '{target}') = 'object', false)
         AND COALESCE(jsonb_typeof(metadata_json #> '{target,values}') = 'array', false)
         AND CASE
           WHEN jsonb_typeof(metadata_json #> '{target,values}') = 'array'
           THEN jsonb_array_length(metadata_json #> '{target,values}') BETWEEN 1 AND 64
           ELSE false
         END
         AND COALESCE(length(btrim(metadata_json #>> '{target,type}')) BETWEEN 1 AND 64, false)
         AND lower(btrim(metadata_json #>> '{target,type}')) NOT IN (
           'all', 'any', 'everyone', 'unrestricted', 'domain users', 'all users',
           'all_hosts', 'all-hosts', 'all_devices', 'all-devices', 'all_vms', 'all-vms'
         )
         AND (metadata_json #>> '{target,type}') !~ '\\*'
         AND (metadata_json #> '{target,values}')::text !~ '\\*'
         AND (metadata_json #> '{target,values}')::text !~* '"[[:space:]]*(all|any|everyone|unrestricted|domain users|all users|all_hosts|all-hosts|all_devices|all-devices|all_vms|all-vms)[[:space:]]*"'
         AND (metadata_json #> '{target,values}')::text !~* '(api[-_]?key|token|secret|password|authorization|cookie|session|client_secret|credential|Bearer[[:space:]]+[A-Za-z0-9._~+/=-]{12,})'
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS chk_ai_live_test_targets_awx_selector_safe`);
    await queryRunner.query(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS chk_ai_live_test_targets_metadata_no_secret_text`);
    await queryRunner.query(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS chk_ai_live_test_targets_metadata_object`);
  }
}
