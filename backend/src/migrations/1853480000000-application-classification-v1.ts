import { MigrationInterface, QueryRunner } from 'typeorm';
import { catalogFromMetadata, catalogToMetadata } from '../it-ops-settings/classification-catalog';

export class ApplicationClassificationV11853480000000 implements MigrationInterface {
  name = 'ApplicationClassificationV11853480000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE applications
      ALTER COLUMN criticality DROP NOT NULL, ALTER COLUMN criticality DROP DEFAULT,
      ADD COLUMN business_mtd_minutes integer CHECK (business_mtd_minutes > 0),
      ADD COLUMN legacy_criticality text,
      ADD COLUMN business_criticality_origin text NOT NULL DEFAULT 'unset' CHECK (business_criticality_origin IN ('unset','legacy','derived')),
      ADD COLUMN cyber_criticality text,
      ADD COLUMN recovery_wave text,
      ADD COLUMN rto_minutes integer CHECK (rto_minutes > 0),
      ADD COLUMN rpo_minutes integer CHECK (rpo_minutes >= 0),
      ADD COLUMN classification_justification text,
      ADD COLUMN classification_revision integer NOT NULL DEFAULT 0 CHECK (classification_revision >= 0),
      ADD COLUMN classification_review jsonb`);
    await runner.query(`ALTER TABLE application_links ADD COLUMN purpose text NOT NULL DEFAULT 'general' CHECK (purpose IN ('general','recovery_plan','recovery_test'))`);
    await runner.query(`ALTER TABLE interfaces ALTER COLUMN criticality DROP NOT NULL, ALTER COLUMN criticality DROP DEFAULT,
      ALTER COLUMN data_class DROP NOT NULL, ALTER COLUMN data_class DROP DEFAULT,
      ADD COLUMN classification_incomplete boolean NOT NULL DEFAULT false`);
    await runner.query(`ALTER TABLE connections ALTER COLUMN criticality DROP NOT NULL, ALTER COLUMN criticality DROP DEFAULT,
      ALTER COLUMN data_class DROP NOT NULL, ALTER COLUMN data_class DROP DEFAULT`);
    await runner.query(`CREATE INDEX idx_applications_tenant_cyber ON applications(tenant_id, cyber_criticality)`);
    await runner.query(`CREATE INDEX idx_applications_tenant_recovery ON applications(tenant_id, recovery_wave)`);

    await runner.query(`CREATE FUNCTION application_classification_reference_changed() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE affected_id uuid; affected_tenant uuid;
      BEGIN
        affected_id := COALESCE(NEW.application_id, OLD.application_id);
        affected_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
        IF TG_TABLE_NAME = 'application_links' THEN
          IF TG_OP = 'INSERT' AND NEW.purpose = 'general' THEN RETURN NEW; END IF;
          IF TG_OP = 'DELETE' AND OLD.purpose = 'general' THEN RETURN OLD; END IF;
          IF TG_OP = 'UPDATE' AND ((OLD.purpose = 'general' AND NEW.purpose = 'general') OR NEW IS NOT DISTINCT FROM OLD) THEN RETURN NEW; END IF;
        END IF;
        UPDATE applications SET classification_revision = classification_revision + 1 WHERE id = affected_id AND tenant_id = affected_tenant;
        IF TG_OP = 'UPDATE' AND (OLD.application_id IS DISTINCT FROM NEW.application_id OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN
          UPDATE applications SET classification_revision = classification_revision + 1 WHERE id = OLD.application_id AND tenant_id = OLD.tenant_id;
        END IF;
        RETURN COALESCE(NEW, OLD);
      END $$`);
    for (const table of ['application_links', 'application_data_residency']) {
      await runner.query(`CREATE TRIGGER classification_reference_changed AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION application_classification_reference_changed()`);
    }

    // Per-tenant context also works when FORCE RLS is enabled for the migration role.
    const tenants = await runner.query(`SELECT id, metadata FROM tenants`);
    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);
      await runner.query(`UPDATE applications SET legacy_criticality = criticality,
        business_criticality_origin = CASE WHEN criticality IS NULL THEN 'unset' ELSE 'legacy' END WHERE tenant_id = $1`, [tenant.id]);
      const raw = tenant.metadata?.it_ops ?? {};
      const catalog = catalogFromMetadata(raw);
      const known = new Set(catalog.businessCriticalityLevels.map((item) => item.code));
      const historical = await runner.query(`SELECT DISTINCT criticality AS code FROM applications WHERE tenant_id = $1 AND criticality IS NOT NULL
        UNION SELECT DISTINCT criticality FROM interfaces WHERE tenant_id = $1 AND criticality IS NOT NULL
        UNION SELECT DISTINCT criticality FROM connections WHERE tenant_id = $1 AND criticality IS NOT NULL`, [tenant.id]);
      const unknownCodes = historical.filter(({ code }: { code: string }) => !known.has(code)).map(({ code }: { code: string }) => code);
      if (unknownCodes.length) {
        // Preserve anomalous codes on records, but never invent their severity.
        // Consumers flag unknown codes as incomplete until an administrator defines them.
        console.warn(`Classification migration: tenant ${tenant.id} has unranked historical codes: ${unknownCodes.join(', ')}`);
        raw.classification_anomalies = { unranked_business_codes: unknownCodes };
      }
      await runner.query(`UPDATE tenants SET metadata = $2::jsonb WHERE id = $1`, [tenant.id, JSON.stringify({ ...tenant.metadata, it_ops: { ...raw, ...catalogToMetadata(catalog) } })]);
    }
    await runner.query(`SELECT set_config('app.current_tenant', '', true)`);
  }

  async down(): Promise<void> {
    throw new Error('Application classification V1 rollback is intentionally non-destructive. Restore a verified pre-migration test backup or ship a forward compatibility fix; nullable/custom classifications cannot safely return to the old contract.');
  }
}
