import { useTranslation } from 'react-i18next';
import { classificationText } from '../../../utils/applicationClassification';
import React from 'react';
import { Alert, Box, Button, Checkbox, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KanapDialog } from '../../../components/design';
import type { ApplicationClassificationCatalog, BusinessCriticalityLevel, ClassificationLevel, ClassificationPreview, ItOpsSettings, RecoveryWave } from '../../../services/itOpsSettings';
import { previewClassificationSettings, updateItOpsSettings } from '../../../services/itOpsSettings';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';

type Props = { settings: ItOpsSettings };

function stripCatalog(settings: ItOpsSettings): ApplicationClassificationCatalog {
  return {
    businessCriticalityLevels: settings.businessCriticalityLevels || [], businessMtdPresets: settings.businessMtdPresets || [],
    cyberCriticalityLevels: settings.cyberCriticalityLevels || [], dataClasses: settings.dataClasses as ClassificationLevel[] || [], recoveryWaves: settings.recoveryWaves || [],
    classificationVersions: settings.classificationVersions || { business: 1, cyber: 1, confidentiality: 1, recovery: 1 },
    classificationSettingsRevision: settings.classificationSettingsRevision || 0,
  };
}

const fieldSx = { '& input': { fontSize: 12, py: 0.5 } } as const;

function LevelRows<T extends ClassificationLevel | BusinessCriticalityLevel | RecoveryWave>({ rows, kind, onChange }: { rows: T[]; kind: 'business' | 'level' | 'wave'; onChange: (rows: T[]) => void }) {
  const patch = (index: number, next: Partial<T>) => onChange(rows.map((row, i) => i === index ? { ...row, ...next } : row));
  return <Stack spacing={0.75}>
    {rows.map((row, index) => <Box key={index} sx={{ display: 'grid', gridTemplateColumns: kind === 'business' ? '110px 140px minmax(180px,1fr) 75px 105px 36px' : '110px 140px minmax(180px,1fr) 75px 36px', gap: 1, alignItems: 'center' }}>
      <TextField value={row.code} onChange={(e) => patch(index, { code: e.target.value } as Partial<T>)} placeholder="code" size="small" sx={fieldSx} />
      <TextField value={row.label} onChange={(e) => patch(index, { label: e.target.value } as Partial<T>)} placeholder="Label" size="small" sx={fieldSx} />
      <TextField value={row.description || ''} onChange={(e) => patch(index, { description: e.target.value } as Partial<T>)} placeholder="Description" size="small" sx={fieldSx} />
      <TextField value={kind === 'wave' ? (row as RecoveryWave).order : (row as ClassificationLevel).rank} onChange={(e) => patch(index, { [kind === 'wave' ? 'order' : 'rank']: Number(e.target.value) } as Partial<T>)} type="number" size="small" sx={fieldSx} />
      {kind === 'business' && <TextField value={(row as BusinessCriticalityLevel).maxMtdMinutes ?? ''} onChange={(e) => patch(index, { maxMtdMinutes: e.target.value === '' ? null : Number(e.target.value) } as unknown as Partial<T>)} placeholder={classificationText("No limit")} type="number" size="small" sx={fieldSx} />}
      <Checkbox checked={!!row.deprecated} onChange={(e) => patch(index, { deprecated: e.target.checked } as Partial<T>)} size="small" inputProps={{ 'aria-label': `Deprecate ${row.label}` }} />
    </Box>)}
    <Button variant="action" sx={{ alignSelf: 'flex-start' }} onClick={() => onChange([...rows, ({ code: '', label: '', description: '', deprecated: false, ...(kind === 'wave' ? { order: rows.length } : { rank: rows.length + 1 }), ...(kind === 'business' ? { maxMtdMinutes: null } : {}) } as T)])}>{classificationText("Add level")}</Button>
  </Stack>;
}

export default function ClassificationCatalogSettings({ settings }: Props) {
  const { t } = useTranslation('it');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => stripCatalog(settings));
  const [presetsText, setPresetsText] = React.useState(() => (settings.businessMtdPresets || []).join(', '));
  const [preview, setPreview] = React.useState<ClassificationPreview | null>(null);
  React.useEffect(() => { if (!open) { setDraft(stripCatalog(settings)); setPresetsText((settings.businessMtdPresets || []).join(', ')); } }, [open, settings]);
  const presetParts = presetsText.split(',').map((part) => part.trim());
  const presets = presetParts.map(Number);
  const invalidPresets = presetParts.some((part) => !part) || presets.some((value) => !Number.isInteger(value) || value <= 0 || value > 2147483647) || new Set(presets).size !== presets.length || presets.length > 30;
  const payload = { businessCriticalityLevels: draft.businessCriticalityLevels, businessMtdPresets: presets, cyberCriticalityLevels: draft.cyberCriticalityLevels, dataClasses: draft.dataClasses, recoveryWaves: draft.recoveryWaves, expectedClassificationSettingsRevision: draft.classificationSettingsRevision };
  const previewMutation = useMutation({ mutationFn: () => previewClassificationSettings(payload), onSuccess: setPreview });
  const publishMutation = useMutation({ mutationFn: () => updateItOpsSettings(payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['it-ops-settings'] }); await queryClient.invalidateQueries({ queryKey: ['application-classification-catalog'] }); await queryClient.invalidateQueries({ predicate: (query) => ['application', 'app-filter', 'interface', 'connection'].some((prefix) => String(query.queryKey[0]).startsWith(prefix)) }); setOpen(false); setPreview(null); } });
  const invalid = [...draft.businessCriticalityLevels, ...draft.cyberCriticalityLevels, ...draft.dataClasses, ...draft.recoveryWaves].some((row) => !row.code.trim() || !row.label.trim() );
  return <Box sx={(theme) => ({ p: 2, border: `1px solid ${theme.palette.kanap.border.default}`, borderRadius: '8px' })}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box><Typography sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary })}>{classificationText("Classifications and continuity")}</Typography><Typography sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.secondary })}>{classificationText("Business thresholds are also the operational criticality catalog for interfaces and connections. MTD thresholds apply only to applications.")}</Typography></Box>
      <Button variant="action" onClick={() => setOpen(true)}>{classificationText("Edit catalog")}</Button>
    </Stack>
    <KanapDialog open={open} title={classificationText("Edit classifications and continuity")} onClose={() => { setOpen(false); setPreview(null); }} onSave={() => preview ? publishMutation.mutate() : previewMutation.mutate()} saveLabel={preview ? classificationText("Publish changes") : classificationText("Preview impact")} saveDisabled={invalid || invalidPresets} saveLoading={previewMutation.isPending || publishMutation.isPending} sx={{ maxWidth: 1050 }}>
      <Stack spacing={2.5} sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {(previewMutation.error || publishMutation.error) && <Alert severity="error">{getApiErrorMessage(previewMutation.error || publishMutation.error, t, classificationText("The catalog could not be saved. Reload settings and try again."))}</Alert>}
        {preview && <Alert severity={preview.affectedApplications ? 'warning' : 'info'}>{preview.affectedApplications} applications will change.{preview.transitions.map((item) => ` ${item.from || classificationText("Not set")} → ${item.to || classificationText("Not set")}: ${item.count}.`)}</Alert>}
        <Box><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>{classificationText("Business criticality and MTD thresholds")}</Typography><LevelRows rows={draft.businessCriticalityLevels} kind="business" onChange={(rows) => { setDraft({ ...draft, businessCriticalityLevels: rows }); setPreview(null); }} /></Box>
        <Box><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>{classificationText("Allowed MTD durations in minutes")}</Typography><TextField value={presetsText} inputProps={{ 'aria-label': classificationText('Allowed MTD durations in minutes') }} placeholder="240, 1440, 4320, 10080" error={invalidPresets} helperText={invalidPresets ? classificationText('Enter distinct positive whole minutes separated by commas.') : undefined} onChange={(e) => { setPresetsText(e.target.value); setPreview(null); }} fullWidth size="small" /></Box>
        <Box><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>{classificationText("Cyber criticality")}</Typography><LevelRows rows={draft.cyberCriticalityLevels} kind="level" onChange={(rows) => { setDraft({ ...draft, cyberCriticalityLevels: rows }); setPreview(null); }} /></Box>
        <Box><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>{classificationText("Data confidentiality")}</Typography><LevelRows rows={draft.dataClasses} kind="level" onChange={(rows) => { setDraft({ ...draft, dataClasses: rows }); setPreview(null); }} /></Box>
        <Box><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>{classificationText("Recovery waves")}</Typography><LevelRows rows={draft.recoveryWaves} kind="wave" onChange={(rows) => { setDraft({ ...draft, recoveryWaves: rows }); setPreview(null); }} /></Box>
      </Stack>
    </KanapDialog>
  </Box>;
}
