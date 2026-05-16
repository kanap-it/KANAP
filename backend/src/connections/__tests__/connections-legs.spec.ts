import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { ConnectionsBaseService } from '../services/connections-base.service';

/**
 * Minimal subclass to expose protected helpers for unit testing.
 * We pass `null` for repositories/services because the cases under test do not
 * exercise database access (both endpoints null, or both endpoints set which
 * throws before reaching ensureAsset/validateEntityCode).
 */
class TestableLegsService extends ConnectionsBaseService {
  constructor() {
    super(null as any, null as any, null as any, null as any, null as any, null as any);
  }
  publicNormalizeHopEquipment(payload: any) {
    return (this as any).normalizeHopEquipment(payload, 'tenant-uuid', undefined);
  }
  publicNormalizeLegOrderIndex(value: unknown) {
    return (this as any).normalizeLegOrderIndex(value);
  }
}

const svc = new TestableLegsService();

async function bothEquipmentNullIsAllowed() {
  // A hop can be created with no equipment yet (filled in later via PATCH).
  const result = await svc.publicNormalizeHopEquipment({
    equipment_asset_id: null,
    equipment_entity_code: null,
  });
  assert.deepEqual(result, {
    equipment_asset_id: null,
    equipment_entity_code: null,
  });
}

async function emptyStringsTreatedAsNull() {
  const result = await svc.publicNormalizeHopEquipment({
    equipment_asset_id: '',
    equipment_entity_code: '   ',
  });
  assert.deepEqual(result, {
    equipment_asset_id: null,
    equipment_entity_code: null,
  });
}

async function equipmentWithBothFieldsThrows() {
  await assert.rejects(
    () => svc.publicNormalizeHopEquipment({
      equipment_asset_id: '11111111-1111-1111-1111-111111111111',
      equipment_entity_code: 'INTERNET',
    }),
    (err: any) => err instanceof BadRequestException && /choose either an asset or an entity, not both/i.test(err.message),
  );
}

async function hopOrderIndexValidation() {
  // No upper bound anymore — only requires integer >= 1.
  assert.equal(svc.publicNormalizeLegOrderIndex(1), 1);
  assert.equal(svc.publicNormalizeLegOrderIndex(7), 7);
  assert.equal(svc.publicNormalizeLegOrderIndex(42), 42);
  assert.throws(() => svc.publicNormalizeLegOrderIndex(0), BadRequestException);
  assert.throws(() => svc.publicNormalizeLegOrderIndex(-1), BadRequestException);
  assert.throws(() => svc.publicNormalizeLegOrderIndex('foo'), BadRequestException);
  assert.throws(() => svc.publicNormalizeLegOrderIndex(1.5), BadRequestException);
}

(async () => {
  await bothEquipmentNullIsAllowed();
  await emptyStringsTreatedAsNull();
  await equipmentWithBothFieldsThrows();
  await hopOrderIndexValidation();
  // eslint-disable-next-line no-console
  console.log('Connection path-hops validation passes unit checks.');
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
