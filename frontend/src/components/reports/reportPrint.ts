import { useSyncExternalStore } from 'react';
import { useTheme } from '@mui/material';
import type { Theme } from '@mui/material';
import { lightIslandTheme } from '../../config/ThemeContext';

/**
 * Print state of the report on screen. A module-level store rather than a context so
 * the page component that renders `ReportLayout` (and builds chart options from the
 * theme) can read it too, not only the layout's children.
 *
 * While printing: grids render as plain tables with every row and column, charts as
 * frozen copies of their canvas, and everything uses the light palette.
 */
let printing = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setReportPrinting(value: boolean) {
  if (printing === value) return;
  printing = value;
  listeners.forEach((listener) => listener());
}

export function useReportPrinting(): boolean {
  return useSyncExternalStore(subscribe, () => printing, () => false);
}

/** The theme a report should draw with: the screen theme, or the light one on paper. */
export function useReportTheme(): Theme {
  const theme = useTheme();
  const isPrinting = useReportPrinting();
  return isPrinting ? lightIslandTheme : theme;
}

/**
 * Fired by `ReportLayout` right before it opens the print dialog, once the charts have
 * had time to redraw in the light theme: every `PrintableChart` refreshes its copy.
 */
export const REPORT_PRINT_SNAPSHOT_EVENT = 'kanap:report-print-snapshot';

/** Printable width of an A4 page with the print stylesheet's margins, in CSS pixels. */
export const PRINT_CONTENT_WIDTH = 700;
