import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';
import { classificationText } from '../../../utils/applicationClassification';
import React from 'react';
import { Alert, Box, Button, IconButton, Tooltip, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { PropertyRow } from '../../../components/design';
import DateEUField from '../../../components/fields/DateEUField';
import { drawerFieldValueSx, drawerMenuItemSx, drawerSelectSx } from '../../../theme/formSx';
import useApplicationClassificationCatalog from '../../../hooks/useApplicationClassificationCatalog';
import DurationEditor from './DurationEditor';
import ApplicationMtdSelect from './ApplicationMtdSelect';

export type ApplicationClassification = {
  id: string;
  criticality: string | null;
  business_mtd_minutes: number | null;
  business_criticality_origin?: 'unset' | 'legacy' | 'derived';
  cyber_criticality: string | null;
  recovery_wave: string | null;
  rto_minutes: number | null;
  rpo_minutes: number | null;
  classification_justification: string | null;
  classification_revision: number;
  classification_review_state?: 'incomplete' | 'stale' | 'reviewed';
  classification_review_reason?: string | null;
  classification_reviewed_at?: string | null;
  classification_reviewer_name?: string | null;
  data_class: string | null;
  contains_pii: boolean;
  last_dr_test: string | null;
};

type Props = {
  app: ApplicationClassification;
  canManage: boolean;
  onPatch: (patch: Partial<ApplicationClassification> & Record<string, unknown>) => Promise<void>;
  onReview: () => Promise<void>;
  children?: React.ReactNode;
  recoveryLinks?: React.ReactNode;
  error?: string | null;
  saving?: boolean;
};

const rowSx = { display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', columnGap: '18px', alignItems: 'start' } as const;
const valueSx = { maxWidth: 520 } as const;

function optionList<T extends { code: string; label: string; deprecated?: boolean }>(items: T[], current: string | null) {
  return items.filter((item) => !item.deprecated || item.code === current);
}

function HelpLabel({ text, help }: { text: string; help: string }) {
  return <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{classificationText(text)}<Tooltip title={classificationText(help)} enterTouchDelay={0}><IconButton size="small" aria-label={classificationText(text)} sx={{ p: 0.25 }}><HelpOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip></Box>;
}

export default function ApplicationClassificationPanel({ app, canManage, onPatch, onReview, children, recoveryLinks, error, saving }: Props) {
  const { t, i18n } = useTranslation('it');
  const { data: catalog } = useApplicationClassificationCatalog();
  const [durationDraftsBlocking, setDurationDraftsBlocking] = React.useState({ businessMtd: false, rto: false, rpo: false });
  const setDurationDraftBlocking = React.useCallback((field: keyof typeof durationDraftsBlocking, blocking: boolean) => {
    setDurationDraftsBlocking((current) => current[field] === blocking ? current : { ...current, [field]: blocking });
  }, []);
  const business = catalog?.businessCriticalityLevels.find((item) => item.code === app.criticality);
  const missingFields = [
    !app.business_mtd_minutes && classificationText('Maximum tolerable downtime (MTD)'),
    !app.cyber_criticality && classificationText('Cyber criticality'),
    !app.data_class && classificationText('Data confidentiality'),
    !app.recovery_wave && classificationText('Recovery wave'),
    !app.classification_justification?.trim() && classificationText('Justification'),
  ].filter(Boolean);
  const complete = missingFields.length === 0;
  const hasBlockingDurationDraft = Object.values(durationDraftsBlocking).some(Boolean);
  const reviewLabels = { incomplete: classificationText("To complete"), stale: classificationText("Review needed"), reviewed: classificationText("Reviewed") } as const;

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box>
        <Typography component="h2" sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary, mb: 1.25 })}>{classificationText("Criticality")}</Typography>
        <Stack spacing={1.25}>
          <PropertyRow label={<HelpLabel text="Maximum tolerable downtime (MTD)" help="Business help" />} sx={rowSx} valueSx={valueSx}>
            <ApplicationMtdSelect value={app.business_mtd_minutes} onCommit={(value) => onPatch({ business_mtd_minutes: value })} onDraftStateChange={(blocking) => setDurationDraftBlocking('businessMtd', blocking)} disabled={!canManage} />
          </PropertyRow>
          <PropertyRow label={classificationText("Business criticality")} sx={rowSx} valueSx={valueSx}>
            <Box>
              <Typography sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.primary })}>{business?.label || app.criticality || classificationText("Not set")}</Typography>
              {app.business_criticality_origin === 'legacy' && <Typography sx={(theme) => ({ fontSize: 11, color: theme.palette.kanap.text.tertiary })}>{classificationText("Legacy value \u2014 MTD has not been assessed.")}</Typography>}
            </Box>
          </PropertyRow>
          <PropertyRow label={<HelpLabel text="Cyber criticality" help="Cyber help" />} sx={rowSx} valueSx={valueSx}>
            <Select value={app.cyber_criticality || ''} renderValue={(value) => catalog?.cyberCriticalityLevels.find((item) => item.code === value)?.label || value || classificationText("Choose cyber criticality")} onChange={(event) => void onPatch({ cyber_criticality: event.target.value || null }).catch(() => {})} disabled={!canManage} displayEmpty variant="standard" disableUnderline sx={drawerSelectSx}>
              <MenuItem value="" sx={drawerMenuItemSx}>{classificationText("Choose cyber criticality")}</MenuItem>
              {optionList(catalog?.cyberCriticalityLevels || [], app.cyber_criticality).map((item) => <MenuItem key={item.code} value={item.code} sx={drawerMenuItemSx}><Box><Typography sx={{ fontSize: 13 }}>{item.label}{item.deprecated ? ` (${classificationText("Deprecated")})` : ''}</Typography><Typography sx={{ fontSize: 11, whiteSpace: 'normal', maxWidth: 440, color: 'text.secondary' }}>{item.description}</Typography></Box></MenuItem>)}
            </Select>
          </PropertyRow>
          <PropertyRow label={classificationText("Justification")} sx={rowSx} valueSx={valueSx}>
            <TextField defaultValue={app.classification_justification || ''} key={`${app.id}:justification`} onBlur={(event) => void onPatch({ classification_justification: event.target.value.trim() || null }).catch(() => {})} disabled={!canManage} multiline minRows={3} placeholder={classificationText("Explain the business, cyber and recovery decisions")} variant="standard" fullWidth InputProps={{ disableUnderline: true }} sx={(theme) => ({ ...drawerFieldValueSx, p: 1, border: `1px solid ${theme.palette.kanap.border.default}`, borderRadius: '8px', bgcolor: theme.palette.kanap.bg.composer })} />
          </PropertyRow>
        </Stack>
      </Box>
      <Box>
        <Typography component="h2" sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary, mb: 1.25 })}>{classificationText("Data")}</Typography>
        <Stack spacing={1.25}>
          <PropertyRow label={<HelpLabel text="Data confidentiality" help="Confidentiality help" />} sx={rowSx} valueSx={valueSx}>
            <Select value={app.data_class || ''} renderValue={(value) => catalog?.dataClasses.find((item) => item.code === value)?.label || value || classificationText("Choose data confidentiality")} onChange={(event) => void onPatch({ data_class: event.target.value || null }).catch(() => {})} disabled={!canManage} displayEmpty variant="standard" disableUnderline sx={drawerSelectSx}>
              <MenuItem value="" sx={drawerMenuItemSx}>{classificationText("Choose data confidentiality")}</MenuItem>
              {optionList(catalog?.dataClasses || [], app.data_class).map((item) => <MenuItem key={item.code} value={item.code} sx={drawerMenuItemSx}><Box><Typography sx={{ fontSize: 13 }}>{item.label}{item.deprecated ? ` (${classificationText("Deprecated")})` : ''}</Typography><Typography sx={{ fontSize: 11, whiteSpace: 'normal', maxWidth: 440, color: 'text.secondary' }}>{item.description}</Typography></Box></MenuItem>)}
            </Select>
          </PropertyRow>
          <PropertyRow label={classificationText("Contains personal data")} sx={rowSx} valueSx={valueSx}><input type="checkbox" checked={!!app.contains_pii} disabled={!canManage} onChange={(event) => void onPatch({ contains_pii: event.target.checked }).catch(() => {})} /></PropertyRow>
          {children}
        </Stack>
      </Box>
      <Box>
        <Typography component="h2" sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary, mb: 1.25 })}>{classificationText("Continuity and recovery")}</Typography>
        <Stack spacing={1.25}>
          <PropertyRow label={<HelpLabel text="Recovery wave" help="Recovery help" />} sx={rowSx} valueSx={valueSx}>
            <Select value={app.recovery_wave || ''} renderValue={(value) => catalog?.recoveryWaves.find((item) => item.code === value)?.label || value || classificationText("Choose a recovery wave")} onChange={(event) => void onPatch({ recovery_wave: event.target.value || null }).catch(() => {})} disabled={!canManage} displayEmpty variant="standard" disableUnderline sx={drawerSelectSx}>
              <MenuItem value="" sx={drawerMenuItemSx}>{classificationText("Choose a recovery wave")}</MenuItem>
              {optionList(catalog?.recoveryWaves || [], app.recovery_wave).sort((a, b) => a.order - b.order).map((item) => <MenuItem key={item.code} value={item.code} sx={drawerMenuItemSx}><Box><Typography sx={{ fontSize: 13 }}>{item.label}{item.deprecated ? ` (${classificationText("Deprecated")})` : ''}</Typography><Typography sx={{ fontSize: 11, whiteSpace: 'normal', maxWidth: 440, color: 'text.secondary' }}>{item.description}</Typography></Box></MenuItem>)}
            </Select>
          </PropertyRow>
          <PropertyRow label={<HelpLabel text="Recovery time objective (RTO)" help="RTO help" />} sx={rowSx} valueSx={valueSx}><DurationEditor value={app.rto_minutes} onCommit={(value) => onPatch({ rto_minutes: value })} onDraftStateChange={(blocking) => setDurationDraftBlocking('rto', blocking)} disabled={!canManage} placeholder={classificationText("Choose a duration")} ariaLabel={classificationText("Recovery time objective")} /></PropertyRow>
          {app.rto_minutes != null && app.business_mtd_minutes != null && app.rto_minutes >= app.business_mtd_minutes && <Alert severity="warning" sx={{ maxWidth: 700 }}>{classificationText("RTO leaves no margin before the maximum tolerable downtime.")}</Alert>}
          <PropertyRow label={<HelpLabel text="Recovery point objective (RPO)" help="RPO help" />} sx={rowSx} valueSx={valueSx}><DurationEditor value={app.rpo_minutes} onCommit={(value) => onPatch({ rpo_minutes: value })} onDraftStateChange={(blocking) => setDurationDraftBlocking('rpo', blocking)} allowZero disabled={!canManage} placeholder={classificationText("Choose a duration")} ariaLabel={classificationText("Recovery point objective")} /></PropertyRow>
          <PropertyRow label={classificationText("Last recovery test")} sx={rowSx} valueSx={valueSx}><DateEUField label="" valueYmd={app.last_dr_test || ''} onChangeYmd={(value) => void onPatch({ last_dr_test: value || null }).catch(() => {})} disabled={!canManage} hideLabel textFieldSx={drawerFieldValueSx} /></PropertyRow>
          {recoveryLinks}
        </Stack>
      </Box>
      <Box>
        <Typography component="h2" sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary, mb: 1.25 })}>{classificationText("Review")}</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.primary })}>{reviewLabels[app.classification_review_state || 'incomplete']}</Typography>
            {app.classification_reviewed_at && <Typography sx={(theme) => ({ fontSize: 11, color: theme.palette.kanap.text.tertiary })}>{classificationText("Last reviewed")} {new Date(app.classification_reviewed_at).toLocaleString(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' })}</Typography>}
            {app.classification_reviewer_name && <Typography sx={(theme) => ({ fontSize: 11, color: theme.palette.kanap.text.tertiary })}>{t("classification.reviewed_by", { name: app.classification_reviewer_name })}</Typography>}
            {missingFields.length > 0 && <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.secondary })}>{t("classification.complete_before_review", { fields: missingFields.join(', ') })}</Typography>}
            {app.classification_review_reason && app.classification_review_reason !== 'missing_fields' && <Typography sx={(theme) => ({ fontSize: 11, color: theme.palette.kanap.text.tertiary })}>{classificationText(app.classification_review_reason.replace(/_/g, ' '))}</Typography>}
          </Box>
          {canManage && <Button variant="contained" size="small" disabled={!complete || hasBlockingDurationDraft || saving || !!error || app.classification_review_state === 'reviewed'} onClick={() => void onReview().catch(() => {})}>{classificationText("Mark as reviewed")}</Button>}
        </Stack>
      </Box>
    </Stack>
  );
}
