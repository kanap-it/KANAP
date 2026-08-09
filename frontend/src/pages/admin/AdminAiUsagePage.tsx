import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { useLocale } from '../../i18n/useLocale';
import { aiAdminApi } from '../../ai/aiApi';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

function formatNumber(value: number | null | undefined, locale: string): string {
  if (value == null) return '0';
  return value.toLocaleString(locale);
}

function MetricCard(props: { label: string; value: string; caption?: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            {props.label}
          </Typography>
          <Typography variant="h5">{props.value}</Typography>
          {props.caption ? (
            <Typography variant="caption" color="text.secondary">
              {props.caption}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

// Cross-cutting usage view: today the admin token totals and per-agent message
// counts; real per-model cost reporting lands with the cost engine (registry PR 2).
export default function AdminAiUsagePage() {
  const { t } = useTranslation(['admin', 'common']);
  const locale = useLocale();

  const overviewQuery = useQuery({
    queryKey: ['ai-admin-overview'],
    queryFn: () => aiAdminApi.getOverview(),
  });

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={t('aiUsage.title')} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('aiUsage.subtitle')}</Typography>
      {overviewQuery.isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : overviewQuery.isError ? (
        <Alert severity="error">
          {getApiErrorMessage(overviewQuery.error, t, t('aiAdmin.messages.loadOverviewFailed'))}
        </Alert>
      ) : overviewQuery.data ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            <MetricCard
              label={t('aiAdmin.overview.metrics.allConversations')}
              value={formatNumber(overviewQuery.data.totals.conversations_all, locale)}
            />
            <MetricCard
              label={t('aiAdmin.overview.metrics.activeConversations7d')}
              value={formatNumber(overviewQuery.data.totals.conversations_7d, locale)}
            />
            <MetricCard
              label={t('aiAdmin.overview.metrics.activeConversations30d')}
              value={formatNumber(overviewQuery.data.totals.conversations_30d, locale)}
            />
            <MetricCard
              label={t('aiAdmin.overview.metrics.activeUsers30d')}
              value={formatNumber(overviewQuery.data.totals.active_users_30d, locale)}
            />
          </Box>

          <Stack spacing={1}>
            <Typography variant="subtitle1">{t('aiAdmin.overview.tokenUsage')}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('aiAdmin.overview.columns.window')}</TableCell>
                  <TableCell align="right">{t('aiAdmin.overview.columns.inputTokens')}</TableCell>
                  <TableCell align="right">{t('aiAdmin.overview.columns.outputTokens')}</TableCell>
                  <TableCell align="right">{t('aiAdmin.overview.columns.totalTokens')}</TableCell>
                  <TableCell align="right">{t('aiAdmin.overview.columns.messages')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{t('aiAdmin.overview.windows.currentMonth')}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.input_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.output_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.total_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.message_count, locale)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('aiAdmin.overview.windows.last30Days')}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.input_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.output_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.total_tokens, locale)}</TableCell>
                  <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.message_count, locale)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Stack>

          {(overviewQuery.data.agents ?? []).length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('aiAdmin.overview.agentMessages')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <MetricCard
                  label={t('aiAdmin.overview.agentsTotal')}
                  value={formatNumber(overviewQuery.data.agents.reduce((sum, agent) => sum + agent.messages_current_month, 0), locale)}
                  caption={`${t('aiAdmin.overview.windows.last30Days')}: ${formatNumber(overviewQuery.data.agents.reduce((sum, agent) => sum + agent.messages_last_30_days, 0), locale)}`}
                />
                {overviewQuery.data.agents.map((agent) => (
                  <MetricCard
                    key={agent.agent_definition_id}
                    label={agent.name}
                    value={formatNumber(agent.messages_current_month, locale)}
                    caption={`${t('aiAdmin.overview.windows.last30Days')}: ${formatNumber(agent.messages_last_30_days, locale)}`}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      ) : null}
    </Box>
  );
}
