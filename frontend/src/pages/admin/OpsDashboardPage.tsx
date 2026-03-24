import React from 'react';
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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import { fetchOpsSnapshot, type OpsSnapshot } from '../../services/adminOps';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return t('opsDashboard.values.uptimeDaysHoursMinutes', { days: d, hours: h, minutes: m });
  if (h > 0) return t('opsDashboard.values.uptimeHoursMinutes', { hours: h, minutes: m });
  return t('opsDashboard.values.uptimeMinutes', { minutes: m });
}

function ago(ts: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return t('opsDashboard.values.justNow');
  if (s < 60) return t('opsDashboard.values.secondsAgo', { count: s });
  return t('opsDashboard.values.minutesAgo', { count: Math.floor(s / 60) });
}

type Severity = 'ok' | 'warn' | 'critical';

function severityColor(s: Severity): 'success' | 'warning' | 'error' {
  return s === 'ok' ? 'success' : s === 'warn' ? 'warning' : 'error';
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  severity = 'ok',
}: {
  label: string;
  value: string | number;
  sub?: string;
  severity?: Severity;
}) {
  const borderColor =
    severity === 'critical' ? 'error.main' : severity === 'warn' ? 'warning.main' : 'divider';
  return (
    <Card variant="outlined" sx={{ minWidth: 150, flex: '1 1 0', borderLeftWidth: 3, borderLeftColor: borderColor }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OpsDashboardPage() {
  const { claims } = useAuth();
  if (!claims?.isPlatformAdmin) return <ForbiddenPage />;

  return <DashboardContent />;
}

function DashboardContent() {
  const { t } = useTranslation(['admin']);
  const { data, error, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-ops-snapshot'],
    queryFn: fetchOpsSnapshot,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  return (
    <>
      <PageHeader
        title={t('opsDashboard.title')}
        actions={
          dataUpdatedAt ? (
            <Typography variant="caption" color="text.secondary">
              {t('opsDashboard.updated', { value: ago(dataUpdatedAt, t) })}
            </Typography>
          ) : null
        }
      />

      {isLoading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, t, t('opsDashboard.messages.loadFailed'))}
        </Alert>
      )}

      {data && <SnapshotView data={data} t={t} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Snapshot renderer
// ---------------------------------------------------------------------------

function SnapshotView({
  data,
  t,
}: {
  data: OpsSnapshot;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const w1 = data.windows['1m'];
  const w5 = data.windows['5m'];
  const pool = data.db.pool;
  const dbAct = data.db.activity;
  const proc = data.process;

  // Severity helpers
  const s5xx: Severity = w1.statusClasses['5xx'] > 5 ? 'critical' : w1.statusClasses['5xx'] > 0 ? 'warn' : 'ok';
  const s429: Severity = w1.exact429 > 10 ? 'critical' : w1.exact429 > 0 ? 'warn' : 'ok';
  const sPool: Severity = pool.utilizationPct > 90 ? 'critical' : pool.utilizationPct > 70 ? 'warn' : 'ok';
  const sWait: Severity = pool.waitingCount > 0 ? 'critical' : 'ok';
  const sEL: Severity = proc.eventLoopLagMs.p99 > 100 ? 'critical' : proc.eventLoopLagMs.p99 > 50 ? 'warn' : 'ok';
  const sLoginFail: Severity = data.auth.loginFailures > 10 ? 'critical' : data.auth.loginFailures > 3 ? 'warn' : 'ok';

  return (
    <>
      {/* ---- Traffic overview ---- */}
      <SectionTitle>{t('opsDashboard.sections.traffic')}</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label={t('opsDashboard.cards.requestsPerMinute')} value={w1.requestsPerMinute} sub={t('opsDashboard.cards.totalRequests', { count: w1.totalRequests })} />
        <StatCard label={t('opsDashboard.cards.status2xx')} value={w1.statusClasses['2xx']} />
        <StatCard label={t('opsDashboard.cards.status4xx')} value={w1.statusClasses['4xx']} severity={w1.statusClasses['4xx'] > 20 ? 'warn' : 'ok'} />
        <StatCard label={t('opsDashboard.cards.status5xx')} value={w1.statusClasses['5xx']} severity={s5xx} />
        <StatCard label={t('opsDashboard.cards.rateLimited')} value={w1.exact429} severity={s429} />
      </Stack>

      {/* ---- Auth ---- */}
      <SectionTitle>{t('opsDashboard.sections.auth')}</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label={t('opsDashboard.cards.loginAttempts')} value={data.auth.loginAttempts} />
        <StatCard label={t('opsDashboard.cards.loginFailures')} value={data.auth.loginFailures} severity={sLoginFail} sub={data.auth.loginAttempts > 0 ? t('opsDashboard.cards.failRate', { count: Math.round((data.auth.loginFailures / data.auth.loginAttempts) * 100) }) : undefined} />
        <StatCard label={t('opsDashboard.cards.tokenRefreshes')} value={data.auth.refreshAttempts} />
        <StatCard label={t('opsDashboard.cards.refreshFailures')} value={data.auth.refreshFailures} severity={data.auth.refreshFailures > 0 ? 'warn' : 'ok'} />
      </Stack>

      {/* ---- Database ---- */}
      <SectionTitle>{t('opsDashboard.sections.database')}</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label={t('opsDashboard.cards.poolUtilization')} value={`${pool.utilizationPct}%`} sub={t('opsDashboard.cards.poolActive', { active: pool.totalCount - pool.idleCount, max: pool.maxPool })} severity={sPool} />
        <StatCard label={t('opsDashboard.cards.poolWaiting')} value={pool.waitingCount} severity={sWait} sub={t('opsDashboard.cards.requestsQueued')} />
        <StatCard label={t('opsDashboard.cards.activeQueries')} value={dbAct.active} />
        <StatCard label={t('opsDashboard.cards.idleInTransaction')} value={dbAct.idleInTransaction} severity={dbAct.idleInTransaction > 3 ? 'warn' : 'ok'} />
        <StatCard label={t('opsDashboard.cards.deadlocks')} value={data.db.database.deadlocks} severity={data.db.database.deadlocks > 0 ? 'warn' : 'ok'} />
      </Stack>

      {/* ---- Process ---- */}
      <SectionTitle>{t('opsDashboard.sections.process')}</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label={t('opsDashboard.cards.uptime')} value={formatUptime(proc.uptimeSeconds, t)} />
        <StatCard label={t('opsDashboard.cards.heapUsed')} value={`${proc.memoryMB.heapUsed} MB`} sub={t('opsDashboard.cards.heapTotal', { total: proc.memoryMB.heapTotal })} />
        <StatCard label="RSS" value={`${proc.memoryMB.rss} MB`} />
        <StatCard label={t('opsDashboard.cards.eventLoopP99')} value={`${proc.eventLoopLagMs.p99} ms`} severity={sEL} sub={t('opsDashboard.cards.meanMs', { count: proc.eventLoopLagMs.mean })} />
        <StatCard label={t('opsDashboard.cards.cpuUser')} value={`${Math.round(proc.cpuUsage.userMs / 1000)}s`} sub={t('opsDashboard.cards.cpuSystem', { count: Math.round(proc.cpuUsage.systemMs / 1000) })} />
      </Stack>

      {/* ---- Route latencies ---- */}
      <SectionTitle>{t('opsDashboard.sections.topRoutes')}</SectionTitle>
      {data.topRoutes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('opsDashboard.messages.noTraffic')}</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('opsDashboard.columns.route')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.count')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.p50')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.p95')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.p99')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.avg')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.topRoutes.map((r) => (
                <TableRow key={`${r.method}-${r.route}`} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <Chip label={r.method} size="small" variant="outlined" sx={{ mr: 1, fontFamily: 'monospace', height: 20, fontSize: '0.7rem' }} />
                    {r.route}
                  </TableCell>
                  <TableCell align="right">{r.count}</TableCell>
                  <TableCell align="right">{r.p50} ms</TableCell>
                  <TableCell align="right" sx={{ color: r.p95 > 500 ? 'warning.main' : undefined }}>{r.p95} ms</TableCell>
                  <TableCell align="right" sx={{ color: r.p99 > 1000 ? 'error.main' : undefined }}>{r.p99} ms</TableCell>
                  <TableCell align="right">{r.avg} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ---- Recent errors ---- */}
      <SectionTitle>{t('opsDashboard.sections.recentErrors')}</SectionTitle>
      {data.recentErrors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('opsDashboard.messages.noErrors')}</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('opsDashboard.columns.error')}</TableCell>
                <TableCell>{t('opsDashboard.columns.route')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.count')}</TableCell>
                <TableCell align="right">{t('opsDashboard.columns.lastSeen')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentErrors.map((e, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.errorType}</Typography>
                    {e.errorMessage && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.errorMessage}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.route}</TableCell>
                  <TableCell align="right">{e.count}</TableCell>
                  <TableCell align="right">{ago(e.lastSeen, t)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ---- Traffic comparison ---- */}
      <SectionTitle>{t('opsDashboard.sections.windowComparison')}</SectionTitle>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('opsDashboard.columns.window')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.total')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.requestsPerMinute')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.status2xx')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.status4xx')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.status5xx')}</TableCell>
              <TableCell align="right">{t('opsDashboard.columns.status429')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(['1m', '5m', '15m'] as const).map((key) => {
              const w = data.windows[key];
              return (
                <TableRow key={key}>
                  <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                  <TableCell align="right">{w.totalRequests}</TableCell>
                  <TableCell align="right">{w.requestsPerMinute}</TableCell>
                  <TableCell align="right">{w.statusClasses['2xx']}</TableCell>
                  <TableCell align="right">{w.statusClasses['4xx']}</TableCell>
                  <TableCell align="right" sx={{ color: w.statusClasses['5xx'] > 0 ? 'error.main' : undefined }}>{w.statusClasses['5xx']}</TableCell>
                  <TableCell align="right" sx={{ color: w.exact429 > 0 ? 'warning.main' : undefined }}>{w.exact429}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
