import { describe, expect, it } from 'vitest';
import {
  applyEntityTaskListFilters,
  filterEntityTasks,
  navFromTaskList,
  parseEntityTaskListFilters,
} from './entityTaskList';

const tasks = [
  { id: 'a', item_number: 10, status: 'open', phase_id: null },
  { id: 'b', item_number: 11, status: 'done', phase_id: 'phase-1' },
  { id: 'c', item_number: 12, status: 'in_progress', phase_id: 'phase-1' },
  { id: 'd', item_number: null, status: 'cancelled', phase_id: 'phase-2' },
];

describe('parse / apply entity task list filters', () => {
  it('defaults to all / all', () => {
    expect(parseEntityTaskListFilters(new URLSearchParams())).toEqual({ status: 'all', phase: 'all' });
    expect(parseEntityTaskListFilters(new URLSearchParams('taskStatus=nope&taskPhase='))).toEqual({
      status: 'all',
      phase: 'all',
    });
  });

  it('round-trips non-default filters and omits defaults', () => {
    const applied = applyEntityTaskListFilters(new URLSearchParams('sort=name:ASC'), {
      status: 'open',
      phase: 'project-level',
    });
    expect(applied.get('sort')).toBe('name:ASC');
    expect(applied.get('taskStatus')).toBe('open');
    expect(applied.get('taskPhase')).toBe('project-level');

    const cleared = applyEntityTaskListFilters(applied, { status: 'all', phase: 'all' });
    expect(cleared.get('taskStatus')).toBeNull();
    expect(cleared.get('taskPhase')).toBeNull();
    expect(cleared.get('sort')).toBe('name:ASC');
  });
});

describe('filterEntityTasks', () => {
  it('keeps every task when filters are all', () => {
    expect(filterEntityTasks(tasks, { status: 'all', phase: 'all' }).map((task) => task.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('hides done and cancelled when status is active', () => {
    expect(filterEntityTasks(tasks, { status: 'active', phase: 'all' }).map((task) => task.id)).toEqual(['a', 'c']);
  });

  it('filters a single status', () => {
    expect(filterEntityTasks(tasks, { status: 'open', phase: 'all' }).map((task) => task.id)).toEqual(['a']);
  });

  it('keeps project-level tasks only', () => {
    expect(filterEntityTasks(tasks, { status: 'all', phase: 'project-level' }).map((task) => task.id)).toEqual(['a']);
  });

  it('filters a phase and a status together', () => {
    expect(filterEntityTasks(tasks, { status: 'in_progress', phase: 'phase-1' }).map((task) => task.id)).toEqual(['c']);
  });
});

describe('navFromTaskList', () => {
  it('walks the filtered array in display order and prefers T-n', () => {
    const visible = filterEntityTasks(tasks, { status: 'active', phase: 'all' });
    expect(navFromTaskList('a', visible)).toEqual({
      index: 0,
      total: 2,
      hasPrev: false,
      hasNext: true,
      prevId: null,
      nextId: 'T-12',
    });
    expect(navFromTaskList('c', visible).prevId).toBe('T-10');
  });

  it('falls back to the raw id when item_number is missing', () => {
    expect(navFromTaskList('d', [tasks[3]])).toMatchObject({
      index: 0,
      total: 1,
      prevId: null,
      nextId: null,
    });
  });

  it('returns 1 of 1 when the current task is missing or the list is loading', () => {
    expect(navFromTaskList('missing', tasks)).toEqual({
      index: 0,
      total: 1,
      hasPrev: false,
      hasNext: false,
      prevId: null,
      nextId: null,
    });
    expect(navFromTaskList('a', tasks, { isLoading: true }).total).toBe(1);
    expect(navFromTaskList('a', tasks, { isLoading: true }).hasNext).toBe(false);
  });
});
