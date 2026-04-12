import React from 'react';
import { Box, Typography } from '@mui/material';
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
            <Typography
              variant="body2"
              component="span"
              onClick={() => app.id !== current.id && navigate(`/it/applications/${app.id}`)}
              sx={{
                cursor: app.id !== current.id ? 'pointer' : 'default',
                opacity: app.lifecycle === 'retired' ? 0.6 : 1,
                textDecoration: app.lifecycle === 'retired' ? 'line-through' : 'none',
                fontWeight: app.id === current.id ? 600 : 400,
                color: app.id === current.id ? 'text.primary' : 'text.secondary',
                '&:hover': app.id !== current.id ? { color: 'text.primary' } : {},
              }}
            >
              {getLabel(app)}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
