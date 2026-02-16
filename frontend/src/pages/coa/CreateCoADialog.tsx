import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../../api';
import { COUNTRY_OPTIONS } from '../../constants/isoOptions';

type TemplateOption = {
  id: string;
  country_iso: string | null;
  template_code: string;
  template_name: string;
  version: string;
  is_global?: boolean;
  loaded_by_default?: boolean;
};

export default function CreateCoADialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (newId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'scratch' | 'template'>('scratch');
  const [scope, setScope] = useState<'GLOBAL' | 'COUNTRY'>('COUNTRY');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [preflight, setPreflight] = useState<any | null>(null);
  const [preflighting, setPreflighting] = useState(false);

  useEffect(() => {
    if (!open || mode !== 'template') return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/chart-of-accounts/templates');
        if (!alive) return;
        setTemplates(res.data?.items || []);
      } catch {
        if (!alive) return;
        setTemplates([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== 'template') return;
    if (!selectedTemplate) return;
    const template = templates.find((item) => item.id === selectedTemplate);
    if (!template) return;
    if (!name) setName(template.template_name);
    if (template.is_global) {
      setScope('GLOBAL');
      setCountry('');
      setIsDefault(false);
    } else {
      setScope('COUNTRY');
      if (!country) setCountry(template.country_iso || '');
    }
    if (!code) setCode(template.template_name);
  }, [selectedTemplate, templates, open, mode, name, country, code]);

  const resetForm = () => {
    setCode('');
    setName('');
    setCountry('');
    setScope('COUNTRY');
    setIsDefault(false);
    setSelectedTemplate('');
    setPreflight(null);
    setMode('scratch');
    setError(null);
  };

  const runPreflight = async () => {
    if (mode !== 'template' || !selectedTemplate) return;
    setPreflighting(true);
    setError(null);
    try {
      const res = await api.post('/chart-of-accounts/import-template/preflight', { template_id: selectedTemplate });
      setPreflight(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Preflight failed');
      setPreflight(null);
    } finally {
      setPreflighting(false);
    }
  };

  const handleSubmit = async () => {
    const selected = templates.find((item) => item.id === selectedTemplate);
    const isGlobal = scope === 'GLOBAL' || !!selected?.is_global;
    if (!code || !name) {
      setError('Code and Name are required');
      return;
    }
    if (scope === 'COUNTRY' && !(mode === 'template' && isGlobal) && !country) {
      setError('Country is required');
      return;
    }
    if (mode === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { code, name, scope };
      if (scope === 'COUNTRY') payload.country_iso = country;
      payload.is_default = scope === 'COUNTRY' ? isDefault : false;

      const createRes = await api.post('/chart-of-accounts', payload);
      const created = createRes.data;
      if (mode === 'template' && selectedTemplate) {
        await api.post(`/chart-of-accounts/${created.id}/load-template`, {
          template_id: selectedTemplate,
          dryRun: false,
          overwrite: true,
        });
      }

      if (created?.id) onCreated(String(created.id));
      onClose();
      resetForm();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Chart of Accounts</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl>
            <FormLabel id="coa-create-mode">Mode</FormLabel>
            <RadioGroup
              row
              aria-labelledby="coa-create-mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as 'scratch' | 'template');
                setPreflight(null);
              }}
            >
              <FormControlLabel value="scratch" control={<Radio />} label="Create from scratch" />
              <FormControlLabel value="template" control={<Radio />} label="Copy from template" />
            </RadioGroup>
          </FormControl>

          {mode === 'template' && (
            <TextField
              select
              label="Template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
              size="small"
            >
              {templates.map((template) => {
                const templateScope = template.country_iso ? template.country_iso : 'ALL';
                return (
                  <MenuItem key={template.id} value={template.id}>
                    {templateScope} — {template.template_code} {template.version} · {template.template_name}
                  </MenuItem>
                );
              })}
            </TextField>
          )}

          <TextField
            label={(
              <>
                Code
                <Tooltip title="A stable identifier used in exports/imports (coa_code) and deep links." placement="top">
                  <InfoOutlinedIcon fontSize="small" sx={{ ml: 0.75, verticalAlign: 'middle' }} />
                </Tooltip>
              </>
            )}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            size="small"
            autoFocus
          />
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
          />

          <FormControl>
            <FormLabel id="coa-scope">Scope</FormLabel>
            <RadioGroup
              row
              aria-labelledby="coa-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'GLOBAL' | 'COUNTRY')}
            >
              <FormControlLabel value="COUNTRY" control={<Radio />} label="Country" />
              <FormControlLabel value="GLOBAL" control={<Radio />} label="Global" />
            </RadioGroup>
          </FormControl>

          {scope === 'COUNTRY' && (
            <TextField
              select
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              size="small"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.code} — {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {scope === 'COUNTRY' && (
            <FormControlLabel
              control={<Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
              label="Set as default for this country"
            />
          )}

          {mode === 'template' && preflight && (
            <Alert severity="success">
              Preflight OK — total {preflight.total}, inserts {preflight.inserted}, updates {preflight.updated}.
            </Alert>
          )}

          {error && <Box sx={{ color: 'error.main', fontSize: 14 }}>{error}</Box>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting || preflighting}>Cancel</Button>
        {mode === 'template' && (
          <Button onClick={runPreflight} disabled={!selectedTemplate || preflighting || submitting}>
            Preflight
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || (mode === 'template' && !selectedTemplate)}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
