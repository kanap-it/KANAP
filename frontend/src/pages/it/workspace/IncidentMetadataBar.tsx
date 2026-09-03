import React from 'react';
import { Box, Menu, MenuItem, Popover } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { INCIDENT_SEVERITIES, type Incident, type IncidentSeverity } from '../../../api/endpoints/incidents';
import { StatusDot } from '../../../components/design';
import MetadataUserPicker from '../../../components/workspace/MetadataUserPicker';
import { useLocale } from '../../../i18n/useLocale';
import { formatShortDateTime } from '../../../lib/dateFormat';
import { PortfolioMetadataItem } from '../../portfolio/workspace/PortfolioMetadataBar';
import { drawerMenuItemSx } from '../../../theme/formSx';
import { getDotColor, INCIDENT_SEVERITY_COLORS, INCIDENT_STATUS_COLORS } from '../../../utils/statusColors';
import IncidentDateTimeField from './IncidentDateTimeField';
import { formatIncidentDuration, incidentSeverityLabel, incidentStatusLabel } from './incidentWorkspace';

type Props = {
  incident: Incident;
  disabled?: boolean;
  onSeverityChange: (next: IncidentSeverity) => void;
  onOwnerChange: (next: string | null) => void;
  onDetectedAtChange: (next: string) => void;
};

export default function IncidentMetadataBar({
  incident,
  disabled = false,
  onSeverityChange,
  onOwnerChange,
  onDetectedAtChange,
}: Props) {
  const { t } = useTranslation('it');
  const theme = useTheme();
  const locale = useLocale();
  const [severityAnchor, setSeverityAnchor] = React.useState<HTMLElement | null>(null);
  const [detectedAnchor, setDetectedAnchor] = React.useState<HTMLElement | null>(null);

  const statusColor = getDotColor(INCIDENT_STATUS_COLORS[incident.status], theme.palette.mode);
  const severityColor = (severity: string) => getDotColor(INCIDENT_SEVERITY_COLORS[severity], theme.palette.mode);

  return (
    <>
      <PortfolioMetadataItem label={t('workspace.incident.metadata.status')}>
        <StatusDot color={statusColor} size={8} sx={{ mr: 0.75 }} />
        {incidentStatusLabel(t, incident.status)}
      </PortfolioMetadataItem>

      <PortfolioMetadataItem
        label={t('workspace.incident.metadata.severity')}
        onClick={(event) => setSeverityAnchor(event.currentTarget)}
        disabled={disabled}
      >
        <StatusDot color={severityColor(incident.severity)} size={8} sx={{ mr: 0.75 }} />
        {incidentSeverityLabel(t, incident.severity)}
      </PortfolioMetadataItem>
      <Menu anchorEl={severityAnchor} open={!!severityAnchor} onClose={() => setSeverityAnchor(null)}>
        {INCIDENT_SEVERITIES.map((severity) => (
          <MenuItem
            key={severity}
            selected={severity === incident.severity}
            onClick={() => {
              setSeverityAnchor(null);
              if (severity !== incident.severity) onSeverityChange(severity);
            }}
            sx={{ ...drawerMenuItemSx, gap: '8px' }}
          >
            <StatusDot color={severityColor(severity)} size={8} />
            {incidentSeverityLabel(t, severity)}
          </MenuItem>
        ))}
      </Menu>

      <PortfolioMetadataItem label={t('workspace.incident.metadata.owner')}>
        <MetadataUserPicker
          value={incident.owner_user_id}
          displayName={incident.owner_name}
          placeholder={t('workspace.incident.metadata.ownerMissing')}
          searchPlaceholder={t('workspace.incident.metadata.owner')}
          disabled={disabled}
          onChange={onOwnerChange}
        />
      </PortfolioMetadataItem>

      <PortfolioMetadataItem
        label={t('workspace.incident.metadata.detected')}
        onClick={(event) => setDetectedAnchor(event.currentTarget)}
        disabled={disabled}
      >
        {formatShortDateTime(incident.detected_at, locale)}
      </PortfolioMetadataItem>
      <Popover
        anchorEl={detectedAnchor}
        open={!!detectedAnchor}
        onClose={() => setDetectedAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, minWidth: 240 } } }}
      >
        <Box sx={{ fontSize: 13 }}>
          <IncidentDateTimeField
            value={incident.detected_at}
            autoFocus
            onChange={(next) => {
              if (next) onDetectedAtChange(next);
            }}
          />
        </Box>
      </Popover>

      {incident.resolved_at && (
        <PortfolioMetadataItem label={t('workspace.incident.metadata.duration')}>
          {formatIncidentDuration(t, incident.detected_at, incident.resolved_at)}
        </PortfolioMetadataItem>
      )}
    </>
  );
}
