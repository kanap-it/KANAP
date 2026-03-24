import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ImportMode, ImportOperation } from './csv.types';

interface CsvImportAdvancedOptionsProps {
  mode: ImportMode;
  operation: ImportOperation;
  onModeChange: (mode: ImportMode) => void;
  onOperationChange: (operation: ImportOperation) => void;
}

export function CsvImportAdvancedOptions({
  mode,
  operation,
  onModeChange,
  onOperationChange,
}: CsvImportAdvancedOptionsProps) {
  const { t } = useTranslation('common');
  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        {t('csv.overridePresetNote')}
      </Typography>
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('csv.emptyCellHandling')}</InputLabel>
          <Select
            value={mode}
            label={t('csv.emptyCellHandling')}
            onChange={(e) => onModeChange(e.target.value as ImportMode)}
          >
            <MenuItem value="enrich">
              {t('csv.preserveExisting')}
            </MenuItem>
            <MenuItem value="replace">
              {t('csv.setToNull')}
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('csv.operation')}</InputLabel>
          <Select
            value={operation}
            label={t('csv.operation')}
            onChange={(e) => onOperationChange(e.target.value as ImportOperation)}
          >
            <MenuItem value="upsert">
              {t('csv.insertAndUpdate')}
            </MenuItem>
            <MenuItem value="update_only">
              {t('csv.updateOnly')}
            </MenuItem>
            <MenuItem value="insert_only">
              {t('csv.insertOnly')}
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}
