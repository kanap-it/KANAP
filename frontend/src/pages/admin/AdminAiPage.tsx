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
import api from '../../api';
import { useFeatures } from '../../config/FeaturesContext';
import { aiKeysApi } from '../../ai/aiApi';
import { AiApiKeyRecord } from '../../ai/aiTypes';

type ProviderDescriptor = {
  id: string;
  label: string;
  description: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsToolCalling: boolean;
    requiresApiKey: boolean;
    allowsCustomEndpoint: boolean;
  };
};

type AiSettingsPayload = {
  instance_features: { ai_chat: boolean; ai_mcp: boolean; ai_settings: boolean };
  settings: {
    chat_enabled: boolean;
    mcp_enabled: boolean;
    llm_provider: string | null;
    llm_endpoint_url: string | null;
    llm_model: string | null;
    mcp_key_max_lifetime_days: number | null;
    conversation_retention_days: number | null;
    web_enrichment_enabled: boolean;
    has_llm_api_key: boolean;
    provider_secret_writable: boolean;
    provider_validation_errors: string[];
    chat_ready: boolean;
  };
  available_providers: ProviderDescriptor[];
};

export default function AdminAiPage() {
  const { config } = useFeatures();
  const queryClient = useQueryClient();

  // Settings query
  const query = useQuery<AiSettingsPayload>({
    queryKey: ['admin-ai-settings'],
    queryFn: async () => {
      const res = await api.get('/ai/settings');
      return res.data;
    },
    enabled: config.features.aiSettings,
  });

  // Settings form state
  const [form, setForm] = useState<Record<string, any>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form from query data
  React.useEffect(() => {
    if (query.data) {
      const s = query.data.settings;
      setForm({
        chat_enabled: s.chat_enabled,
        mcp_enabled: s.mcp_enabled,
        llm_provider: s.llm_provider || '',
        llm_model: s.llm_model || '',
        llm_endpoint_url: s.llm_endpoint_url || '',
        llm_api_key: '',
        mcp_key_max_lifetime_days: s.mcp_key_max_lifetime_days ?? '',
        conversation_retention_days: s.conversation_retention_days ?? '',
        web_enrichment_enabled: s.web_enrichment_enabled,
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const payload: Record<string, any> = {};
      const s = query.data!.settings;
      if (data.chat_enabled !== s.chat_enabled) payload.chat_enabled = data.chat_enabled;
      if (data.mcp_enabled !== s.mcp_enabled) payload.mcp_enabled = data.mcp_enabled;
      if (data.llm_provider !== (s.llm_provider || '')) payload.llm_provider = data.llm_provider || null;
      if (data.llm_model !== (s.llm_model || '')) payload.llm_model = data.llm_model || null;
      if (data.llm_endpoint_url !== (s.llm_endpoint_url || '')) payload.llm_endpoint_url = data.llm_endpoint_url || null;
      if (data.llm_api_key) payload.llm_api_key = data.llm_api_key;
      const maxLifetime = data.mcp_key_max_lifetime_days === '' ? null : Number(data.mcp_key_max_lifetime_days);
      if (maxLifetime !== s.mcp_key_max_lifetime_days) payload.mcp_key_max_lifetime_days = maxLifetime;
      const retention = data.conversation_retention_days === '' ? null : Number(data.conversation_retention_days);
      if (retention !== s.conversation_retention_days) payload.conversation_retention_days = retention;
      if (data.web_enrichment_enabled !== s.web_enrichment_enabled) payload.web_enrichment_enabled = data.web_enrichment_enabled;
      if (Object.keys(payload).length === 0) return;
      await api.patch('/ai/settings', payload);
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError(null);
      setForm((prev) => ({ ...prev, llm_api_key: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message || err.message || 'Save failed.');
    },
  });

  // MCP Keys
  const keysQuery = useQuery<AiApiKeyRecord[]>({
    queryKey: ['admin-ai-keys'],
    queryFn: () => aiKeysApi.adminList(),
    enabled: config.features.aiSettings,
  });

  const [createKeyDialog, setCreateKeyDialog] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createKeyMutation = useMutation({
    mutationFn: (label: string) => aiKeysApi.create({ label }),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setNewKeyLabel('');
      queryClient.invalidateQueries({ queryKey: ['admin-ai-keys'] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => aiKeysApi.adminRevoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ai-keys'] }),
  });

  const selectedProvider = query.data?.available_providers.find((p) => p.id === form.llm_provider);

  return (
    <>
      <PageHeader title="AI" />
      <Stack spacing={2} maxWidth={980}>
        {!config.features.aiSettings && (
          <Alert severity="warning">AI settings are disabled for this instance.</Alert>
        )}

        {config.features.aiSettings && query.isLoading && (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        )}

        {config.features.aiSettings && query.isError && (
          <Alert severity="error">
            {(query.error as any)?.response?.data?.message || 'Failed to load AI settings.'}
          </Alert>
        )}

        {query.data && (
          <>
            {/* Status chips */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AutoAwesomeIcon color="primary" />
                    <Typography variant="h6">AI Configuration</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={query.data.settings.chat_enabled ? 'Chat enabled' : 'Chat disabled'} size="small" color={query.data.settings.chat_enabled ? 'success' : 'default'} />
                    <Chip label={query.data.settings.mcp_enabled ? 'MCP enabled' : 'MCP disabled'} size="small" color={query.data.settings.mcp_enabled ? 'success' : 'default'} />
                    <Chip label={query.data.settings.chat_ready ? 'Provider ready' : 'Provider incomplete'} size="small" color={query.data.settings.chat_ready ? 'success' : 'default'} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Settings form */}
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h6">Provider settings</Typography>

                  <FormControl size="small" fullWidth>
                    <InputLabel>Provider</InputLabel>
                    <Select
                      value={form.llm_provider || ''}
                      label="Provider"
                      onChange={(e) => {
                        const newProvider = query.data?.available_providers.find((p) => p.id === e.target.value);
                        const clearEndpoint = newProvider && newProvider.id !== 'ollama' && newProvider.id !== 'custom';
                        setForm({
                          ...form,
                          llm_provider: e.target.value,
                          ...(clearEndpoint ? { llm_endpoint_url: '' } : {}),
                        });
                      }}
                    >
                      <MenuItem value="">None</MenuItem>
                      {query.data.available_providers.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedProvider && (
                    <Alert severity="info" variant="outlined">
                      {selectedProvider.id === 'anthropic' && 'Anthropic: provide your API key and a model name (e.g., claude-sonnet-4-20250514). No endpoint URL needed.'}
                      {selectedProvider.id === 'openai' && 'OpenAI: provide your API key and a model name (e.g., gpt-4o). No endpoint URL needed.'}
                      {selectedProvider.id === 'ollama' && 'Ollama / LMStudio: provide the endpoint URL and model name. No API key needed. In Docker, use http://host.docker.internal:<port>/v1 instead of localhost.'}
                      {selectedProvider.id === 'custom' && 'Custom OpenAI-compatible provider: provide endpoint URL, API key, and model name.'}
                    </Alert>
                  )}

                  <TextField
                    size="small"
                    label="Model"
                    value={form.llm_model || ''}
                    onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
                    placeholder={
                      selectedProvider?.id === 'anthropic' ? 'e.g., claude-sonnet-4-20250514' :
                      selectedProvider?.id === 'openai' ? 'e.g., gpt-4o' :
                      selectedProvider?.id === 'ollama' ? 'e.g., llama3, mistral' :
                      'Model identifier'
                    }
                  />

                  {selectedProvider?.id === 'ollama' || selectedProvider?.id === 'custom' ? (
                    <TextField
                      size="small"
                      label="Endpoint URL"
                      value={form.llm_endpoint_url || ''}
                      onChange={(e) => setForm({ ...form, llm_endpoint_url: e.target.value })}
                      placeholder={
                        selectedProvider?.id === 'ollama'
                          ? 'e.g., http://host.docker.internal:1234/v1'
                          : 'e.g., https://my-provider.example.com/v1'
                      }
                    />
                  ) : null}

                  {selectedProvider?.capabilities.requiresApiKey && (
                    <TextField
                      size="small"
                      label="API Key"
                      type="password"
                      value={form.llm_api_key || ''}
                      onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })}
                      placeholder={query.data.settings.has_llm_api_key ? 'Key configured (leave blank to keep)' : 'Enter API key'}
                      helperText={!query.data.settings.provider_secret_writable ? 'Secret storage not configured on this instance.' : undefined}
                    />
                  )}

                  <Divider />

                  <Stack direction="row" spacing={3}>
                    <FormControlLabel
                      control={<Switch checked={form.chat_enabled || false} onChange={(e) => setForm({ ...form, chat_enabled: e.target.checked })} />}
                      label="Enable chat"
                    />
                    <FormControlLabel
                      control={<Switch checked={form.mcp_enabled || false} onChange={(e) => setForm({ ...form, mcp_enabled: e.target.checked })} />}
                      label="Enable MCP"
                    />
                    <FormControlLabel
                      control={<Switch checked={form.web_enrichment_enabled || false} onChange={(e) => setForm({ ...form, web_enrichment_enabled: e.target.checked })} />}
                      label="Web enrichment"
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      label="MCP key max lifetime (days)"
                      type="number"
                      value={form.mcp_key_max_lifetime_days ?? ''}
                      onChange={(e) => setForm({ ...form, mcp_key_max_lifetime_days: e.target.value })}
                      sx={{ width: 220 }}
                    />
                    <TextField
                      size="small"
                      label="Conversation retention (days)"
                      type="number"
                      value={form.conversation_retention_days ?? ''}
                      onChange={(e) => setForm({ ...form, conversation_retention_days: e.target.value })}
                      sx={{ width: 220 }}
                    />
                  </Stack>

                  {saveSuccess && <Alert severity="success">Settings saved.</Alert>}
                  {saveError && <Alert severity="error">{saveError}</Alert>}

                  <Box>
                    <Button
                      variant="contained"
                      onClick={() => saveMutation.mutate(form)}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? 'Saving...' : 'Save settings'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* MCP Keys */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">MCP API Keys</Typography>
                    <Button size="small" variant="outlined" onClick={() => setCreateKeyDialog(true)}>
                      Create key
                    </Button>
                  </Stack>

                  {keysQuery.data && keysQuery.data.length > 0 ? (
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
                              {!key.revoked_at && (
                                <IconButton
                                  size="small"
                                  onClick={() => revokeKeyMutation.mutate(key.id)}
                                  disabled={revokeKeyMutation.isPending}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
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
          </>
        )}
      </Stack>

      {/* Create Key Dialog */}
      <Dialog open={createKeyDialog} onClose={() => { setCreateKeyDialog(false); setCreatedKey(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{createdKey ? 'Key created' : 'Create MCP API key'}</DialogTitle>
        <DialogContent>
          {createdKey ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                Copy this key now. It will not be shown again.
              </Alert>
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
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Label"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              sx={{ mt: 1 }}
              placeholder="e.g., Desktop MCP client"
            />
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
                Create
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
