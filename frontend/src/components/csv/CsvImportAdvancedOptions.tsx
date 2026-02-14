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
  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        These settings override the workflow preset selection.
      </Typography>
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Empty cell handling</InputLabel>
          <Select
            value={mode}
            label="Empty cell handling"
            onChange={(e) => onModeChange(e.target.value as ImportMode)}
          >
            <MenuItem value="enrich">
              Preserve existing
            </MenuItem>
            <MenuItem value="replace">
              Set to null
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Operation</InputLabel>
          <Select
            value={operation}
            label="Operation"
            onChange={(e) => onOperationChange(e.target.value as ImportOperation)}
          >
            <MenuItem value="upsert">
              Insert & Update
            </MenuItem>
            <MenuItem value="update_only">
              Update only
            </MenuItem>
            <MenuItem value="insert_only">
              Insert only
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}
