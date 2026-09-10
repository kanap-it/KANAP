import * as assert from 'node:assert/strict';
import { TeamMemberConfigService } from '../team-member-config.service';

// Partial PATCH contract of the contributor workspace autosave: omitted fields
// stay untouched, explicit clears (empty notes, team_id null) reach the DB as
// NULL (TypeORM skips `undefined` on save), and a zero availability persists.
function createService(existing: Record<string, unknown>) {
  const saved: any[] = [];
  const repoImpl = {
    async findOne() {
      return existing;
    },
    async save(record: any) {
      saved.push({ ...record });
      return record;
    },
    create(payload: any) {
      return payload;
    },
  };
  const service = new TeamMemberConfigService(
    { manager: { getRepository: () => repoImpl } } as any,
    { log: async () => undefined } as any,
    { nextItemNumber: async () => 1 } as any,
  );
  return { service, saved };
}

function baseRecord() {
  return {
    id: 'cfg-1',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    areas_of_expertise: [],
    skills: [{ skill_id: 'skill-1', proficiency: 3 }],
    project_availability: 12,
    notes: 'Some notes',
    team_id: 'team-1',
    default_source_id: 'src-1',
    default_category_id: null,
    default_stream_id: null,
    default_company_id: null,
  };
}

async function testPartialPatchKeepsOtherFields() {
  const { service, saved } = createService(baseRecord());
  await service.update('cfg-1', { project_availability: 8 }, 'user-1');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].project_availability, 8);
  assert.equal(saved[0].notes, 'Some notes');
  assert.equal(saved[0].team_id, 'team-1');
  assert.deepEqual(saved[0].skills, [{ skill_id: 'skill-1', proficiency: 3 }]);
  assert.equal(saved[0].default_source_id, 'src-1');
}

async function testClearsPersistAsNull() {
  const { service, saved } = createService(baseRecord());
  await service.update('cfg-1', { notes: '', team_id: null }, 'user-1');
  assert.equal(saved[0].notes, null);
  assert.equal(saved[0].team_id, null);
  // An explicit null for notes clears as well.
  await service.update('cfg-1', { notes: null }, 'user-1');
  assert.equal(saved[1].notes, null);
}

async function testZeroAvailabilityPersists() {
  const { service, saved } = createService(baseRecord());
  await service.update('cfg-1', { project_availability: 0 }, 'user-1');
  assert.equal(saved[0].project_availability, 0);
}

async function testUndefinedFieldsAreNotTouched() {
  const { service, saved } = createService(baseRecord());
  await service.update('cfg-1', { notes: undefined, team_id: undefined, skills: [] }, 'user-1');
  assert.equal(saved[0].notes, 'Some notes');
  assert.equal(saved[0].team_id, 'team-1');
  assert.deepEqual(saved[0].skills, []);
}

async function run() {
  await testPartialPatchKeepsOtherFields();
  await testClearsPersistAsNull();
  await testZeroAvailabilityPersists();
  await testUndefinedFieldsAreNotTouched();
}

void run();
