import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { DocumentExportService, ExportImageFetchOptions } from '../document-export.service';

async function withEnv<T>(
  values: Record<string, string | undefined>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withMockFetch(
  mockFetch: typeof fetch,
  fn: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function pngResponse(): Response {
  return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  });
}

function imageNode(target: string, alt = 'alt'): any {
  return { t: 'Image', c: [['', [], []], [{ t: 'Str', c: alt }], [target, '']] };
}

function context(service: DocumentExportService, opts?: ExportImageFetchOptions) {
  return {
    service,
    ctx: {
      opts,
      cache: new Map<string, string>(),
      budget: { downloadedBytes: 0, inlinedBytes: 0 },
    },
  };
}

function documentWith(blocks: any[]): any {
  return {
    'pandoc-api-version': [1, 23, 1],
    meta: { 'header-includes': { t: 'MetaString', c: '#read("/etc/passwd")' } },
    blocks,
  };
}

function collectImageTargets(node: any, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) collectImageTargets(child, found);
    return found;
  }
  if (!node || typeof node !== 'object') return found;
  if (node.t === 'Image' && Array.isArray(node.c) && Array.isArray(node.c[2])) {
    found.push(String(node.c[2][0]));
  }
  for (const value of Object.values(node)) collectImageTargets(value, found);
  return found;
}

async function run() {
  // ------------------------------------------------------------------ allowlist
  await withEnv({
    APP_ENV: undefined,
    NODE_ENV: undefined,
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, () => {
    const service = new DocumentExportService();
    assert.throws(
      () => (service as any).assertAllowedImageHost('127.0.0.1'),
      (error: unknown) => error instanceof BadRequestException,
    );
    assert.doesNotThrow(() => (service as any).assertAllowedImageHost('cdn.example.com'));
  });

  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, () => {
    const service = new DocumentExportService();
    assert.throws(
      () => (service as any).assertAllowedImageHost('127.0.0.1'),
      (error: unknown) => error instanceof BadRequestException,
    );
    assert.doesNotThrow(() => (service as any).assertAllowedImageHost('cdn.example.com'));
  });

  // ------------------------------------- téléchargement autorisé -> data: URI
  // Les en-têtes transmis (dont le cookie de session) ne partent que vers notre
  // propre infrastructure : un hôte tiers autorisé n'en reçoit aucun.
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    APP_URL: 'https://app.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    await withMockFetch(async (input, init) => {
      fetchCalls.push({ input, init });
      assert.equal(init?.redirect, 'error');
      assert.deepEqual(init?.headers, { Authorization: 'Bearer export-test' });
      return pngResponse();
    }, async () => {
      const { ctx } = context(service, { imageFetchHeaders: { Authorization: 'Bearer export-test' } });
      const uri = await (service as any).fetchImageAsDataUri('https://app.example.com/image.png', ctx);
      assert.ok(uri.startsWith('data:image/png;base64,'), `unexpected data URI: ${uri.slice(0, 40)}`);
      assert.equal(ctx.budget.downloadedBytes, 8);
    });
    assert.equal(fetchCalls.length, 1);
    assert.equal(String(fetchCalls[0].input), 'https://app.example.com/image.png');
  });

  // ---------------------------------- redirection refusée (redirect: 'error')
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const redirectedLoopbackUrl = 'http://127.0.0.1:8080/internal.png';
    let simulatedLoopbackHits = 0;

    await withMockFetch(async (input, init) => {
      assert.equal(String(input), 'http://cdn.example.com/redirecting-image.png');
      if (init?.redirect !== 'error') {
        simulatedLoopbackHits += 1;
        return pngResponse();
      }
      throw new TypeError(`fetch failed due to redirect to ${redirectedLoopbackUrl}`);
    }, async () => {
      const { ctx } = context(service);
      await assert.rejects(
        () => (service as any).fetchImageAsDataUri('http://cdn.example.com/redirecting-image.png', ctx),
        (error: unknown) => error instanceof BadRequestException
          && String((error as Error).message).includes(redirectedLoopbackUrl),
      );
    });

    assert.equal(simulatedLoopbackHits, 0);
  });

  // --------------------- hôte interdit : rejet attendu ET aucun accès réseau
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      // Forme résolue par le lecteur Pandoc pour `![x][r]` + `[r]: http://127.0.0.1/...`
      const doc = documentWith([{ t: 'Para', c: [imageNode('http://127.0.0.1:8080/internal-admin')] }]);
      await assert.rejects(
        () => (service as any).inlineAstImages(doc, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });

    assert.equal(fetchCount, 0);
  });

  // ------------------ ressource autorisée : incorporée, mise en cache, tracée
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const doc = documentWith([
        { t: 'Para', c: [imageNode('http://cdn.example.com/logo.png')] },
        { t: 'Para', c: [imageNode('http://cdn.example.com/logo.png')] },
      ]);
      await (service as any).inlineAstImages(doc, ctx);

      const targets = collectImageTargets(doc);
      assert.equal(targets.length, 2);
      for (const target of targets) {
        assert.ok(target.startsWith('data:image/png;base64,'), `cible non validée: ${target}`);
      }
      // Une seule requête pour deux occurrences, mais deux incorporations comptées.
      assert.equal(fetchCount, 1);
      assert.equal(ctx.budget.downloadedBytes, 8);
      assert.equal(ctx.budget.inlinedBytes, targets[0].length * 2);
    });
  });

  // ------------------------------------ métadonnées écartées et HTML converti
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    await withMockFetch(async () => pngResponse(), async () => {
      const { ctx } = context(service);
      const doc = documentWith([
        { t: 'RawInline', c: ['html', '<img src="http://cdn.example.com/a.png" alt="A">'] },
        { t: 'RawBlock', c: ['html', '<div><img src="http://cdn.example.com/b.png"></div>'] },
      ]);
      await (service as any).inlineAstImages(doc, ctx);

      assert.deepEqual(doc.meta, {}, 'les métadonnées du document doivent être écartées');
      const targets = collectImageTargets(doc);
      assert.equal(targets.length, 2, 'les images HTML doivent être converties');
      for (const target of targets) {
        assert.ok(target.startsWith('data:image/png;base64,'));
      }
    });
  });

  // ------------------------------ data: fourni par l'auteur : rejet et zéro accès
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const doc = documentWith([
        { t: 'Para', c: [imageNode('data:image/png;base64,iVBORw0KGgo=')] },
      ]);
      await assert.rejects(
        () => (service as any).inlineAstImages(doc, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });

    assert.equal(fetchCount, 0);
  });

  // --------------------------------- chemin local : jamais lu comme un fichier
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_MEDIA_BASE_URL: undefined,
    APP_URL: undefined,
    APP_BASE_URL: undefined,
    PUBLIC_APP_URL: undefined,
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      // `![x][r]` + `[r]: /tmp/canary.txt` : sans base média configurée, la cible
      // est refusée. Dans tous les cas, elle n'est jamais lue sur le disque.
      const doc = documentWith([{ t: 'Para', c: [imageNode('/tmp/audit-canary.txt')] }]);
      await assert.rejects(
        () => (service as any).inlineAstImages(doc, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });

    assert.equal(fetchCount, 0);
  });

  // --------- chemin racine avec base média : traité comme une URL de l'application
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_MEDIA_BASE_URL: 'https://app.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const requested: string[] = [];

    await withMockFetch(async (input) => {
      requested.push(String(input));
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const doc = documentWith([{ t: 'Para', c: [imageNode('/tmp/audit-canary.txt')] }]);
      await (service as any).inlineAstImages(doc, ctx);
    });

    // La cible est devenue une requête vers l'origine de l'application : le
    // contenu d'un fichier local ne peut pas se retrouver dans le document.
    assert.deepEqual(requested, ['https://app.example.com/tmp/audit-canary.txt']);
  });

  // ----------------------------------------- cible vide : remplacée par son alt
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;
    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const doc = documentWith([{ t: 'Para', c: [imageNode('', 'texte de remplacement')] }]);
      await (service as any).inlineAstImages(doc, ctx);
      assert.equal(collectImageTargets(doc).length, 0);
      assert.equal(JSON.stringify(doc).includes('texte de remplacement'), true);
    });
    assert.equal(fetchCount, 0);
  });

  // ------------------------- plafond par image appliqué PENDANT le transfert
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const oneMegabyte = new Uint8Array(1024 * 1024);
    let pulls = 0;

    const stream = new ReadableStream({
      pull(controller) {
        pulls += 1;
        controller.enqueue(oneMegabyte);
      },
    });
    const response = new Response(stream, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });

    await assert.rejects(
      () => (service as any).readImageBody(response, 'http://cdn.example.com/big.png', 32 * 1024 * 1024),
      (error: unknown) => error instanceof BadRequestException
        && /too large/i.test(String((error as Error).message)),
    );

    // 10 Mio autorisés : la lecture doit s'arrêter au 11e morceau, pas consommer
    // l'intégralité d'un flux qui en produirait indéfiniment.
    assert.ok(pulls <= 12, `le flux a été consommé trop loin: ${pulls} morceaux`);
  });

  // ------------------- dépassement : le flux est réellement annulé, pas seulement
  // ------------------- abandonné (`body.cancel()` échoue sur un flux verrouillé)
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let sourceCancelled = false;
    const oneMegabyte = new Uint8Array(1024 * 1024);

    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(oneMegabyte);
      },
      cancel() {
        sourceCancelled = true;
      },
    });
    const response = new Response(stream, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });

    await assert.rejects(
      () => (service as any).readImageBody(response, 'http://cdn.example.com/big.png', 32 * 1024 * 1024),
      (error: unknown) => error instanceof BadRequestException,
    );

    assert.equal(sourceCancelled, true, 'le flux doit être annulé au dépassement de taille');
  });

  // ------------------- type refusé : la réponse abandonnée est annulée aussi
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let sourceCancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel() {
        sourceCancelled = true;
      },
    });

    await withMockFetch(async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }), async () => {
      const { ctx } = context(service);
      await assert.rejects(
        () => (service as any).fetchImageAsDataUri('http://cdn.example.com/page.html', ctx),
        (error: unknown) => error instanceof BadRequestException
          && /unexpected content-type/i.test(String((error as Error).message)),
      );
    });

    assert.equal(sourceCancelled, true, 'une réponse de type refusé doit être annulée');
  });

  // ------------------- image imbriquée dans le texte alternatif : validée aussi
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const requested: string[] = [];

    // Forme réelle produite par le lecteur : `![alt ![inner][i] suite][outer]`
    // place un nœud Image dans le texte alternatif (c[1]) de l'image externe.
    const nestedImage = (innerTarget: string, outerTarget: string) => ({
      t: 'Image',
      c: [
        ['', [], []],
        [
          { t: 'Str', c: 'alt' },
          { t: 'Space' },
          { t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'inner' }], [innerTarget, '']] },
          { t: 'Space' },
          { t: 'Str', c: 'suite' },
        ],
        [outerTarget, ''],
      ],
    });

    await withMockFetch(async (input) => {
      requested.push(String(input));
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const forbidden = documentWith([
        { t: 'Para', c: [nestedImage('http://127.0.0.1:8080/secret.png', 'http://cdn.example.com/outer.png')] },
      ]);
      await assert.rejects(
        () => (service as any).inlineAstImages(forbidden, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });
    assert.ok(
      !requested.includes('http://127.0.0.1:8080/secret.png'),
      `la cible imbriquée interdite ne doit jamais être contactée (contactées: ${requested.join(', ')})`,
    );

    await withMockFetch(async (input) => {
      requested.push(String(input));
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const allowed = documentWith([
        { t: 'Para', c: [nestedImage('http://cdn.example.com/inner.png', 'http://cdn.example.com/outer.png')] },
      ]);
      await (service as any).inlineAstImages(allowed, ctx);
      const targets = collectImageTargets(allowed);
      assert.equal(targets.length, 2, 'les deux images doivent être présentes');
      for (const target of targets) {
        assert.ok(target.startsWith('data:image/png;base64,'), `cible non validée: ${target}`);
      }
    });

    // Cible externe vide : le texte alternatif est conservé, et l'image qu'il
    // contient doit malgré tout être validée avant toute autre opération.
    const beforeDropped = requested.length;
    await withMockFetch(async (input) => {
      requested.push(String(input));
      return pngResponse();
    }, async () => {
      const { ctx } = context(service);
      const dropped = documentWith([
        { t: 'Para', c: [nestedImage('http://127.0.0.1:8080/secret.png', '')] },
      ]);
      await assert.rejects(
        () => (service as any).inlineAstImages(dropped, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });
    assert.equal(requested.length, beforeDropped, 'aucune requête ne doit être émise');
  });

  // ------------------- l'arbre est préservé hormis images et métadonnées (forme)
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    // Arbre volontairement varié : table avec légende vide (`Maybe` à null),
    // note de bas de page, liens, attributs. Aucune image : la structure doit
    // ressortir strictement identique, sinon Pandoc refuse le JSON (c'est arrivé).
    const document = {
      'pandoc-api-version': [1, 23, 1],
      meta: { title: { t: 'MetaInlines', c: [{ t: 'Str', c: 'Titre' }] } },
      blocks: [
        { t: 'Header', c: [1, ['sec', [], []], [{ t: 'Str', c: 'Titre' }]] },
        {
          t: 'Table',
          c: [
            ['', [], []],
            [null, []],
            [],
            [{ t: 'Plain', c: [{ t: 'Str', c: 'a' }] }],
            [],
            [],
          ],
        },
        { t: 'Para', c: [{ t: 'Str', c: 'texte ' }, { t: 'Note', c: [{ t: 'Plain', c: [{ t: 'Str', c: 'note' }] }] }] },
        { t: 'Para', c: [{ t: 'Link', c: [['', [], []], [{ t: 'Str', c: 'lien' }], ['https://example.com', '']] }] },
      ],
    };
    const expected = JSON.parse(JSON.stringify(document));
    expected.meta = {};

    await withMockFetch(async () => pngResponse(), async () => {
      const { ctx } = context(service);
      await (service as any).inlineAstImages(document, ctx);
    });

    assert.deepEqual(document, expected, "l'arbre doit garder sa forme d'origine");
  });

  // ------------------------------------------------- budget global dépassé
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, () => {
    const service = new DocumentExportService();
    assert.throws(
      () => (service as any).assertImageBytesWithinCaps(2048, 1024, 'http://cdn.example.com/x.png'),
      (error: unknown) => error instanceof BadRequestException
        && /size budget/i.test(String((error as Error).message)),
    );
    assert.doesNotThrow(() => (service as any).assertImageBytesWithinCaps(512, 1024, 'http://cdn.example.com/x.png'));
  });

  // ------------- résolveur interne prioritaire, avant toute validation d'hôte
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    APP_URL: 'https://stale-host.invalid',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const seen: string[] = [];
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service, {
        resolveInlineImage: async (rawTarget: string) => {
          seen.push(rawTarget);
          return { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mimeType: 'image/png' };
        },
      });
      // Hôte inconnu de la liste autorisée : sans la priorité au résolveur,
      // `normalizeAndValidateImageTarget` lèverait « host is not allowed ».
      const doc = documentWith([
        { t: 'Para', c: [imageNode('https://stale-host.invalid/api/knowledge/inline/fromage/11111111-1111-4111-8111-111111111111')] },
      ]);
      await (service as any).inlineAstImages(doc, ctx);

      const targets = collectImageTargets(doc);
      assert.equal(targets.length, 1);
      assert.ok(targets[0].startsWith('data:image/png;base64,'), `cible non incorporée: ${targets[0]}`);
      assert.equal(ctx.budget.downloadedBytes, 4, 'les octets résolus entrent dans le budget total');
    });

    assert.deepEqual(seen, [
      'https://stale-host.invalid/api/knowledge/inline/fromage/11111111-1111-4111-8111-111111111111',
    ], 'le résolveur reçoit la cible brute');
    assert.equal(fetchCount, 0, 'aucune requête ne doit être émise pour une image résolue en interne');
  });

  // ------------- résolveur muet : le comportement d'origine s'applique inchangé
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    let fetchCount = 0;

    await withMockFetch(async () => {
      fetchCount += 1;
      return pngResponse();
    }, async () => {
      const { ctx } = context(service, { resolveInlineImage: async () => null });
      const doc = documentWith([
        { t: 'Para', c: [imageNode('http://127.0.0.1:8080/internal-admin')] },
      ]);
      await assert.rejects(
        () => (service as any).inlineAstImages(doc, ctx),
        (error: unknown) => error instanceof BadRequestException,
      );
    });
    assert.equal(fetchCount, 0);
  });

  // ------------- cookie : transmis à notre infrastructure, jamais à un tiers
  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    APP_URL: 'https://app.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    const service = new DocumentExportService();
    const requests: Array<{ url: string; headers: any }> = [];

    await withMockFetch(async (input, init) => {
      requests.push({ url: String(input), headers: init?.headers });
      return pngResponse();
    }, async () => {
      const { ctx } = context(service, { imageFetchHeaders: { Cookie: 'refresh_token=SYNTHETIC' } });
      await (service as any).fetchImageAsDataUri('http://cdn.example.com/a.png', ctx);
      await (service as any).fetchImageAsDataUri('https://app.example.com/b.png', ctx);
    });

    assert.equal(requests[0].headers?.Cookie, undefined, 'aucun cookie vers un CDN tiers autorisé');
    assert.equal(requests[1].headers?.Cookie, 'refresh_token=SYNTHETIC', 'cookie conservé vers notre hôte');
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
