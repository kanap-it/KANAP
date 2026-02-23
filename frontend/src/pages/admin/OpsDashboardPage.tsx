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
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import { fetchOpsSnapshot, type OpsSnapshot } from '../../services/adminOps';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ago(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
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
  const { data, error, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-ops-snapshot'],
    queryFn: fetchOpsSnapshot,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  return (
    <>
      <PageHeader
        title="Ops Dashboard"
        actions={
          dataUpdatedAt ? (
            <Typography variant="caption" color="text.secondary">
              Updated {ago(dataUpdatedAt)}
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
          Failed to load ops snapshot: {(error as Error).message}
        </Alert>
      )}

      {data && <SnapshotView data={data} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Snapshot renderer
// ---------------------------------------------------------------------------

function SnapshotView({ data }: { data: OpsSnapshot }) {
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
      <SectionTitle>Traffic (1-minute window)</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label="Requests / min" value={w1.requestsPerMinute} sub={`${w1.totalRequests} total`} />
        <StatCard label="2xx" value={w1.statusClasses['2xx']} />
        <StatCard label="4xx" value={w1.statusClasses['4xx']} severity={w1.statusClasses['4xx'] > 20 ? 'warn' : 'ok'} />
        <StatCard label="5xx" value={w1.statusClasses['5xx']} severity={s5xx} />
        <StatCard label="429 (rate limited)" value={w1.exact429} severity={s429} />
      </Stack>

      {/* ---- Auth ---- */}
      <SectionTitle>Auth (5-minute window)</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label="Login attempts" value={data.auth.loginAttempts} />
        <StatCard label="Login failures" value={data.auth.loginFailures} severity={sLoginFail} sub={data.auth.loginAttempts > 0 ? `${Math.round((data.auth.loginFailures / data.auth.loginAttempts) * 100)}% fail rate` : undefined} />
        <StatCard label="Token refreshes" value={data.auth.refreshAttempts} />
        <StatCard label="Refresh failures" value={data.auth.refreshFailures} severity={data.auth.refreshFailures > 0 ? 'warn' : 'ok'} />
      </Stack>

      {/* ---- Database ---- */}
      <SectionTitle>Database</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label="Pool utilization" value={`${pool.utilizationPct}%`} sub={`${pool.totalCount - pool.idleCount} / ${pool.maxPool} active`} severity={sPool} />
        <StatCard label="Pool waiting" value={pool.waitingCount} severity={sWait} sub="Requests queued for a connection" />
        <StatCard label="Active queries" value={dbAct.active} />
        <StatCard label="Idle in txn" value={dbAct.idleInTransaction} severity={dbAct.idleInTransaction > 3 ? 'warn' : 'ok'} />
        <StatCard label="Deadlocks (cumul.)" value={data.db.database.deadlocks} severity={data.db.database.deadlocks > 0 ? 'warn' : 'ok'} />
      </Stack>

      {/* ---- Process ---- */}
      <SectionTitle>Node.js Process</SectionTitle>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label="Uptime" value={formatUptime(proc.uptimeSeconds)} />
        <StatCard label="Heap used" value={`${proc.memoryMB.heapUsed} MB`} sub={`/ ${proc.memoryMB.heapTotal} MB total`} />
        <StatCard label="RSS" value={`${proc.memoryMB.rss} MB`} />
        <StatCard label="Event loop P99" value={`${proc.eventLoopLagMs.p99} ms`} severity={sEL} sub={`mean ${proc.eventLoopLagMs.mean} ms`} />
        <StatCard label="CPU (user)" value={`${Math.round(proc.cpuUsage.userMs / 1000)}s`} sub={`system ${Math.round(proc.cpuUsage.systemMs / 1000)}s`} />
      </Stack>

      {/* ---- Route latencies ---- */}
      <SectionTitle>Top Routes by Volume (5-minute window)</SectionTitle>
      {data.topRoutes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No traffic recorded yet.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Route</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">P50</TableCell>
                <TableCell align="right">P95</TableCell>
                <TableCell align="right">P99</TableCell>
                <TableCell align="right">Avg</TableCell>
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
      <SectionTitle>Recent Errors (15-minute window)</SectionTitle>
      {data.recentErrors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No errors recorded.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Error</TableCell>
                <TableCell>Route</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">Last Seen</TableCell>
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
                  <TableCell align="right">{ago(e.lastSeen)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ---- Traffic comparison ---- */}
      <SectionTitle>Window Comparison</SectionTitle>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Window</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Req/min</TableCell>
              <TableCell align="right">2xx</TableCell>
              <TableCell align="right">4xx</TableCell>
              <TableCell align="right">5xx</TableCell>
              <TableCell align="right">429</TableCell>
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
