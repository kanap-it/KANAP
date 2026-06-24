import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { GlpiService } from '../glpi/glpi.service';

function createService(glpiUrl = 'https://glpi.internal') {
  return new GlpiService(
    {
      find: async () => ({
        glpi_url: glpiUrl,
        glpi_user_token_encrypted: 'enc:user-token',
        glpi_app_token_encrypted: 'enc:app-token',
      }),
    } as any,
    {
      decrypt: (value: string) => value.replace(/^enc:/, ''),
    } as any,
  );
}

async function testInitSessionSendsJsonHeaders() {
  const service = createService();
  const originalFetch = global.fetch;
  let capturedHeaders: Headers | undefined;

  try {
    global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      // initSession now also calls getFullSession; capture the first (initSession) call's
      // headers so the auth-header assertions below check the initSession request.
      if (!capturedHeaders) capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ session_token: 'session-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const session = await service.initSession('tenant-1', {} as any);
    assert.equal(session.sessionToken, 'session-1');
    assert.equal(capturedHeaders?.get('accept'), 'application/json');
    assert.equal(capturedHeaders?.get('content-type'), 'application/json');
    assert.equal(capturedHeaders?.get('authorization'), 'user_token user-token');
    assert.equal(capturedHeaders?.get('app-token'), 'app-token');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testInitSessionExplainsHtmlResponse() {
  const service = createService();
  const originalFetch = global.fetch;

  try {
    global.fetch = (async () => new Response('<html><body>Login</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    })) as typeof fetch;

    await assert.rejects(
      () => service.initSession('tenant-1', {} as any),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('GLPI returned HTML instead of JSON'),
    );
  } finally {
    global.fetch = originalFetch;
  }
}

async function testInitSessionNormalizesApiEndpointBaseUrl() {
  const service = createService('https://glpi.internal/helpdesk/apirest.php');
  const originalFetch = global.fetch;
  let requestedUrl = '';

  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      // Capture the first (initSession) request; initSession now also calls getFullSession.
      if (!requestedUrl) requestedUrl = String(input);
      return new Response(JSON.stringify({ session_token: 'session-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await service.initSession('tenant-1', {} as any);
    assert.equal(requestedUrl, 'https://glpi.internal/helpdesk/apirest.php/initSession');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testFetchDocumentUsesDocumentApiDownloadForDocumentSendUrls() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let requestedUrl = '';
  let capturedHeaders: Headers | undefined;

  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      capturedHeaders = new Headers(init?.headers);
      return new Response(Buffer.from('image-bytes'), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-disposition': 'inline; filename="ticket-image.png"',
        },
      });
    }) as typeof fetch;

    const document = await service.fetchDocument(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      '/front/document.send.php?docid=41260&itemtype=Ticket&items_id=59925',
    );

    assert.equal(requestedUrl, 'https://glpi.internal/helpdesk/apirest.php/Document/41260?alt=media');
    assert.equal(capturedHeaders?.get('accept'), 'application/octet-stream');
    assert.equal(capturedHeaders?.get('session-token'), 'session-token');
    assert.equal(capturedHeaders?.get('app-token'), 'app-token');
    assert.equal(document.mimeType, 'image/png');
    assert.equal(document.filename, 'ticket-image.png');
    assert.equal(document.buffer.toString(), 'image-bytes');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testGetTicketFollowupsPaginatesAndNormalizesNewestFirst() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  const requestedUrls: string[] = [];

  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes('range=0-49')) {
        return new Response(JSON.stringify([
          {
            id: 10,
            itemtype: 'Ticket',
            items_id: 4523,
            content: '<p>Older public</p><img src="/front/document.send.php?docid=88&amp;itemtype=Ticket" />',
            users_id: { id: 101, name: 'Alice Technician' },
            users_id_editor: { id: 999, name: 'Editor' },
            date: '2026-01-02 10:00:00',
            date_mod: '2026-01-02 10:05:00',
            is_private: 0,
          },
          {
            id: 11,
            itemtype: 'Ticket',
            items_id: 4523,
            content: '<p>Private note</p>',
            user_name: 'Manager',
            date_creation: '2026-01-03 10:00:00',
            is_private: '1',
          },
        ]), {
          status: 206,
          headers: {
            'content-type': 'application/json',
            'content-range': '0-1/3',
          },
        });
      }

      return new Response(JSON.stringify([
        {
          id: 12,
          itemtype: 'Ticket',
          items_id: 4523,
          content: '<p>Newest public</p>',
          users_id: { id: 202, name: 'Bob Requester' },
          date_mod: '2026-01-04 10:00:00',
          is_private: false,
        },
      ]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-range': '2-2/3',
        },
      });
    }) as typeof fetch;

    const followups = await service.getTicketFollowups(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      4523,
    );

    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0], /Ticket\/4523\/ITILFollowup/);
    assert.deepEqual(followups.map((item) => item.id), [12, 11, 10]);
    assert.equal(followups[0].author_label, 'Bob Requester');
    assert.equal(followups[0].author_id, 202);
    assert.equal(followups[1].is_private, true);
    assert.equal(followups[2].author_label, 'Alice Technician');
    assert.equal(followups[2].author_id, 101);
    assert.equal(followups[2].editor_id, 999);
    assert.equal(followups[2].updated_date, '2026-01-02 10:05:00');
    assert.deepEqual(followups[2].image_targets, ['/front/document.send.php?docid=88&itemtype=Ticket']);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testGetTicketUsersNormalizesRoles() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let requestedUrl = '';

  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify([
        { id: 1, users_id: { id: 202, name: 'Bob Requester' }, type: 1 },
        { id: 2, users_id: { id: 303, name: 'Alice Technician' }, type: 2 },
        { id: 3, users_id: { id: 404, name: 'Duty Manager' }, type: 3 },
        { id: 4, users_id: { id: 404, name: 'Duty Manager' }, type: 3 },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const users = await service.getTicketUsers(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      4523,
    );

    assert.match(requestedUrl, /Ticket\/4523\/Ticket_User/);
    assert.equal(users.length, 3);
    assert.deepEqual(users.map((item) => item.role), ['requester', 'assigned', 'observer']);
    assert.equal(users[0].user_id, 202);
    assert.equal(users[0].user_label, 'Bob Requester');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testGetTicketFollowupsStopsOnDuplicatePageWhenRangeIsIgnored() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let calls = 0;

  try {
    global.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify(
        Array.from({ length: 50 }, (_, index) => ({
          id: index + 1,
          content: `<p>Followup ${index + 1}</p>`,
          users_id: `User ${index + 1}`,
          date: `2026-01-01 10:${String(index).padStart(2, '0')}:00`,
          is_private: 0,
        })),
      ), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const followups = await service.getTicketFollowups(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      },
      4523,
    );

    assert.equal(calls, 2);
    assert.equal(followups.length, 50);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupUsesFixedPrivatePostEndpoint() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let requestedUrl = '';
  let capturedMethod = '';
  let capturedHeaders: Headers | undefined;
  let capturedBody: any;

  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      capturedMethod = String(init?.method || 'GET');
      capturedHeaders = new Headers(init?.headers);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: 987 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const result = await service.addTicketFollowup(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      4523,
      'Private operator triage note.',
    );

    assert.equal(requestedUrl, 'https://glpi.internal/helpdesk/apirest.php/ITILFollowup');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedHeaders?.get('session-token'), 'session-token');
    assert.equal(capturedHeaders?.get('app-token'), 'app-token');
    assert.deepEqual(capturedBody, {
      input: {
        itemtype: 'Ticket',
        items_id: 4523,
        content: 'Private operator triage note.',
        is_private: 1,
      },
    });
    assert.equal(result.id, 987);
    assert.equal(result.ticket_id, 4523);
    assert.equal(result.is_private, true);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupRejectsPublicWrites() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let called = false;

  try {
    global.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    await assert.rejects(
      () => service.addTicketFollowup(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        'Public note attempt.',
        { isPrivate: false },
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('Only private/internal GLPI followups are allowed'),
    );
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupAllowsExplicitPublicWrites() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let capturedBody: any = null;

  try {
    global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: 988 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const result = await service.addTicketFollowup(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      },
      4523,
      'Public requester reply.',
      { isPrivate: false, allowPublic: true },
    );

    assert.equal(capturedBody?.input?.is_private, 0);
    assert.equal(result.id, 988);
    assert.equal(result.ticket_id, 4523);
    assert.equal(result.is_private, false);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupAllowsLongExplicitPublicWritesOnly() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  const longReply = 'A'.repeat(4500);
  let capturedBody: any = null;
  let calls = 0;

  try {
    global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: 989 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await assert.rejects(
      () => service.addTicketFollowup(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        longReply,
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('GLPI internal note content exceeds the allowed length'),
    );
    assert.equal(calls, 0);

    const result = await service.addTicketFollowup(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      },
      4523,
      longReply,
      { isPrivate: false, allowPublic: true },
    );

    assert.equal(calls, 1);
    assert.equal(capturedBody?.input?.is_private, 0);
    assert.equal(capturedBody?.input?.content.length, longReply.length);
    assert.equal(result.id, 989);
    assert.equal(result.is_private, false);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupRejectsHtmlOrScriptContent() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let called = false;

  try {
    global.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    await assert.rejects(
      () => service.addTicketFollowup(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        '<script>alert(1)</script>',
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('plain text'),
    );
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAddTicketFollowupRejectsMalformedCreateResponse() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;

  try {
    global.fetch = (async () => new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

    await assert.rejects(
      () => service.addTicketFollowup(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        'Private operator triage note.',
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('followup creation response was malformed'),
    );
  } finally {
    global.fetch = originalFetch;
  }
}

async function testUpdateTicketFieldsUsesSafePutEndpoint() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let requestedUrl = '';
  let capturedMethod = '';
  let capturedHeaders: Headers | undefined;
  let capturedBody: any;

  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      capturedMethod = String(init?.method || 'GET');
      capturedHeaders = new Headers(init?.headers);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const result = await service.updateTicketFields(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      4523,
      { type: 2, priority: 4, urgency: 3, status: 4 },
    );

    assert.equal(requestedUrl, 'https://glpi.internal/helpdesk/apirest.php/Ticket/4523');
    assert.equal(capturedMethod, 'PUT');
    assert.equal(capturedHeaders?.get('session-token'), 'session-token');
    assert.equal(capturedHeaders?.get('app-token'), 'app-token');
    assert.deepEqual(capturedBody, {
      input: {
        type: 2,
        priority: 4,
        urgency: 3,
        status: 4,
      },
    });
    assert.deepEqual(result, {
      ticket_id: 4523,
      updated_fields: ['type', 'priority', 'urgency', 'status'],
    });
  } finally {
    global.fetch = originalFetch;
  }
}

async function testUpdateTicketFieldsRejectsUnsupportedOrInvalidUpdates() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  let called = false;

  try {
    global.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    await assert.rejects(
      () => service.updateTicketFields(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        { status: 0 },
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('must be a positive integer'),
    );
    await assert.rejects(
      () => service.updateTicketFields(
        {
          baseUrl: 'https://glpi.internal/helpdesk/',
          sessionToken: 'session-token',
          appToken: null,
        },
        4523,
        {},
      ),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('No supported GLPI ticket fields'),
    );
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testSearchTicketsForScopeTreatsZeroResultsAsEmpty() {
  const service = createService();
  const originalFetch = global.fetch;
  const session = {
    baseUrl: 'https://glpi.internal/',
    sessionToken: 'session-token',
    appToken: 'app-token',
  };

  try {
    // GLPI omits the data key entirely when a search matches zero rows.
    global.fetch = (async () => new Response(
      JSON.stringify({ totalcount: 0, count: 0, sort: 15, order: 'DESC' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

    const tickets = await service.searchTicketsForScope(session, {
      createdAfter: '2026-06-11T08:00:00.000Z',
      maxResults: 5,
      entityId: null,
      categoryId: null,
    });
    assert.deepEqual(tickets, []);

    // A response without data and without a zero count is still malformed.
    global.fetch = (async () => new Response(
      JSON.stringify({ sort: 15, order: 'DESC' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
    await assert.rejects(
      () => service.searchTicketsForScope(session, {
        createdAfter: '2026-06-11T08:00:00.000Z',
        maxResults: 5,
        entityId: null,
        categoryId: null,
      }),
      (error: any) => error instanceof BadRequestException
        && String(error.message || '').includes('malformed'),
    );

    // The created-after horizon is the remaining bound for wildcard scopes
    // and must be valid.
    await assert.rejects(
      () => service.searchTicketsForScope(session, {
        createdAfter: 'not-a-date',
        maxResults: 5,
        entityId: null,
        categoryId: null,
      }),
      (error: any) => error instanceof BadRequestException
        && /horizon|created-after/i.test(String(error.message || '')),
    );
  } finally {
    global.fetch = originalFetch;
  }
}

async function testSearchReferenceCatalogBuildsBoundedSearchAndNormalizesRows() {
  const service = createService('https://glpi.internal/helpdesk');
  const originalFetch = global.fetch;
  const requestedUrls: string[] = [];

  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify({
        totalcount: 2,
        count: 2,
        data: [
          { id: 12, name: 'VPN', completename: 'IT > Access > VPN', parent_id: 4 },
          { 2: 13, 1: 'Badge', completename: 'IT > Access > Badge' },
          { id: 12, name: 'VPN duplicate', completename: 'Duplicate' },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const categories = await service.searchReferenceCatalog(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      { kind: 'category', query: 'vpn', limit: 2 },
    );

    assert.match(requestedUrls[0], /search\/ITILCategory/);
    assert.match(requestedUrls[0], /range=0-1/);
    assert.match(requestedUrls[0], /criteria%5B0%5D%5Bvalue%5D=vpn/);
    assert.deepEqual(categories, [
      { id: 12, name: 'VPN', completename: 'IT > Access > VPN', parent_id: 4 },
      { id: 13, name: 'Badge', completename: 'IT > Access > Badge', parent_id: null },
    ]);

    // Entity kind routes to the GLPI Entity dropdown and stays bounded by the limit.
    await service.searchReferenceCatalog(
      {
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: 'app-token',
      },
      { kind: 'entity', query: 'it', limit: 1 },
    );
    assert.match(requestedUrls[1], /search\/Entity/);
    assert.match(requestedUrls[1], /range=0-0/);
  } finally {
    global.fetch = originalFetch;
  }
}

async function run() {
  await testInitSessionSendsJsonHeaders();
  await testInitSessionExplainsHtmlResponse();
  await testInitSessionNormalizesApiEndpointBaseUrl();
  await testFetchDocumentUsesDocumentApiDownloadForDocumentSendUrls();
  await testGetTicketFollowupsPaginatesAndNormalizesNewestFirst();
  await testGetTicketUsersNormalizesRoles();
  await testGetTicketFollowupsStopsOnDuplicatePageWhenRangeIsIgnored();
  await testAddTicketFollowupUsesFixedPrivatePostEndpoint();
  await testAddTicketFollowupRejectsPublicWrites();
  await testAddTicketFollowupAllowsExplicitPublicWrites();
  await testAddTicketFollowupAllowsLongExplicitPublicWritesOnly();
  await testAddTicketFollowupRejectsHtmlOrScriptContent();
  await testAddTicketFollowupRejectsMalformedCreateResponse();
  await testUpdateTicketFieldsUsesSafePutEndpoint();
  await testUpdateTicketFieldsRejectsUnsupportedOrInvalidUpdates();
  await testSearchReferenceCatalogBuildsBoundedSearchAndNormalizesRows();
  await testSearchTicketsForScopeTreatsZeroResultsAsEmpty();
}

void run();
