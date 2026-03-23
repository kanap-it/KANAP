import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface EffortConsumptionBarProps {
  itConsumed: number;      // Actual IT MD consumed
  bizConsumed: number;     // Actual Business MD consumed
  totalPlanned: number;    // Total planned MD (IT + Business estimates)
}

export default function EffortConsumptionBar({
  itConsumed,
  bizConsumed,
  totalPlanned,
}: EffortConsumptionBarProps) {
  const { t } = useTranslation('portfolio');
  const totalConsumed = itConsumed + bizConsumed;

  // Percentage scale marks - matching MUI Slider marks
  const marks = [
    { value: 0, label: '0%' },
    { value: 50, label: '50%' },
    { value: 100, label: '100%' },
  ];

  // Determine scale max to allow overflow visualization
  const scaleMax = Math.max(totalPlanned, totalConsumed, 1); // At least 1 to avoid division by zero
  const isOverConsumed = totalConsumed > totalPlanned && totalPlanned > 0;

  // Calculate segment widths as percentages
  const itPct = scaleMax > 0 ? (itConsumed / scaleMax) * 100 : 0;
  const thresholdPct = scaleMax > 0 ? (totalPlanned / scaleMax) * 100 : 0;

  // When over-consumed, calculate how much of each segment is in excess
  let itNormalPct = itPct;
  let bizNormalPct = scaleMax > 0 ? (bizConsumed / scaleMax) * 100 : 0;
  let excessPct = 0;

  if (isOverConsumed) {
    excessPct = ((totalConsumed - totalPlanned) / scaleMax) * 100;

    if (itConsumed > totalPlanned) {
      itNormalPct = thresholdPct;
      bizNormalPct = 0;
    } else {
      itNormalPct = itPct;
      bizNormalPct = thresholdPct - itPct;
    }
  }

  return (
    <Box>
      {/*
        Container matching MUI Slider's vertical layout:
        - 13px padding top (to match Slider's thumb space)
        - 4px track height
        - 20px for mark labels below
      */}
      <Box sx={{ pt: '13px', pb: '26px', position: 'relative' }}>
        {/* Progress bar track - matching Slider's 4px rail */}
        <Box sx={{ position: 'relative', height: 4 }}>
          {/* Background track */}
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            bgcolor: 'grey.300',
            borderRadius: 1,
          }} />

          {/* IT segment */}
          {itNormalPct > 0 && (
            <Box sx={{
              position: 'absolute',
              left: 0,
              width: `${itNormalPct}%`,
              height: '100%',
              bgcolor: 'primary.main',
              borderRadius: !isOverConsumed && bizNormalPct === 0 ? 1 : '4px 0 0 4px',
            }} />
          )}

          {/* Business segment */}
          {bizNormalPct > 0 && (
            <Box sx={{
              position: 'absolute',
              left: `${itNormalPct}%`,
              width: `${bizNormalPct}%`,
              height: '100%',
              bgcolor: 'secondary.main',
              borderRadius: !isOverConsumed ? '0 4px 4px 0' : 0,
            }} />
          )}

          {/* Excess segment */}
          {isOverConsumed && excessPct > 0 && (
            <Box sx={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              width: `${excessPct}%`,
              height: '100%',
              bgcolor: 'error.main',
              borderRadius: '0 4px 4px 0',
            }} />
          )}

          {/* Threshold marker */}
          {isOverConsumed && (
            <Box sx={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: -4,
              width: 2,
              height: 12,
              bgcolor: 'text.primary',
              transform: 'translateX(-1px)',
            }} />
          )}
        </Box>

        {/* Percentage scale - matching MUI Slider mark labels */}
        {marks.map((mark) => (
          <Typography
            key={mark.value}
            sx={{
              position: 'absolute',
              top: '30px', // 13px padding + 4px track + 13px gap to match MUI Slider
              left: `${mark.value}%`,
              transform: 'translateX(-50%)',
              color: 'text.secondary',
              fontSize: '0.875rem', // MUI Slider mark label font size
              lineHeight: 1.43,
            }}
          >
            {mark.label}
          </Typography>
        ))}
      </Box>

      {/* Legend - below the aligned section */}
      <Stack direction="row" spacing={2} sx={{ mt: '13px' }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Typography variant="caption">{t('dialogs.logTime.categories.it')}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'secondary.main' }} />
          <Typography variant="caption">{t('dialogs.logTime.categories.business')}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
