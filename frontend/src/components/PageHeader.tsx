import React from 'react';
import { Breadcrumbs, Link as MLink, Typography, Stack, Chip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

type Crumb = { label: string; to?: string };

function useBreadcrumbs(): Crumb[] {
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);
  const mapLabel = (seg: string) => {
    switch (seg) {
      case 'ops': return 'Budget Management';
      case 'admin': return 'Admin';
      case 'it': return 'IT Operations';
      case 'master-data': return 'Master Data';
      case 'portfolio': return 'Portfolio';
      case 'opex': return 'OPEX';
      case 'capex': return 'CAPEX';
      case 'projects': return 'Projects';
      case 'companies': return 'Companies';
      case 'departments': return 'Departments';
      case 'suppliers': return 'Suppliers';
      case 'accounts': return 'Accounts';
      case 'coa': return 'Charts of Accounts';
      case 'analytics': return 'Analytics Dimensions';
      case 'users': return 'Users';
      case 'roles': return 'Roles';
      case 'billing': return 'Billing';
      case 'reports': return 'Reporting';
      case 'contracts': return 'Contracts';
      case 'applications': return 'Applications';
      case 'interface-map': return 'Interface Map';
      case 'connection-map': return 'Connection Map';
      case 'tasks': return 'Tasks';
      case 'operations': return 'Administration';
      default: return seg;
    }
  };

  // Determine the root based on the first part of the path
  const crumbs: Crumb[] = [];
  if (parts.length === 0) {
    crumbs.push({ label: 'Dashboard', to: '/ops' });
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
  let crumbs = useBreadcrumbs();

  // Override last breadcrumb label if provided
  if (breadcrumbTitle && crumbs.length > 0) {
    crumbs = [...crumbs.slice(0, -1), { ...crumbs[crumbs.length - 1], label: breadcrumbTitle }];
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
          {isAdmin && <Chip label="Admin" size="small" />}
        </Stack>
        {actions}
      </Stack>
    </Stack>
  );
}
