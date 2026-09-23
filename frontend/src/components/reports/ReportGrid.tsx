import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { AgGridReactProps } from 'ag-grid-react';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import AgGridBox from '../AgGridBox';
import { useReportPrinting } from './reportPrint';

type ReportGridProps = AgGridReactProps & {
  /** Styles of the themed wrapper on screen (typically a fixed height). */
  wrapperSx?: SxProps<Theme>;
};

function flattenColumns(defs: (ColDef | ColGroupDef)[] | null | undefined): ColDef[] {
  const out: ColDef[] = [];
  for (const def of defs ?? []) {
    if ('children' in def && Array.isArray(def.children)) {
      out.push(...flattenColumns(def.children));
    } else if (!(def as ColDef).hide) {
      out.push(def as ColDef);
    }
  }
  return out;
}

function readPath(row: any, path: string | undefined): unknown {
  if (!row || !path) return undefined;
  if (path in row) return row[path];
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), row);
}

function humanize(field: string | undefined): string {
  if (!field) return '';
  const last = field.split('.').pop() ?? field;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isRightAligned(col: ColDef): boolean {
  const types = Array.isArray(col.type) ? col.type : col.type ? [col.type] : [];
  if (types.includes('rightAligned') || types.includes('numericColumn')) return true;
  const cls = col.cellClass;
  return typeof cls === 'string' && cls.includes('ag-right-aligned-cell');
}

function cellText(col: ColDef, row: any, pinned: 'bottom' | null): string {
  let value: unknown;
  if (typeof col.valueGetter === 'function') {
    value = col.valueGetter({ data: row, colDef: col, node: { data: row, rowPinned: pinned } } as any);
  } else {
    value = readPath(row, col.field);
  }
  let text: unknown = value;
  if (typeof col.valueFormatter === 'function') {
    text = col.valueFormatter({ value, data: row, colDef: col, node: { data: row, rowPinned: pinned } } as any);
  }
  if (text == null) return '';
  if (typeof text === 'object') return '';
  return String(text);
}

/**
 * Paper rendering of a grid: every row and column, no virtualisation, headers repeated
 * on each page by the print stylesheet. Formatting follows the same column definitions
 * as the screen grid so both read identically.
 */
function PrintTable({ rowData, columnDefs, pinnedBottomRowData, getRowStyle }: AgGridReactProps) {
  const columns = flattenColumns(columnDefs);
  const rows = (rowData ?? []) as any[];
  const footer = (pinnedBottomRowData ?? []) as any[];
  const styleFor = (row: any, pinned: 'bottom' | null) =>
    typeof getRowStyle === 'function'
      ? (getRowStyle({ data: row, node: { data: row, rowPinned: pinned } } as any) as React.CSSProperties | undefined)
      : undefined;
  return (
    <table className="report-print-table">
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={col.colId ?? col.field ?? index} className={isRightAligned(col) ? 'num' : undefined}>
              {col.headerName ?? humanize(col.field)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} style={styleFor(row, null)}>
            {columns.map((col, index) => (
              <td key={col.colId ?? col.field ?? index} className={isRightAligned(col) ? 'num' : undefined}>
                {cellText(col, row, null)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer.length > 0 && (
        <tfoot>
          {footer.map((row, rowIndex) => (
            <tr key={rowIndex} style={styleFor(row, 'bottom')}>
              {columns.map((col, index) => (
                <td key={col.colId ?? col.field ?? index} className={isRightAligned(col) ? 'num' : undefined}>
                  {cellText(col, row, 'bottom')}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );
}

/**
 * AG Grid for report pages. On screen it is the usual themed grid; while the report is
 * printed it renders as a static table, because a virtualised grid prints empty rows
 * and clipped columns.
 */
export default function ReportGrid({ wrapperSx, ...gridProps }: ReportGridProps) {
  const printing = useReportPrinting();
  if (printing) {
    return <PrintTable {...gridProps} />;
  }
  return (
    <Box component={AgGridBox} sx={wrapperSx}>
      <AgGridReact {...gridProps} />
    </Box>
  );
}
