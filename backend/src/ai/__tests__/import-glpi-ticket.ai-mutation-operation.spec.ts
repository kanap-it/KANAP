import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { ImportGlpiTicketAiMutationOperation } from '../mutation/operations/import-glpi-ticket.ai-mutation-operation';

function createContext() {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    conversationId: 'conv-1',
    surface: 'chat' as const,
    authMethod: 'jwt' as const,
    isPlatformHost: false,
    manager: {
      query: async (sql: string) => {
        if (sql.includes('FROM tenants')) {
          return [{ slug: 'tenant-slug' }];
        }
        return [];
      },
    },
  };
}

async function testPrepareCreatePreviewMapsTicketFieldsAndUsesCurrentUserAsRequestor() {
  let killSessionCalls = 0;

  const operation = new ImportGlpiTicketAiMutationOperation(
    {
      resolveCurrentUser: async () => ({
        id: 'user-1',
        email: 'requestor@example.com',
        label: 'Requestor User',
      }),
      resolveCreateTarget: async () => ({
        mode: 'standalone',
        type: null,
        id: null,
        ref: null,
        label: 'Standalone',
      }),
      resolveUserReference: async () => ({
        id: 'user-2',
        email: 'assignee@example.com',
        label: 'Assigned User',
      }),
      resolveTaskType: async () => {
        throw new BadRequestException('Task type "Task" is not available.');
      },
    } as any,
    {} as any,
    {} as any,
    {
      initSession: async () => ({
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      }),
      getTicket: async () => ({
        id: 4523,
        name: 'VPN access broken',
        content_html: '<p>User cannot connect.</p><p><img src="front/document.send.php?docid=19" /></p>',
        status: 'Assigned',
        priority: 4,
        urgency: '5',
        type: 2,
        glpi_url: 'https://glpi.internal/helpdesk/front/ticket.form.php?id=4523',
      }),
      killSession: async () => {
        killSessionCalls += 1;
      },
    } as any,
    {
      assertBusinessPermission: async () => undefined,
    } as any,
  );

  const prepared = await operation.prepareCreatePreview(createContext() as any, {
    ticket_id: 4523,
    relation_type: 'standalone',
    assignee: 'Assigned User',
  });

  assert.equal(prepared.targetEntityType, 'tasks');
  assert.equal(prepared.mutationInput.title, 'VPN access broken');
  assert.equal(prepared.mutationInput.requestor_user_id, 'user-1');
  assert.equal(prepared.mutationInput.requestor_label, 'Requestor User');
  assert.equal(prepared.mutationInput.assignee_user_id, 'user-2');
  assert.equal(prepared.mutationInput.priority_level, 'high');
  assert.equal(prepared.mutationInput.task_type_id, null);
  assert.deepEqual(prepared.mutationInput.glpi_image_targets, ['front/document.send.php?docid=19']);
  assert.match(String(prepared.mutationInput.description || ''), /Source: GLPI Ticket #4523/);
  assert.match(String(prepared.mutationInput.description || ''), /GLPI URL: https:\/\/glpi\.internal\/helpdesk\/front\/ticket\.form\.php\?id=4523/);
  assert.equal(killSessionCalls, 1);
}

async function testPrepareCreatePreviewFallsBackToUrgencyWhenPriorityIsMissing() {
  const operation = new ImportGlpiTicketAiMutationOperation(
    {
      resolveCurrentUser: async () => ({
        id: 'user-1',
        email: 'requestor@example.com',
        label: 'Requestor User',
      }),
      resolveCreateTarget: async () => ({
        mode: 'standalone',
        type: null,
        id: null,
        ref: null,
        label: 'Standalone',
      }),
    } as any,
    {} as any,
    {} as any,
    {
      initSession: async () => ({
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      }),
      getTicket: async () => ({
        id: 5000,
        name: 'Urgent ticket',
        content_html: '<p>Urgent ticket</p>',
        status: 'Assigned',
        priority: null,
        urgency: '5',
        type: 1,
        glpi_url: 'https://glpi.internal/helpdesk/front/ticket.form.php?id=5000',
      }),
      killSession: async () => undefined,
    } as any,
    {
      assertBusinessPermission: async () => undefined,
    } as any,
  );

  const prepared = await operation.prepareCreatePreview(createContext() as any, {
    ticket_id: 5000,
    relation_type: 'standalone',
  });

  assert.equal(prepared.mutationInput.priority_level, 'blocker');
}

async function testPrepareCreatePreviewConvertsEscapedHtmlContent() {
  const operation = new ImportGlpiTicketAiMutationOperation(
    {
      resolveCurrentUser: async () => ({
        id: 'user-1',
        email: 'requestor@example.com',
        label: 'Requestor User',
      }),
      resolveCreateTarget: async () => ({
        mode: 'standalone',
        type: null,
        id: null,
        ref: null,
        label: 'Standalone',
      }),
    } as any,
    {} as any,
    {} as any,
    {
      initSession: async () => ({
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      }),
      getTicket: async () => ({
        id: 59925,
        name: 'Création demandeurs dans la COA',
        content_html: '&lt;div&gt;&lt;h1&gt;Donn&#233;es du formulaire&lt;/h1&gt;'
          + '&lt;div&gt;&lt;b&gt;Titre : &lt;/b&gt;Cr&#233;ation demandeurs dans la COA&lt;/div&gt;'
          + '&lt;p&gt;&lt;img src=&quot;/front/document.send.php?docid=41260&amp;itemtype=Ticket&amp;items_id=59925&quot; /&gt;&lt;/p&gt;'
          + '&lt;/div&gt;',
        status: '2',
        priority: 4,
        urgency: '5',
        type: 1,
        glpi_url: 'https://glpi.internal/helpdesk/front/ticket.form.php?id=59925',
      }),
      killSession: async () => undefined,
    } as any,
    {
      assertBusinessPermission: async () => undefined,
    } as any,
  );

  const prepared = await operation.prepareCreatePreview(createContext() as any, {
    ticket_id: 59925,
    relation_type: 'standalone',
  });

  assert.match(String(prepared.mutationInput.description || ''), /# Données du formulaire/i);
  assert.doesNotMatch(String(prepared.mutationInput.description || ''), /<div>|&lt;div&gt;/i);
  assert.deepEqual(prepared.mutationInput.glpi_image_targets, ['/front/document.send.php?docid=41260&itemtype=Ticket&items_id=59925']);
}

async function testExecutePreviewImportsInlineImagesBestEffort() {
  const uploads: any[] = [];
  const taskUpdates: any[] = [];
  let killSessionCalls = 0;

  const operation = new ImportGlpiTicketAiMutationOperation(
    {
      resolveStoredCreateTarget: async () => ({
        mode: 'standalone',
        type: null,
        id: null,
        ref: null,
        label: 'Standalone',
      }),
    } as any,
    {
      createForTarget: async () => ({
        id: 'task-1',
        item_number: 44,
        title: 'VPN access broken',
        description: '![one](front/document.send.php?docid=19)\n\n![two](front/document.send.php?docid=20)',
      }),
      updateById: async (...args: any[]) => {
        taskUpdates.push(args);
      },
    } as any,
    {
      uploadAttachment: async (...args: any[]) => {
        uploads.push(args);
        return { id: `attachment-${uploads.length}` };
      },
    } as any,
    {
      initSession: async () => ({
        baseUrl: 'https://glpi.internal/helpdesk/',
        sessionToken: 'session-token',
        appToken: null,
      }),
      fetchDocument: async (_session: any, sourceUrl: string) => {
        if (sourceUrl.includes('docid=20')) {
          throw new BadRequestException('image not found');
        }
        return {
          buffer: Buffer.from('fake-image'),
          mimeType: 'image/png',
          filename: 'vpn.png',
        };
      },
      killSession: async () => {
        killSessionCalls += 1;
      },
    } as any,
    {
      assertBusinessPermission: async () => undefined,
    } as any,
  );

  const preview = {
    id: 'preview-1',
    tenant_id: 'tenant-1',
    conversation_id: 'conv-1',
    user_id: 'user-1',
    tool_name: 'import_glpi_ticket',
    target_entity_type: 'tasks',
    target_entity_id: null,
    mutation_input: {
      relation_type: 'standalone',
      relation_id: null,
      title: 'VPN access broken',
      description: '![one](front/document.send.php?docid=19)\n\n![two](front/document.send.php?docid=20)',
      assignee_user_id: null,
      priority_level: 'high',
      task_type_id: null,
      glpi_image_targets: [
        'front/document.send.php?docid=19',
        'front/document.send.php?docid=20',
      ],
    },
    current_values: {},
  };

  await operation.executePreview(createContext() as any, preview as any);

  const currentValues = preview.current_values as Record<string, any>;
  assert.equal(preview.target_entity_id, 'task-1');
  assert.equal(currentValues.target_ref, 'T-44');
  assert.equal(currentValues.glpi_image_total_count, 2);
  assert.equal(currentValues.glpi_image_imported_count, 1);
  assert.equal(Array.isArray(currentValues.glpi_image_warnings), true);
  assert.equal(currentValues.glpi_image_warnings.length, 1);
  assert.equal(uploads.length, 1);
  assert.equal(taskUpdates.length, 1);
  assert.match(String(taskUpdates[0][1]?.description || ''), /\/api\/tasks\/attachments\/tenant-slug\/attachment-1\/inline/);
  assert.equal(killSessionCalls, 1);
}

async function run() {
  await testPrepareCreatePreviewMapsTicketFieldsAndUsesCurrentUserAsRequestor();
  await testPrepareCreatePreviewFallsBackToUrgencyWhenPriorityIsMissing();
  await testPrepareCreatePreviewConvertsEscapedHtmlContent();
  await testExecutePreviewImportsInlineImagesBestEffort();
}

void run();
