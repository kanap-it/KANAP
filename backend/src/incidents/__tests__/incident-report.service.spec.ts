import * as assert from 'node:assert/strict';
import {
  buildMarkdown,
  IncidentReportService,
  labelsFor,
  normalizeReportLang,
  reportHeading,
  reportPdfFilename,
  type IncidentReportRecord,
} from '../services/incident-report.service';

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function fixture(overrides: Partial<IncidentReportRecord> = {}): IncidentReportRecord {
  return {
    incident: {
      id: UUID,
      item_number: 12,
      title: 'Mail outage | #1 *urgent*',
      category: 'infrastructure',
      severity: 'major',
      status: 'resolved',
      detected_at: '2026-03-10T08:00:00.000Z',
      started_at: '2026-03-10T07:30:00.000Z',
      resolved_at: '2026-03-10T11:00:00.000Z',
      closed_at: null,
      reporter_name: 'Thomas Berger',
      owner_name: 'Thomas Berger',
      source_ref: 'GLPI-4821',
      description: 'Mail stopped for the Lyon office.',
      impact: '',
      root_cause: null,
      corrective_actions: null,
      lessons_learned: null,
      personal_data_affected: true,
      authority_notification_required: false,
      authority_notified_at: null,
      notified_parties: 'Security team',
      created_at: '2026-03-10T08:05:00.000Z',
      updated_at: '2026-03-10T11:00:00.000Z',
    },
    categoryLabel: 'Infrastructure',
    entries: [
      {
        kind: 'system',
        content: 'Incident logged',
        changed_fields: null,
        occurred_at: '2026-03-10T08:05:00.000Z',
        created_at: '2026-03-10T08:05:00.000Z',
        author_name: null,
      },
      {
        kind: 'note',
        content: 'Failover | #step *done*',
        changed_fields: null,
        occurred_at: '2026-03-10T09:00:00.000Z',
        created_at: '2026-03-10T09:10:00.000Z',
        author_name: 'Thomas Berger',
      },
      {
        kind: 'status_change',
        content: null,
        changed_fields: { status: { from: 'in_progress', to: 'resolved' } },
        occurred_at: '2026-03-10T11:00:00.000Z',
        created_at: '2026-03-10T11:00:00.000Z',
        author_name: 'Thomas Berger',
      },
    ],
    assets: [],
    applications: [],
    tasks: [{ item_number: 28, title: 'Restore mail flow', status: 'open' }],
    documents: { access: 'granted', items: [] },
    attachments: [
      { original_filename: 'screenshot | #1.png', size: 2048, uploaded_at: '2026-03-10T09:15:00.000Z' },
    ],
    ...overrides,
  };
}

function headingIndex(markdown: string, heading: string): number {
  const index = markdown.indexOf(`## ${heading}`);
  assert.ok(index >= 0, `missing heading: ${heading}`);
  return index;
}

function testNormalizeLang() {
  assert.equal(normalizeReportLang('fr'), 'fr');
  assert.equal(normalizeReportLang('DE'), 'de');
  assert.equal(normalizeReportLang('es'), 'es');
  assert.equal(normalizeReportLang(undefined), 'en');
  assert.equal(normalizeReportLang('pt'), 'en');
  assert.equal(normalizeReportLang(''), 'en');
}

function testFilenameAndHeaderRef() {
  assert.equal(reportPdfFilename(12), 'INC-12-incident-report.pdf');
  assert.equal(reportHeading(12, 'Mail outage | #1 *urgent*'), 'INC-12 — Mail outage | #1 *urgent*');
  assert.equal(reportHeading(12, ''), 'INC-12');
  const markdown = buildMarkdown(fixture(), 'en', labelsFor('en'));
  assert.equal(markdown.includes('# INC-12'), false);
  assert.match(markdown, /^- \*\*Severity:\*\*/);
  assert.doesNotMatch(markdown, new RegExp(UUID));
  assert.equal(markdown.includes(UUID), false);
}

function testSectionOrder() {
  const labels = labelsFor('en');
  const markdown = buildMarkdown(fixture(), 'en', labels);
  const positions = [
    markdown.indexOf('**Severity:**'),
    headingIndex(markdown, labels.properties),
    headingIndex(markdown, labels.description),
    headingIndex(markdown, labels.journal),
    headingIndex(markdown, labels.linkedObjects),
    headingIndex(markdown, labels.compliance),
    headingIndex(markdown, labels.attachments),
    markdown.indexOf('Generated on '),
  ];
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] > positions[i - 1], `section ${i} is out of order`);
  }
}

function testJournalChronologicalAndChangeRendering() {
  const markdown = buildMarkdown(fixture(), 'en', labelsFor('en'));
  const first = markdown.indexOf('Incident logged');
  const second = markdown.indexOf('Failover');
  const third = markdown.indexOf('Status: In progress → Resolved');
  assert.ok(first >= 0 && second > first && third > second, 'journal is not chronological');
  assert.match(markdown, /Status: In progress → Resolved/);
  assert.match(markdown, /\| System \|/);
}

function testEmptySectionsOmitted() {
  const labels = labelsFor('en');
  const markdown = buildMarkdown(fixture(), 'en', labels);
  assert.equal(markdown.includes(`## ${labels.impact}`), false);
  assert.equal(markdown.includes(`## ${labels.rootCause}`), false);
  assert.equal(markdown.includes(`## ${labels.correctiveActions}`), false);
  assert.equal(markdown.includes(`## ${labels.lessonsLearned}`), false);
  assert.equal(markdown.includes(`### ${labels.assets}`), false);
  assert.equal(markdown.includes(`### ${labels.applications}`), false);
  assert.equal(markdown.includes(`### ${labels.documents}`), false);
  assert.ok(markdown.includes(`### ${labels.tasks}`));
  assert.ok(markdown.includes('T-28 · Restore mail flow · Open'));

  const empty = buildMarkdown(
    fixture({
      incident: {
        ...fixture().incident,
        description: '   ',
        personal_data_affected: false,
        authority_notification_required: false,
        notified_parties: null,
      },
      tasks: [],
      attachments: [],
      entries: [],
    }),
    'en',
    labels,
  );
  assert.equal(empty.includes(`## ${labels.description}`), false);
  assert.equal(empty.includes(`## ${labels.journal}`), false);
  assert.equal(empty.includes(`## ${labels.linkedObjects}`), false);
  assert.equal(empty.includes(`## ${labels.compliance}`), false);
  assert.equal(empty.includes(`## ${labels.attachments}`), false);
}

function testMarkdownEscaping() {
  const markdown = buildMarkdown(fixture(), 'en', labelsFor('en'));
  assert.ok(markdown.includes('Failover \\| \\#step \\*done\\*'));
  assert.ok(markdown.includes('screenshot \\| \\#1.png'));
  assert.equal(markdown.includes('\n#1'), false);
  assert.equal(markdown.includes('| Mail outage |'), false);
}

function testRestrictedDocumentsOmitted() {
  const labels = labelsFor('en');
  const markdown = buildMarkdown(
    fixture({
      documents: { access: 'restricted', items: [{ item_number: 9, title: 'Secret post-mortem' }] },
    }),
    'en',
    labels,
  );
  assert.equal(markdown.includes('Secret post-mortem'), false);
  assert.equal(markdown.includes('DOC-9'), false);
}

function testFrenchChangeLabels() {
  const markdown = buildMarkdown(fixture(), 'fr', labelsFor('fr'));
  assert.match(markdown, /Statut: En cours → Résolu/);
  assert.ok(markdown.includes('Généré le '));
  assert.ok(markdown.includes(' par KANAP'));
  assert.ok(markdown.includes('T-28 · Restore mail flow · Ouvert'));
}

function testLinkChangeUsesContentOnly() {
  const markdown = buildMarkdown(
    fixture({
      entries: [
        {
          kind: 'link_change',
          content: 'Assets linked: PAR-ESX-01',
          changed_fields: { assets: { from: [], to: [UUID] } },
          occurred_at: '2026-03-10T10:00:00.000Z',
          created_at: '2026-03-10T10:00:00.000Z',
          author_name: 'Thomas Berger',
        },
      ],
    }),
    'en',
    labelsFor('en'),
  );
  assert.ok(markdown.includes('Assets linked: PAR-ESX-01'));
  assert.equal(markdown.includes(UUID), false);
}

async function testExportPdfForwardsViewer() {
  const captured: Array<{ viewer?: unknown }> = [];
  const records = {
    load: async (_id: string, opts: { viewer?: unknown }) => {
      captured.push(opts);
      return fixture();
    },
  };
  const documentExport = {
    exportMarkdown: async () => ({ buffer: Buffer.from('pdf'), contentType: 'application/pdf' }),
  };
  const itOps = {
    getSettings: async () => ({ incidentCategories: [] }),
  };
  const service = new IncidentReportService(records as any, documentExport as any, itOps as any);
  const viewer = { userId: 'u1', isAdmin: false };
  await service.exportPdf(UUID, 'en', {
    manager: {} as any,
    tenantId: 'tenant-1',
    userId: 'u1',
    viewer,
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].viewer, viewer);
}

async function run() {
  testNormalizeLang();
  testFilenameAndHeaderRef();
  testSectionOrder();
  testJournalChronologicalAndChangeRendering();
  testEmptySectionsOmitted();
  testMarkdownEscaping();
  testRestrictedDocumentsOmitted();
  testFrenchChangeLabels();
  testLinkChangeUsesContentOnly();
  await testExportPdfForwardsViewer();
  console.log('incident-report.service.spec.ts: ok');
}

void run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
