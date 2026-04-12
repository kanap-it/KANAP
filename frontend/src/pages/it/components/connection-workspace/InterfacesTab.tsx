import React from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import type { LinkedInterfaceBinding } from './types';

import { useTranslation } from 'react-i18next';
interface InterfacesTabProps {
  linkedBindings: LinkedInterfaceBinding[];
  linkedBindingsLoading: boolean;
  linkedBindingsError: string | null;
}

export default function InterfacesTab({
  linkedBindings,
  linkedBindingsLoading,
  linkedBindingsError,
}: InterfacesTabProps) {
  const { t } = useTranslation(['it', 'common']);
  const navigate = useNavigate();
  const { byField } = useItOpsEnumOptions();

  const dataClassLabel = React.useCallback(
    (code?: string | null) => {
      if (!code) return '';
      const item = (byField.dataClass || []).find((o) => o.code === code);
      return item?.label || code;
    },
    [byField.dataClass],
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 900 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Related interfaces
      </Typography>
      {linkedBindingsLoading && (
        <Typography variant="body2" color="text.secondary">
          Loading linked interfaces...
        </Typography>
      )}
      {linkedBindingsError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {linkedBindingsError}
        </Alert>
      )}
      {!linkedBindingsLoading && !linkedBindingsError && linkedBindings.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No interface bindings linked yet.
        </Typography>
      )}
      {linkedBindings.length > 0 && (
        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                {['Interface', 'Environment', 'Source endpoint', 'Target endpoint', 'Lifecycle', 'Actions'].map(
                  (col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: col === 'Actions' ? 'right' : 'left',
                        padding: '8px 8px',
                        fontWeight: 400,
                      }}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {linkedBindings.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <td style={{ padding: '8px 8px' }}>
                    <Typography variant="body2">
                      {item.interface_name || item.interface_code}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        ({item.interface_code})
                      </Typography>
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {`Criticality: ${item.interface_criticality || 'n/a'}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {`Data class: ${dataClassLabel(item.interface_data_class) || item.interface_data_class || 'n/a'}`}
                      </Typography>
                      <Typography variant="body2" color={item.interface_contains_pii ? 'warning.main' : 'text.secondary'}>
                        {item.interface_contains_pii ? 'PII' : 'No PII'}
                      </Typography>
                    </Stack>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Typography variant="body2">{item.environment.toUpperCase()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Leg: {item.leg_type.toUpperCase()}
                    </Typography>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.source_endpoint || '-'}
                    </Typography>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.target_endpoint || '-'}
                    </Typography>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Typography variant="body2">{item.interface_lifecycle}</Typography>
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/it/interfaces/${item.interface_id}/environments`)}
                    >
                      Go to interface
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Stack>
  );
}
