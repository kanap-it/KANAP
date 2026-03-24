import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from 'react-i18next';
import { CsvImportResult } from './csv.types';

interface CsvValidationResultsProps {
  result: CsvImportResult;
  maxErrors?: number;
  maxWarnings?: number;
}

export function CsvValidationResults({
  result,
  maxErrors = 10,
  maxWarnings = 5,
}: CsvValidationResultsProps) {
  const { t } = useTranslation('common');
  const isValidation = result.dryRun;
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <Box>
      {/* Summary */}
      <Alert
        severity={result.ok ? 'success' : 'error'}
        icon={result.ok ? <CheckCircleIcon /> : <ErrorIcon />}
        sx={{ mb: 2 }}
      >
        {result.ok ? (
          isValidation ? (
            <>{t('csv.validationPassed', { total: result.total })}</>
          ) : (
            <>{t('csv.importCompleted')}</>
          )
        ) : (
          <>{t('csv.validationFailed')}</>
        )}
      </Alert>

      {/* Counts */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip
          label={t('csv.totalRows', { count: result.total })}
          size="small"
          variant="outlined"
        />
        {result.inserted > 0 && (
          <Chip
            label={t('csv.toInsert', { count: result.inserted })}
            size="small"
            color="success"
            variant="outlined"
          />
        )}
        {result.updated > 0 && (
          <Chip
            label={t('csv.toUpdate', { count: result.updated })}
            size="small"
            color="info"
            variant="outlined"
          />
        )}
        {result.skipped > 0 && (
          <Chip
            label={t('csv.skipped', { count: result.skipped })}
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Errors */}
      {hasErrors && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <ErrorIcon fontSize="small" />
            {t('csv.errors', { count: result.errors.length })}
          </Typography>
          <List dense disablePadding sx={{ bgcolor: 'error.50', borderRadius: 1 }}>
            {result.errors.slice(0, maxErrors).map((err, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {err.row > 0 && <strong>Row {err.row}:</strong>} {err.message}
                      {err.column && <Typography component="span" color="text.secondary"> ({err.column})</Typography>}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            {result.errors.length > maxErrors && (
              <ListItem sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="caption" color="text.secondary">
                      {t('csv.andMoreErrors2', { count: result.errors.length - maxErrors })}
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Box>
          <Typography variant="subtitle2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <WarningIcon fontSize="small" />
            {t('csv.warnings', { count: result.warnings.length })}
          </Typography>
          <List dense disablePadding sx={{ bgcolor: 'warning.50', borderRadius: 1 }}>
            {result.warnings.slice(0, maxWarnings).map((warn, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {warn.row > 0 && <strong>Row {warn.row}:</strong>} {warn.message}
                      {warn.column && <Typography component="span" color="text.secondary"> ({warn.column})</Typography>}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            {result.warnings.length > maxWarnings && (
              <ListItem sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="caption" color="text.secondary">
                      {t('csv.andMoreWarnings', { count: result.warnings.length - maxWarnings })}
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}
    </Box>
  );
}
