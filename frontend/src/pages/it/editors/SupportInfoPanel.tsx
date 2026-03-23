import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import DateEUField from '../../../components/fields/DateEUField';
import ContactSelect from '../../../components/fields/ContactSelect';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
export type SupportInfoPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
  isDirty: () => boolean;
};

type VendorOption = { id: string; name: string };
type ContractOption = { id: string; name: string };

type SupportInfo = {
  vendor_id?: string | null;
  support_contract_id?: string | null;
  support_tier?: string | null;
  support_expiry?: string | null;
  notes?: string | null;
};

type SupportContactRow = {
  id?: string;
  contact_id: string | null;
  role: string;
  contact?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
};

type Props = {
  assetId: string;
  onDirtyChange?: (dirty: boolean) => void;
};

function normalizeContacts(rows: SupportContactRow[]) {
  return rows.map((r) => ({ contact_id: r.contact_id, role: (r.role || '').trim() }));
}

export default forwardRef<SupportInfoPanelHandle, Props>(function SupportInfoPanel({ assetId, onDirtyChange }, ref) {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('infrastructure', 'member');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [vendorId, setVendorId] = React.useState<string | null>(null);
  const [contractId, setContractId] = React.useState<string | null>(null);
  const [supportTier, setSupportTier] = React.useState('');
  const [supportExpiry, setSupportExpiry] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [baseline, setBaseline] = React.useState<SupportInfo>({});

  // Support contacts
  const [supportContacts, setSupportContacts] = React.useState<SupportContactRow[]>([]);
  const [contactsBaseline, setContactsBaseline] = React.useState<SupportContactRow[]>([]);

  // Options for autocomplete
  const [vendorOptions, setVendorOptions] = React.useState<VendorOption[]>([]);
  const [contractOptions, setContractOptions] = React.useState<ContractOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = React.useState(false);
  const [contractsLoading, setContractsLoading] = React.useState(false);

  const infoDirty = React.useMemo(() => {
    return (
      (vendorId || null) !== (baseline.vendor_id || null) ||
      (contractId || null) !== (baseline.support_contract_id || null) ||
      (supportTier || '') !== (baseline.support_tier || '') ||
      (supportExpiry || '') !== (baseline.support_expiry || '') ||
      (notes || '') !== (baseline.notes || '')
    );
  }, [vendorId, contractId, supportTier, supportExpiry, notes, baseline]);

  const contactsDirty = React.useMemo(() => {
    return JSON.stringify(normalizeContacts(supportContacts)) !== JSON.stringify(normalizeContacts(contactsBaseline));
  }, [supportContacts, contactsBaseline]);

  const dirty = infoDirty || contactsDirty;

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Load vendors (suppliers)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setVendorsLoading(true);
      try {
        const res = await api.get('/suppliers', { params: { limit: 500, sort: 'name:ASC' } });
        if (!alive) return;
        const items = (res.data?.items || []).map((s: any) => ({ id: s.id, name: s.name }));
        setVendorOptions(items);
      } catch {
        if (!alive) return;
        setVendorOptions([]);
      } finally {
        setVendorsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load contracts
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setContractsLoading(true);
      try {
        const res = await api.get('/contracts', { params: { limit: 500, sort: 'name:ASC' } });
        if (!alive) return;
        const items = (res.data?.items || []).map((c: any) => ({ id: c.id, name: c.name }));
        setContractOptions(items);
      } catch {
        if (!alive) return;
        setContractOptions([]);
      } finally {
        setContractsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load support info
      try {
        const res = await api.get(`/assets/${assetId}/support-info`);
        const data = res.data as SupportInfo | null;
        if (data) {
          setVendorId(data.vendor_id || null);
          setContractId(data.support_contract_id || null);
          setSupportTier(data.support_tier || '');
          setSupportExpiry(data.support_expiry || '');
          setNotes(data.notes || '');
          setBaseline(data);
        } else {
          setVendorId(null);
          setContractId(null);
          setSupportTier('');
          setSupportExpiry('');
          setNotes('');
          setBaseline({});
        }
      } catch (e: any) {
        if (e?.response?.status !== 404) {
          throw e;
        }
        setVendorId(null);
        setContractId(null);
        setSupportTier('');
        setSupportExpiry('');
        setNotes('');
        setBaseline({});
      }

      // Load support contacts
      try {
        const res = await api.get(`/assets/${assetId}/support-contacts`);
        const items = (res.data || []) as SupportContactRow[];
        const mapped = items.map((row) => ({
          id: row.id,
          contact_id: row.contact_id || null,
          role: row.role || '',
          contact: row.contact || null,
        }));
        setSupportContacts(mapped.length > 0 ? mapped : []);
        setContactsBaseline(mapped);
      } catch {
        setSupportContacts([]);
        setContactsBaseline([]);
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadSupportInfoFailed')));
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Contact row helpers
  const addContactRow = () => {
    setSupportContacts((rows) => [...rows, { contact_id: null, role: '', contact: null }]);
  };

  const removeContactRow = (idx: number) => {
    setSupportContacts((rows) => rows.filter((_, i) => i !== idx));
  };

  const setContactRowContact = async (idx: number, contactId: string | null) => {
    setSupportContacts((rows) =>
      rows.map((row, i) => (i === idx ? { ...row, contact_id: contactId, contact: contactId ? row.contact : null } : row))
    );
    if (contactId) {
      try {
        const res = await api.get(`/contacts/${contactId}`);
        const details = res.data;
        setSupportContacts((rows) => rows.map((row, i) => (i === idx ? { ...row, contact: details } : row)));
      } catch { /* ignore */ }
    }
  };

  const setContactRowRole = (idx: number, role: string) => {
    setSupportContacts((rows) => rows.map((row, i) => (i === idx ? { ...row, role } : row)));
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      // Save support info
      await api.post(`/assets/${assetId}/support-info`, {
        vendor_id: vendorId || null,
        support_contract_id: contractId || null,
        support_tier: supportTier || null,
        support_expiry: supportExpiry || null,
        notes: notes || null,
      });
      setBaseline({
        vendor_id: vendorId || null,
        support_contract_id: contractId || null,
        support_tier: supportTier || null,
        support_expiry: supportExpiry || null,
        notes: notes || null,
      });

      // Save support contacts
      const payload = normalizeContacts(supportContacts).filter((r) => r.contact_id);
      await api.post(`/assets/${assetId}/support-contacts/bulk-replace`, { contacts: payload });
      setContactsBaseline(supportContacts);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveSupportInfoFailed')));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setVendorId(baseline.vendor_id || null);
    setContractId(baseline.support_contract_id || null);
    setSupportTier(baseline.support_tier || '');
    setSupportExpiry(baseline.support_expiry || '');
    setNotes(baseline.notes || '');
    setSupportContacts(contactsBaseline.length > 0 ? contactsBaseline : []);
  };

  useImperativeHandle(ref, () => ({
    save,
    reset,
    isDirty: () => dirty,
  }), [save, dirty, baseline, contactsBaseline]);

  if (loading) {
    return <Alert severity="info">Loading support information...</Alert>;
  }

  const selectedVendor = vendorId ? vendorOptions.find((v) => v.id === vendorId) || null : null;
  const selectedContract = contractId ? contractOptions.find((c) => c.id === contractId) || null : null;

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={2} maxWidth={520}>
        <Autocomplete
          options={vendorOptions}
          value={selectedVendor}
          onChange={(_, v) => setVendorId(v?.id || null)}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          loading={vendorsLoading}
          disabled={saving || readOnly}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.name}</li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vendor"
              placeholder="Select vendor"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {vendorsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <Autocomplete
          options={contractOptions}
          value={selectedContract}
          onChange={(_, v) => setContractId(v?.id || null)}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          loading={contractsLoading}
          disabled={saving || readOnly}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.name}</li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Support contract"
              placeholder="Select contract"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {contractsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <TextField
          label="Support tier"
          value={supportTier}
          onChange={(e) => setSupportTier(e.target.value)}
          disabled={saving || readOnly}
          placeholder="e.g., Gold, Silver, 24x7"
          InputLabelProps={{ shrink: true }}
        />

        <DateEUField
          label="Support expiry"
          valueYmd={supportExpiry}
          onChangeYmd={setSupportExpiry}
          disabled={saving || readOnly}
        />

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving || readOnly}
          multiline
          minRows={3}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {/* Support Contacts Table */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Support Contacts</Typography>
          {!readOnly && (
            <Button startIcon={<AddIcon />} onClick={addContactRow} size="small">
              Add contact
            </Button>
          )}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contact</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Role</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {supportContacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">No support contacts yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {supportContacts.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell sx={{ minWidth: 260 }}>
                  <ContactSelect
                    value={row.contact_id}
                    onChange={(v) => void setContactRowContact(idx, v)}
                    showEmail={false}
                    disabled={readOnly || saving}
                  />
                </TableCell>
                <TableCell>{row.contact?.email || '—'}</TableCell>
                <TableCell>{row.contact?.phone || '—'}</TableCell>
                <TableCell>{row.contact?.mobile || '—'}</TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <TextField
                    value={row.role}
                    onChange={(e) => setContactRowRole(idx, e.target.value)}
                    size="small"
                    placeholder="Role"
                    fullWidth
                    disabled={readOnly || saving}
                  />
                </TableCell>
                <TableCell width={48}>
                  {!readOnly && (
                    <IconButton aria-label={t('common.remove')} size="small" onClick={() => removeContactRow(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
});
