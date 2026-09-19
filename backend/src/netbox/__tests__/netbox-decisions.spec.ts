import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { parseNetboxDecisions } from '../netbox-sync.service';

// The choices a preview dialog sends with a preview or a run. They decide
// whether an asset gets created or overwritten, so a body that cannot be read
// in full is refused in full: nothing is dropped quietly.

const ASSET = '3f2b7c1e-4a5d-4e8f-9a1b-2c3d4e5f6a7b';

function refused(raw: unknown) {
  assert.throws(() => parseNetboxDecisions(raw), BadRequestException);
}

// Nothing sent is an empty list, not an error.
assert.deepEqual(parseNetboxDecisions(undefined), []);
assert.deepEqual(parseNetboxDecisions(null), []);
assert.deepEqual(parseNetboxDecisions([]), []);

// The three choices, normalised; a link keeps its asset, the others drop it.
assert.deepEqual(
  parseNetboxDecisions([
    { external_type: 'device', external_id: 12, action: 'link', asset_id: ASSET },
    { external_type: 'vm', external_id: '12', action: 'create', asset_id: ASSET },
    { external_type: 'device', external_id: ' 13 ', action: 'ignore' },
  ]),
  [
    { external_type: 'device', external_id: '12', action: 'link', asset_id: ASSET },
    { external_type: 'vm', external_id: '12', action: 'create' },
    { external_type: 'device', external_id: '13', action: 'ignore' },
  ],
);

// One choice per object: the last one wins.
assert.deepEqual(
  parseNetboxDecisions([
    { external_type: 'device', external_id: '12', action: 'ignore' },
    { external_type: 'device', external_id: '12', action: 'create' },
  ]),
  [{ external_type: 'device', external_id: '12', action: 'create' }],
);

// Anything else is refused outright.
refused('link');
refused({ decisions: [] });
refused([null]);
refused([{ external_type: 'rack', external_id: '1', action: 'ignore' }]);
refused([{ external_type: 'device', external_id: '', action: 'ignore' }]);
refused([{ external_type: 'device', external_id: '1; DROP TABLE assets', action: 'ignore' }]);
refused([{ external_type: 'device', external_id: '1', action: 'delete' }]);
refused([{ external_type: 'device', external_id: '1', action: 'link' }]);
refused([{ external_type: 'device', external_id: '1', action: 'link', asset_id: 'AST-12' }]);
refused(Array.from({ length: 1001 }, (_, index) => ({
  external_type: 'device', external_id: String(index + 1), action: 'ignore',
})));

console.log('netbox-decisions.spec.ts OK');
