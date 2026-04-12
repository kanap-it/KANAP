import React from 'react';
import { Breadcrumbs, Link as MLink, Typography, Stack, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type Crumb = { label: string; to?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function humanizeSegment(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function useBreadcrumbs(): Crumb[] {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);
  const mapLabel = (seg: string): string => {
    // Convert route segments to camelCase keys for lookup
    const keyMap: Record<string, string> = {
      'ops': 'ops',
      'admin': 'admin',
      'it': 'it',
      'master-data': 'masterData',
      'portfolio': 'portfolio',
      'ai': 'ai',
      'opex': 'opex',
      'capex': 'capex',
      'projects': 'projects',
      'contributors': 'contributors',
      'team-members': 'teamMembers',
      'companies': 'companies',
      'departments': 'departments',
      'suppliers': 'suppliers',
      'accounts': 'accounts',
      'coa': 'coa',
      'analytics': 'analytics',
      'users': 'users',
      'roles': 'roles',
      'scheduled-tasks': 'scheduledTasks',
      'billing': 'billing',
      'reports': 'reports',
      'contracts': 'contracts',
      'applications': 'applications',
      'interface-map': 'interfaceMap',
      'connection-map': 'connectionMap',
      'tasks': 'tasks',
      'operations': 'operations',
    };
    const key = keyMap[seg];
    if (key) return t(`breadcrumbs.${key}`);
    return humanizeSegment(seg);
  };

  // Determine the root based on the first part of the path
  const crumbs: Crumb[] = [];
  if (parts.length === 0) {
    crumbs.push({ label: t('breadcrumbs.dashboard'), to: '/ops' });
    return crumbs;
  }

  // Don't add a root crumb - start directly with the section
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    acc += '/' + parts[i];
    const label = mapLabel(parts[i]);
    const to = i < parts.length - 1 ? acc : undefined;
    crumbs.push({ label, to });
  }
  return crumbs;
}

export default function PageHeader({
  title,
  actions,
  breadcrumbTitle,
}: {
  title: string;
  actions?: React.ReactNode;
  /** Override the last breadcrumb segment (e.g., show name instead of UUID) */
  breadcrumbTitle?: string;
}) {
  const { t } = useTranslation('nav');
  let crumbs = useBreadcrumbs();

  // For /:id/:tab routes, replace UUID breadcrumb with tab label.
  if (crumbs.length >= 2) {
    const idCrumb = crumbs[crumbs.length - 2];
    const tabCrumb = crumbs[crumbs.length - 1];
    if (isUuid(idCrumb.label)) {
      crumbs = [
        ...crumbs.slice(0, -2),
        { ...idCrumb, label: humanizeSegment(tabCrumb.label) },
        tabCrumb,
      ];
    }
  }

  // Override last breadcrumb label if provided
  if (breadcrumbTitle && crumbs.length > 0) {
    crumbs = [...crumbs.slice(0, -1), { ...crumbs[crumbs.length - 1], label: breadcrumbTitle, to: undefined }];
  }

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb">
        {crumbs.map((c, idx) => (
          c.to ? (
            <MLink key={idx} component={Link} underline="hover" color="inherit" to={c.to!}>{c.label}</MLink>
          ) : (
            <Typography key={idx} color="text.primary">{c.label}</Typography>
          )
        ))}
      </Breadcrumbs>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5">{title}</Typography>
          {isAdmin && <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{t('breadcrumbs.admin')}</Box>}
        </Stack>
        {actions}
      </Stack>
    </Stack>
  );
}
