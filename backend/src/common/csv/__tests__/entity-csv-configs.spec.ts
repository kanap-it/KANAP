/**
 * Cross-cutting invariants over the REAL entity CSV configs (not synthetic ones).
 *
 * These lock the contract between export, template and import for every entity
 * on the config-driven CSV system, so config edits can't silently break the
 * round-trip (template -> import, export -> import).
 */
import * as assert from 'node:assert/strict';
import { CsvEntityConfig, CsvFieldType } from '../csv-field.types';
import { CsvResolverService } from '../csv-resolver.service';
import { assetCsvConfig } from '../../../assets/asset-csv.config';
import { applicationCsvConfig } from '../../../applications/application-csv.config';
import { taskCsvConfig } from '../../../tasks/task-csv.config';
import { portfolioProjectCsvConfig } from '../../../portfolio/portfolio-project-csv.config';
import { portfolioRequestCsvConfig } from '../../../portfolio/portfolio-request-csv.config';

const configs: CsvEntityConfig[] = [
  assetCsvConfig,
  applicationCsvConfig,
  taskCsvConfig,
  portfolioProjectCsvConfig,
  portfolioRequestCsvConfig,
];

function testUniqueCsvColumns() {
  for (const config of configs) {
    const seen = new Set<string>();
    for (const f of config.fields) {
      assert.ok(!seen.has(f.csvColumn), `${config.entityName}: duplicate csvColumn '${f.csvColumn}'`);
      seen.add(f.csvColumn);
    }
  }
}

function testRequiredFieldsAreImportable() {
  // Every required column must be importable, otherwise the template misses it
  // and imports can never satisfy the requirement.
  for (const config of configs) {
    for (const f of config.fields) {
      if (f.required) {
        assert.notEqual(f.importable, false,
          `${config.entityName}: required field '${f.csvColumn}' must be importable`);
      }
    }
  }
}

function testImportableComputedFieldsUseTempProperties() {
  // Importable COMPUTED fields parse to a raw string assigned to entityProperty.
  // If entityProperty is a real DB column, the raw string is written verbatim
  // (this corrupted tasks.viewer_ids/owner_ids). Such fields must target a
  // '_'-prefixed temp property handled + cleaned up in beforeCommit.
  for (const config of configs) {
    for (const f of config.fields) {
      if (f.type === CsvFieldType.COMPUTED && f.importable !== false) {
        assert.ok(f.entityProperty.startsWith('_'),
          `${config.entityName}: importable COMPUTED field '${f.csvColumn}' must map to a temp ` +
          `('_'-prefixed) entityProperty, not the real column '${f.entityProperty}'`);
      }
    }
  }
}

function testAssetStatusIsNotHardcodedEnum() {
  // asset.status is settings-backed (lifecycle_states, tenant-configurable):
  // a hard-coded ENUM gate rejects valid lifecycle codes (e.g. 'retired')
  // before beforeCommit can resolve them, breaking export -> import.
  const status = assetCsvConfig.fields.find((f) => f.csvColumn === 'status');
  assert.ok(status, 'asset config has a status field');
  assert.equal(status!.type, CsvFieldType.STRING,
    'asset.status must be STRING (settings-backed), not a hard-coded ENUM');
}

function testEnumFieldsHaveValues() {
  for (const config of configs) {
    for (const f of config.fields) {
      if (f.type === CsvFieldType.ENUM) {
        assert.ok(Array.isArray(f.enumValues) && f.enumValues.length > 0,
          `${config.entityName}: ENUM field '${f.csvColumn}' must declare enumValues`);
      }
    }
  }
}

function testFkEntitiesHaveResolvers() {
  const resolver = new CsvResolverService();
  const registry = (resolver as any).entityConfigs as Record<string, unknown>;
  for (const config of configs) {
    for (const f of config.fields) {
      if (f.fkEntity) {
        assert.ok(registry[f.fkEntity],
          `${config.entityName}: field '${f.csvColumn}' references unknown fkEntity '${f.fkEntity}'`);
      }
    }
  }
}

async function testTemplateHeadersRoundTripThroughImportValidation() {
  // The template exposes exactly the importable columns; import header
  // validation must accept every one of them and find all required columns.
  const { CsvExportService } = await import('../csv-export.service');
  const service = new CsvExportService(new CsvResolverService());
  for (const config of configs) {
    const result = await service.export(config, [], {
      manager: { query: async () => [] } as any,
      tenantId: 't1',
      scope: 'template',
    });
    const headerLine = result.content.replace(/^﻿/, '').split('\n')[0].trim();
    const headers = headerLine.split(';');
    const importable = new Set(
      config.fields.filter((f) => f.importable !== false).map((f) => f.csvColumn),
    );
    for (const h of headers) {
      assert.ok(importable.has(h),
        `${config.entityName}: template header '${h}' is not an importable column`);
    }
    for (const f of config.fields) {
      if (f.required) {
        assert.ok(headers.includes(f.csvColumn),
          `${config.entityName}: required column '${f.csvColumn}' missing from template`);
      }
    }
  }
}

(async () => {
  testUniqueCsvColumns();
  testRequiredFieldsAreImportable();
  testImportableComputedFieldsUseTempProperties();
  testAssetStatusIsNotHardcodedEnum();
  testEnumFieldsHaveValues();
  testFkEntitiesHaveResolvers();
  await testTemplateHeadersRoundTripThroughImportValidation();

  console.log('Entity CSV config invariant tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
