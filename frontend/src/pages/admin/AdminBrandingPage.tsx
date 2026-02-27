import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { getContrastRatio, useTheme } from '@mui/material/styles';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useTenant } from '../../tenant/TenantContext';
import ForbiddenPage from '../ForbiddenPage';

type BrandingSettings = {
  has_logo: boolean;
  logo_version: number;
  use_logo_in_dark: boolean;
  primary_color_light: string | null;
  primary_color_dark: string | null;
};

type BrandingFormState = {
  useLogoInDark: boolean;
  primaryColorLight: string;
  primaryColorDark: string;
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const LIGHT_COLOR_PRESETS = ['#0D47A1', '#1976D2', '#1E88E5', '#00897B', '#2E7D32', '#F57C00', '#EF6C00', '#D32F2F', '#6A1B9A', '#37474F'];
const DARK_COLOR_PRESETS = ['#90CAF9', '#64B5F6', '#4DD0E1', '#80CBC4', '#81C784', '#FFCC80', '#FFAB91', '#EF9A9A', '#CE93D8', '#B0BEC5'];

function normalizeColorForCompare(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeServerHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!HEX_COLOR_RE.test(text)) return null;
  return text.toUpperCase();
}

function validateHexField(value: string): { normalized: string | null; error: string | null } {
  const text = value.trim();
  if (!text) return { normalized: null, error: null };
  if (HEX_COLOR_RE.test(text)) {
    return { normalized: text.toUpperCase(), error: null };
  }
  return { normalized: null, error: 'Use format #RRGGBB (example: #1F3A5F)' };
}

function pickerValue(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (HEX_COLOR_RE.test(trimmed)) return trimmed.toUpperCase();
  return fallback;
}

function describeTextTone(color: string): 'white' | 'dark' {
  const vsWhite = getContrastRatio(color, '#FFFFFF');
  const vsBlack = getContrastRatio(color, '#000000');
  return vsWhite > vsBlack ? 'dark' : 'white';
}

function toFormState(settings: BrandingSettings): BrandingFormState {
  return {
    useLogoInDark: settings.use_logo_in_dark,
    primaryColorLight: settings.primary_color_light ?? '',
    primaryColorDark: settings.primary_color_dark ?? '',
  };
}

function normalizeSettings(data: any): BrandingSettings {
  const logoVersion = Number(data?.logo_version);
  return {
    has_logo: !!data?.has_logo,
    logo_version: Number.isFinite(logoVersion) && logoVersion >= 0 ? logoVersion : 0,
    use_logo_in_dark: data?.use_logo_in_dark !== false,
    primary_color_light: normalizeServerHex(data?.primary_color_light),
    primary_color_dark: normalizeServerHex(data?.primary_color_dark),
  };
}

type HeaderPreviewProps = {
  label: string;
  dark?: boolean;
  logoUrl: string | null;
  showLogo: boolean;
};

function HeaderPreview({ label, dark = false, logoUrl, showLogo }: HeaderPreviewProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1,
        bgcolor: dark ? '#182230' : '#f3f6fb',
        borderColor: dark ? 'rgba(255,255,255,0.16)' : 'divider',
      }}
    >
      <Typography variant="caption" sx={{ color: dark ? 'rgba(255,255,255,0.76)' : 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ minHeight: 42, mt: 0.5, display: 'flex', alignItems: 'center' }}>
        {showLogo && logoUrl ? (
          <Box component="img" src={logoUrl} alt="Logo preview" sx={{ maxHeight: 32, maxWidth: 180, objectFit: 'contain' }} />
        ) : (
          <Typography variant="h6" sx={{ color: dark ? '#FFFFFF' : '#111827' }}>
            KANAP
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function AdminBrandingPage() {
  const theme = useTheme();
  const { hasLevel } = useAuth();
  const {
    isPlatformHost,
    logoUrl,
    refreshTenantInfo,
  } = useTenant();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingLogo, setDeletingLogo] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<BrandingSettings | null>(null);
  const [form, setForm] = React.useState<BrandingFormState>({
    useLogoInDark: true,
    primaryColorLight: '',
    primaryColorDark: '',
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = React.useState<string | null>(null);
  const lightColorInputRef = React.useRef<HTMLInputElement | null>(null);
  const darkColorInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadSettings = React.useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/admin/branding/settings');
      const normalized = normalizeSettings(res.data);
      setSettings(normalized);
      setForm(toFormState(normalized));
      setSelectedFile(null);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load branding settings.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  React.useEffect(() => {
    if (!selectedFile) {
      setSelectedFileUrl(null);
      return;
    }
    const next = URL.createObjectURL(selectedFile);
    setSelectedFileUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [selectedFile]);

  if (isPlatformHost || !hasLevel('users', 'admin')) {
    return <ForbiddenPage />;
  }

  const lightValidation = validateHexField(form.primaryColorLight);
  const darkValidation = validateHexField(form.primaryColorDark);

  const baseLight = normalizeColorForCompare(settings?.primary_color_light);
  const baseDark = normalizeColorForCompare(settings?.primary_color_dark);
  const currentLight = normalizeColorForCompare(form.primaryColorLight);
  const currentDark = normalizeColorForCompare(form.primaryColorDark);

  const isDirty = !!settings && (
    !!selectedFile
    || form.useLogoInDark !== settings.use_logo_in_dark
    || currentLight !== baseLight
    || currentDark !== baseDark
  );

  const isInputInvalid = !!lightValidation.error || !!darkValidation.error;
  const canSubmit = !!settings && isDirty && !isInputInvalid && !saving && !deletingLogo && !resetting;
  const previewLogoUrl = selectedFileUrl || logoUrl;

  const effectiveLightColor = lightValidation.normalized || darkValidation.normalized;
  const effectiveDarkColor = darkValidation.normalized || lightValidation.normalized;
  const lightUsesFallback = !lightValidation.normalized && !!darkValidation.normalized;
  const darkUsesFallback = !darkValidation.normalized && !!lightValidation.normalized;

  const lightContrastText = effectiveLightColor
    ? theme.palette.getContrastText(effectiveLightColor)
    : null;
  const lightContrast = effectiveLightColor && lightContrastText
    ? getContrastRatio(lightContrastText, effectiveLightColor)
    : null;
  const lightTextTone = lightContrastText ? describeTextTone(lightContrastText) : null;

  const darkContrastText = effectiveDarkColor
    ? theme.palette.getContrastText(effectiveDarkColor)
    : null;
  const darkContrast = effectiveDarkColor && darkContrastText
    ? getContrastRatio(darkContrastText, effectiveDarkColor)
    : null;
  const darkTextTone = darkContrastText ? describeTextTone(darkContrastText) : null;

  const lowLightContrast = lightContrast != null && lightContrast < 4.5;
  const lowDarkContrast = darkContrast != null && darkContrast < 4.5;

  const handleDiscard = () => {
    if (!settings) return;
    setForm(toFormState(settings));
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!settings || !canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let changed = false;

      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        await api.post('/admin/branding/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        changed = true;
      }

      const payload: Record<string, unknown> = {};
      if (form.useLogoInDark !== settings.use_logo_in_dark) {
        payload.use_logo_in_dark = form.useLogoInDark;
      }
      if (currentLight !== baseLight) {
        payload.primary_color_light = lightValidation.normalized;
      }
      if (currentDark !== baseDark) {
        payload.primary_color_dark = darkValidation.normalized;
      }

      if (Object.keys(payload).length > 0) {
        await api.patch('/admin/branding/settings', payload);
        changed = true;
      }

      if (!changed) {
        setSuccess('No changes to save.');
        return;
      }

      await Promise.all([
        loadSettings({ silent: true }),
        refreshTenantInfo(),
      ]);

      setSuccess('Branding updated.');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save branding settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!settings || (!settings.has_logo && !selectedFile)) return;
    setDeletingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete('/admin/branding/logo');
      await Promise.all([
        loadSettings({ silent: true }),
        refreshTenantInfo(),
      ]);
      setSuccess('Logo removed.');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to remove logo.');
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleReset = async () => {
    if (!settings) return;
    const confirmed = window.confirm('Reset branding to default Kanap settings? This removes logo and custom colors.');
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/admin/branding/reset', {});
      await Promise.all([
        loadSettings({ silent: true }),
        refreshTenantInfo(),
      ]);
      setSuccess('Branding reset to defaults.');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to reset branding.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader title="Branding" />

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <Stack spacing={2} maxWidth={900}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Logo</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload one logo for the app header and login page. Best results: transparent PNG, JPG, GIF, or WEBP with a wide ratio.
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <HeaderPreview
                    label="Light header preview"
                    logoUrl={previewLogoUrl}
                    showLogo={!!previewLogoUrl}
                  />
                  <HeaderPreview
                    label={form.useLogoInDark ? 'Dark header preview' : 'Dark header preview (logo hidden)'}
                    dark
                    logoUrl={previewLogoUrl}
                    showLogo={!!previewLogoUrl && form.useLogoInDark}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    component="label"
                    disabled={saving || deletingLogo || resetting}
                  >
                    {selectedFile ? 'Replace Selected File' : 'Upload Logo'}
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setSelectedFile(file);
                        setSuccess(null);
                        setError(null);
                      }}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteLogo}
                    disabled={deletingLogo || saving || resetting || (!settings?.has_logo && !selectedFile)}
                  >
                    {deletingLogo ? 'Removing…' : 'Remove Logo'}
                  </Button>
                </Stack>

                {selectedFile && (
                  <Alert severity="info">
                    Selected file: {selectedFile.name}. Save changes to publish it.
                  </Alert>
                )}

                <FormControlLabel
                  control={(
                    <Switch
                      checked={form.useLogoInDark}
                      onChange={(event) => setForm((prev) => ({ ...prev, useLogoInDark: event.target.checked }))}
                      disabled={saving || deletingLogo || resetting}
                    />
                  )}
                  label="Show logo in dark mode"
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Primary Colors</Typography>
                <Typography variant="body2" color="text.secondary">
                  Set one color for light mode and one for dark mode. Leave blank to keep Kanap defaults.
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Light mode primary"
                      placeholder="#1F3A5F"
                      value={form.primaryColorLight}
                      onChange={(event) => setForm((prev) => ({ ...prev, primaryColorLight: event.target.value }))}
                      error={!!lightValidation.error}
                      helperText={lightValidation.error || 'Used for app bar, primary buttons, and links in light mode.'}
                      disabled={saving || deletingLogo || resetting}
                    />
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Swatch</Typography>
                      <Box
                        sx={{
                          width: 28,
                          height: 18,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: lightValidation.normalized || 'transparent',
                        }}
                      />
                      <input
                        ref={lightColorInputRef}
                        type="color"
                        value={pickerValue(form.primaryColorLight, '#1976D2')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                        onChange={(event) => setForm((prev) => ({ ...prev, primaryColorLight: event.target.value.toUpperCase() }))}
                      />
                      <Tooltip title="Open color picker">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => lightColorInputRef.current?.click()}
                            disabled={saving || deletingLogo || resetting}
                          >
                            <ColorLensIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
                      {LIGHT_COLOR_PRESETS.map((color) => (
                        <Tooltip key={color} title={color}>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, primaryColorLight: color }))}
                            disabled={saving || deletingLogo || resetting}
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              border: lightValidation.normalized === color ? '2px solid' : '1px solid',
                              borderColor: lightValidation.normalized === color ? 'text.primary' : 'divider',
                              bgcolor: color,
                              cursor: 'pointer',
                              p: 0,
                            }}
                          />
                        </Tooltip>
                      ))}
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setForm((prev) => ({ ...prev, primaryColorLight: '' }))}
                        disabled={saving || deletingLogo || resetting}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Dark mode primary"
                      placeholder="#9BC1FF"
                      value={form.primaryColorDark}
                      onChange={(event) => setForm((prev) => ({ ...prev, primaryColorDark: event.target.value }))}
                      error={!!darkValidation.error}
                      helperText={darkValidation.error || 'Used in dark mode. If empty, light mode color is reused.'}
                      disabled={saving || deletingLogo || resetting}
                    />
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Swatch</Typography>
                      <Box
                        sx={{
                          width: 28,
                          height: 18,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: darkValidation.normalized || 'transparent',
                        }}
                      />
                      <input
                        ref={darkColorInputRef}
                        type="color"
                        value={pickerValue(form.primaryColorDark, '#90CAF9')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                        onChange={(event) => setForm((prev) => ({ ...prev, primaryColorDark: event.target.value.toUpperCase() }))}
                      />
                      <Tooltip title="Open color picker">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => darkColorInputRef.current?.click()}
                            disabled={saving || deletingLogo || resetting}
                          >
                            <ColorLensIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
                      {DARK_COLOR_PRESETS.map((color) => (
                        <Tooltip key={color} title={color}>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, primaryColorDark: color }))}
                            disabled={saving || deletingLogo || resetting}
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              border: darkValidation.normalized === color ? '2px solid' : '1px solid',
                              borderColor: darkValidation.normalized === color ? 'text.primary' : 'divider',
                              bgcolor: color,
                              cursor: 'pointer',
                              p: 0,
                            }}
                          />
                        </Tooltip>
                      ))}
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setForm((prev) => ({ ...prev, primaryColorDark: '' }))}
                        disabled={saving || deletingLogo || resetting}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Box>
                </Stack>

                {(lowLightContrast || lowDarkContrast) && (
                  <Alert severity="warning">
                    {lowLightContrast && `Light mode contrast is low (${(lightContrast || 0).toFixed(2)}:1 vs ${lightTextTone || 'selected'} text${lightUsesFallback ? ', using dark-mode fallback color' : ''}). `}
                    {lowDarkContrast && `Dark mode contrast is low (${(darkContrast || 0).toFixed(2)}:1 vs ${darkTextTone || 'selected'} text${darkUsesFallback ? ', using light-mode fallback color' : ''}). `}
                    You can still save, but readability may suffer.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" onClick={handleSave} disabled={!canSubmit}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outlined" onClick={handleDiscard} disabled={!isDirty || saving || deletingLogo || resetting}>
                Discard
              </Button>
              <Button variant="text" color="warning" onClick={handleReset} disabled={saving || deletingLogo || resetting}>
                {resetting ? 'Resetting…' : 'Reset to Default'}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Logo version: {settings?.logo_version ?? 0}
            </Typography>
          </Paper>
        </Stack>
      )}
    </>
  );
}
