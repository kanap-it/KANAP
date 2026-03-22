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
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../../components/PageHeader';
import { useFeatures } from '../../config/FeaturesContext';
import {
  aiAdminApi,
  aiKeysApi,
  type AiAdminOverview,
  type AiProviderTestResult,
  type AiSettingsPayload,
  type ProviderDescriptor,
} from '../../ai/aiApi';
import { AiApiKeyRecord } from '../../ai/aiTypes';

type AiSettingsForm = {
  chat_enabled: boolean;
  mcp_enabled: boolean;
  llm_provider: string;
  llm_model: string;
  llm_endpoint_url: string;
  llm_api_key: string;
  mcp_key_max_lifetime_days: string | number;
  conversation_retention_days: string | number;
  web_enrichment_enabled: boolean;
};

const EMPTY_FORM: AiSettingsForm = {
  chat_enabled: false,
  mcp_enabled: false,
  llm_provider: '',
  llm_model: '',
  llm_endpoint_url: '',
  llm_api_key: '',
  mcp_key_max_lifetime_days: '',
  conversation_retention_days: '',
  web_enrichment_enabled: false,
};

const numberFormatter = new Intl.NumberFormat();

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

function getErrorMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0) return message.map(String).join(' ');
  return error?.message || fallback;
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
    llm_provider: settings.llm_provider || '',
    llm_model: settings.llm_model || '',
    llm_endpoint_url: settings.llm_endpoint_url || '',
    llm_api_key: '',
    mcp_key_max_lifetime_days: settings.mcp_key_max_lifetime_days ?? '',
    conversation_retention_days: settings.conversation_retention_days ?? '',
    web_enrichment_enabled: settings.web_enrichment_enabled,
  };
}

function buildSettingsUpdatePayload(
  form: AiSettingsForm,
  settings: AiSettingsPayload['settings'],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (form.chat_enabled !== settings.chat_enabled) payload.chat_enabled = form.chat_enabled;
  if (form.mcp_enabled !== settings.mcp_enabled) payload.mcp_enabled = form.mcp_enabled;

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

  if (form.web_enrichment_enabled !== settings.web_enrichment_enabled) {
    payload.web_enrichment_enabled = form.web_enrichment_enabled;
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

function providerInfoText(provider: ProviderDescriptor | undefined): string | null {
  switch (provider?.id) {
    case 'anthropic':
      return 'Anthropic: provide your API key and a model name (for example claude-sonnet-4-20250514). No endpoint URL is needed.';
    case 'openai':
      return 'OpenAI: provide your API key and a model name (for example gpt-4o). No endpoint URL is needed.';
    case 'ollama':
      return 'Ollama / LMStudio: provide the endpoint URL and model name. In Docker, use http://host.docker.internal:<port>/v1 instead of localhost.';
    case 'custom':
      return 'Custom OpenAI-compatible provider: provide endpoint URL, API key, and model name.';
    default:
      return null;
  }
}

function providerModelPlaceholder(provider: ProviderDescriptor | undefined): string {
  switch (provider?.id) {
    case 'anthropic':
      return 'e.g., claude-sonnet-4-20250514';
    case 'openai':
      return 'e.g., gpt-4o';
    case 'ollama':
      return 'e.g., llama3, mistral';
    default:
      return 'Model identifier';
  }
}

function providerApiKeyHelperText(settings: AiSettingsPayload['settings'] | undefined): string | undefined {
  const messages: string[] = [];
  if (settings?.has_llm_api_key) {
    messages.push('Leave blank to keep the stored key for save and test actions.');
  }
  if (settings && !settings.provider_secret_writable) {
    messages.push('Secret storage is not configured on this instance.');
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
}) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6">Usage Overview</Typography>
          </Stack>

          {overviewQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : overviewQuery.isError ? (
            <Alert severity="error">
              {getErrorMessage(overviewQuery.error, 'Failed to load AI overview.')}
            </Alert>
          ) : overviewQuery.data ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Chat usage only. Token totals are aggregated from persisted `ai_messages.usage_json`.
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
                  label="All conversations"
                  value={formatNumber(overviewQuery.data.totals.conversations_all)}
                />
                <MetricCard
                  label="Active conversations (7d)"
                  value={formatNumber(overviewQuery.data.totals.conversations_7d)}
                />
                <MetricCard
                  label="Active conversations (30d)"
                  value={formatNumber(overviewQuery.data.totals.conversations_30d)}
                />
                <MetricCard
                  label="Active users (30d)"
                  value={formatNumber(overviewQuery.data.totals.active_users_30d)}
                />
              </Box>

              <Stack spacing={1}>
                <Typography variant="subtitle1">Token usage</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Window</TableCell>
                      <TableCell align="right">Input tokens</TableCell>
                      <TableCell align="right">Output tokens</TableCell>
                      <TableCell align="right">Total tokens</TableCell>
                      <TableCell align="right">Messages</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Current month</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.input_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.output_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.total_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.current_month.message_count)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Last 30 days</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.input_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.output_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.total_tokens)}</TableCell>
                      <TableCell align="right">{formatNumber(overviewQuery.data.usage.last_30_days.message_count)}</TableCell>
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

  const [form, setForm] = useState<AiSettingsForm>(EMPTY_FORM);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [providerTestResult, setProviderTestResult] = useState<AiProviderTestResult | null>(null);
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
      setForm((prev) => ({ ...prev, llm_api_key: '' }));
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      const validationErrors = getValidationErrors(error);
      const message = getErrorMessage(error, 'Save failed.');
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
        message: getErrorMessage(error, 'Connection test failed.'),
        validation_errors: getValidationErrors(error),
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
      setKeyActionError(getErrorMessage(error, 'Failed to create MCP key.'));
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
      setKeyActionError(getErrorMessage(error, 'Failed to revoke MCP key.'));
    },
  });

  const selectedProvider = settingsQuery.data?.available_providers.find((provider) => provider.id === form.llm_provider);
  const currentSettings = settingsQuery.data?.settings;

  return (
    <>
      <PageHeader title="AI" />
      <Stack spacing={2} maxWidth={980}>
        {!config.features.aiSettings ? (
          <Alert severity="warning">AI settings are disabled for this instance.</Alert>
        ) : (
          <>
            <Card>
              <CardContent>
                {settingsQuery.isLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={28} />
                  </Box>
                ) : settingsQuery.isError ? (
                  <Alert severity="error">
                    {getErrorMessage(settingsQuery.error, 'Failed to load AI settings.')}
                  </Alert>
                ) : settingsQuery.data ? (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeIcon color="primary" />
                      <Typography variant="h6">AI Configuration</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={settingsQuery.data.settings.chat_enabled ? 'Chat enabled' : 'Chat disabled'}
                        size="small"
                        color={settingsQuery.data.settings.chat_enabled ? 'success' : 'default'}
                      />
                      <Chip
                        label={settingsQuery.data.settings.mcp_enabled ? 'MCP enabled' : 'MCP disabled'}
                        size="small"
                        color={settingsQuery.data.settings.mcp_enabled ? 'success' : 'default'}
                      />
                      <Chip
                        label={settingsQuery.data.settings.chat_ready ? 'Provider ready' : 'Provider incomplete'}
                        size="small"
                        color={settingsQuery.data.settings.chat_ready ? 'success' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {settingsQuery.data.settings.llm_provider
                        ? `Current provider: ${settingsQuery.data.settings.llm_provider}${settingsQuery.data.settings.llm_model ? ` / ${settingsQuery.data.settings.llm_model}` : ''}`
                        : 'No provider configured yet.'}
                    </Typography>
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                {settingsQuery.isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={28} />
                  </Box>
                ) : settingsQuery.isError ? (
                  <Alert severity="error">
                    {getErrorMessage(settingsQuery.error, 'Failed to load AI settings.')}
                  </Alert>
                ) : settingsQuery.data ? (
                  <Stack spacing={2.5}>
                    <Typography variant="h6">Provider settings</Typography>

                    {currentSettings?.provider_validation_errors.length ? (
                      <Alert severity="warning" variant="outlined">
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight={600}>
                            Current provider validation errors
                          </Typography>
                          <ValidationErrorList errors={currentSettings.provider_validation_errors} />
                        </Stack>
                      </Alert>
                    ) : null}

                    {providerTestResult ? (
                      <Alert severity={providerTestResult.ok ? 'success' : 'error'} variant="outlined">
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight={600}>
                            {providerTestResult.ok ? 'Connection succeeded' : 'Connection failed'}
                          </Typography>
                          <Typography variant="body2">{providerTestResult.message}</Typography>
                          {providerTestResult.provider || providerTestResult.model || providerTestResult.latency_ms != null ? (
                            <Typography variant="caption" color="text.secondary">
                              {[providerTestResult.provider, providerTestResult.model].filter(Boolean).join(' / ') || 'Provider test'}
                              {providerTestResult.latency_ms != null ? ` • ${providerTestResult.latency_ms} ms` : ''}
                            </Typography>
                          ) : null}
                          {providerTestResult.validation_errors.length > 0 ? (
                            <ValidationErrorList errors={providerTestResult.validation_errors} />
                          ) : null}
                        </Stack>
                      </Alert>
                    ) : null}

                    <Alert severity="info" variant="outlined">
                      Test connection uses the current form values. Leave API key blank to reuse the stored key for this tenant.
                    </Alert>

                    <FormControl size="small" fullWidth>
                      <InputLabel>Provider</InputLabel>
                      <Select
                        value={form.llm_provider}
                        label="Provider"
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
                        <MenuItem value="">None</MenuItem>
                        {settingsQuery.data.available_providers.map((provider) => (
                          <MenuItem key={provider.id} value={provider.id}>
                            {provider.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {providerInfoText(selectedProvider) ? (
                      <Alert severity="info" variant="outlined">
                        {providerInfoText(selectedProvider)}
                      </Alert>
                    ) : null}

                    <TextField
                      size="small"
                      label="Model"
                      value={form.llm_model}
                      onChange={(event) => setForm((prev) => ({ ...prev, llm_model: event.target.value }))}
                      placeholder={providerModelPlaceholder(selectedProvider)}
                    />

                    {(selectedProvider?.id === 'ollama' || selectedProvider?.id === 'custom') ? (
                      <TextField
                        size="small"
                        label="Endpoint URL"
                        value={form.llm_endpoint_url}
                        onChange={(event) => setForm((prev) => ({ ...prev, llm_endpoint_url: event.target.value }))}
                        placeholder={
                          selectedProvider?.id === 'ollama'
                            ? 'e.g., http://host.docker.internal:1234/v1'
                            : 'e.g., https://my-provider.example.com/v1'
                        }
                      />
                    ) : null}

                    {selectedProvider?.capabilities.requiresApiKey ? (
                      <TextField
                        size="small"
                        label="API Key"
                        type="password"
                        value={form.llm_api_key}
                        onChange={(event) => setForm((prev) => ({ ...prev, llm_api_key: event.target.value }))}
                        placeholder={
                          currentSettings?.has_llm_api_key
                            ? 'Key configured (leave blank to keep)'
                            : 'Enter API key'
                        }
                        helperText={providerApiKeyHelperText(currentSettings)}
                      />
                    ) : null}

                    <Divider />

                    <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.chat_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, chat_enabled: event.target.checked }))}
                          />
                        }
                        label="Enable chat"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.mcp_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, mcp_enabled: event.target.checked }))}
                          />
                        }
                        label="Enable MCP"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.web_enrichment_enabled}
                            onChange={(event) => setForm((prev) => ({ ...prev, web_enrichment_enabled: event.target.checked }))}
                          />
                        }
                        label="Web enrichment"
                      />
                    </Stack>

                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <TextField
                        size="small"
                        label="MCP key max lifetime (days)"
                        type="number"
                        value={form.mcp_key_max_lifetime_days}
                        onChange={(event) => setForm((prev) => ({ ...prev, mcp_key_max_lifetime_days: event.target.value }))}
                        sx={{ width: 240 }}
                      />
                      <TextField
                        size="small"
                        label="Conversation retention (days)"
                        type="number"
                        value={form.conversation_retention_days}
                        onChange={(event) => setForm((prev) => ({ ...prev, conversation_retention_days: event.target.value }))}
                        sx={{ width: 240 }}
                      />
                    </Stack>

                    {saveSuccess ? <Alert severity="success">Settings saved.</Alert> : null}
                    {saveError ? <Alert severity="error">{saveError}</Alert> : null}

                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="contained"
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? 'Saving...' : 'Save settings'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => testProviderMutation.mutate(form)}
                        disabled={testProviderMutation.isPending}
                      >
                        {testProviderMutation.isPending ? 'Testing...' : 'Test connection'}
                      </Button>
                    </Stack>
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">MCP API Keys</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCreateKeyDialog(true);
                        setCreatedKey(null);
                        setKeyActionError(null);
                      }}
                    >
                      Create key
                    </Button>
                  </Stack>

                  {keyActionError ? <Alert severity="error">{keyActionError}</Alert> : null}

                  {keysQuery.isLoading ? (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : keysQuery.isError ? (
                    <Alert severity="error">
                      {getErrorMessage(keysQuery.error, 'Failed to load MCP API keys.')}
                    </Alert>
                  ) : keysQuery.data && keysQuery.data.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Label</TableCell>
                          <TableCell>Prefix</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Expires</TableCell>
                          <TableCell>Last used</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {keysQuery.data.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell>{key.label}</TableCell>
                            <TableCell><code>{key.key_prefix}</code></TableCell>
                            <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                            <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</TableCell>
                            <TableCell>
                              {key.revoked_at ? (
                                <Chip label="Revoked" size="small" color="error" />
                              ) : (
                                <Chip label="Active" size="small" color="success" />
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
                      No MCP API keys configured.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {renderOverviewSection(overviewQuery)}
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
        <DialogTitle>{createdKey ? 'Key created' : 'Create MCP API key'}</DialogTitle>
        <DialogContent>
          {createdKey ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">Copy this key now. It will not be shown again.</Alert>
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
                label="Label"
                value={newKeyLabel}
                onChange={(event) => setNewKeyLabel(event.target.value)}
                placeholder="e.g., Desktop MCP client"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {createdKey ? (
            <Button onClick={() => { setCreateKeyDialog(false); setCreatedKey(null); }}>Done</Button>
          ) : (
            <>
              <Button onClick={() => setCreateKeyDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => createKeyMutation.mutate(newKeyLabel)}
                disabled={!newKeyLabel.trim() || createKeyMutation.isPending}
              >
                {createKeyMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
