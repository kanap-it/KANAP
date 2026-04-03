import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import { useFeatures } from '../../config/FeaturesContext';
import { useLocale } from '../../i18n/useLocale';
import {
  aiAdminApi,
  aiKeysApi,
  type AiAdminOverview,
  type AiProviderTestResult,
  type AiSettingsPayload,
  type AiWebSearchTestResult,
  type ProviderDescriptor,
} from '../../ai/aiApi';
import { AiApiKeyRecord } from '../../ai/aiTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

type AiSettingsForm = {
  chat_enabled: boolean;
  mcp_enabled: boolean;
  provider_source: 'builtin' | 'custom';
  llm_provider: string;
  llm_model: string;
  llm_endpoint_url: string;
  llm_api_key: string;
  mcp_key_max_lifetime_days: string | number;
  conversation_retention_days: string | number;
  web_search_enabled: boolean;
  web_enrichment_enabled: boolean;
  glpi_enabled: boolean;
  glpi_url: string;
  glpi_user_token: string;
  glpi_app_token: string;
};

const EMPTY_FORM: AiSettingsForm = {
  chat_enabled: false,
  mcp_enabled: false,
  provider_source: 'custom',
  llm_provider: '',
  llm_model: '',
  llm_endpoint_url: '',
  llm_api_key: '',
  mcp_key_max_lifetime_days: '',
  conversation_retention_days: '',
  web_search_enabled: false,
  web_enrichment_enabled: false,
  glpi_enabled: false,
  glpi_url: '',
  glpi_user_token: '',
  glpi_app_token: '',
};

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function formatNumber(value: number | null | undefined, locale: string): string {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

function getValidationErrors(error: any): string[] {
  const payload = error?.response?.data;
  if (Array.isArray(payload?.errors)) return payload.errors.map(String);
  if (Array.isArray(payload?.validation_errors)) return payload.validation_errors.map(String);
  if (Array.isArray(payload?.message)) return payload.message.map(String);
  return [];
}

function buildSettingsForm(settings: AiSettingsPayload['settings']): AiSettingsForm {
  return {
    chat_enabled: settings.chat_enabled,
    mcp_enabled: settings.mcp_enabled,
    provider_source: settings.provider_source,
    llm_provider: settings.llm_provider || '',
    llm_model: settings.llm_model || '',
    llm_endpoint_url: settings.llm_endpoint_url || '',
    llm_api_key: '',
    mcp_key_max_lifetime_days: settings.mcp_key_max_lifetime_days ?? '',
    conversation_retention_days: settings.conversation_retention_days ?? '',
    web_search_enabled: settings.web_search_enabled,
    web_enrichment_enabled: settings.web_enrichment_enabled,
    glpi_enabled: settings.glpi_enabled,
    glpi_url: settings.glpi_url || '',
    glpi_user_token: '',
    glpi_app_token: '',
  };
}

function buildSettingsUpdatePayload(
  form: AiSettingsForm,
  settings: AiSettingsPayload['settings'],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (form.chat_enabled !== settings.chat_enabled) payload.chat_enabled = form.chat_enabled;
  if (form.mcp_enabled !== settings.mcp_enabled) payload.mcp_enabled = form.mcp_enabled;
  if (form.provider_source !== settings.provider_source) payload.provider_source = form.provider_source;

  const provider = normalizeNullableString(form.llm_provider);
  if (provider !== settings.llm_provider) payload.llm_provider = provider;

  const model = normalizeNullableString(form.llm_model);
  if (model !== settings.llm_model) payload.llm_model = model;

  const endpointUrl = normalizeNullableString(form.llm_endpoint_url);
  if (endpointUrl !== settings.llm_endpoint_url) payload.llm_endpoint_url = endpointUrl;

  if (form.llm_api_key.trim()) payload.llm_api_key = form.llm_api_key.trim();

  const maxLifetime = form.mcp_key_max_lifetime_days === '' ? null : Number(form.mcp_key_max_lifetime_days);
  if (maxLifetime !== settings.mcp_key_max_lifetime_days) {
    payload.mcp_key_max_lifetime_days = maxLifetime;
  }

  const retention = form.conversation_retention_days === '' ? null : Number(form.conversation_retention_days);
  if (retention !== settings.conversation_retention_days) {
    payload.conversation_retention_days = retention;
  }

  if (form.web_search_enabled !== settings.web_search_enabled) {
    payload.web_search_enabled = form.web_search_enabled;
  }
  if (form.web_enrichment_enabled !== settings.web_enrichment_enabled) {
    payload.web_enrichment_enabled = form.web_enrichment_enabled;
  }

  if (form.glpi_enabled !== settings.glpi_enabled) {
    payload.glpi_enabled = form.glpi_enabled;
  }

  const glpiUrl = normalizeNullableString(form.glpi_url);
  if (glpiUrl !== settings.glpi_url) {
    payload.glpi_url = glpiUrl;
  }

  if (form.glpi_user_token.trim()) {
    payload.glpi_user_token = form.glpi_user_token.trim();
  }

  if (form.glpi_app_token.trim()) {
    payload.glpi_app_token = form.glpi_app_token.trim();
  }

  return payload;
}

function buildProviderTestPayload(form: AiSettingsForm): Record<string, unknown> {
  return {
    llm_provider: normalizeNullableString(form.llm_provider),
    llm_model: normalizeNullableString(form.llm_model),
    llm_endpoint_url: normalizeNullableString(form.llm_endpoint_url),
    ...(form.llm_api_key.trim() ? { llm_api_key: form.llm_api_key.trim() } : {}),
  };
}

function providerInfoText(
  provider: ProviderDescriptor | undefined,
  t: TFunction,
): string | null {
  switch (provider?.id) {
    case 'ollama':
      return t('aiAdmin.provider.info.ollama');
    default:
      return null;
  }
}

function getBuiltinUsageRatio(usage?: { count: number; limit: number } | null): number {
  if (!usage || usage.limit <= 0) {
    return 0;
  }
  return Math.min(1, usage.count / usage.limit);
}

function providerModelPlaceholder(
  provider: ProviderDescriptor | undefined,
  t: TFunction,
): string {
  switch (provider?.id) {
    case 'anthropic':
      return t('aiAdmin.provider.placeholders.anthropicModel');
    case 'openai':
      return t('aiAdmin.provider.placeholders.openaiModel');
    case 'ollama':
      return t('aiAdmin.provider.placeholders.ollamaModel');
    default:
      return t('aiAdmin.provider.placeholders.modelIdentifier');
  }
}

function providerApiKeyHelperText(
  settings: AiSettingsPayload['settings'] | undefined,
  t: TFunction,
): string | undefined {
  const messages: string[] = [];
  if (settings?.has_llm_api_key) {
    messages.push(t('aiAdmin.provider.apiKey.keepExisting'));
  }
  if (settings && !settings.provider_secret_writable) {
    messages.push(t('aiAdmin.provider.apiKey.storageUnavailable'));
  }
  return messages.length > 0 ? messages.join(' ') : undefined;
}

function ValidationErrorList({ errors }: { errors: string[] }) {
  return (
    <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
      {errors.map((error) => (
        <Typography key={error} component="li" variant="body2">
          {error}
        </Typography>
      ))}
    </Stack>
  );
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

function renderOverviewSection(overviewQuery: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: AiAdminOverview | undefined;
}, t: TFunction, locale: string) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6">{t('aiAdmin.overview.title')}</Typography>
          </Stack>

          {overviewQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : overviewQuery.isError ? (
            <Alert severity="error">
              {getApiErrorMessage(overviewQuery.error, t, t('aiAdmin.messages.loadOverviewFailed'))}
            </Alert>
          ) : overviewQuery.data ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('aiAdmin.overview.description')}
              </Typography>

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

            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminAiPage() {
  const { config } = useFeatures();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['admin', 'common']);
  const locale = useLocale();

  const [form, setForm] = useState<AiSettingsForm>(EMPTY_FORM);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [providerTestResult, setProviderTestResult] = useState<AiProviderTestResult | null>(null);
  const [webSearchTestResult, setWebSearchTestResult] = useState<AiWebSearchTestResult | null>(null);
  const [createKeyDialog, setCreateKeyDialog] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyActionError, setKeyActionError] = useState<string | null>(null);

  const settingsQuery = useQuery<AiSettingsPayload>({
    queryKey: ['admin-ai-settings'],
    queryFn: () => aiAdminApi.getSettings(),
    enabled: config.features.aiSettings,
  });

  const overviewQuery = useQuery<AiAdminOverview>({
    queryKey: ['admin-ai-overview'],
    queryFn: () => aiAdminApi.getOverview(),
    enabled: config.features.aiSettings,
  });

  const builtinUsageQuery = useQuery({
    queryKey: ['admin-ai-builtin-usage'],
    queryFn: () => aiAdminApi.getBuiltinUsage(),
    enabled: config.features.aiSettings && config.features.builtinAiProvider,
  });

  const keysQuery = useQuery<AiApiKeyRecord[]>({
    queryKey: ['admin-ai-keys'],
    queryFn: () => aiKeysApi.adminList(),
    enabled: config.features.aiSettings,
  });

  React.useEffect(() => {
    if (settingsQuery.data) {
      setForm(buildSettingsForm(settingsQuery.data.settings));
      setProviderTestResult(null);
    }
  }, [settingsQuery.data?.settings.updated_at]);

  const saveMutation = useMutation({
    mutationFn: async (data: AiSettingsForm) => {
      if (!settingsQuery.data) return false;
      const payload = buildSettingsUpdatePayload(data, settingsQuery.data.settings);
      if (Object.keys(payload).length === 0) return false;
      await aiAdminApi.updateSettings(payload);
      return true;
    },
    onMutate: () => {
      setSaveSuccess(false);
      setSaveError(null);
    },
    onSuccess: async (updated) => {
      if (!updated) return;
      setSaveSuccess(true);
      setSaveError(null);
      setProviderTestResult(null);
      setForm((prev) => ({ ...prev, llm_api_key: '', glpi_user_token: '', glpi_app_token: '' }));
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-builtin-usage'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      const validationErrors = getValidationErrors(error);
      const message = getApiErrorMessage(error, t, t('aiAdmin.messages.saveFailed'));
      setSaveError(validationErrors.length > 0 ? `${message} ${validationErrors.join(' ')}` : message);
    },
  });

  const testProviderMutation = useMutation({
    mutationFn: async (data: AiSettingsForm) => aiAdminApi.testProvider(buildProviderTestPayload(data)),
    onMutate: () => {
      setProviderTestResult(null);
    },
    onSuccess: (result) => {
      setProviderTestResult(result);
    },
    onError: (error: any, data) => {
      setProviderTestResult({
        ok: false,
        provider: normalizeNullableString(data.llm_provider),
        model: normalizeNullableString(data.llm_model),
        latency_ms: null,
        message: getApiErrorMessage(error, t, t('aiAdmin.messages.connectionTestFailed')),
        validation_errors: getValidationErrors(error),
      });
    },
  });

  const testWebSearchMutation = useMutation({
    mutationFn: async () => aiAdminApi.testWebSearch(),
    onMutate: () => {
      setWebSearchTestResult(null);
    },
    onSuccess: (result) => {
      setWebSearchTestResult(result);
    },
    onError: (error: any) => {
      setWebSearchTestResult({
        ok: false,
        message: getApiErrorMessage(error, t, t('aiAdmin.messages.webSearchTestFailed')),
        latency_ms: null,
      });
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: (label: string) => aiKeysApi.create({ label }),
    onMutate: () => {
      setKeyActionError(null);
    },
    onSuccess: async (data) => {
      setCreatedKey(data.key);
      setNewKeyLabel('');
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-keys'] });
    },
    onError: (error: any) => {
      setKeyActionError(getApiErrorMessage(error, t, t('aiAdmin.messages.createMcpKeyFailed')));
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => aiKeysApi.adminRevoke(id),
    onMutate: () => {
      setKeyActionError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-keys'] });
    },
    onError: (error: any) => {
      setKeyActionError(getApiErrorMessage(error, t, t('aiAdmin.messages.revokeMcpKeyFailed')));
    },
  });

  const selectedProvider = settingsQuery.data?.available_providers.find((provider) => provider.id === form.llm_provider);
  const currentSettings = settingsQuery.data?.settings;
  const builtinUsageRatio = getBuiltinUsageRatio(builtinUsageQuery.data);
  const builtinUsageColor = builtinUsageRatio >= 0.9 ? 'error' : builtinUsageRatio >= 0.75 ? 'warning' : 'success';

  return (
    <>
      <PageHeader title={t('aiAdmin.title')} />
      <Stack spacing={2} maxWidth={980}>
        {!config.features.aiSettings ? (
          <Alert severity="warning">{t('aiAdmin.messages.disabled')}</Alert>
        ) : (
          <>
            <Card>
              <CardContent>
                {settingsQuery.isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={28} />
                  </Box>
                ) : settingsQuery.isError ? (
                  <Alert severity="error">
                    {getApiErrorMessage(settingsQuery.error, t, t('aiAdmin.messages.loadSettingsFailed'))}
                  </Alert>
                ) : settingsQuery.data ? (
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeIcon color="primary" />
                      <Typography variant="h6">{t('aiAdmin.provider.title')}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ ml: 'auto' }}>
                        <Chip
                          label={settingsQuery.data.settings.chat_enabled ? t('aiAdmin.provider.chips.chatEnabled') : t('aiAdmin.provider.chips.chatDisabled')}
                          size="small"
                          color={settingsQuery.data.settings.chat_enabled ? 'success' : 'default'}
                        />
                        <Chip
                          label={settingsQuery.data.settings.mcp_enabled ? t('aiAdmin.provider.chips.mcpEnabled') : t('aiAdmin.provider.chips.mcpDisabled')}
                          size="small"
                          color={settingsQuery.data.settings.mcp_enabled ? 'success' : 'default'}
                        />
                        <Chip
                          label={settingsQuery.data.settings.chat_ready ? t('aiAdmin.provider.chips.providerReady') : t('aiAdmin.provider.chips.providerIncomplete')}
                          size="small"
                          color={settingsQuery.data.settings.chat_ready ? 'success' : 'default'}
                        />
                      </Stack>
                    </Stack>

                    {currentSettings?.provider_validation_errors.length ? (
                      <Alert severity="warning" variant="outlined">
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight={600}>
                            {t('aiAdmin.provider.validationErrorsTitle')}
                          </Typography>
                          <ValidationErrorList errors={currentSettings.provider_validation_errors} />
                        </Stack>
                      </Alert>
                    ) : null}

                    {providerTestResult ? (
                      <Alert severity={providerTestResult.ok ? 'success' : 'error'} variant="outlined">
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight={600}>
                            {providerTestResult.ok ? t('aiAdmin.provider.connectionSucceeded') : t('aiAdmin.provider.connectionFailed')}
                          </Typography>
                          <Typography variant="body2">{providerTestResult.message}</Typography>
                          {providerTestResult.provider || providerTestResult.model || providerTestResult.latency_ms != null ? (
                            <Typography variant="caption" color="text.secondary">
                              {[providerTestResult.provider, providerTestResult.model].filter(Boolean).join(' / ') || t('aiAdmin.provider.testLabel')}
                              {providerTestResult.latency_ms != null ? ` • ${providerTestResult.latency_ms} ms` : ''}
                            </Typography>
                          ) : null}
                          {providerTestResult.validation_errors.length > 0 ? (
                            <ValidationErrorList errors={providerTestResult.validation_errors} />
                          ) : null}
                        </Stack>
                      </Alert>
                    ) : null}

                    {config.features.builtinAiProvider ? (
                      <FormControl>
                        <RadioGroup
                          row
                          value={form.provider_source}
                          onChange={(event) => {
                            setProviderTestResult(null);
                            setForm((prev) => ({
                              ...prev,
                              provider_source: event.target.value as 'builtin' | 'custom',
                            }));
                          }}
                        >
                          <FormControlLabel
                            value="builtin"
                            control={<Radio />}
                            label={t('aiAdmin.provider.sources.builtin')}
                          />
                          <FormControlLabel
                            value="custom"
                            control={<Radio />}
                            label={t('aiAdmin.provider.sources.custom')}
                          />
                        </RadioGroup>
                      </FormControl>
                    ) : null}

                    {form.provider_source === 'builtin' ? (
                      <Card variant="outlined">
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Typography variant="subtitle2">
                              {t('aiAdmin.provider.builtinUsage.title')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('aiAdmin.provider.builtinUsage.description')}
                            </Typography>
                            {builtinUsageQuery.isLoading ? (
                              <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={24} />
                              </Box>
                            ) : builtinUsageQuery.isError ? (
                              <Alert severity="error">
                                {getApiErrorMessage(builtinUsageQuery.error, t, t('aiAdmin.provider.builtinUsage.loadFailed'))}
                              </Alert>
                            ) : builtinUsageQuery.data ? (
                              <>
                                <Typography variant="body2">
                                  {t('aiAdmin.provider.builtinUsage.summary', {
                                    count: builtinUsageQuery.data.count,
                                    limit: builtinUsageQuery.data.limit,
                                  })}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.round(builtinUsageRatio * 100)}
                                  color={builtinUsageColor}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {t('aiAdmin.provider.builtinUsage.reset', {
                                    date: new Date(builtinUsageQuery.data.reset_date).toLocaleDateString(locale),
                                  })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('aiAdmin.provider.builtinUsage.cta')}
                                </Typography>
                              </>
                            ) : null}
                          </Stack>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <FormControl size="small" fullWidth>
                          <InputLabel>{t('aiAdmin.provider.fields.provider')}</InputLabel>
                          <Select
                            value={form.llm_provider}
                            label={t('aiAdmin.provider.fields.provider')}
                            onChange={(event) => {
                              const nextProvider = settingsQuery.data?.available_providers.find((provider) => provider.id === event.target.value);
                              const shouldClearEndpoint = nextProvider && nextProvider.id !== 'ollama' && nextProvider.id !== 'custom';
                              setForm((prev) => ({
                                ...prev,
                                llm_provider: String(event.target.value),
                                ...(shouldClearEndpoint ? { llm_endpoint_url: '' } : {}),
                              }));
                            }}
                          >
                            <MenuItem value="">{t('aiAdmin.shared.none')}</MenuItem>
                            {settingsQuery.data.available_providers.map((provider) => (
                              <MenuItem key={provider.id} value={provider.id}>
                                {provider.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {providerInfoText(selectedProvider, t) ? (
                          <Alert severity="info" variant="outlined">
                            {providerInfoText(selectedProvider, t)}
                          </Alert>
                        ) : null}

                        <TextField
                          size="small"
                          label={t('aiAdmin.provider.fields.model')}
                          value={form.llm_model}
                          onChange={(event) => setForm((prev) => ({ ...prev, llm_model: event.target.value }))}
                          placeholder={providerModelPlaceholder(selectedProvider, t)}
                        />

                        {(selectedProvider?.id === 'ollama' || selectedProvider?.id === 'custom') ? (
                          <TextField
                            size="small"
                            label={t('aiAdmin.provider.fields.endpointUrl')}
                            value={form.llm_endpoint_url}
                            onChange={(event) => setForm((prev) => ({ ...prev, llm_endpoint_url: event.target.value }))}
                            placeholder={
                              selectedProvider?.id === 'ollama'
                                ? t('aiAdmin.provider.placeholders.ollamaEndpoint')
                                : t('aiAdmin.provider.placeholders.customEndpoint')
                            }
                          />
                        ) : null}

                        {selectedProvider?.capabilities.requiresApiKey ? (
                          <TextField
                            size="small"
                            label={t('aiAdmin.provider.fields.apiKey')}
                            type="password"
                            value={form.llm_api_key}
                            onChange={(event) => setForm((prev) => ({ ...prev, llm_api_key: event.target.value }))}
                            placeholder={
                              currentSettings?.has_llm_api_key
                                ? t('aiAdmin.provider.placeholders.apiKeyConfigured')
                                : t('aiAdmin.provider.placeholders.enterApiKey')
                            }
                            helperText={providerApiKeyHelperText(currentSettings, t)}
                          />
                        ) : null}
                      </>
                    )}

                    <Divider />

                    <Typography variant="subtitle2" color="text.secondary">{t('aiAdmin.sections.features')}</Typography>

                    <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.chat_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, chat_enabled: event.target.checked }))}
                          />
                        }
                        label={t('aiAdmin.features.enableChat')}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.mcp_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, mcp_enabled: event.target.checked }))}
                          />
                        }
                        label={t('aiAdmin.features.enableMcp')}
                      />
                      <Tooltip title={settingsQuery.data?.instance_features.ai_web_search ? '' : t('aiAdmin.features.braveSearchNotConfigured')}>
                        <span>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={form.web_search_enabled}
                                disabled={!settingsQuery.data?.instance_features.ai_web_search}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setForm((prev) => ({
                                    ...prev,
                                    web_search_enabled: checked,
                                    ...(checked ? {} : { web_enrichment_enabled: false }),
                                  }));
                                  if (checked) {
                                    setWebSearchTestResult(null);
                                    testWebSearchMutation.mutate();
                                  }
                                }}
                              />
                            }
                            label={t('aiAdmin.features.webSearch')}
                          />
                        </span>
                      </Tooltip>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.web_enrichment_enabled}
                            disabled={!form.web_search_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, web_enrichment_enabled: event.target.checked }))}
                          />
                        }
                        label={t('aiAdmin.features.webEnrichment')}
                      />
                    </Stack>

                    {webSearchTestResult ? (
                      <Alert
                        severity={webSearchTestResult.ok ? 'success' : 'error'}
                        onClose={() => setWebSearchTestResult(null)}
                      >
                        {webSearchTestResult.message}
                        {webSearchTestResult.latency_ms != null ? ` (${webSearchTestResult.latency_ms}ms)` : ''}
                      </Alert>
                    ) : testWebSearchMutation.isPending ? (
                      <Alert severity="info">{t('aiAdmin.messages.testingWebSearch')}</Alert>
                    ) : null}

                    <Divider />

                    <Typography variant="subtitle2" color="text.secondary">{t('aiAdmin.sections.retention')}</Typography>

                    <TextField
                      size="small"
                      label={t('aiAdmin.fields.conversationRetentionDays')}
                      type="number"
                      value={form.conversation_retention_days}
                      onChange={(event) => setForm((prev) => ({ ...prev, conversation_retention_days: event.target.value }))}
                      sx={{ width: 240 }}
                    />

                    {saveSuccess ? <Alert severity="success">{t('aiAdmin.messages.settingsSaved')}</Alert> : null}
                    {saveError ? <Alert severity="error">{saveError}</Alert> : null}

                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="contained"
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? t('common:status.saving') : t('aiAdmin.actions.saveSettings')}
                      </Button>
                      {form.provider_source === 'custom' ? (
                        <Button
                          variant="outlined"
                          onClick={() => testProviderMutation.mutate(form)}
                          disabled={testProviderMutation.isPending}
                        >
                          {testProviderMutation.isPending ? t('aiAdmin.actions.testing') : t('aiAdmin.actions.testConnection')}
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{t('aiAdmin.keys.title')}</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCreateKeyDialog(true);
                        setCreatedKey(null);
                        setKeyActionError(null);
                      }}
                    >
                      {t('aiAdmin.actions.createKey')}
                    </Button>
                  </Stack>

                  <TextField
                    size="small"
                    label={t('aiAdmin.fields.keyMaxLifetimeDays')}
                    type="number"
                    value={form.mcp_key_max_lifetime_days}
                    onChange={(event) => setForm((prev) => ({ ...prev, mcp_key_max_lifetime_days: event.target.value }))}
                    helperText={t('aiAdmin.fields.keyMaxLifetimeHelper')}
                    sx={{ width: 240 }}
                  />

                  {keyActionError ? <Alert severity="error">{keyActionError}</Alert> : null}

                  {keysQuery.isLoading ? (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : keysQuery.isError ? (
                    <Alert severity="error">
                      {getApiErrorMessage(keysQuery.error, t, t('aiAdmin.messages.loadKeysFailed'))}
                    </Alert>
                  ) : keysQuery.data && keysQuery.data.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('aiAdmin.keys.columns.label')}</TableCell>
                          <TableCell>{t('aiAdmin.keys.columns.prefix')}</TableCell>
                          <TableCell>{t('aiAdmin.keys.columns.created')}</TableCell>
                          <TableCell>{t('aiAdmin.keys.columns.expires')}</TableCell>
                          <TableCell>{t('aiAdmin.keys.columns.lastUsed')}</TableCell>
                          <TableCell>{t('aiAdmin.keys.columns.status')}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {keysQuery.data.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell>{key.label}</TableCell>
                            <TableCell><code>{key.key_prefix}</code></TableCell>
                            <TableCell>{new Date(key.created_at).toLocaleDateString(locale)}</TableCell>
                            <TableCell>{key.expires_at ? new Date(key.expires_at).toLocaleDateString(locale) : t('aiAdmin.shared.never')}</TableCell>
                            <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString(locale) : t('aiAdmin.shared.never')}</TableCell>
                            <TableCell>
                              {key.revoked_at ? (
                                <Chip label={t('aiAdmin.keys.statuses.revoked')} size="small" color="error" />
                              ) : (
                                <Chip label={t('aiAdmin.keys.statuses.active')} size="small" color="success" />
                              )}
                            </TableCell>
                            <TableCell>
                              {!key.revoked_at ? (
                                <IconButton
                                  size="small"
                                  onClick={() => revokeKeyMutation.mutate(key.id)}
                                  disabled={revokeKeyMutation.isPending}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('aiAdmin.keys.empty')}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {renderOverviewSection(overviewQuery, t, locale)}
          </>
        )}
      </Stack>

      <Dialog
        open={createKeyDialog}
        onClose={() => {
          setCreateKeyDialog(false);
          setCreatedKey(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{createdKey ? t('aiAdmin.dialogs.keyCreatedTitle') : t('aiAdmin.dialogs.createKeyTitle')}</DialogTitle>
        <DialogContent>
          {createdKey ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">{t('aiAdmin.dialogs.copyKeyWarning')}</Alert>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  size="small"
                  value={createdKey}
                  InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                <IconButton onClick={() => navigator.clipboard.writeText(createdKey)}>
                  <ContentCopyIcon />
                </IconButton>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {keyActionError ? <Alert severity="error">{keyActionError}</Alert> : null}
              <TextField
                autoFocus
                fullWidth
                size="small"
                label={t('aiAdmin.fields.label')}
                value={newKeyLabel}
                onChange={(event) => setNewKeyLabel(event.target.value)}
                placeholder={t('aiAdmin.fields.labelPlaceholder')}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {createdKey ? (
            <Button onClick={() => { setCreateKeyDialog(false); setCreatedKey(null); }}>{t('aiAdmin.actions.done')}</Button>
          ) : (
            <>
              <Button onClick={() => setCreateKeyDialog(false)}>{t('common:buttons.cancel')}</Button>
              <Button
                variant="contained"
                onClick={() => createKeyMutation.mutate(newKeyLabel)}
                disabled={!newKeyLabel.trim() || createKeyMutation.isPending}
              >
                {createKeyMutation.isPending ? t('aiAdmin.actions.creating') : t('common:buttons.create')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
