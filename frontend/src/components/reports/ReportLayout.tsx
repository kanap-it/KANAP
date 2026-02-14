import React, { useEffect } from 'react';
import { Box, Stack, Typography, Paper, Divider, IconButton, Tooltip, Breadcrumbs, Link as MLink } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ImageIcon from '@mui/icons-material/Image';
import { Link as RouterLink } from 'react-router-dom';

export default function ReportLayout({
  title,
  subtitle,
  filters,
  actions,
  rootTo = '/ops/reports',
  rootLabel = 'Reporting',
  onExportTableCsv,
  onExportChartPng,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  rootTo?: string;
  rootLabel?: string;
  onExportTableCsv?: () => void;
  onExportChartPng?: () => void;
  children: React.ReactNode;
}) {
  // Auto-print when `?print=1` present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1') {
      setTimeout(() => window.print(), 300);
    }
  }, []);

  return (
    <Stack spacing={2} sx={{ width: '100%', alignSelf: 'stretch' }} className="report-print-frame">
      <Box>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5 }}>
          <MLink component={RouterLink} to={rootTo} underline="hover" color="inherit">
            {rootLabel}
          </MLink>
          <Typography color="text.primary">{title}</Typography>
        </Breadcrumbs>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
        )}
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            alignItems="flex-start"
            sx={{ flexWrap: 'wrap', rowGap: { xs: 1, md: 1.5 } }}
          >
            {filters}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {actions}
            {onExportTableCsv && (
              <Tooltip title="Export table as CSV">
                <IconButton size="small" onClick={onExportTableCsv} aria-label="Export table as CSV">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onExportChartPng && (
              <Tooltip title="Export chart as PNG">
                <IconButton size="small" onClick={onExportChartPng} aria-label="Export chart as PNG">
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Print / Save as PDF">
              <IconButton size="small" onClick={() => window.print()} aria-label="Print report">
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
      <Divider />
      {children}
    </Stack>
  );
}
