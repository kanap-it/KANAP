import React from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Incident } from '../../../api/endpoints/incidents';
import { incidentComposerSx, incidentSectionLabelSx } from './incidentWorkspace';

type TextFieldKey = 'description' | 'impact' | 'root_cause' | 'corrective_actions' | 'lessons_learned';

const TEXT_FIELDS: Array<{ key: TextFieldKey; label: string; placeholder: string }> = [
  { key: 'description', label: 'description', placeholder: 'descriptionPlaceholder' },
  { key: 'impact', label: 'impact', placeholder: 'impactPlaceholder' },
  { key: 'root_cause', label: 'rootCause', placeholder: 'rootCausePlaceholder' },
  { key: 'corrective_actions', label: 'correctiveActions', placeholder: 'correctiveActionsPlaceholder' },
  { key: 'lessons_learned', label: 'lessonsLearned', placeholder: 'lessonsLearnedPlaceholder' },
];

type Props = {
  incident: Incident;
  readOnly: boolean;
  lockedBanner: string | null;
  savingHint: string | null;
  onPatchDebounced: (patch: Partial<Incident>) => void;
};

export default function IncidentOverviewTab({ incident, readOnly, lockedBanner, savingHint, onPatchDebounced }: Props) {
  const { t } = useTranslation('it');
  const [texts, setTexts] = React.useState<Record<TextFieldKey, string>>(() => ({
    description: incident.description || '',
    impact: incident.impact || '',
    root_cause: incident.root_cause || '',
    corrective_actions: incident.corrective_actions || '',
    lessons_learned: incident.lessons_learned || '',
  }));

  const handleChange = (key: TextFieldKey, value: string) => {
    setTexts((prev) => ({ ...prev, [key]: value }));
    onPatchDebounced({ [key]: value.trim().length > 0 ? value : null });
  };

  return (
    <Stack spacing={3} sx={{ pt: 1, maxWidth: 900 }}>
      {lockedBanner && (
        <Typography sx={{ fontSize: 13, color: 'kanap.text.secondary' }}>{lockedBanner}</Typography>
      )}
      {TEXT_FIELDS.map((field, index) => (
        <Box key={field.key}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography component="label" sx={incidentSectionLabelSx}>
              {t(`workspace.incident.overview.${field.label}`)}
            </Typography>
            {index === 0 && savingHint && (
              <Typography sx={{ fontSize: 11, color: 'kanap.text.tertiary' }}>{savingHint}</Typography>
            )}
          </Box>
          <TextField
            value={texts[field.key]}
            onChange={(event) => handleChange(field.key, event.target.value)}
            multiline
            minRows={field.key === 'description' ? 4 : 3}
            fullWidth
            variant="standard"
            placeholder={readOnly
              ? t('workspace.incident.drawer.notSet')
              : t(`workspace.incident.overview.${field.placeholder}`)}
            InputProps={{ disableUnderline: true, readOnly }}
            sx={incidentComposerSx}
          />
        </Box>
      ))}
    </Stack>
  );
}
