import * as assert from 'node:assert/strict';
import {
  filterProviderToolsForProfile,
  selectAiContextProfile,
  selectAiContextProfileForTurn,
} from '../ai-context-profile';
import type { AiProviderToolDef } from '../providers/ai-provider.types';

function tool(name: string): AiProviderToolDef {
  return {
    name,
    description: `${name} description`,
    parameters: { type: 'object', properties: {} },
  };
}

async function testSelectsMinimalProfileForDirectGreeting() {
  const profile = selectAiContextProfile('salut');
  assert.equal(profile.name, 'minimal');
  assert.deepEqual(profile.toolNames, []);
}

async function testSelectsKnowledgeProfileForDocumentSearch() {
  const profile = selectAiContextProfile('Find documents about backups');
  assert.equal(profile.name, 'knowledge');
  assert.ok(profile.toolNames.includes('search_knowledge'));
  assert.ok(profile.toolNames.includes('get_document'));
  assert.ok(!profile.toolNames.includes('create_document'));
}

async function testSelectsWriteProfileForDocumentCreationFromEntity() {
  const profile = selectAiContextProfile('create a document from T-48');
  assert.equal(profile.name, 'write_document');
  assert.ok(profile.toolNames.includes('get_entity_detail'));
  assert.ok(profile.toolNames.includes('create_document'));
  assert.ok(!profile.toolNames.includes('web_search'));
}

async function testSelectsExpectedProfilesForObservedWorkflows() {
  const cases = [
    ['Show me my overdue tasks', 'read_query'],
    ['Show current tasks', 'read_query'],
    ['How many tasks are in progress by status?', 'read_query'],
    ['Summarize T-48', 'entity_inspection'],
    ['Create a task to invent sliced bread.', 'write_task'],
    ['Change T-48 status to done.', 'write_task'],
    ['Add a comment to T-48', 'write_task'],
    ['tu peux passer la @T-49 en "en cours" ?', 'write_task'],
    ['tu peux passer la [T-49](/portfolio/tasks/123) en "en cours" ?', 'write_task'],
    ['Change [APP-41](/it/applications/41) status to retired.', 'write_business'],
    ['Publish DOC-151.', 'write_document'],
    ['Link APP-41 to PRJ-12.', 'write_relation'],
    ['Create something useful for onboarding', 'write_general'],
    ['Change ABC-12 status to done.', 'write_general'],
    ["cherche la météo d'obernai pour demain sur internet", 'web'],
    ['What is the latest Windows Server version?', 'web'],
  ] as const;

  for (const [prompt, expectedProfile] of cases) {
    assert.equal(selectAiContextProfile(prompt).name, expectedProfile, prompt);
  }
}

async function testFiltersProviderToolsForProfile() {
  const profile = selectAiContextProfile('cherche la meteo pour demain sur internet');
  const selected = filterProviderToolsForProfile(
    [
      tool('web_search'),
      tool('query_entities'),
      tool('create_task'),
    ],
    profile,
  );
  assert.deepEqual(selected.map((item) => item.name), ['web_search']);
}

async function testNonWebProfilesExposeAllKanapToolsButPrioritizeProfileTools() {
  const profile = selectAiContextProfile('Show me overdue tasks');
  const selected = filterProviderToolsForProfile(
    [
      tool('web_search'),
      tool('create_task'),
      tool('query_entities'),
      tool('search_all'),
    ],
    profile,
  );

  assert.deepEqual(
    selected.map((item) => item.name),
    ['search_all', 'query_entities', 'create_task'],
  );
}

async function testContinuationInheritsOpenWriteRequestProfile() {
  const profile = selectAiContextProfileForTurn([
    { role: 'user', content: 'tu peux ajouter un commentaire à la [T-49](/portfolio/tasks/123) ?' },
    { role: 'assistant', content: 'Je peux ajouter un commentaire à la tâche T-49. Quel contenu souhaitez-vous y inscrire ?' },
    { role: 'user', content: '"Jalopeno for the win"' },
  ]);

  assert.equal(profile.name, 'write_task');
  assert.ok(profile.toolNames.includes('add_task_comment'));
}

async function testExplicitNewIntentDoesNotInheritOpenWriteRequestProfile() {
  const profile = selectAiContextProfileForTurn([
    { role: 'user', content: 'tu peux ajouter un commentaire à la [T-49](/portfolio/tasks/123) ?' },
    { role: 'assistant', content: 'Quel contenu souhaitez-vous y inscrire ?' },
    { role: 'user', content: 'Show me overdue tasks' },
  ]);

  assert.equal(profile.name, 'read_query');
  assert.ok(!profile.toolNames.includes('add_task_comment'));
}

async function run() {
  await testSelectsMinimalProfileForDirectGreeting();
  await testSelectsKnowledgeProfileForDocumentSearch();
  await testSelectsWriteProfileForDocumentCreationFromEntity();
  await testSelectsExpectedProfilesForObservedWorkflows();
  await testFiltersProviderToolsForProfile();
  await testNonWebProfilesExposeAllKanapToolsButPrioritizeProfileTools();
  await testContinuationInheritsOpenWriteRequestProfile();
  await testExplicitNewIntentDoesNotInheritOpenWriteRequestProfile();
}

void run();
