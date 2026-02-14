import type { ComponentType } from 'react';

export type PermissionLevel = 'reader' | 'contributor' | 'member' | 'admin';

export interface ConfigFieldSchema {
  type: 'number' | 'boolean' | 'select';
  label: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface TileDefinition {
  component: ComponentType<{ config: Record<string, unknown> }>;
  title: string;
  icon: string;
  defaultConfig: Record<string, unknown>;
  configSchema: Record<string, ConfigFieldSchema>;
  requiredPermissions?: Array<{
    resource: string;
    level: PermissionLevel;
  }>;
}

// Lazy load tile components to avoid circular imports
// They will be imported dynamically
const LazyMyTasksTile = () => import('./MyTasksTile').then((m) => m.default);
const LazyProjectsILeadTile = () => import('./ProjectsILeadTile').then((m) => m.default);
const LazyProjectsIContributeTile = () => import('./ProjectsIContributeTile').then((m) => m.default);
const LazyRecentlyViewedTile = () => import('./RecentlyViewedTile').then((m) => m.default);
const LazyMyTimeLastWeekTile = () => import('./MyTimeLastWeekTile').then((m) => m.default);
const LazyNewRequestsTile = () => import('./NewRequestsTile').then((m) => m.default);
const LazyTeamActivityTile = () => import('./TeamActivityTile').then((m) => m.default);
const LazyGlobalStatusChangesTile = () => import('./GlobalStatusChangesTile').then((m) => m.default);
const LazyStaleTasksTile = () => import('./StaleTasksTile').then((m) => m.default);

// We'll use a placeholder component initially, then replace with lazy-loaded ones
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Placeholder: ComponentType<any> = () => null;

export const TILE_REGISTRY: Record<string, TileDefinition> = {
  'my-tasks': {
    component: Placeholder, // Will be replaced
    title: 'My Tasks',
    icon: 'Task',
    defaultConfig: { limit: 5, showOverdue: true },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 3, max: 20 },
      showOverdue: { type: 'boolean', label: 'Show overdue section' },
    },
    requiredPermissions: [{ resource: 'tasks', level: 'reader' }],
  },
  'projects-i-lead': {
    component: Placeholder,
    title: 'Projects I Lead',
    icon: 'Leaderboard',
    defaultConfig: { limit: 5 },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 3, max: 20 },
    },
    requiredPermissions: [{ resource: 'portfolio_projects', level: 'reader' }],
  },
  'projects-i-contribute': {
    component: Placeholder,
    title: 'Projects I Contribute To',
    icon: 'Groups',
    defaultConfig: { limit: 5 },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 3, max: 20 },
    },
    requiredPermissions: [
      { resource: 'portfolio_projects', level: 'reader' },
      { resource: 'tasks', level: 'reader' },
    ],
  },
  'recently-viewed': {
    component: Placeholder,
    title: 'Recently Viewed',
    icon: 'History',
    defaultConfig: { limit: 10 },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 5, max: 20 },
    },
    // No requiredPermissions - always visible
  },
  'my-time-last-week': {
    component: Placeholder,
    title: 'My Time Last Week',
    icon: 'AccessTime',
    defaultConfig: { days: 7 },
    configSchema: {
      days: { type: 'number', label: 'Days to show', min: 7, max: 30 },
    },
    requiredPermissions: [
      { resource: 'portfolio_projects', level: 'reader' },
      { resource: 'tasks', level: 'reader' },
    ],
  },
  'new-requests': {
    component: Placeholder,
    title: 'New Requests',
    icon: 'Inbox',
    defaultConfig: { limit: 5, days: 7 },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 3, max: 20 },
      days: { type: 'number', label: 'Days to show', min: 1, max: 30 },
    },
    requiredPermissions: [{ resource: 'portfolio_requests', level: 'reader' }],
  },
  // Phase 2 tiles
  'team-activity': {
    component: Placeholder,
    title: 'Team Activity',
    icon: 'Update',
    defaultConfig: { limit: 10 },
    configSchema: {
      limit: { type: 'number', label: 'Max items', min: 5, max: 30 },
    },
    requiredPermissions: [{ resource: 'portfolio_projects', level: 'reader' }],
  },
  'global-status-changes': {
    component: Placeholder,
    title: 'Project Status Changes',
    icon: 'SwapHoriz',
    defaultConfig: { days: 5 },
    configSchema: {
      days: { type: 'number', label: 'Days to show', min: 1, max: 14 },
    },
    requiredPermissions: [{ resource: 'portfolio_projects', level: 'reader' }],
  },
  'stale-tasks': {
    component: Placeholder,
    title: 'Stale Tasks',
    icon: 'Warning',
    defaultConfig: { scope: 'my', thresholdDays: 90 },
    configSchema: {
      scope: { type: 'select', label: 'Scope', options: ['my', 'team', 'all'] },
      thresholdDays: { type: 'number', label: 'Threshold (days)', min: 30, max: 365 },
    },
    requiredPermissions: [{ resource: 'tasks', level: 'reader' }],
  },
};

// Export lazy loaders for use in the dashboard page
export const TILE_LOADERS = {
  'my-tasks': LazyMyTasksTile,
  'projects-i-lead': LazyProjectsILeadTile,
  'projects-i-contribute': LazyProjectsIContributeTile,
  'recently-viewed': LazyRecentlyViewedTile,
  'my-time-last-week': LazyMyTimeLastWeekTile,
  'new-requests': LazyNewRequestsTile,
  'team-activity': LazyTeamActivityTile,
  'global-status-changes': LazyGlobalStatusChangesTile,
  'stale-tasks': LazyStaleTasksTile,
};
