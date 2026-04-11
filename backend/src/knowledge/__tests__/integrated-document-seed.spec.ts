import * as assert from 'node:assert/strict';
import { getManagedDocsSeedDefinitions } from '../integrated-document-seed';

function testFoundationDefinitionsExcludeInterfaces() {
  const { folderDefinitions, slotDefinitions } = getManagedDocsSeedDefinitions({
    supportedSourceEntityTypes: ['requests', 'projects', 'applications', 'assets'],
  });

  assert.equal(folderDefinitions.some((definition) => definition.sourceEntityType === 'interfaces'), false);
  assert.equal(slotDefinitions.some((definition) => definition.sourceEntityType === 'interfaces'), false);
  assert.deepEqual(
    slotDefinitions.map((definition) => `${definition.sourceEntityType}:${definition.slotKey}`),
    ['requests:purpose', 'requests:risks_mitigations', 'projects:purpose'],
  );
}

function testInterfaceDefinitionsIncludeSpecificationSlot() {
  const { folderDefinitions, slotDefinitions } = getManagedDocsSeedDefinitions({
    supportedSourceEntityTypes: ['requests', 'projects', 'interfaces', 'applications', 'assets'],
  });

  assert.equal(folderDefinitions.some((definition) => definition.sourceEntityType === 'interfaces'), true);
  assert.equal(
    slotDefinitions.some(
      (definition) =>
        definition.sourceEntityType === 'interfaces'
        && definition.slotKey === 'specification',
    ),
    true,
  );
}

function testDefaultDefinitionsRemainUnfiltered() {
  const { folderDefinitions, slotDefinitions } = getManagedDocsSeedDefinitions();

  assert.equal(folderDefinitions.some((definition) => definition.sourceEntityType === 'interfaces'), true);
  assert.equal(slotDefinitions.some((definition) => definition.sourceEntityType === 'interfaces'), true);
}

function run() {
  testFoundationDefinitionsExcludeInterfaces();
  testInterfaceDefinitionsIncludeSpecificationSlot();
  testDefaultDefinitionsRemainUnfiltered();
}

run();
