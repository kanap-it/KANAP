import * as assert from 'node:assert/strict';
import { DEFAULT_CLASSIFICATION_CATALOG } from '../../it-ops-settings/classification-catalog';
import { ConnectionsBaseService } from '../services/connections-base.service';

class Harness extends ConnectionsBaseService {
  async derive(rows: any[], bases: any[]) {
    const manager = { query: async () => rows } as any;
    return this.computeEffectiveRiskForConnections('tenant-1', bases, manager);
  }
}

const settings = {
  getClassificationCatalog: async () => ({
    ...DEFAULT_CLASSIFICATION_CATALOG,
    businessCriticalityLevels: [
      { code: 'routine', label: 'Routine', description: '', rank: 10, maxMtdMinutes: null },
      { code: 'urgent', label: 'Urgent', description: '', rank: 40, maxMtdMinutes: 60 },
    ],
    dataClasses: [
      { code: 'open', label: 'Open', description: '', rank: 3 },
      { code: 'secret', label: 'Secret', description: '', rank: 90 },
    ],
  }),
};

const harness = new Harness({ manager: {} } as any, {} as any, {} as any, {} as any, {} as any, settings as any);

async function run() {
  const result = await harness.derive(
    [
      { connection_id: 'c1', interface_id: 'i1', criticality: 'routine', data_class: 'secret', contains_pii: false },
      { connection_id: 'c1', interface_id: 'i2', criticality: 'urgent', data_class: 'open', contains_pii: true },
    ],
    [{ id: 'c1', risk_mode: 'derived', criticality: null, data_class: null, contains_pii: false }],
  );
  assert.deepEqual(result.get('c1'), {
    effective_criticality: 'urgent',
    effective_data_class: 'secret',
    effective_contains_pii: true,
    derived_interface_count: 2,
    classification_incomplete: false,
  });

  const incomplete = await harness.derive(
    [{ connection_id: 'c2', interface_id: 'i3', criticality: null, data_class: 'unknown', contains_pii: false }],
    [{ id: 'c2', risk_mode: 'derived', criticality: 'routine', data_class: 'open', contains_pii: false }],
  );
  assert.equal(incomplete.get('c2')?.effective_criticality, null);
  assert.equal(incomplete.get('c2')?.effective_data_class, null);
  assert.equal(incomplete.get('c2')?.classification_incomplete, true);

  const manual = await harness.derive([], [
    { id: 'c3', risk_mode: 'manual', criticality: 'historical-class', data_class: 'historical-data', contains_pii: false },
  ]);
  assert.equal(manual.get('c3')?.effective_criticality, 'historical-class');
  assert.equal(manual.get('c3')?.effective_data_class, 'historical-data');
  assert.equal(manual.get('c3')?.classification_incomplete, false);
}

run().then(() => console.log('classification consumer tests passed'));
