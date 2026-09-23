import React, { useImperativeHandle, forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const printing = useReportPrinting();
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  // A live canvas keeps its screen pixel size on paper and overflows the page. Copy its
  // pixels into a page-wide canvas the moment print mode starts: synchronous, so the
  // copy exists before the browser lays the pages out (an <img> would still be decoding).
  useLayoutEffect(() => {
    if (!printing) {
      setCopied(false);
      return;
    }
    const live = wrapperRef.current?.querySelector('canvas');
    const target = printCanvasRef.current;
    if (!live || !target || live.width === 0 || live.height === 0) return;
    try {
      target.width = live.width;
      target.height = live.height;
      target.style.maxWidth = `${live.clientWidth || live.width}px`;
      const ctx = target.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(live, 0, 0);
      setCopied(true);
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
      {printing && (
        <canvas
          ref={printCanvasRef}
          aria-label={title}
          style={{ display: copied ? 'block' : 'none', width: '100%', height: 'auto' }}
        />
      )}
      {/* Same slot in both modes so the chart instance survives the switch to print and back. */}
      <Box sx={{ height, display: printing && copied ? 'none' : undefined }} ref={wrapperRef}>
        <AgChartsReact ref={chartRef} options={options} />
      </Box>
    </Paper>
  );
});
