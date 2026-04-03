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
      capturedHeaders = new Headers(init?.headers);
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
      requestedUrl = String(input);
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

async function run() {
  await testInitSessionSendsJsonHeaders();
  await testInitSessionExplainsHtmlResponse();
  await testInitSessionNormalizesApiEndpointBaseUrl();
  await testFetchDocumentUsesDocumentApiDownloadForDocumentSendUrls();
}

void run();
