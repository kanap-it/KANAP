import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['admin']);
  const { hasLevel, claims } = useAuth();
  const { isPlatformHost } = useTenant();

  const baseCards: CardLink[] = [
    { title: t('landing.cards.companies.title'), description: t('landing.cards.companies.description'), to: '/admin/companies', resource: 'companies' },
    { title: t('landing.cards.departments.title'), description: t('landing.cards.departments.description'), to: '/admin/departments', resource: 'departments' },
    { title: t('landing.cards.suppliers.title'), description: t('landing.cards.suppliers.description'), to: '/admin/suppliers', resource: 'suppliers' },
    { title: t('landing.cards.accounts.title'), description: t('landing.cards.accounts.description'), to: '/admin/accounts', resource: 'accounts' },
    { title: t('landing.cards.users.title'), description: t('landing.cards.users.description'), to: '/admin/users', resource: 'users' },
    { title: t('landing.cards.roles.title'), description: t('landing.cards.roles.description'), to: '/admin/roles', resource: 'users' },
    { title: t('landing.cards.auditLogs.title'), description: t('landing.cards.auditLogs.description'), to: '/admin/audit-logs', resource: 'users' },
    { title: t('landing.cards.billing.title'), description: t('landing.cards.billing.description'), to: '/admin/billing', resource: 'billing', requireBillingAdmin: true },
  ];

  const cards: CardLink[] = isPlatformHost
    ? [
        { title: t('landing.cards.tenants.title'), description: t('landing.cards.tenants.description'), to: '/admin/tenants', requirePlatformAdmin: true },
        { title: t('landing.cards.opsDashboard.title'), description: t('landing.cards.opsDashboard.description'), to: '/admin/ops-dashboard', requirePlatformAdmin: true },
        { title: t('landing.cards.platformAi.title'), description: t('landing.cards.platformAi.description'), to: '/admin/platform-ai', requirePlatformAdmin: true },
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
      <PageHeader title={t('landing.title')} />
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
