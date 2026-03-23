import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Stack, TextField, FormControlLabel, Checkbox } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import DateEUField from '../../../components/fields/DateEUField';
import api from '../../../api';

export type ContractDetailsEditorHandle = {
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id?: string; // when undefined, we still render to show defaults during creation
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function computeEndDate(start: string, durationMonths: number): string {
  if (!start) return '';
  const d = new Date(start + 'T00:00:00Z');
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (durationMonths || 0), d.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0,10);
}
function addMonths(dateIso: string, delta: number): string {
  if (!dateIso) return '';
  const d = new Date(dateIso + 'T00:00:00Z');
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, d.getUTCDate()));
  return out.toISOString().slice(0,10);
}
function computeCancelDeadline(endDateIso: string, noticeMonths: number): string {
  if (!endDateIso) return '';
  return addMonths(endDateIso, -noticeMonths);
}

export default forwardRef<ContractDetailsEditorHandle, Props>(function ContractDetailsEditor({ id, readOnly, onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [startDate, setStartDate] = React.useState<string>(() => new Date().toISOString().slice(0,10));
  const [durationMonthsStr, setDurationMonthsStr] = React.useState<string>('12');
  const [noticeMonthsStr, setNoticeMonthsStr] = React.useState<string>('1');
  const [yearlyAmountStr, setYearlyAmountStr] = React.useState<string>('0');
  const [currency, setCurrency] = React.useState<string>('EUR');
  const [billingFrequency, setBillingFrequency] = React.useState<'monthly'|'quarterly'|'annual'|'other'>('annual');
  const [autoRenewal, setAutoRenewal] = React.useState<boolean>(true);

  const durationMonths = React.useMemo(() => {
    const n = parseInt((durationMonthsStr || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }, [durationMonthsStr]);
  const noticeMonths = React.useMemo(() => {
    const n = parseInt((noticeMonthsStr || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }, [noticeMonthsStr]);
  const yearlyAmount = React.useMemo(() => {
    const n = parseInt((yearlyAmountStr || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }, [yearlyAmountStr]);

  const endDate = React.useMemo(() => computeEndDate(startDate, durationMonths), [startDate, durationMonths]);
  const cancelDeadline = React.useMemo(() => computeCancelDeadline(endDate, noticeMonths), [endDate, noticeMonths]);

  const baselineRef = React.useRef<any>(null);
  const dirty = React.useMemo(() => {
    const cur = { startDate, durationMonths, noticeMonths, yearlyAmount, currency, billingFrequency, autoRenewal };
    return JSON.stringify(cur) !== JSON.stringify(baselineRef.current);
  }, [startDate, durationMonths, noticeMonths, yearlyAmount, currency, billingFrequency, autoRenewal]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    if (!id) { baselineRef.current = { startDate, durationMonths, noticeMonths, yearlyAmount, currency, billingFrequency, autoRenewal }; return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/contracts/${id}`);
      const d = res.data;
      setStartDate(d.start_date || new Date().toISOString().slice(0,10));
      setDurationMonthsStr(String(d.duration_months ?? 12));
      setNoticeMonthsStr(String(d.notice_period_months ?? 1));
      setYearlyAmountStr(String(Number(d.yearly_amount_at_signature ?? 0)));
      setCurrency((d.currency || 'EUR').toUpperCase());
      setBillingFrequency((d.billing_frequency || 'annual'));
      setAutoRenewal(Boolean(d.auto_renewal ?? true));
      baselineRef.current = {
        startDate: d.start_date || new Date().toISOString().slice(0,10),
        durationMonths: Number(d.duration_months ?? 12),
        noticeMonths: Number(d.notice_period_months ?? 1),
        yearlyAmount: Number(d.yearly_amount_at_signature ?? 0),
        currency: (d.currency || 'EUR').toUpperCase(),
        billingFrequency: (d.billing_frequency || 'annual'),
        autoRenewal: Boolean(d.auto_renewal ?? true),
      };
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contracts.details.failedToLoad')));
    } finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!id || !dirty) return;
    setSaving(true); setError(null);
    try {
      await api.patch(`/contracts/${id}`, {
        start_date: startDate,
        duration_months: durationMonths,
        auto_renewal: autoRenewal,
        notice_period_months: noticeMonths,
        yearly_amount_at_signature: yearlyAmount,
        currency: (currency || '').toUpperCase(),
        billing_frequency: billingFrequency,
      });
      await load();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contracts.details.failedToSave')));
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ save, reset: () => { void load(); } }), [save, load]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <DateEUField label="Start Date" valueYmd={startDate || ''} onChangeYmd={setStartDate} disabled={readOnly} required />
      <TextField
        label="Duration (months)"
        value={durationMonthsStr}
        onChange={(e) => {
          const v = e.target.value;
          // Allow blank while typing; otherwise digits only
          if (v === '' || /^[0-9]+$/.test(v)) setDurationMonthsStr(v);
        }}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        InputLabelProps={{ shrink: true }}
        disabled={readOnly}
      />
      <TextField
        label="Notice (months)"
        value={noticeMonthsStr}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^[0-9]+$/.test(v)) setNoticeMonthsStr(v);
        }}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0 }}
        InputLabelProps={{ shrink: true }}
        disabled={readOnly}
      />
      <TextField
        label="Yearly amount"
        value={yearlyAmountStr}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^[0-9]+$/.test(v)) setYearlyAmountStr(v);
        }}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        InputLabelProps={{ shrink: true }}
        disabled={readOnly}
      />
      <TextField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0,3))} InputLabelProps={{ shrink: true }} disabled={readOnly} />
      <EnumAutocomplete label="Billing frequency" value={billingFrequency} onChange={(v) => setBillingFrequency(v as any)} options={['monthly','quarterly','annual','other']} required />
      <FormControlLabel control={<Checkbox checked={autoRenewal} onChange={(e) => setAutoRenewal(e.target.checked)} />} label="Auto-renewal" />
      <TextField label="End date" value={endDate} InputLabelProps={{ shrink: true }} disabled />
      <TextField label="Cancellation deadline" value={cancelDeadline} InputLabelProps={{ shrink: true }} disabled />
    </Stack>
  );
});
