import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
interface VersionApp {
  id: string;
  name: string;
  version?: string | null;
  lifecycle?: string;
}

interface VersionTimelineProps {
  predecessors: VersionApp[];
  current: VersionApp;
  successors: VersionApp[];
}

export default function VersionTimeline({ predecessors, current, successors }: VersionTimelineProps) {
  const { t } = useTranslation(['it', 'common']);
  const navigate = useNavigate();

  const allVersions = [...predecessors, current, ...successors];

  // Don't render if there's no lineage
  if (allVersions.length <= 1) return null;

  const getChipColor = (lifecycle?: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (lifecycle) {
      case 'active':
        return 'success';
      case 'proposed':
        return 'warning';
      case 'sunset':
      case 'retired':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLabel = (app: VersionApp) => {
    if (app.version) return app.version;
    // Extract version from name if present (e.g., "SAP S/4HANA 2023" -> "2023")
    const match = app.name.match(/\d{4}(?:\.\d+)?$|v?\d+(?:\.\d+)+$/i);
    if (match) return match[0];
    return app.name;
  };

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
        Version History
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {allVersions.map((app, idx) => (
          <React.Fragment key={app.id}>
            {idx > 0 && <ArrowForwardIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
            <Chip
              label={getLabel(app)}
              size="small"
              color={app.id === current.id ? 'primary' : getChipColor(app.lifecycle)}
              variant={app.id === current.id ? 'filled' : 'outlined'}
              onClick={() => app.id !== current.id && navigate(`/it/applications/${app.id}`)}
              sx={{
                cursor: app.id !== current.id ? 'pointer' : 'default',
                opacity: app.lifecycle === 'retired' ? 0.6 : 1,
                textDecoration: app.lifecycle === 'retired' ? 'line-through' : 'none',
                fontWeight: app.id === current.id ? 600 : 400,
              }}
            />
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
