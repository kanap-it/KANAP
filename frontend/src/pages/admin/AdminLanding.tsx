import React from 'react';
import PageHeader from '../../components/PageHeader';
import { Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTenant } from '../../tenant/TenantContext';

type CardLink = {
  title: string;
  description: string;
  to: string;
  resource?: string;
  requireBillingAdmin?: boolean;
  requirePlatformAdmin?: boolean;
};

export default function AdminLanding() {
  const navigate = useNavigate();
  const { hasLevel, claims } = useAuth();
  const { isPlatformHost } = useTenant();

  const baseCards: CardLink[] = [
    { title: 'Companies', description: 'Manage companies and year metrics', to: '/admin/companies', resource: 'companies' },
    { title: 'Departments', description: 'Manage departments and headcount', to: '/admin/departments', resource: 'departments' },
    { title: 'Suppliers', description: 'Manage suppliers and contacts', to: '/admin/suppliers', resource: 'suppliers' },
    { title: 'Accounts', description: 'Manage accounting codes', to: '/admin/accounts', resource: 'accounts' },
    { title: 'Users & Access', description: 'Assign seats and roles', to: '/admin/users', resource: 'users' },
    { title: 'Roles', description: 'Define role permissions', to: '/admin/roles', resource: 'users' },
    { title: 'Audit Log', description: 'Browse all change history', to: '/admin/audit-logs', resource: 'users' },
    { title: 'Billing', description: 'Plan, seats and invoices', to: '/admin/billing', resource: 'billing', requireBillingAdmin: true },
  ];

  const cards: CardLink[] = isPlatformHost
    ? [
        { title: 'Tenants', description: 'Tenant lifecycle controls and metrics', to: '/admin/tenants', requirePlatformAdmin: true },
        { title: 'Ops Dashboard', description: 'API traffic, DB health, and process metrics', to: '/admin/ops-dashboard', requirePlatformAdmin: true },
      ]
    : baseCards;

  const visible = cards.filter((c) => {
    if (c.requirePlatformAdmin && !claims?.isPlatformAdmin) return false;
    if (c.requireBillingAdmin) return !!claims?.isBillingAdmin;
    if (!c.resource) return true;
    return hasLevel(c.resource, 'reader');
  });

  return (
    <>
      <PageHeader title="Admin" />
      <Grid container spacing={2}>
        {visible.map((c) => (
          <Grid key={c.to} item xs={12} sm={6} md={4} lg={3}>
            <Card variant="outlined">
              <CardActionArea onClick={() => navigate(c.to)}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
