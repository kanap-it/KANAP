import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DateEUField from '../../components/fields/DateEUField';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TenantDetail,
  TenantSummary,
  TenantListResponse,
  deleteTenant,
  freezeTenant,
  getTenant,
  listTenants,
  unfreezeTenant,
  updateTenantPlan,
} from '../../services/adminTenants';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'deleting', label: 'Deleting' },
  { value: 'deleted', label: 'Deleted' },
];

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  frozen: 'info',
  deleting: 'warning',
  deleted: 'error',
};

type PlanDraft = {
  plan_name: string;
  seat_limit: number;
  active_seats: number;
  subscription_type: 'monthly' | 'annual';
  payment_mode: 'card' | 'bank_transfer';
  next_payment_at: string;
};

export default function AdminTenantsPage() {
  const { claims } = useAuth();
  if (!claims?.isPlatformAdmin) {
    return <ForbiddenPage />;
  }

  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useQuery<TenantListResponse, Error>({
    queryKey: ['admin-tenants', { page, rowsPerPage, q: debouncedSearch, status }],
    queryFn: () =>
      listTenants({
        page: page + 1,
        limit: rowsPerPage,
        q: debouncedSearch ? debouncedSearch : undefined,
        status: status === 'all' ? undefined : status,
      }),
    placeholderData: keepPreviousData,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<TenantSummary | null>(null);

  const detailQuery = useQuery<TenantDetail>({
    queryKey: ['admin-tenant', selectedId],
    queryFn: () => getTenant(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (detailQuery.data) {
      setSelectedSummary(detailQuery.data);
    }
  }, [detailQuery.data]);

  const effectiveDetail: TenantDetail | TenantSummary | null = useMemo(() => {
    return detailQuery.data ?? selectedSummary;
  }, [detailQuery.data, selectedSummary]);

  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  useEffect(() => {
    if (!effectiveDetail || !('plan' in effectiveDetail)) return;
    const plan = effectiveDetail.plan;
    if (!plan) {
      setPlanDraft(null);
      return;
    }
    setPlanDraft({
      plan_name: plan.plan_name ?? '',
      seat_limit: plan.seat_limit ?? 0,
      active_seats: plan.active_seats ?? plan.seats_used ?? 0,
      subscription_type: plan.subscription_type ?? 'monthly',
      payment_mode: plan.payment_mode ?? 'card',
      next_payment_at: plan.next_payment_at ? plan.next_payment_at.slice(0, 10) : '',
    });
  }, [effectiveDetail]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [purgeReport, setPurgeReport] = useState<Array<{ table: string; deleted: number }> | null>(null);

  const invalidateTenants = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }).catch(() => {});
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', selectedId] }).catch(() => {});
    }
  };

  const freezeMutation = useMutation<TenantDetail, unknown, { reason?: string }>({
    mutationFn: (payload: { reason?: string }) => freezeTenant(selectedId!, payload),
    onSuccess: (data: TenantDetail) => {
      setSelectedSummary(data);
      setSuccessMessage('Tenant frozen');
      invalidateTenants();
    },
    onError: (err: any) => setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to freeze tenant'),
  });

  const unfreezeMutation = useMutation<TenantDetail>({
    mutationFn: () => unfreezeTenant(selectedId!),
    onSuccess: (data: TenantDetail) => {
      setSelectedSummary(data);
      setSuccessMessage('Tenant unfrozen');
      invalidateTenants();
    },
    onError: (err: any) => setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to unfreeze tenant'),
  });

  const planMutation = useMutation<TenantDetail, unknown, PlanDraft>({
    mutationFn: (draft: PlanDraft) =>
      updateTenantPlan(selectedId!, {
        plan_name: draft.plan_name,
        seat_limit: Number(draft.seat_limit),
        active_seats: Number(draft.active_seats),
        subscription_type: draft.subscription_type,
        payment_mode: draft.payment_mode,
        next_payment_at: draft.next_payment_at ? new Date(draft.next_payment_at).toISOString() : null,
      }),
    onSuccess: (data: TenantDetail) => {
      setSelectedSummary(data);
      setSuccessMessage('Plan updated');
      invalidateTenants();
    },
    onError: (err: any) => setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to update plan'),
  });

  const deleteMutation = useMutation<{ tenant: TenantDetail; purgeReport: { table: string; deleted: number }[] }, unknown, { confirmSlug: string; reason?: string | null }>({
    mutationFn: (payload: { confirmSlug: string; reason?: string | null }) => deleteTenant(selectedId!, payload),
    onSuccess: ({ tenant, purgeReport: report }: { tenant: TenantDetail; purgeReport: { table: string; deleted: number }[] }) => {
      setSelectedSummary(tenant);
      setPurgeReport(report);
      setSuccessMessage('Tenant deleted successfully');
      invalidateTenants();
    },
    onError: (err: any) => setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to delete tenant'),
  });

  const handleOpenDetail = (tenant: TenantSummary) => {
    setSelectedId(tenant.id);
    setSelectedSummary(tenant);
    setDetailOpen(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setDeleteConfirm('');
    setDeleteReason('');
    setPurgeReport(null);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedId(null);
    setSelectedSummary(null);
    setPlanDraft(null);
    setDeleteConfirm('');
    setDeleteReason('');
    setPurgeReport(null);
  };

  const isDetailLoading = detailQuery.isLoading && !detailQuery.data;
  const isDeleted = effectiveDetail && 'status' in effectiveDetail ? effectiveDetail.status === 'deleted' : false;

  const canFreeze = effectiveDetail && 'status' in effectiveDetail && effectiveDetail.status === 'active';
  const canUnfreeze = effectiveDetail && 'status' in effectiveDetail && effectiveDetail.status === 'frozen';
  const confirmMatches = effectiveDetail && 'slug' in effectiveDetail
    ? deleteConfirm.trim() === effectiveDetail.slug
    : false;

const renderStatCard = (label: string, value: React.ReactNode) => (
  <Grid item xs={12} sm={6} md={4} key={label}>
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6">{value}</Typography>
    </Paper>
  </Grid>
);

  const tenantRows: TenantSummary[] = listQuery.data?.items ?? [];
  const totalRows = listQuery.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Tenants"
        actions={[
          <Tooltip key="refresh" title="Refresh">
            <span>
              <IconButton onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>,
        ]}
      />
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            label="Search tenants"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by slug or name"
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 240 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel id="tenant-status-label">Status</InputLabel>
            <Select
              labelId="tenant-status-label"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {listQuery.isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : tenantRows.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1">No tenants found.</Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Companies</TableCell>
                    <TableCell align="right">Headcount</TableCell>
                    <TableCell align="right">Departments</TableCell>
                    <TableCell align="right">Suppliers</TableCell>
                    <TableCell align="right">OPEX</TableCell>
                    <TableCell align="right">CAPEX</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell align="right">Seats</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenantRows.map((tenant: TenantSummary) => (
                    <TableRow key={tenant.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">{tenant.slug}</Typography>
                          <Typography variant="body2" color="text.secondary">{tenant.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={tenant.status}
                          color={STATUS_COLOR[tenant.status] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">{tenant.stats.companies}</TableCell>
                      <TableCell align="right">{tenant.stats.headcount}</TableCell>
                      <TableCell align="right">{tenant.stats.departments}</TableCell>
                      <TableCell align="right">{tenant.stats.suppliers}</TableCell>
                      <TableCell align="right">{tenant.stats.opexEntries}</TableCell>
                      <TableCell align="right">{tenant.stats.capexEntries}</TableCell>
                      <TableCell align="right">{tenant.stats.users.enabled}/{tenant.stats.users.total}</TableCell>
                      <TableCell align="right">
                        {tenant.plan ? (
                          <Typography variant="body2">{tenant.plan.seats_used}/{tenant.plan.seat_limit}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack spacing={1} direction="row" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenDetail(tenant)}
                          >
                            View
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={(_, next) => setPage(next)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </Paper>
        )}
      </Stack>

      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="lg" fullWidth>
        <DialogTitle>
          Tenant detail
        </DialogTitle>
        <DialogContent dividers>
          {isDetailLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={160}>
              <CircularProgress />
            </Box>
          )}
          {!isDetailLoading && effectiveDetail && (
            <Stack spacing={3}>
              {(successMessage || errorMessage) && (
                <Stack spacing={1}>
                  {successMessage && <Alert severity="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
                  {errorMessage && <Alert severity="error" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}
                </Stack>
              )}

              {'status' in effectiveDetail && (
                <Stack spacing={0.5}>
                  <Typography variant="h6">{effectiveDetail.name}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={effectiveDetail.status}
                      color={STATUS_COLOR[effectiveDetail.status] ?? 'default'}
                    />
                    <Typography variant="body2" color="text.secondary">Slug: {effectiveDetail.slug}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Created {new Date(effectiveDetail.created_at).toLocaleString()} • Updated {new Date(effectiveDetail.updated_at).toLocaleString()}
                  </Typography>
                  {detailQuery.data?.deletion_reason && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Deletion reason: {detailQuery.data?.deletion_reason}
                    </Alert>
                  )}
                  {effectiveDetail.status === 'deleting' && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Deletion is in progress.
                    </Alert>
                  )}
                  {effectiveDetail.status === 'deleted' && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Tenant deleted at {effectiveDetail.deleted_at ? new Date(effectiveDetail.deleted_at).toLocaleString() : '—'}
                    </Alert>
                  )}
                </Stack>
              )}

              {'stats' in effectiveDetail && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Statistics</Typography>
                  <Grid container spacing={2}>
                    {renderStatCard('Companies', effectiveDetail.stats.companies)}
                    {renderStatCard('Headcount', effectiveDetail.stats.headcount)}
                    {renderStatCard('Departments', effectiveDetail.stats.departments)}
                    {renderStatCard('Suppliers', effectiveDetail.stats.suppliers)}
                    {renderStatCard('OPEX Entries', effectiveDetail.stats.opexEntries)}
                    {renderStatCard('CAPEX Entries', effectiveDetail.stats.capexEntries)}
                    {renderStatCard('Users (enabled/total)', `${effectiveDetail.stats.users.enabled}/${effectiveDetail.stats.users.total}`)}
                  </Grid>
                </Box>
              )}

              <Divider />

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1">Lifecycle</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockIcon />}
                      onClick={() => freezeMutation.mutate({})}
                      disabled={!canFreeze || freezeMutation.isPending || isDeleted || !selectedId}
                    >
                      Freeze
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockOpenIcon />}
                      onClick={() => unfreezeMutation.mutate()}
                      disabled={!canUnfreeze || unfreezeMutation.isPending || isDeleted || !selectedId}
                    >
                      Unfreeze
                    </Button>
                  </Stack>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="body2">Frozen at: {effectiveDetail.frozen_at ? new Date(effectiveDetail.frozen_at).toLocaleString() : '—'}</Typography>
                  <Typography variant="body2">Deletion requested: {effectiveDetail.deletion_requested_at ? new Date(effectiveDetail.deletion_requested_at).toLocaleString() : '—'}</Typography>
                  <Typography variant="body2">Deletion confirmed: {effectiveDetail.deletion_confirmed_at ? new Date(effectiveDetail.deletion_confirmed_at).toLocaleString() : '—'}</Typography>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Plan</Typography>
                {planDraft ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Plan name"
                        value={planDraft.plan_name}
                        onChange={(e) => setPlanDraft({ ...planDraft, plan_name: e.target.value })}
                        fullWidth
                        disabled={planMutation.isPending || isDeleted}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Seat limit"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={planDraft.seat_limit}
                        onChange={(e) => setPlanDraft({ ...planDraft, seat_limit: Number(e.target.value) })}
                        fullWidth
                        disabled={planMutation.isPending || isDeleted}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Active seats"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={planDraft.active_seats}
                        onChange={(e) => setPlanDraft({ ...planDraft, active_seats: Number(e.target.value) })}
                        fullWidth
                        disabled={planMutation.isPending || isDeleted}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel id="subscription-type-label">Subscription</InputLabel>
                        <Select
                          labelId="subscription-type-label"
                          label="Subscription"
                          value={planDraft.subscription_type}
                          onChange={(e) => setPlanDraft({ ...planDraft, subscription_type: e.target.value as PlanDraft['subscription_type'] })}
                          disabled={planMutation.isPending || isDeleted}
                        >
                          <MenuItem value="monthly">Monthly</MenuItem>
                          <MenuItem value="annual">Annual</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel id="payment-mode-label">Payment mode</InputLabel>
                        <Select
                          labelId="payment-mode-label"
                          label="Payment mode"
                          value={planDraft.payment_mode}
                          onChange={(e) => setPlanDraft({ ...planDraft, payment_mode: e.target.value as PlanDraft['payment_mode'] })}
                          disabled={planMutation.isPending || isDeleted}
                        >
                          <MenuItem value="card">Credit card</MenuItem>
                          <MenuItem value="bank_transfer">Bank transfer</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DateEUField label="Next payment date" valueYmd={planDraft.next_payment_at || ''} onChangeYmd={(v) => setPlanDraft({ ...planDraft, next_payment_at: v })} />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          onClick={() => planDraft && planMutation.mutate(planDraft)}
                          disabled={planMutation.isPending || isDeleted || !selectedId || !planDraft}
                        >
                          {planMutation.isPending ? 'Saving…' : 'Save plan'}
                        </Button>
                        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                          Seats used: {effectiveDetail?.plan?.seats_used ?? 0}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">No subscription information available.</Typography>
                )}
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <DeleteForeverIcon color="error" />
                  <Typography variant="subtitle1">Delete tenant</Typography>
                </Stack>
                <Alert severity="error" sx={{ mb: 2 }}>
                  Deleting a tenant removes all associated data immediately. This action cannot be undone. Freeze the tenant instead if you want to retain data.
                </Alert>
                <Stack spacing={2} maxWidth={360}>
                  <TextField
                    label="Type the tenant slug to confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    disabled={deleteMutation.isPending || isDeleted}
                    helperText={effectiveDetail ? `Slug: ${effectiveDetail.slug}` : ''}
                  />
                  <TextField
                    label="Reason (optional)"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    disabled={deleteMutation.isPending || isDeleted}
                    multiline
                    minRows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => {
                        if (!confirmMatches || !selectedId) return;
                        deleteMutation.mutate({ confirmSlug: deleteConfirm.trim(), reason: deleteReason ? deleteReason : null });
                      }}
                      disabled={deleteMutation.isPending || isDeleted || !selectedId || !confirmMatches}
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Delete tenant'}
                    </Button>
                    <Button onClick={() => { setDeleteConfirm(''); setDeleteReason(''); }} disabled={deleteMutation.isPending || isDeleted}>Clear</Button>
                  </Stack>
                </Stack>
                {purgeReport && (
                  <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Deletion summary</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Table</TableCell>
                          <TableCell align="right">Rows deleted</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purgeReport.map((row) => (
                          <TableRow key={row.table}>
                            <TableCell>{row.table}</TableCell>
                            <TableCell align="right">{row.deleted}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
