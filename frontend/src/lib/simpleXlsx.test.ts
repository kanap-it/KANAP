import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildXlsxWorkbook } from './simpleXlsx';

describe('simpleXlsx', () => {
  it('writes inline string cells instead of formulas', () => {
    const bytes = buildXlsxWorkbook([
      {
        name: 'Unsafe:/Name',
        rows: [
          ['Name', 'Value'],
          ['Formula-looking', '=HYPERLINK("https://evil.example")'],
        ],
      },
    ]);

    const files = unzipSync(bytes);
    const workbookKey = Object.keys(files).find((key) => key.replace(/\\/g, '/').endsWith('xl/workbook.xml'));
    const sheetKey = Object.keys(files).find((key) => key.replace(/\\/g, '/').endsWith('xl/worksheets/sheet1.xml'));
    expect(workbookKey).toBeTruthy();
    expect(sheetKey).toBeTruthy();
    const workbook = strFromU8(files[workbookKey!]);
    const sheet = strFromU8(files[sheetKey!]);

    expect(workbook).toContain('Unsafe  Name');
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain('=HYPERLINK');
    expect(sheet).not.toContain('<f>');
  });
});
