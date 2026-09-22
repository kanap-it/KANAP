import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { createAppTheme } from '../../config/ThemeContext';
import {
  idsFromParams,
  idsParam,
  ProjectFilter,
  type ReportFilterProject,
  TeamFilter,
} from './ProjectTeamFilters';

vi.mock('../../api', () => ({ default: { get: vi.fn() } }));

const PROJECTS: ReportFilterProject[] = [
  { id: 'p-cancelled', ref: 'PRJ-9', name: 'Abandoned cave', status: 'cancelled' },
  { id: 'p-done', ref: 'PRJ-1', name: 'Aging room', status: 'done' },
  { id: 'p-open', ref: 'PRJ-3', name: 'Cellar probes', status: 'in_progress' },
  { id: 'p-hold', ref: 'PRJ-4', name: 'Dairy intake', status: 'on_hold' },
];

const TEAMS = [
  { id: 'team-1', name: 'Cheese makers' },
  { id: 'team-2', name: 'Infrastructure' },
];

function Harness({ onProjects, onTeams }: { onProjects: (ids: string[]) => void; onTeams: (ids: string[]) => void }) {
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  return (
    <ThemeProvider theme={createAppTheme('light')}>
      <ProjectFilter
        options={PROJECTS}
        value={projectIds}
        onChange={(ids) => {
          setProjectIds(ids);
          onProjects(ids);
        }}
      />
      <TeamFilter
        options={TEAMS}
        value={teamIds}
        onChange={(ids) => {
          setTeamIds(ids);
          onTeams(ids);
        }}
      />
    </ThemeProvider>
  );
}

describe('ProjectTeamFilters', () => {
  it('lists the projects by reference and name, the closed ones last', () => {
    render(<Harness onProjects={() => {}} onTeams={() => {}} />);
    const input = screen.getByRole('combobox', { name: 'Project' });
    expect((input as HTMLInputElement).placeholder).toBe('All projects');

    fireEvent.mouseDown(input);
    const options = screen.getAllByRole('option').map((node) => node.textContent);
    expect(options).toEqual([
      'PRJ-3 · Cellar probes',
      'PRJ-4 · Dairy intake',
      'PRJ-1 · Aging room',
      'PRJ-9 · Abandoned cave',
    ]);
  });

  it('searches by reference and hands the picked ids over', () => {
    const onProjects = vi.fn();
    render(<Harness onProjects={onProjects} onTeams={() => {}} />);
    const input = screen.getByRole('combobox', { name: 'Project' });

    fireEvent.focus(input);
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'PRJ-4' } });
    const options = screen.getAllByRole('option');
    expect(options.map((node) => node.textContent)).toEqual(['PRJ-4 · Dairy intake']);
    fireEvent.click(options[0]);
    expect(onProjects).toHaveBeenLastCalledWith(['p-hold']);
  });

  it('offers every team and reads one pick by its name', () => {
    const onTeams = vi.fn();
    render(<Harness onProjects={() => {}} onTeams={onTeams} />);
    const select = screen.getByText('All teams').closest('[role="combobox"]') as HTMLElement;
    expect(select).toBeTruthy();

    fireEvent.mouseDown(select);
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option').map((node) => node.textContent)).toEqual([
      'Cheese makers',
      'Infrastructure',
    ]);
    fireEvent.click(within(listbox).getByText('Infrastructure'));
    expect(onTeams).toHaveBeenLastCalledWith(['team-2']);
    expect(select.textContent).toBe('Infrastructure');
  });

  it('reads and writes the identifiers the way the URLs carry them', () => {
    expect(idsFromParams(new URLSearchParams('projectIds=a,%20b,,c'), 'projectIds')).toEqual(['a', 'b', 'c']);
    expect(idsFromParams(new URLSearchParams(''), 'projectIds')).toEqual([]);
    expect(idsParam(['a', 'b'])).toBe('a,b');
    expect(idsParam([])).toBeUndefined();
    expect(idsParam(['a'], true)).toBeUndefined();
  });
});
