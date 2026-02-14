import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';

export type ChartCardHandle = {
  download: (fileName?: string) => void;
};

export default forwardRef(function ChartCard(
  {
    title,
    options,
    height = 360,
  }: {
    title?: string;
    options: any;
    height?: number | string;
  },
  ref: React.Ref<ChartCardHandle>
) {
  const chartRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    download: (fileName?: string) => {
      try {
        const chart = (chartRef.current as any)?.chart;
        if (chart && typeof chart.download === 'function') {
          chart.download({ fileName: fileName || 'chart' });
          return;
        }
      } catch (e) {
        // ignore and fallback
      }
      // Fallback: try to grab canvas and force download
      try {
        const canvas = wrapperRef.current?.querySelector('canvas');
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fileName || 'chart'}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (e) {
        console.warn('Chart download failed', e);
      }
    },
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>{title}</Typography>
      )}
      <Box sx={{ height }} ref={wrapperRef}>
        <AgChartsReact ref={chartRef} options={options} />
      </Box>
    </Paper>
  );
});
