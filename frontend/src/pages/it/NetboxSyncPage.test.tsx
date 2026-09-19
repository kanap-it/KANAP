import React from 'react';
import '../../i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NetboxSyncPage from './NetboxSyncPage';
import { createAppTheme } from '../../config/ThemeContext';
import { api as apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasLevel: () => true }),
}));

vi.mock('../../components/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const STATUS = {
  configured: true,
  enabled: true,
  auto_sync: false,
  sync: {
    status: 'success',
    trigger: 'manual',
    started_at: '2026-09-19T08:00:00.000Z',
    finished_at: '2026-09-19T08:00:12.000Z',
    duration_ms: 12000,
    counts: { create: 2, update: 3, unchanged: 10, ambiguous: 1, skipped: 4, missing: 1, error: 0 },
    error: null,
  },
  records: { linked: 10, ambiguous: 1, missing: 1, ignored: 2, error: 0 },
};

const AMBIGUOUS_ROW = {
  id: 'rec-1',
  external_type: 'device',
  external_id: '11',
  external_name: 'par-esx-01',
  external_url: 'https://netbox.internal/dcim/devices/11/',
  state: 'ambiguous',
  asset: null,
  candidates: [{ id: 'asset-1', name: 'PAR-ESX-01', asset_reference: 'AST-4' }],
  // Structured notice: the UI translates by code and only falls back to `text`.
  message: { code: 'ambiguous_candidates', params: {}, text: 'SERVER ENGLISH, SHOULD NOT BE SHOWN' },
  last_seen_at: '2026-09-19T08:00:00.000Z',
  last_synced_at: null,
};

const LINKED_ROW = {
  ...AMBIGUOUS_ROW,
  id: 'rec-2',
  external_name: 'par-nas-01',
  state: 'linked',
  asset: { id: 'asset-2', name: 'PAR-NAS-01', asset_reference: 'AST-9', status: 'active' },
  candidates: [],
  message: null,
};

const PREVIEW = {
  ok: true,
  message: null,
  counts: { create: 1, update: 1, unchanged: 5, ambiguous: 1, skipped: 2, missing: 0, error: 0 },
  rows: [
    {
      external_type: 'device', external_id: '12', external_name: 'par-sw-02',
      external_url: 'https://netbox.internal/dcim/devices/12/',
      action: 'create', asset: null, matched_by: null, candidates: [], diffs: [],
      skip_reason: null, warnings: [],
    },
    {
      external_type: 'device', external_id: '13', external_name: 'par-esx-02',
      external_url: 'https://netbox.internal/dcim/devices/13/',
      action: 'update',
      asset: { id: 'asset-3', name: 'PAR-ESX-02', asset_reference: 'AST-7' },
      matched_by: 'serial', candidates: [],
      diffs: [{ field: 'serial_number', before: 'OLD1', after: 'NEW1' }],
      skip_reason: null,
      warnings: [{ code: 'os_not_in_catalog', params: { value: 'Photon OS' }, text: 'os fallback' }],
    },
    {
      external_type: 'device', external_id: '14', external_name: 'par-pdu-01',
      external_url: 'https://netbox.internal/dcim/devices/14/',
      action: 'skipped', asset: null, matched_by: null, candidates: [], diffs: [],
      skip_reason: 'unmapped_role', warnings: [],
    },
  ],
  rows_truncated: false,
  missing: [],
};

const MAPPING_OPTIONS = {
  roles: [
    // Reserved row the backend synthesises for VMs: counts VMs, label is translated here.
    { slug: 'kanap:virtual-machines', name: 'Virtual machines', device_count: 0, vm_count: 11 },
    { slug: 'switch', name: 'Switch', device_count: 6, vm_count: 0 },
    { slug: 'pdu', name: 'PDU', device_count: 1, vm_count: 0 },
  ],
  sites: [{ slug: 'gouda', name: 'Gouda Server Room', device_count: 4, vm_count: 2 }],
  asset_kinds: [{ code: 'virtual_machine', label: 'Virtual machine' }, { code: 'network_switch', label: 'Network switch' }],
  locations: [{ id: 'loc-1', name: 'Gouda Server Room' }],
  role_map: { 'kanap:virtual-machines': 'virtual_machine' },
  site_map: {},
  suggested_role_map: { switch: 'network_switch' },
  suggested_site_map: {},
};

function renderPage(initialPath = '/it/netbox') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme('light')}>
        <MemoryRouter initialEntries={[initialPath]}>
          <NetboxSyncPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('NetboxSyncPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/netbox/status') return Promise.resolve(STATUS);
      if (url === '/netbox/records') {
        const state = config?.params?.state;
        const items = state === 'linked' ? [LINKED_ROW] : state === 'ambiguous' ? [AMBIGUOUS_ROW] : [];
        return Promise.resolve({ items, total: items.length });
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === '/netbox/sync/preview') return Promise.resolve(PREVIEW);
      throw new Error(`Unexpected POST ${url}`);
    });
  });

  it('shows a compact line and a settings link when Netbox is not configured', async () => {
    (apiClient.get as any).mockResolvedValue({ ...STATUS, configured: false });

    renderPage();

    expect(await screen.findByText('Netbox is not connected yet.')).toBeInTheDocument();
    expect(screen.getByText('Open the integration settings')).toBeInTheDocument();
    expect(screen.queryByText('Synchronise now')).not.toBeInTheDocument();
  });

  it('defaults to the first non-empty attention filter and lists its records', async () => {
    renderPage();

    expect(await screen.findByText('par-esx-01')).toBeInTheDocument();
    expect(screen.getByText('Several assets could be this object. Choose one, or create a new asset.')).toBeInTheDocument();
    expect(screen.queryByText(/SHOULD NOT BE SHOWN/)).not.toBeInTheDocument();
    expect(screen.getByText('Link to...')).toBeInTheDocument();
    expect(screen.getByText('To decide 1')).toBeInTheDocument();
  });

  it('honours the state query parameter', async () => {
    renderPage('/it/netbox?state=linked');

    expect(await screen.findByText('par-nas-01')).toBeInTheDocument();
    expect(screen.getByText('AST-9')).toBeInTheDocument();
  });

  it('counts mapping rows as devices or virtual machines and translates the reserved row', async () => {
    (apiClient.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/netbox/status') return Promise.resolve(STATUS);
      if (url === '/netbox/mapping-options') return Promise.resolve(MAPPING_OPTIONS);
      if (url === '/netbox/records') return Promise.resolve({ items: [], total: 0 });
      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();
    fireEvent.click(await screen.findByText('Mappings'));

    // Reserved row: our label, not the backend's, and counted in virtual machines.
    expect(await screen.findByText('Virtual machines')).toBeInTheDocument();
    expect(screen.getByText('11 virtual machines')).toBeInTheDocument();
    // Real roles only ever count devices.
    expect(screen.getByText('6 devices')).toBeInTheDocument();
    expect(screen.getByText('1 device')).toBeInTheDocument();
    // A site can hold both.
    expect(screen.getByText('4 devices · 2 virtual machines')).toBeInTheDocument();
    // An unsaved label match is flagged as a suggestion.
    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('groups the preview by what will happen and shows the field diffs', async () => {
    renderPage();
    await screen.findByText('par-esx-01');

    fireEvent.click(screen.getByText('Synchronise now'));

    await waitFor(() => expect(screen.getByText('Review before applying')).toBeInTheDocument());
    expect(screen.getByText('New assets (1)')).toBeInTheDocument();
    expect(screen.getByText('Updated assets (1)')).toBeInTheDocument();
    expect(screen.getByText('Skipped (1)')).toBeInTheDocument();
    expect(screen.getByText('Serial number: OLD1 → NEW1')).toBeInTheDocument();
    expect(screen.getByText('Role not mapped · 1')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    // Notice translated by code, with its params interpolated.
    expect(screen.getByText('The operating system "Photon OS" is not in your catalogue, so it was left unchanged.')).toBeInTheDocument();
  });

  it('falls back to the server text for a notice code this build does not know', async () => {
    (apiClient.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/netbox/status') return Promise.resolve(STATUS);
      if (url === '/netbox/records') {
        return Promise.resolve({
          items: [{
            ...AMBIGUOUS_ROW,
            message: { code: 'something_new_from_the_backend', params: {}, text: 'A newer server explained this.' },
          }],
          total: 1,
        });
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(await screen.findByText('A newer server explained this.')).toBeInTheDocument();
  });
});
