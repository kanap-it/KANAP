import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { isUploadTypeAllowedForScope, validateUploadedFile } from '../upload-validation';

function run() {
  assert.equal(isUploadTypeAllowedForScope(
    { originalname: 'import.csv', mimetype: 'text/csv' },
    { scope: 'csv-import' },
  ), true);
  assert.equal(isUploadTypeAllowedForScope(
    { originalname: 'payload.exe', mimetype: 'application/octet-stream' },
    { scope: 'csv-import' },
  ), false);

  assert.throws(
    () => validateUploadedFile({
      originalName: 'unsafe.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
    }),
    (error: unknown) => error instanceof BadRequestException,
  );
}

run();
