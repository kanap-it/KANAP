import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import { FreezeColumn, FreezeScope, freezeTargets, FreezeTarget, unfreezeTargets, FreezeStateResponse } from '../../services/freeze';
import { useFreezeState } from '../../hooks/useFreezeState';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const YEAR_RANGE = 6;
const OPEX_COLUMNS: FreezeColumn[] = ['budget', 'revision', 'actual', 'landing'];
const CAPEX_COLUMNS: FreezeColumn[] = ['budget', 'revision', 'actual', 'landing'];

function useYearOptions() {
  const currentYear = new Date().getFullYear();
  return React.useMemo(() => Array.from({ length: YEAR_RANGE }, (_, i) => currentYear - 1 + i), [currentYear]);
}

type ScopedColumns = {
  opex: FreezeColumn[];
  capex: FreezeColumn[];
};

const defaultColumns: ScopedColumns = {
  opex: [...OPEX_COLUMNS],
  capex: [...CAPEX_COLUMNS],
};

export default function BudgetFreezePage() {
  const years = useYearOptions();
  const { hasLevel } = useAuth();
  const canModify = hasLevel('budget_ops', 'admin');
  const [year, setYear] = React.useState<number>(years[1] ?? years[0] ?? new Date().getFullYear());
  const [selectedScopes, setSelectedScopes] = React.useState<FreezeScope[]>([]);
  const [columnsByScope, setColumnsByScope] = React.useState<ScopedColumns>({ ...defaultColumns });
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error } = useFreezeState(year);

  const freezeMutation = useMutation({
    mutationFn: async (targets: FreezeTarget[]) => freezeTargets(year, targets),
    onSuccess: (res: FreezeStateResponse) => {
      queryClient.setQueryData(['freeze-state', year], res);
      setFeedback({ type: 'success', message: 'Columns frozen successfully.' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.response?.data?.message || err?.message || 'Unable to freeze columns.' });
    }
  });

  const unfreezeMutation = useMutation({
    mutationFn: async (targets: FreezeTarget[]) => unfreezeTargets(year, targets),
    onSuccess: (res: FreezeStateResponse) => {
      queryClient.setQueryData(['freeze-state', year], res);
      setFeedback({ type: 'success', message: 'Columns unfrozen successfully.' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.response?.data?.message || err?.message || 'Unable to unfreeze columns.' });
    }
  });

  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleScope = (scope: FreezeScope) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(null);
    setSelectedScopes((prev) => {
      if (event.target.checked) {
        return prev.includes(scope) ? prev : [...prev, scope];
      }
      return prev.filter((s) => s !== scope);
    });
  };

  const handleColumnsChange = (scope: 'opex' | 'capex') => (event: SelectChangeEvent<FreezeColumn[]>) => {
    const value = event.target.value as FreezeColumn[];
    setFeedback(null);
    setColumnsByScope((prev) => ({ ...prev, [scope]: value.length > 0 ? value : [] }));
  };

  const buildTargets = (): FreezeTarget[] => {
    const targets: FreezeTarget[] = [];
    for (const scope of selectedScopes) {
      if (scope === 'opex' || scope === 'capex') {
        targets.push({ scope, columns: columnsByScope[scope] });
      }
    }
    return targets;
  };

  const handleFreeze = async () => {
    const targets = buildTargets();
    if (targets.length === 0) return;
    await freezeMutation.mutateAsync(targets);
  };

  const handleUnfreeze = async () => {
    const targets = buildTargets();
    if (targets.length === 0) return;
    await unfreezeMutation.mutateAsync(targets);
  };

  const summary = data?.summary;
  const scopeSummary = summary?.scopes;
  const loading = isLoading || isFetching || freezeMutation.isPending || unfreezeMutation.isPending;

  const renderScopeStatus = () => {
    if (!scopeSummary) return null;
    const columnStatus = (label: string, info: { frozen: boolean; frozenAt: string | null; frozenBy: string | null } | undefined) => (
      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{label}</Typography>
        <Typography variant="body2" color={info?.frozen ? 'error.main' : 'text.secondary'}>
          {info?.frozen ? 'Frozen' : 'Editable'}
        </Typography>
      </Box>
    );

    return (
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>OPEX Columns</Typography>
            {OPEX_COLUMNS.map((col) => columnStatus(col, scopeSummary.opex[col]))}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>CAPEX Columns</Typography>
            {CAPEX_COLUMNS.map((col) => columnStatus(col, scopeSummary.capex[col]))}
          </CardContent>
        </Card>
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Freeze / Unfreeze Data" />
      {!canModify && (
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          You need Budget Admin permissions to freeze or unfreeze data. You can still review the current freeze status below.
        </Alert>
      )}
      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</Alert>
      )}
      {error && (
        <Alert severity="error">Failed to load freeze status. Try selecting a different year.</Alert>
      )}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                size="small"
                label="Year"
                value={year}
                onChange={(e) => { setYear(Number(e.target.value)); setFeedback(null); }}
                sx={{ width: 160 }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox checked={selectedScopes.includes('opex')} onChange={toggleScope('opex')} disabled={!canModify} />}
                  label="OPEX"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedScopes.includes('capex')} onChange={toggleScope('capex')} disabled={!canModify} />}
                  label="CAPEX"
                />
              </FormGroup>
            </Stack>

            {(selectedScopes.includes('opex') || selectedScopes.includes('capex')) && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {selectedScopes.includes('opex') && (
                  <FormControl size="small" sx={{ minWidth: 220 }} disabled={!canModify}>
                    <InputLabel id="opex-columns-label">OPEX Columns</InputLabel>
                    <Select
                      labelId="opex-columns-label"
                      multiple
                      value={columnsByScope.opex}
                      label="OPEX Columns"
                      onChange={handleColumnsChange('opex')}
                      renderValue={(selected) => selected.map((c) => c.toUpperCase()).join(', ')}
                    >
                      {OPEX_COLUMNS.map((col) => (
                        <MenuItem key={col} value={col}>
                          <Checkbox checked={columnsByScope.opex.includes(col)} />
                          <Typography sx={{ ml: 1, textTransform: 'capitalize' }}>{col}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {selectedScopes.includes('capex') && (
                  <FormControl size="small" sx={{ minWidth: 220 }} disabled={!canModify}>
                    <InputLabel id="capex-columns-label">CAPEX Columns</InputLabel>
                    <Select
                      labelId="capex-columns-label"
                      multiple
                      value={columnsByScope.capex}
                      label="CAPEX Columns"
                      onChange={handleColumnsChange('capex')}
                      renderValue={(selected) => selected.map((c) => c.toUpperCase()).join(', ')}
                    >
                      {CAPEX_COLUMNS.map((col) => (
                        <MenuItem key={col} value={col}>
                          <Checkbox checked={columnsByScope.capex.includes(col)} />
                          <Typography sx={{ ml: 1, textTransform: 'capitalize' }}>{col}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleFreeze}
                disabled={!canModify || selectedScopes.length === 0 || loading}
                startIcon={freezeMutation.isPending ? <CircularProgress size={16} /> : undefined}
              >
                {freezeMutation.isPending ? 'Freezing…' : 'Freeze Data'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleUnfreeze}
                disabled={!canModify || selectedScopes.length === 0 || loading}
                startIcon={unfreezeMutation.isPending ? <CircularProgress size={16} /> : undefined}
              >
                {unfreezeMutation.isPending ? 'Unfreezing…' : 'Unfreeze Data'}
              </Button>
            </Stack>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Updating freeze status…</Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {renderScopeStatus()}
    </Box>
  );
}
