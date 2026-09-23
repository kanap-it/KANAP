import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { Paper, Typography } from '@mui/material';
import PrintableChart from './PrintableChart';
import { useReportPrinting } from './reportPrint';

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
  const paperRef = useRef<HTMLDivElement | null>(null);
  const printing = useReportPrinting();

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
        const canvas = paperRef.current?.querySelector('canvas');
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
    <Paper ref={paperRef} variant="outlined" sx={{ p: 2 }} className={printing ? 'report-print-chart' : undefined}>
      {title && !printing && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>{title}</Typography>
      )}
      <PrintableChart chartRef={chartRef} options={options} height={height} label={title} />
    </Paper>
  );
});
