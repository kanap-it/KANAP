import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskWorkspacePage from './TaskWorkspacePage';

const translationMock = vi.hoisted(() => {
  let revision = 0;
  const listeners = new Set<() => void>();

  return {
    reset() {
      revision = 0;
      listeners.clear();
    },
    emitLanguageChange() {
      revision += 1;
      listeners.forEach((listener) => listener());
    },
    getRevision() {
      return revision;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
});

const queryClientMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock('react-i18next', async () => {
  const React = await import('react');

  return {
    initReactI18next: {
      type: '3rdParty',
      init: () => undefined,
    },
    useTranslation: () => {
      const [, forceRender] = React.useReducer((value: number) => value + 1, 0);
      React.useEffect(() => translationMock.subscribe(() => forceRender()), []);
      const revision = translationMock.getRevision();
      return {
        t: (key: string) => `${key}__${revision}`,
        i18n: {
          language: 'en',
          resolvedLanguage: 'en',
        },
        ready: true,
      };
    },
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (Array.isArray(queryKey) && queryKey[0] === 'portfolio-task-types') {
      return {
        data: [
          { id: 'task-type', name: 'Task', is_active: true },
        ],
        isLoading: false,
        refetch: vi.fn(),
      };
    }
    return {
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useQueryClient: () => queryClientMock,
}));

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    hasLevel: () => true,
    profile: { id: 'user-1' },
  }),
}));

vi.mock('../../tenant/TenantContext', () => ({
  useTenant: () => ({
    tenantSlug: 'tenant-a',
  }),
}));

vi.mock('../workspace/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    addToRecent: vi.fn(),
  }),
}));

vi.mock('../../hooks/useClassificationDefaults', () => ({
  useClassificationDefaults: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useTaskNav', () => ({
  useTaskNav: () => ({
    total: 0,
    index: 0,
    hasPrev: false,
    hasNext: false,
    prevId: null,
    nextId: null,
  }),
}));

vi.mock('./components/TaskSidebar', () => ({
  default: () => <div data-testid="task-sidebar" />,
}));

vi.mock('../../components/ExportButton', () => ({
  default: () => <button type="button">Export</button>,
}));

vi.mock('../../components/ImportButton', () => ({
  default: () => <button type="button">Import</button>,
}));

vi.mock('../../components/ShareDialog', () => ({
  default: () => null,
}));

vi.mock('./components/ConvertToRequestDialog', () => ({
  default: () => null,
}));

vi.mock('./components/TaskActivity', () => ({
  default: () => null,
}));

vi.mock('./components/TaskAttachments', () => ({
  default: () => null,
}));

vi.mock('../../components/MarkdownEditor', () => ({
  default: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Task description"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={['/portfolio/tasks/new/overview']}>
      <Routes>
        <Route path="/portfolio/tasks/:id/:tab" element={<TaskWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TaskWorkspacePage create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translationMock.reset();

    const localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('preserves an in-progress draft when the language changes', async () => {
    renderCreatePage();

    const titlePlaceholder = 'portfolio:workspace.task.title.placeholder__0';
    const descriptionPlaceholder = 'portfolio:workspace.task.description.placeholder__0';

    await screen.findByPlaceholderText(titlePlaceholder);

    const titleInput = screen.getByPlaceholderText(titlePlaceholder);
    const descriptionInput = screen.getByPlaceholderText(descriptionPlaceholder);

    fireEvent.change(titleInput, { target: { value: 'Investigate disappearing draft' } });
    fireEvent.change(descriptionInput, { target: { value: 'The form should keep this text.' } });

    act(() => {
      translationMock.emitLanguageChange();
    });

    expect(screen.getByDisplayValue('Investigate disappearing draft')).toBeInTheDocument();
    expect(screen.getByDisplayValue('The form should keep this text.')).toBeInTheDocument();
  });
});
