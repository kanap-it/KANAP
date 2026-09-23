import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
import { PRINT_CONTENT_WIDTH, REPORT_PRINT_SNAPSHOT_EVENT, useReportPrinting } from './reportPrint';

/**
 * An ag-charts chart that survives printing. A live canvas keeps its screen pixel size
 * on paper and overflows the page, so on paper the chart is a copy of its pixels in a
 * page-wide canvas. The copy is taken synchronously when print mode starts (so it exists
 * before the browser lays the pages out) and refreshed on the layout's snapshot event,
 * after the live chart has redrawn in the light theme at its paper width. The live chart
 * stays mounted and laid out off-page meanwhile, so it can redraw and the instance
 * survives the round trip.
 */
export default function PrintableChart({
  options,
  height,
  chartRef,
  label,
  printWidth = PRINT_CONTENT_WIDTH,
}: {
  options: any;
  height: number | string;
  chartRef?: React.Ref<any>;
  label?: string;
  /** Width the chart is redrawn at for paper: the page, or a share of it for tiles. */
  printWidth?: number;
}) {
  const printing = useReportPrinting();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copy, setCopy] = useState<{ width: number } | null>(null);

  const snapshot = useCallback(() => {
    const live = wrapperRef.current?.querySelector('canvas');
    const target = printCanvasRef.current;
    if (!live || !target || live.width === 0 || live.height === 0) return;
    try {
      target.width = live.width;
      target.height = live.height;
      const width = live.clientWidth || live.width;
      target.style.maxWidth = `${width}px`;
      const ctx = target.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(live, 0, 0);
      setCopy({ width });
    } catch (e) {
      console.warn('Chart snapshot failed', e);
    }
  }, []);

  useLayoutEffect(() => {
    if (!printing) {
      setCopy(null);
      return;
    }
    snapshot();
  }, [printing, snapshot]);

  useEffect(() => {
    if (!printing) return;
    window.addEventListener(REPORT_PRINT_SNAPSHOT_EVENT, snapshot);
    return () => window.removeEventListener(REPORT_PRINT_SNAPSHOT_EVENT, snapshot);
  }, [printing, snapshot]);

  const parked = printing && copy != null;

  return (
    <>
      {printing && (
        <canvas
          ref={printCanvasRef}
          aria-label={label}
          style={{ display: copy ? 'block' : 'none', width: '100%', height: 'auto' }}
        />
      )}
      {/* Same slot in both modes so the chart instance survives the switch to print and back. */}
      <Box
        ref={wrapperRef}
        sx={
          parked
            ? { position: 'absolute', left: -10000, top: 0, width: printWidth, height, opacity: 0, pointerEvents: 'none' }
            : { height }
        }
      >
        <AgChartsReact ref={chartRef} options={options} />
      </Box>
    </>
  );
}
