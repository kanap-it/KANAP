import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import CompanySelect from '../../../components/fields/CompanySelect';
import UserSelect from '../../../components/fields/UserSelect';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { STATUS_ENABLED } from '../../../constants/status';
import api from '../../../api';

export type ContractOverviewEditorHandle = {
  save: () => Promise<string | void>;
  reset: () => void;
};

type Props = {
  id?: string; // undefined when creating
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<ContractOverviewEditorHandle, Props>(function ContractOverviewEditor({ id, readOnly, onDirtyChange }, ref) {
  const isCreate = !id;
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [companyId, setCompanyId] = React.useState<string>('');
  const [ownerUserId, setOwnerUserId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'enabled' | 'disabled'>(STATUS_ENABLED);
  const [disabledAt, setDisabledAt] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<string>('');

  const baselineRef = React.useRef<any>(null);

  const dirty = React.useMemo(() => {
    const cur = { name, supplierId, companyId, ownerUserId, status, disabledAt, notes };
    return JSON.stringify(cur) !== JSON.stringify(baselineRef.current);
  }, [name, supplierId, companyId, ownerUserId, status, disabledAt, notes]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    if (!id) { baselineRef.current = { name: '', supplierId: '', companyId: '', ownerUserId: null, status: 'enabled', disabledAt: null, notes: '' }; return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/contracts/${id}`);
      const d = res.data;
      setName(d.name || '');
      setSupplierId(d.supplier_id || '');
      setCompanyId(d.company_id || '');
      setOwnerUserId(d.owner_user_id || null);
      setStatus((d.status || 'enabled').toLowerCase() === 'disabled' ? 'disabled' : 'enabled');
      setDisabledAt(d.disabled_at ? new Date(d.disabled_at).toISOString() : null);
      setNotes(d.notes || '');
      baselineRef.current = { name: d.name || '', supplierId: d.supplier_id || '', companyId: d.company_id || '', ownerUserId: d.owner_user_id || null, status: ((d.status || 'enabled').toLowerCase() === 'disabled' ? 'disabled' : 'enabled'), disabledAt: d.disabled_at ? new Date(d.disabled_at).toISOString() : null, notes: d.notes || '' };
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load contract');
    } finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true); setError(null);
    try {
      const payload: any = {
        name: (name || '').trim(),
        supplier_id: supplierId || null,
        company_id: companyId || null,
        owner_user_id: ownerUserId || null,
        status,
        disabled_at: disabledAt,
        notes: (notes || '').trim() || null,
      };
      if (isCreate) {
        // additional required fields will be set in Details editor later
        if (!payload.name || !payload.supplier_id || !payload.company_id) throw new Error('Name, Supplier and Company are required');
        const res = await api.post('/contracts', {
          ...payload,
          // minimal defaults to pass backend validation
          start_date: new Date().toISOString().slice(0,10),
          duration_months: 12,
          auto_renewal: true,
          notice_period_months: 1,
          yearly_amount_at_signature: 0,
          currency: 'EUR',
          billing_frequency: 'annual',
        });
        const newId = res.data?.id as string;
        await load();
        return newId;
      } else {
        await api.patch(`/contracts/${id}`, payload);
        await load();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save');
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ save, reset: () => { void load(); } }), [save, load]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <TextField label="Contract Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
      <SupplierSelect label="Supplier" value={supplierId} onChange={(v) => setSupplierId(v || '')} disabled={readOnly} required />
      <CompanySelect label="Contracting Company" value={companyId} onChange={(v) => setCompanyId(v || '')} disabled={readOnly} required />
      <UserSelect label="Owner" value={ownerUserId} onChange={setOwnerUserId} disabled={readOnly} />
      <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
      <StatusLifecycleField
        status={status}
        onStatusChange={(next) => setStatus(next)}
        disabledAt={disabledAt}
        onDisabledAtChange={(next) => setDisabledAt(next)}
        disabled={!!readOnly}
      />
    </Stack>
  );
});
