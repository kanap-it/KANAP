import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { createAppTheme } from '../../../config/ThemeContext';
import ClassificationGapsStrip, { type ClassificationGaps } from './ClassificationGapsStrip';

const noGaps = { open: 0, anyGap: 0, source: 0, category: 0, stream: 0 };

const gaps = (overrides: Partial<ClassificationGaps> = {}): ClassificationGaps => ({
  tasks: { ...noGaps, taskType: 0 },
  requests: { ...noGaps },
  projects: { ...noGaps },
  categoriesWithStreams: ['Infrastructure'],
  ...overrides,
});

function renderStrip(data: ClassificationGaps | undefined) {
  return render(
    <ThemeProvider theme={createAppTheme('light')}>
      <MemoryRouter initialEntries={['/portfolio/reports']}>
        <ClassificationGapsStrip data={data} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('ClassificationGapsStrip', () => {
  it('renders nothing while there is no data', () => {
    const { container } = renderStrip(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('says everything is classified when no open item has a gap', () => {
    renderStrip(gaps());
    expect(screen.getByText('Everything open is classified')).toBeTruthy();
    expect(screen.queryByText('Projects')).toBeNull();
  });

  it('shows one line per entity with a gap, zeros staying plain text', () => {
    renderStrip(gaps({ projects: { open: 14, anyGap: 3, source: 3, category: 2, stream: 0 } }));
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('3 without source')).toBeTruthy();
    expect(screen.getByText('2 without category')).toBeTruthy();
    // A zero is shown for context but is not a link.
    expect(screen.getByText('0 without stream').closest('a')).toBeNull();
    // Entities without a gap are left out entirely.
    expect(screen.queryByText('Tasks')).toBeNull();
  });

  it('links a task figure to the task list filtered on the same population', () => {
    renderStrip(gaps({ tasks: { open: 9, anyGap: 4, source: 4, category: 0, stream: 0, taskType: 0 } }));
    const href = screen.getByText('4 without source').closest('a')?.getAttribute('href') ?? '';
    const [path, search] = href.split('?');
    const params = new URLSearchParams(search);
    expect(path).toBe('/portfolio/tasks');
    expect(params.get('taskScope')).toBe('all');
    expect(JSON.parse(params.get('filters') ?? '{}')).toEqual({
      status: { filterType: 'set', values: ['open', 'in_progress', 'pending', 'in_testing'] },
      related_object_type: { filterType: 'set', values: [null, 'project'] },
      source_name: { filterType: 'set', values: [null] },
    });
  });

  it('narrows a stream figure to the categories that actually offer a stream', () => {
    renderStrip(gaps({ requests: { open: 6, anyGap: 2, source: 0, category: 0, stream: 2 } }));
    const href = screen.getByText('2 without stream').closest('a')?.getAttribute('href') ?? '';
    const params = new URLSearchParams(href.split('?')[1]);
    expect(href.split('?')[0]).toBe('/portfolio/requests');
    expect(params.get('requestScope')).toBe('all');
    expect(JSON.parse(params.get('filters') ?? '{}')).toEqual({
      status: { filterType: 'set', values: ['pending_review', 'candidate', 'approved', 'on_hold'] },
      category_name: { filterType: 'set', values: ['Infrastructure'] },
      stream_name: { filterType: 'set', values: [null] },
    });
  });
});
