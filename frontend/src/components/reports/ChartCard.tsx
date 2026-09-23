import React, { useImperativeHandle, forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
import { useReportPrinting } from './reportPrint';

export type ChartCardHandle = {
  download: (fileName?: string) => void;
};

type Snapshot = { url: string; width: number };

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
  const printing = useReportPrinting();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  // A live canvas keeps its screen pixel size on paper and overflows the page. Freeze it
  // into an image the moment print mode starts, while the chart is still laid out.
  useLayoutEffect(() => {
    if (!printing) {
      setSnapshot(null);
      return;
    }
    const canvas = wrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      setSnapshot({ url: canvas.toDataURL('image/png'), width: canvas.clientWidth || canvas.width });
    } catch (e) {
      console.warn('Chart snapshot failed', e);
    }
  }, [printing]);

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
    <Paper variant="outlined" sx={{ p: 2 }} className={printing ? 'report-print-chart' : undefined}>
      {title && !printing && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>{title}</Typography>
      )}
      {printing && snapshot && (
        <img
          src={snapshot.url}
          alt={title ?? ''}
          style={{ display: 'block', width: '100%', maxWidth: snapshot.width, height: 'auto' }}
        />
      )}
      {/* Same slot in both modes so the chart instance survives the switch to print and back. */}
      <Box sx={{ height, display: printing && snapshot ? 'none' : undefined }} ref={wrapperRef}>
        <AgChartsReact ref={chartRef} options={options} />
      </Box>
    </Paper>
  );
});
