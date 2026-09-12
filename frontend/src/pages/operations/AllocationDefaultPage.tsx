import React from 'react';
import { Alert, Box, Button, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import { PropertyRow } from '../../components/design';
import { compactSelectMenuProps, drawerMenuItemSx, pageSelectSx } from '../../theme/formSx';
import { useAuth } from '../../auth/AuthContext';
import {
  AllocationMethod,
  AllocationRuleResolution,
  fetchAllocationRule,
  resetAllocationRule,
  saveAllocationRule,
} from '../../services/allocationRules';

const METHODS: AllocationMethod[] = ['headcount', 'it_users', 'turnover'];

/** Locale keys are camelCase while the API values are snake_case. */
const METHOD_LABEL_KEYS: Record<AllocationMethod, string> = {
  headcount: 'headcount',
  it_users: 'itUsers',
  turnover: 'turnover',
};

export default function AllocationDefaultPage() {
  const { t } = useTranslation(['ops', 'common']);
  const { hasLevel } = useAuth();
  const canManage = hasLevel('budget_ops', 'admin');
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);
  const [year, setYear] = React.useState(currentYear);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const flashTimer = React.useRef<number | null>(null);

  const { data, isLoading, isError } = useQuery<AllocationRuleResolution>({
    queryKey: ['allocation-rule', year],
    queryFn: () => fetchAllocationRule(year),
    staleTime: 30_000,
  });

  const applyResult = React.useCallback(
    (next: AllocationRuleResolution) => {
      queryClient.setQueryData(['allocation-rule', year], next);
      setSavedFlash(true);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1500);
    },
    [queryClient, year],
  );

  React.useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (method: AllocationMethod) => saveAllocationRule(year, method),
    onSuccess: applyResult,
  });

  const resetMutation = useMutation({
    mutationFn: () => resetAllocationRule(year),
    onSuccess: applyResult,
  });

  const methodLabel = React.useCallback(
    (method: AllocationMethod | null | undefined) =>
      method
        ? t(`operations.allocationDefault.methods.${METHOD_LABEL_KEYS[method] ?? METHOD_LABEL_KEYS.headcount}`)
        : '',
    [t],
  );

  const busy = saveMutation.isPending || resetMutation.isPending;
  const mutationError = saveMutation.error ?? resetMutation.error;
  const isOverridden = data?.source === 'tenant';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title={t('operations.allocationDefault.title')}
        breadcrumbTitle={t('operations.allocationDefault.title')}
      />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        {t('operations.allocationDefault.subtitle')}
      </Typography>

      {!canManage && (
        <Alert severity="info">{t('operations.allocationDefault.noPermission')}</Alert>
      )}
      {isError && <Alert severity="error">{t('operations.allocationDefault.loadError')}</Alert>}
      {mutationError && (
        <Alert severity="error">
          {mutationError instanceof Error
            ? mutationError.message
            : t('operations.allocationDefault.saveError')}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, maxWidth: 560 }}>
        <Stack spacing={1}>
          <PropertyRow label={t('operations.allocationDefault.year')}>
            <Select
              variant="standard"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={pageSelectSx}
              MenuProps={compactSelectMenuProps}
              disabled={busy}
            >
              {years.map((y) => (
                <MenuItem key={y} value={String(y)} sx={drawerMenuItemSx}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </PropertyRow>

          <PropertyRow
            label={t('operations.allocationDefault.method')}
            helperText={t('operations.allocationDefault.methodHelp')}
          >
            {canManage ? (
              <Select
                variant="standard"
                value={data ? data.method : ''}
                onChange={(e) => saveMutation.mutate(e.target.value as AllocationMethod)}
                sx={pageSelectSx}
                MenuProps={compactSelectMenuProps}
                disabled={isLoading || busy}
              >
                {METHODS.map((method) => (
                  <MenuItem key={method} value={method} sx={drawerMenuItemSx}>
                    {methodLabel(method)}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Typography sx={{ fontSize: 13 }}>
                {isLoading ? '' : methodLabel(data?.method ?? 'headcount')}
              </Typography>
            )}
          </PropertyRow>

          {data && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 28 }}>
              <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>
                {isOverridden
                  ? t('operations.allocationDefault.overriddenNote', {
                      method: methodLabel(data.standard_method),
                    })
                  : t('operations.allocationDefault.standardNote')}
              </Typography>
              {isOverridden && canManage && (
                <Button
                  variant="action"
                  onClick={() => resetMutation.mutate()}
                  disabled={busy}
                >
                  {t('operations.allocationDefault.resetToStandard')}
                </Button>
              )}
            </Stack>
          )}

          <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', minHeight: 18 }}>
            {saveMutation.isPending || resetMutation.isPending
              ? t('common:status.saving', 'Saving…')
              : savedFlash
                ? t('common:status.saved', 'Saved')
                : ''}
          </Typography>
        </Stack>
      </Paper>

      <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', maxWidth: 720 }}>
        {t('operations.allocationDefault.scopeNote')}
      </Typography>
    </Box>
  );
}
