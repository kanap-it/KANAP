import * as assert from 'node:assert/strict';
import { AiSettingsService } from '../ai-settings.service';
import { AiSettings } from '../ai-settings.entity';
import { Features } from '../../config/features';

function createMockSettings(overrides?: Partial<AiSettings>): AiSettings {
  return {
    id: 'settings-1',
    tenant_id: 'tenant-1',
    chat_enabled: false,
    mcp_enabled: false,
    provider_source: 'custom',
    llm_provider: null,
    llm_api_key_encrypted: null,
    llm_endpoint_url: null,
    llm_model: null,
    mcp_key_max_lifetime_days: null,
    conversation_retention_days: null,
    web_search_enabled: false,
    web_enrichment_enabled: false,
    glpi_enabled: false,
    glpi_url: null,
    glpi_user_token_encrypted: null,
    glpi_app_token_encrypted: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createService(settings: AiSettings) {
  const queryBuilder = {
    addSelect: () => queryBuilder,
    where: () => ({
      getOne: async () => settings,
    }),
  };
  const repo = {
    manager: {
      getRepository: () => ({
        createQueryBuilder: () => queryBuilder,
        save: async (entity: AiSettings) => entity,
        create: (data: any) => ({ ...settings, ...data }),
      }),
    },
  };

  const providerRegistry = {
    validate: () => [],
    get: () => true,
  };

  const cipher = {
    encrypt: (v: string) => `enc:${v}`,
    canEncrypt: () => true,
  };

  const platformAiConfig = {
    isConfigured: async () => true,
  };

  return new AiSettingsService(repo as any, providerRegistry as any, cipher as any, platformAiConfig as any);
}

async function testRejectsWebSearchWhenEnvVarAbsent() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    (Features as any).AI_WEB_SEARCH_READY = false;
    const service = createService(createMockSettings());

    await assert.rejects(
      () => service.update('tenant-1', { web_search_enabled: true }),
      (error: any) => error.message?.includes('BRAVE_SEARCH_API_KEY') || error.response?.message?.includes('BRAVE_SEARCH_API_KEY'),
    );
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function testAcceptsWebSearchWhenEnvVarPresent() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    (Features as any).AI_WEB_SEARCH_READY = true;
    const service = createService(createMockSettings());

    const result = await service.update('tenant-1', { web_search_enabled: true });
    assert.equal(result.web_search_enabled, true);
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function testEnrichmentWithoutSearchThrows() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    (Features as any).AI_WEB_SEARCH_READY = true;
    const service = createService(createMockSettings({ web_search_enabled: false }));

    await assert.rejects(
      () => service.update('tenant-1', { web_enrichment_enabled: true }),
      (error: any) => {
        const msg = error.message || error.response?.message || '';
        return msg.includes('web search') || msg.includes('Web enrichment');
      },
    );
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function testDisablingSearchCascadesEnrichment() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    (Features as any).AI_WEB_SEARCH_READY = true;
    const service = createService(createMockSettings({
      web_search_enabled: true,
      web_enrichment_enabled: true,
    }));

    const result = await service.update('tenant-1', { web_search_enabled: false });
    assert.equal(result.web_search_enabled, false);
    assert.equal(result.web_enrichment_enabled, false);
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function testUnrelatedSaveDoesNotBlockWhenEnvVarRemoved() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    // Simulate env var removed after web_search was already enabled
    (Features as any).AI_WEB_SEARCH_READY = false;
    const service = createService(createMockSettings({
      web_search_enabled: true,
      web_enrichment_enabled: true,
    }));

    // Changing an unrelated field should not fail
    const result = await service.update('tenant-1', { llm_model: 'gpt-4o-mini' });
    assert.equal(result.llm_model, 'gpt-4o-mini');
    // web_search_enabled remains true from the original settings
    assert.equal(result.web_search_enabled, true);
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function testEnablingGlpiRequiresUrlAndToken() {
  const service = createService(createMockSettings());

  await assert.rejects(
    () => service.update('tenant-1', { glpi_enabled: true }),
    (error: any) => {
      const msg = error.message || error.response?.message || '';
      return msg.includes('glpi_url');
    },
  );

  await assert.rejects(
    () => service.update('tenant-1', {
      glpi_url: 'https://glpi.internal',
      glpi_enabled: true,
    }),
    (error: any) => {
      const msg = error.message || error.response?.message || '';
      return msg.includes('glpi_user_token');
    },
  );
}

async function testGlpiSecretsAreStoredEncryptedAndHiddenInView() {
  const service = createService(createMockSettings());

  const updated = await service.update('tenant-1', {
    glpi_enabled: true,
    glpi_url: 'https://glpi.internal/helpdesk',
    glpi_user_token: 'user-secret',
    glpi_app_token: 'app-secret',
  });
  const view = await service.toView(updated);

  assert.equal(updated.glpi_enabled, true);
  assert.equal(updated.glpi_url, 'https://glpi.internal/helpdesk');
  assert.equal(updated.glpi_user_token_encrypted, 'enc:user-secret');
  assert.equal(updated.glpi_app_token_encrypted, 'enc:app-secret');
  assert.equal(view.glpi_enabled, true);
  assert.equal(view.glpi_url, 'https://glpi.internal/helpdesk');
  assert.equal(view.has_glpi_user_token, true);
  assert.equal(view.has_glpi_app_token, true);
}

async function run() {
  await testRejectsWebSearchWhenEnvVarAbsent();
  await testAcceptsWebSearchWhenEnvVarPresent();
  await testEnrichmentWithoutSearchThrows();
  await testDisablingSearchCascadesEnrichment();
  await testUnrelatedSaveDoesNotBlockWhenEnvVarRemoved();
  await testEnablingGlpiRequiresUrlAndToken();
  await testGlpiSecretsAreStoredEncryptedAndHiddenInView();
}

void run();
