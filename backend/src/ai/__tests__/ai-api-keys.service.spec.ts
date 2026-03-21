import * as assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { AiApiKeysService } from '../ai-api-keys.service';
import { McpApiKeyHashService } from '../auth/mcp-api-key-hash.service';

function createService(options?: {
  records?: any[];
  user?: any;
}) {
  const records = options?.records ?? [];
  const repoImpl = {
    createQueryBuilder() {
      let keyPrefix: string | null = null;
      let tenantId: string | null = null;

      return {
        addSelect() {
          return this;
        },
        where(_sql: string, params: Record<string, string>) {
          keyPrefix = params.keyPrefix ?? null;
          return this;
        },
        andWhere(_sql: string, params: Record<string, string>) {
          tenantId = params.tenantId ?? null;
          return this;
        },
        async getMany() {
          return records.filter((record) => (
            (!keyPrefix || record.key_prefix === keyPrefix)
            && (!tenantId || record.tenant_id === tenantId)
          ));
        },
      };
    },
    async save(record: any) {
      return record;
    },
    async find() {
      return records;
    },
    async findOne({ where }: any) {
      return records.find((record) => record.id === where.id) ?? null;
    },
    create(payload: any) {
      return payload;
    },
  };

  return new AiApiKeysService(
    {
      manager: {
        getRepository: () => repoImpl,
      },
    } as any,
    {
      findById: async () => options?.user ?? {
        id: 'user-1',
        email: 'user@example.com',
        status: 'enabled',
        role: { role_name: 'Member', is_system: false },
      },
    } as any,
    new McpApiKeyHashService(),
    {
      find: async () => null,
    } as any,
  );
}

async function testRejectsInvalidPrefix() {
  const service = createService();
  await assert.rejects(
    () => service.authenticatePresentedKey('not-a-real-key'),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      assert.match(String((error as any).message || ''), /Invalid MCP API key/);
      return true;
    },
  );
}

async function testRejectsRevokedKeys() {
  const hashService = new McpApiKeyHashService();
  const generated = hashService.generate();
  const service = createService({
    records: [{
      id: 'key-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      key_prefix: generated.keyPrefix,
      key_hash: generated.keyHash,
      label: 'Desktop',
      created_at: new Date(),
      expires_at: null,
      last_used_at: null,
      revoked_at: new Date(),
      created_by_user_id: 'user-1',
    }],
  });

  await assert.rejects(
    () => service.authenticatePresentedKey(generated.rawKey),
    /revoked/,
  );
}

async function testRejectsExpiredKeys() {
  const hashService = new McpApiKeyHashService();
  const generated = hashService.generate();
  const service = createService({
    records: [{
      id: 'key-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      key_prefix: generated.keyPrefix,
      key_hash: generated.keyHash,
      label: 'Desktop',
      created_at: new Date(),
      expires_at: new Date('2000-01-01T00:00:00.000Z'),
      last_used_at: null,
      revoked_at: null,
      created_by_user_id: 'user-1',
    }],
  });

  await assert.rejects(
    () => service.authenticatePresentedKey(generated.rawKey),
    /expired/,
  );
}

async function testRejectsDisabledOwners() {
  const hashService = new McpApiKeyHashService();
  const generated = hashService.generate();
  const service = createService({
    records: [{
      id: 'key-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      key_prefix: generated.keyPrefix,
      key_hash: generated.keyHash,
      label: 'Desktop',
      created_at: new Date(),
      expires_at: null,
      last_used_at: null,
      revoked_at: null,
      created_by_user_id: 'user-1',
    }],
    user: {
      id: 'user-1',
      email: 'user@example.com',
      status: 'disabled',
      role: { role_name: 'Member', is_system: false },
    },
  });

  await assert.rejects(
    () => service.authenticatePresentedKey(generated.rawKey),
    /owner is not allowed/,
  );
}

async function run() {
  await testRejectsInvalidPrefix();
  await testRejectsRevokedKeys();
  await testRejectsExpiredKeys();
  await testRejectsDisabledOwners();
}

void run();
