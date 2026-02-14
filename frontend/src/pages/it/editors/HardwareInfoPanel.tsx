import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import DateEUField from '../../../components/fields/DateEUField';

export type HardwareInfoPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
  isDirty: () => boolean;
};

type HardwareInfo = {
  serial_number?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  rack_location?: string | null;
  rack_unit?: string | null;
  notes?: string | null;
};

type Props = {
  assetId: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<HardwareInfoPanelHandle, Props>(function HardwareInfoPanel({ assetId, onDirtyChange }, ref) {
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('infrastructure', 'member');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [serialNumber, setSerialNumber] = React.useState('');
  const [manufacturer, setManufacturer] = React.useState('');
  const [model, setModel] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState('');
  const [rackLocation, setRackLocation] = React.useState('');
  const [rackUnit, setRackUnit] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [baseline, setBaseline] = React.useState<HardwareInfo>({});

  const dirty = React.useMemo(() => {
    return (
      (serialNumber || '') !== (baseline.serial_number || '') ||
      (manufacturer || '') !== (baseline.manufacturer || '') ||
      (model || '') !== (baseline.model || '') ||
      (purchaseDate || '') !== (baseline.purchase_date || '') ||
      (rackLocation || '') !== (baseline.rack_location || '') ||
      (rackUnit || '') !== (baseline.rack_unit || '') ||
      (notes || '') !== (baseline.notes || '')
    );
  }, [serialNumber, manufacturer, model, purchaseDate, rackLocation, rackUnit, notes, baseline]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/assets/${assetId}/hardware-info`);
      const data = res.data as HardwareInfo | null;
      if (data) {
        setSerialNumber(data.serial_number || '');
        setManufacturer(data.manufacturer || '');
        setModel(data.model || '');
        setPurchaseDate(data.purchase_date || '');
        setRackLocation(data.rack_location || '');
        setRackUnit(data.rack_unit || '');
        setNotes(data.notes || '');
        setBaseline(data);
      } else {
        setSerialNumber('');
        setManufacturer('');
        setModel('');
        setPurchaseDate('');
        setRackLocation('');
        setRackUnit('');
        setNotes('');
        setBaseline({});
      }
    } catch (e: any) {
      // 404 means no hardware info yet, which is OK
      if (e?.response?.status !== 404) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load hardware info');
      }
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/assets/${assetId}/hardware-info`, {
        serial_number: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        purchase_date: purchaseDate || null,
        rack_location: rackLocation || null,
        rack_unit: rackUnit || null,
        notes: notes || null,
      });
      setBaseline({
        serial_number: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        purchase_date: purchaseDate || null,
        rack_location: rackLocation || null,
        rack_unit: rackUnit || null,
        notes: notes || null,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save hardware info');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSerialNumber(baseline.serial_number || '');
    setManufacturer(baseline.manufacturer || '');
    setModel(baseline.model || '');
    setPurchaseDate(baseline.purchase_date || '');
    setRackLocation(baseline.rack_location || '');
    setRackUnit(baseline.rack_unit || '');
    setNotes(baseline.notes || '');
  };

  useImperativeHandle(ref, () => ({
    save,
    reset,
    isDirty: () => dirty,
  }), [save, dirty, baseline]);

  if (loading) {
    return <Alert severity="info">Loading hardware information...</Alert>;
  }

  return (
    <Stack spacing={2} maxWidth={520}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Serial number"
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        disabled={saving || readOnly}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Manufacturer"
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        disabled={saving || readOnly}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={saving || readOnly}
        InputLabelProps={{ shrink: true }}
      />

      <DateEUField
        label="Purchase date"
        valueYmd={purchaseDate}
        onChangeYmd={setPurchaseDate}
        disabled={saving || readOnly}
      />

      <TextField
        label="Rack location"
        value={rackLocation}
        onChange={(e) => setRackLocation(e.target.value)}
        disabled={saving || readOnly}
        placeholder="e.g., Row A, Rack 12"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Rack unit"
        value={rackUnit}
        onChange={(e) => setRackUnit(e.target.value)}
        disabled={saving || readOnly}
        placeholder="e.g., U1-U4"
        InputLabelProps={{ shrink: true }}
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
  );
});
