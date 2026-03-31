import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import ForbiddenPage from '../ForbiddenPage';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { platformAiApi, PlatformAiConfigPayload, PlatformAiPlanLimit } from '../../ai/platformAiApi';
import { AiProviderTestResult } from '../../ai/aiApi';
import { useLocale } from '../../i18n/useLocale';

type ConfigForm = {
  provider: string;
  model: string;
  api_key: string;
  endpoint_url: string;
  rate_limit_tenant_per_minute: string;
  rate_limit_user_per_hour: string;
};

const EMPTY_CONFIG_FORM: ConfigForm = {
  provider: '',
  model: '',
  api_key: '',
  endpoint_url: '',
  rate_limit_tenant_per_minute: '30',
  rate_limit_user_per_hour: '60',
};

function buildConfigForm(data: PlatformAiConfigPayload['config']): ConfigForm {
  if (!data) {
    return EMPTY_CONFIG_FORM;
  }
  return {
    provider: data.provider,
    model: data.model,
    api_key: '',
    endpoint_url: data.endpoint_url || '',
    rate_limit_tenant_per_minute: String(data.rate_limit_tenant_per_minute),
    rate_limit_user_per_hour: String(data.rate_limit_user_per_hour),
  };
}

function buildConfigPayload(form: ConfigForm, existing: PlatformAiConfigPayload['config']): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (form.provider !== (existing?.provider || '')) {
    payload.provider = form.provider || null;
  }
  if (form.model !== (existing?.model || '')) {
    payload.model = form.model || null;
  }
  if (form.api_key.trim()) {
    payload.api_key = form.api_key.trim();
  }
  if (form.endpoint_url !== (existing?.endpoint_url || '')) {
    payload.endpoint_url = form.endpoint_url.trim() || null;
  }

  const tenantRate = Number(form.rate_limit_tenant_per_minute);
  if (tenantRate !== (existing?.rate_limit_tenant_per_minute ?? 30)) {
    payload.rate_limit_tenant_per_minute = tenantRate;
  }

  const userRate = Number(form.rate_limit_user_per_hour);
  if (userRate !== (existing?.rate_limit_user_per_hour ?? 60)) {
    payload.rate_limit_user_per_hour = userRate;
  }

  return payload;
}

export default function AdminPlatformAiPage() {
  const { claims } = useAuth();
  const { t } = useTranslation(['admin', 'common']);
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [configForm, setConfigForm] = React.useState<ConfigForm>(EMPTY_CONFIG_FORM);
  const [planLimits, setPlanLimits] = React.useState<PlatformAiPlanLimit[]>([]);
  const [configError, setConfigError] = React.useState<string | null>(null);
  const [planError, setPlanError] = React.useState<string | null>(null);
  const [configSaved, setConfigSaved] = React.useState(false);
  const [planSaved, setPlanSaved] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AiProviderTestResult | null>(null);

  const configQuery = useQuery({
    queryKey: ['platform-ai-config'],
    queryFn: () => platformAiApi.getConfig(),
  });

  React.useEffect(() => {
    if (!configQuery.data) {
      return;
    }
    setConfigForm(buildConfigForm(configQuery.data.config));
    setPlanLimits(configQuery.data.plan_limits);
    setTestResult(null);
  }, [configQuery.data?.config?.updated_at, configQuery.data?.plan_limits]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!configQuery.data) {
        return false;
      }
      const payload = buildConfigPayload(configForm, configQuery.data.config);
      if (Object.keys(payload).length === 0) {
        return false;
      }
      await platformAiApi.updateConfig(payload);
      return true;
    },
    onMutate: () => {
      setConfigError(null);
      setConfigSaved(false);
    },
    onSuccess: async (changed) => {
      if (!changed) {
        return;
      }
      setConfigSaved(true);
      setConfigForm((prev) => ({ ...prev, api_key: '' }));
      await queryClient.invalidateQueries({ queryKey: ['platform-ai-config'] });
      setTimeout(() => setConfigSaved(false), 3000);
    },
    onError: (error: unknown) => {
      setConfigError(getApiErrorMessage(error, t, t('platformAi.messages.saveFailed')));
    },
  });

  const testConfigMutation = useMutation({
    mutationFn: async () => platformAiApi.testConfig({
      provider: configForm.provider || null,
      model: configForm.model || null,
      endpoint_url: configForm.endpoint_url.trim() || null,
      ...(configForm.api_key.trim() ? { api_key: configForm.api_key.trim() } : {}),
    }),
    onMutate: () => {
      setTestResult(null);
    },
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: unknown) => {
      setTestResult({
        ok: false,
        provider: configForm.provider || null,
        model: configForm.model || null,
        latency_ms: null,
        message: getApiErrorMessage(error, t, t('platformAi.messages.testFailed')),
        validation_errors: [],
      });
    },
  });

  const savePlanLimitsMutation = useMutation({
    mutationFn: async () => {
      await platformAiApi.updatePlanLimits(planLimits);
    },
    onMutate: () => {
      setPlanError(null);
      setPlanSaved(false);
    },
    onSuccess: async () => {
      setPlanSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['platform-ai-config'] });
      setTimeout(() => setPlanSaved(false), 3000);
    },
    onError: (error: unknown) => {
      setPlanError(getApiErrorMessage(error, t, t('platformAi.messages.planSaveFailed')));
    },
  });

  if (!claims?.isPlatformAdmin) {
    return <ForbiddenPage />;
  }

  return (
    <>
      <PageHeader title={t('platformAi.title')} />
      <Stack spacing={2} maxWidth={1080}>
        {configQuery.isLoading ? (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            </CardContent>
          </Card>
        ) : configQuery.isError ? (
          <Alert severity="error">
            {getApiErrorMessage(configQuery.error, t, t('platformAi.messages.loadFailed'))}
          </Alert>
        ) : configQuery.data ? (
          <>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('platformAi.cards.provider')}</Typography>

                  {configSaved ? <Alert severity="success">{t('platformAi.messages.saved')}</Alert> : null}
                  {configError ? <Alert severity="error">{configError}</Alert> : null}
                  {testResult ? (
                    <Alert severity={testResult.ok ? 'success' : 'error'}>
                      {testResult.message}
                    </Alert>
                  ) : null}

                  <FormControl size="small" fullWidth>
                    <InputLabel>{t('platformAi.fields.provider')}</InputLabel>
                    <Select
                      value={configForm.provider}
                      label={t('platformAi.fields.provider')}
                      onChange={(event) => setConfigForm((prev) => ({ ...prev, provider: String(event.target.value) }))}
                    >
                      {configQuery.data.available_providers.map((provider) => (
                        <MenuItem key={provider.id} value={provider.id}>
                          {provider.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label={t('platformAi.fields.model')}
                    value={configForm.model}
                    onChange={(event) => setConfigForm((prev) => ({ ...prev, model: event.target.value }))}
                  />

                  <TextField
                    size="small"
                    label={t('platformAi.fields.apiKey')}
                    type="password"
                    value={configForm.api_key}
                    onChange={(event) => setConfigForm((prev) => ({ ...prev, api_key: event.target.value }))}
                    placeholder={configQuery.data.config?.has_api_key ? t('platformAi.placeholders.keepKey') : t('platformAi.placeholders.enterKey')}
                  />

                  <TextField
                    size="small"
                    label={t('platformAi.fields.endpointUrl')}
                    value={configForm.endpoint_url}
                    onChange={(event) => setConfigForm((prev) => ({ ...prev, endpoint_url: event.target.value }))}
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      size="small"
                      type="number"
                      label={t('platformAi.fields.tenantRateLimit')}
                      value={configForm.rate_limit_tenant_per_minute}
                      onChange={(event) => setConfigForm((prev) => ({ ...prev, rate_limit_tenant_per_minute: event.target.value }))}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label={t('platformAi.fields.userRateLimit')}
                      value={configForm.rate_limit_user_per_hour}
                      onChange={(event) => setConfigForm((prev) => ({ ...prev, rate_limit_user_per_hour: event.target.value }))}
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={() => saveConfigMutation.mutate()}
                      disabled={saveConfigMutation.isPending}
                    >
                      {saveConfigMutation.isPending ? t('common:status.saving') : t('platformAi.actions.save')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => testConfigMutation.mutate()}
                      disabled={testConfigMutation.isPending}
                    >
                      {testConfigMutation.isPending ? t('platformAi.actions.testing') : t('platformAi.actions.test')}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('platformAi.cards.planLimits')}</Typography>
                  {planSaved ? <Alert severity="success">{t('platformAi.messages.planSaved')}</Alert> : null}
                  {planError ? <Alert severity="error">{planError}</Alert> : null}

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('platformAi.planLimits.plan')}</TableCell>
                        <TableCell align="right">{t('platformAi.planLimits.monthlyLimit')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {planLimits.map((item, index) => (
                        <TableRow key={item.plan_name}>
                          <TableCell>{item.plan_name}</TableCell>
                          <TableCell align="right" sx={{ width: 180 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={item.monthly_message_limit}
                              onChange={(event) => {
                                const next = Number(event.target.value);
                                setPlanLimits((prev) => prev.map((current, currentIndex) => (
                                  currentIndex === index
                                    ? { ...current, monthly_message_limit: Number.isFinite(next) ? next : 0 }
                                    : current
                                )));
                              }}
                              inputProps={{ min: 0 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Button
                    variant="contained"
                    onClick={() => savePlanLimitsMutation.mutate()}
                    disabled={savePlanLimitsMutation.isPending}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {savePlanLimitsMutation.isPending ? t('common:status.saving') : t('platformAi.actions.savePlanLimits')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('platformAi.cards.usage')}</Typography>
                  {configQuery.data.usage.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('platformAi.usage.empty')}
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('platformAi.usage.tenant')}</TableCell>
                          <TableCell>{t('platformAi.usage.plan')}</TableCell>
                          <TableCell align="right">{t('platformAi.usage.used')}</TableCell>
                          <TableCell align="right">{t('platformAi.usage.limit')}</TableCell>
                          <TableCell align="right">{t('platformAi.usage.percent')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {configQuery.data.usage.map((item) => {
                          const percent = item.limit && item.limit > 0
                            ? Math.min(100, Math.round((item.used / item.limit) * 100))
                            : 0;
                          return (
                            <TableRow key={item.tenant_id}>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="body2">{item.tenant_name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.tenant_slug}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{item.plan_key || item.plan_name || '-'}</TableCell>
                              <TableCell align="right">{item.used.toLocaleString(locale)}</TableCell>
                              <TableCell align="right">{(item.limit ?? 0).toLocaleString(locale)}</TableCell>
                              <TableCell align="right" sx={{ minWidth: 180 }}>
                                <Stack spacing={1} alignItems="stretch">
                                  <Typography variant="body2">{percent}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={percent}
                                    color={percent >= 90 ? 'error' : percent >= 75 ? 'warning' : 'success'}
                                  />
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </>
        ) : null}
      </Stack>
    </>
  );
}
