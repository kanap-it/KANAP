import * as assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { InlineImageResolverService } from '../inline-image-resolver.service';

const DOC = '11111111-1111-4111-8111-111111111111';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function nodeStream(chunks: Buffer[], onDestroy?: () => void): Readable {
  const stream = Readable.from(chunks);
  const original = stream.destroy.bind(stream);
  (stream as any).destroy = (error?: Error) => {
    onDestroy?.();
    return original(error as any);
  };
  return stream;
}

function build(options: {
  documentMeta?: { storagePath: string; mimeType: string | null } | null;
  attachmentRow?: { storage_path: string; mime_type: string | null } | null;
  resourceAllowed?: boolean;
  storageContentType?: string | null;
  storageChunks?: Buffer[];
  onDestroy?: () => void;
}) {
  const calls = {
    documentMeta: [] as any[],
    resourceChecks: [] as any[],
    queries: [] as Array<{ sql: string; params: any[] }>,
    storageKeys: [] as string[],
  };
  const knowledge = {
    getInlineAttachmentMetaForUser: async (...args: any[]) => {
      calls.documentMeta.push(args);
      return options.documentMeta === undefined
        ? { storagePath: 'files/a.png', mimeType: 'image/png' }
        : options.documentMeta;
    },
    canAccessResourceForUser: async (...args: any[]) => {
      calls.resourceChecks.push(args);
      return options.resourceAllowed ?? true;
    },
  };
  const manager = {
    query: async (sql: string, params: any[]) => {
      calls.queries.push({ sql, params });
      const row = options.attachmentRow === undefined
        ? { storage_path: 'files/a.png', mime_type: 'image/png' }
        : options.attachmentRow;
      return row ? [row] : [];
    },
  };
  const storage = {
    getObjectStream: async (key: string) => {
      calls.storageKeys.push(key);
      return {
        stream: nodeStream(options.storageChunks || [PNG], options.onDestroy),
        contentType: options.storageContentType ?? 'image/png',
      };
    },
  };
  const resolver = new InlineImageResolverService(knowledge as any, storage as any);
  const ctx = { manager: manager as any, tenantId: 'tenant-a', userId: 'user-1' };
  return { resolver, ctx, calls };
}

async function run() {
  // ------------------------------------------------- reconnaissance des chemins
  {
    const { resolver } = build({});
    const cases: Array<[string, string | null, string | null]> = [
      [`/api/knowledge/inline/fromage/${DOC}`, 'document', DOC],
      [`https://app.dev.kanap.net/api/knowledge/inline/fromage/${DOC}`, 'document', DOC],
      [`http://localhost:8080/knowledge/inline/fromage/${DOC}`, 'document', DOC],
      [`/knowledge/inline/fromage/${DOC}?v=2`, 'document', DOC],
      [`/api/portfolio/projects/inline/fromage/${DOC}`, 'project', DOC],
      [`/api/portfolio/requests/inline/fromage/${DOC}`, 'request', DOC],
      [`/tasks/attachments/fromage/${DOC}/inline`, 'task', DOC],
      // Cinquième famille volontairement hors périmètre (images de conversation IA).
      [`/ai/conversations/${DOC}/inline`, null, null],
      ['https://cdn.example.com/logo.png', null, null],
      [`data:image/png;base64,${PNG.toString('base64')}`, null, null],
      ['/knowledge/inline/fromage/not-a-valid-id!!', null, null],
      ['/knowledge/attachments/' + DOC, null, null],
      ['', null, null],
    ];

    for (const [target, family, id] of cases) {
      const match = resolver.matchInternalInlinePath(target);
      assert.equal(match?.family ?? null, family, `famille inattendue pour ${target}`);
      assert.equal(match?.attachmentId ?? null, id, `identifiant inattendu pour ${target}`);
    }
  }

  // ------------------------------------------------------ famille document
  {
    const { resolver, ctx, calls } = build({});
    const result = await resolver.resolve(`/api/knowledge/inline/fromage/${DOC}`, ctx);

    assert.ok(result, 'image attendue');
    assert.ok(result!.buffer.equals(PNG));
    assert.equal(result!.mimeType, 'image/png');
    assert.equal(calls.documentMeta.length, 1, 'la règle knowledge partagée doit être utilisée');
    assert.equal(calls.documentMeta[0][1], 'tenant-a');
    assert.equal(calls.documentMeta[0][2], 'user-1');
    assert.equal(calls.storageKeys[0], 'files/a.png');
    // NB : sur une lecture complète, c'est Node qui détruit le flux en fin
    // d'itération ; l'annulation par le résolveur est vérifiée plus bas, au
    // dépassement de plafond.
  }

  // ------------------------------- attachement introuvable ou accès refusé
  {
    // Famille document : la règle partagée renvoie null (introuvable ou refusé).
    const documentDenied = build({ documentMeta: null });
    assert.equal(
      await documentDenied.resolver.resolve(`/api/knowledge/inline/fromage/${DOC}`, documentDenied.ctx),
      null,
    );

    // Familles portfolio / tâches : ligne absente (donc aussi filtre tenant).
    const missingRow = build({ attachmentRow: null });
    assert.equal(
      await missingRow.resolver.resolve(`/api/portfolio/projects/inline/fromage/${DOC}`, missingRow.ctx),
      null,
    );
  }

  // ------------------------------- familles portfolio / tâches : accès contrôlé
  for (const [target, resource] of [
    [`/api/portfolio/projects/inline/fromage/${DOC}`, 'portfolio_projects'],
    [`/api/portfolio/requests/inline/fromage/${DOC}`, 'portfolio_requests'],
    [`/tasks/attachments/fromage/${DOC}/inline`, 'tasks'],
  ] as const) {
    const allowed = build({ resourceAllowed: true });
    const granted = await allowed.resolver.resolve(target, allowed.ctx);
    assert.ok(granted, `${target} : image attendue`);
    assert.equal(allowed.calls.resourceChecks[0][2], resource, 'ressource RBAC attendue');
    assert.equal(allowed.calls.resourceChecks[0][1], 'user-1');
    // Filtre tenant explicite : une image d'un autre tenant ne peut pas être servie.
    assert.ok(
      allowed.calls.queries[0].sql.includes('tenant_id = $2'),
      'la requête doit filtrer sur le tenant',
    );
    assert.deepEqual(allowed.calls.queries[0].params, [DOC, 'tenant-a']);

    const denied = build({ resourceAllowed: false });
    const refused = await denied.resolver.resolve(target, denied.ctx);
    assert.equal(refused, null, `${target} : accès refusé doit renvoyer null`);
  }

  // ------------------------------------------------ plafond et libération
  {
    const destroy = { called: false };
    const { resolver, ctx } = build({
      storageChunks: [Buffer.alloc(11 * 1024 * 1024)],
      onDestroy: () => { destroy.called = true; },
    });
    const result = await resolver.resolve(`/api/knowledge/inline/fromage/${DOC}`, ctx);
    assert.equal(result, null, 'une image au-delà du plafond ne doit pas être servie');
    assert.equal(destroy.called, true, 'le flux de stockage doit être libéré');
  }

  // --------------------------------------- contexte incomplet / cible externe
  {
    const { resolver, calls } = build({});
    assert.equal(
      await resolver.resolve(`/api/knowledge/inline/fromage/${DOC}`, { manager: undefined as any, tenantId: 't', userId: 'u' }),
      null,
    );
    assert.equal(await resolver.resolve('/api/knowledge/inline/fromage/x', { manager: {} as any, tenantId: '', userId: 'u' }), null);
    assert.equal(await resolver.resolve('https://cdn.example.com/logo.png', { manager: {} as any, tenantId: 't', userId: 'u' }), null);
    assert.equal(calls.documentMeta.length, 0, 'aucune résolution pour une cible externe');
    assert.equal(calls.queries.length, 0);
  }

  // ------------------------------------------------------- fabrique `exporter`
  {
    const { resolver, ctx } = build({});
    assert.equal(resolver.exporter({}), undefined);
    assert.equal(resolver.exporter({ manager: ctx.manager, tenantId: 'tenant-a' }), undefined);
    const exporter = resolver.exporter(ctx);
    assert.equal(typeof exporter, 'function');
    const image = await exporter!(`/api/knowledge/inline/fromage/${DOC}`);
    assert.ok(image && image.buffer.equals(PNG));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
