import { createContext, useContext } from 'react';

/**
 * True while a report is laid out for paper (print dialog open, or "Save as PDF").
 * Consumers swap their screen widgets for print-safe ones: AG Grid becomes a plain
 * table with every row and column, a chart becomes a snapshot image.
 */
export const ReportPrintContext = createContext(false);

export function useReportPrinting(): boolean {
  return useContext(ReportPrintContext);
}
