import React from 'react';
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WORKFLOW_PRESETS } from './csv.types';

interface CsvImportWorkflowPresetsProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CsvImportWorkflowPresets({
  selectedId,
  onSelect,
}: CsvImportWorkflowPresetsProps) {
  const { t } = useTranslation('common');
  return (
    <FormControl component="fieldset" fullWidth>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('csv.importWorkflow')}
      </Typography>
      <RadioGroup
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {WORKFLOW_PRESETS.map((preset) => (
          <Box
            key={preset.id}
            sx={{
              border: '1px solid',
              borderColor: selectedId === preset.id ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1.5,
              mb: 1,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              '&:hover': {
                borderColor: 'primary.light',
              },
            }}
            onClick={() => onSelect(preset.id)}
          >
            <FormControlLabel
              value={preset.id}
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {preset.label}
                  </Typography>
                  {preset.recommended && (
                    <Chip label={t('labels.recommended')} size="small" color="primary" variant="outlined" />
                  )}
                </Box>
              }
              sx={{ m: 0 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
              {preset.description}
            </Typography>
          </Box>
        ))}
      </RadioGroup>
    </FormControl>
  );
}
