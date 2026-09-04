import * as assert from 'node:assert/strict';
import { adaptFilters, getAppliedFilterNames } from '../query/ai-filter.adapter';
import { tasksRegistry } from '../query/registries/tasks.registry';
import { projectsRegistry } from '../query/registries/projects.registry';
import { requestsRegistry } from '../query/registries/requests.registry';
import { incidentsRegistry } from '../query/registries/incidents.registry';

function testSetFilterAdaptation() {
  const adapted = adaptFilters(tasksRegistry, {
    status: ['open', 'in_progress'],
  });
  assert.deepEqual(adapted.filters, {
    status: { filterType: 'set', values: ['open', 'in_progress'] },
  });
  assert.deepEqual(adapted.applied, ['status']);
  assert.deepEqual(adapted.ignored, []);
}

function testStringToSetFilterAdaptation() {
  const adapted = adaptFilters(tasksRegistry, {
    assignee: 'Ada Lovelace',
  } as any);
  assert.deepEqual(adapted.filters, {
    assignee_name: { filterType: 'set', values: ['Ada Lovelace'] },
  });
}

function testDateFilterAdaptation() {
  const adapted = adaptFilters(projectsRegistry, {
    planned_start: { op: 'before', value: '2026-01-01' },
  });
  assert.deepEqual(adapted.filters, {
    planned_start: { filterType: 'date', type: 'lessThan', dateFrom: '2026-01-01' },
  });
}

function testUnknownFieldsAreIgnored() {
  const adapted = adaptFilters(tasksRegistry, {
    made_up: ['nope'],
  } as any);
  assert.deepEqual(adapted.filters, {});
  assert.deepEqual(adapted.applied, []);
  assert.deepEqual(adapted.ignored, ['made_up']);
}

function testRequestAssigneeFieldIsIgnored() {
  const adapted = adaptFilters(requestsRegistry, {
    assignee: ['yann.aubert@lohr.fr'],
  } as any);
  assert.deepEqual(adapted.filters, {});
  assert.deepEqual(adapted.applied, []);
  assert.deepEqual(adapted.ignored, ['assignee']);
}

function testEmptyInput() {
  const adapted = adaptFilters(tasksRegistry, undefined);
  assert.deepEqual(adapted.filters, {});
  assert.deepEqual(getAppliedFilterNames(tasksRegistry, undefined), []);
}

function testIncidentSeveritySetFilter() {
  const adapted = adaptFilters(incidentsRegistry, {
    severity: ['critical', 'major'],
  });
  assert.deepEqual(adapted.filters, {
    severity: { filterType: 'set', values: ['critical', 'major'] },
  });
  assert.deepEqual(adapted.applied, ['severity']);
  assert.deepEqual(adapted.ignored, []);
}

function testIncidentDetectedAtDateFilter() {
  const adapted = adaptFilters(incidentsRegistry, {
    detected_at: { op: 'after', value: '2026-07-01' },
  });
  assert.deepEqual(adapted.filters, {
    detected_at: { filterType: 'date', type: 'greaterThan', dateFrom: '2026-07-01' },
  });
  assert.deepEqual(adapted.applied, ['detected_at']);
  assert.deepEqual(adapted.ignored, []);
}

function testIncidentUnknownFieldIgnored() {
  const adapted = adaptFilters(incidentsRegistry, {
    made_up: ['nope'],
  } as any);
  assert.deepEqual(adapted.filters, {});
  assert.deepEqual(adapted.applied, []);
  assert.deepEqual(adapted.ignored, ['made_up']);
}

function run() {
  testSetFilterAdaptation();
  testStringToSetFilterAdaptation();
  testDateFilterAdaptation();
  testUnknownFieldsAreIgnored();
  testRequestAssigneeFieldIsIgnored();
  testEmptyInput();
  testIncidentSeveritySetFilter();
  testIncidentDetectedAtDateFilter();
  testIncidentUnknownFieldIgnored();
}

run();
