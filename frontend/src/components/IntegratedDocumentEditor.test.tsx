import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import IntegratedDocumentEditor, { type IntegratedDocumentEditorHandle } from './IntegratedDocumentEditor';
import { createAppTheme } from '../config/ThemeContext';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ hasLevel: () => false, profile: { id: 'user-1' } }),
}));

vi.mock('../tenant/TenantContext', () => ({
  useTenant: () => ({ tenantSlug: 'acme' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('./MarkdownEditor', () => ({
  default: ({ value, onChange, disabled }: any) => (
    <textarea
      aria-label="markdown-editor"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('./MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('./ExportButton', () => ({ default: () => null }));
vi.mock('./ImportButton', () => ({ default: () => null }));

const REVIEW_ENDPOINT = '/incidents/inc-1/integrated-documents/review';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function documentPayload(content: string, revision = 1) {
  return {
    data: {
      id: 'doc-1',
      item_number: 12,
      item_ref: 'DOC-12',
      content_markdown: content,
      revision,
      edit_lock: null,
    },
  };
}

const theme = createAppTheme('light');

async function renderEditor(options?: { autosaveDelayMs?: number; entityId?: string }) {
  const ref = React.createRef<IntegratedDocumentEditorHandle>();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <IntegratedDocumentEditor
          ref={ref}
          entityType="incidents"
          entityId={options?.entityId ?? 'inc-1'}
          slotKey="review"
          label="Incident review"
          hideHeaderLabel
          showManagedDocChip={false}
          showDocumentControls={false}
          editModeBehavior="auto"
          autosaveEnabled
          autosaveDelayMs={options?.autosaveDelayMs ?? 5}
          surface
          hideToolbarUntilFocus
          minRows={10}
        />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await screen.findByLabelText('Incident review');
  return { ref, view };
}

/** Click the read-only preview: the editor acquires the lock and switches to edit mode. */
async function startEditing() {
  fireEvent.click(screen.getByLabelText('Incident review'));
  return screen.findByLabelText('markdown-editor');
}

describe('IntegratedDocumentEditor — incidents:review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(documentPayload('## Description', 3));
    vi.mocked(api.post).mockResolvedValue({ data: { lock_token: 'lock-1', expires_at: null } } as any);
    // The API echoes the stored document, like the real endpoint.
    vi.mocked(api.patch).mockImplementation(async (_url: string, body: any) => (
      documentPayload(String(body?.content_markdown ?? ''), 4) as any
    ));
    vi.mocked(api.delete).mockResolvedValue({ data: null } as any);
  });

  it('reads and locks the incident review through the /incidents endpoints', async () => {
    await renderEditor();
    expect(api.get).toHaveBeenCalledWith(REVIEW_ENDPOINT);

    await startEditing();
    expect(api.post).toHaveBeenCalledWith(`${REVIEW_ENDPOINT}/locks`);
  });

  it('save() waits for an autosave already in flight and does not save twice', async () => {
    const { ref } = await renderEditor();
    const editor = await startEditing();

    const pending = deferred<any>();
    vi.mocked(api.patch).mockReturnValueOnce(pending.promise as any);
    fireEvent.change(editor, { target: { value: '## Description\nRouter down' } });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));

    let savePromise!: Promise<boolean>;
    await act(async () => {
      savePromise = ref.current!.save();
    });
    // Still in flight: nothing else may be sent while it runs.
    expect(api.patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(documentPayload('## Description\nRouter down', 4));
      await savePromise;
    });

    await expect(savePromise).resolves.toBe(true);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.patch).mock.calls[0][1]).toMatchObject({ save_mode: 'autosave' });
  });

  it('keeps text typed while a save is running and persists it with the next save', async () => {
    const { ref } = await renderEditor({ autosaveDelayMs: 60_000 });
    const editor = await startEditing();

    fireEvent.change(editor, { target: { value: 'first' } });
    const pending = deferred<any>();
    vi.mocked(api.patch).mockReturnValueOnce(pending.promise as any);

    let firstSave!: Promise<boolean>;
    await act(async () => {
      firstSave = ref.current!.save();
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));

    // The user keeps typing while the request is in flight.
    fireEvent.change(editor, { target: { value: 'first and second' } });

    await act(async () => {
      pending.resolve(documentPayload('first', 4));
      await firstSave;
    });

    // The server echo of the older text must not replace the newer draft.
    expect((screen.getByLabelText('markdown-editor') as HTMLTextAreaElement).value).toBe('first and second');
    expect(ref.current!.isDirty()).toBe(true);

    await act(async () => {
      await ref.current!.save();
    });
    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.patch).mock.calls[1][1]).toMatchObject({
      content_markdown: 'first and second',
      save_mode: 'manual',
    });
  });

  it('reports a failed save so the caller can abort its transition', async () => {
    const { ref } = await renderEditor({ autosaveDelayMs: 60_000 });
    const editor = await startEditing();
    fireEvent.change(editor, { target: { value: 'unsaved work' } });

    vi.mocked(api.patch).mockRejectedValueOnce(Object.assign(new Error('offline'), { response: undefined }));

    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current!.save();
    });

    expect(result).toBe(false);
    expect((screen.getByLabelText('markdown-editor') as HTMLTextAreaElement).value).toBe('unsaved work');
    expect(ref.current!.isDirty()).toBe(true);
  });

  it('does not save again when nothing changed since the last save', async () => {
    const { ref } = await renderEditor({ autosaveDelayMs: 60_000 });
    const editor = await startEditing();
    fireEvent.change(editor, { target: { value: 'once' } });

    await act(async () => {
      await ref.current!.save();
    });
    expect(api.patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await ref.current!.save();
    });
    expect(api.patch).toHaveBeenCalledTimes(1);
  });
});
