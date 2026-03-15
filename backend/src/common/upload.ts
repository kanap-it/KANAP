// Shared upload configuration for attachments
// Aligns attachment upload size across workspaces
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { isUploadTypeAllowedForScope, UploadValidationScope } from './upload-validation';

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
export const CSV_IMPORT_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

const buildFileFilter = (scope: UploadValidationScope): NonNullable<MulterOptions['fileFilter']> => {
  return (_req, file, cb) => {
    if (isUploadTypeAllowedForScope(file, { scope })) {
      cb(null, true);
      return;
    }

    if (scope === 'inline-image') {
      cb(new BadRequestException('Unsupported image type. Allowed: PNG, JPG, JPEG, GIF, WEBP'), false);
      return;
    }
    if (scope === 'document-import') {
      cb(new BadRequestException('Unsupported file type. Allowed: DOCX'), false);
      return;
    }

    cb(new BadRequestException('Unsupported file type'), false);
  };
};

export const attachmentMulterOptions: MulterOptions = {
  limits: { fileSize: ATTACHMENT_MAX_BYTES },
  fileFilter: buildFileFilter('attachment'),
};

export const inlineImageMulterOptions: MulterOptions = {
  limits: { fileSize: ATTACHMENT_MAX_BYTES },
  fileFilter: buildFileFilter('inline-image'),
};

export const documentImportMulterOptions: MulterOptions = {
  limits: { fileSize: ATTACHMENT_MAX_BYTES },
  fileFilter: buildFileFilter('document-import'),
};

export const csvImportMulterOptions: MulterOptions = {
  limits: { fileSize: CSV_IMPORT_MAX_BYTES },
};

/** Re-decode multer's latin1-mangled filename back to UTF-8 */
export function fixMulterFilename(name: string | undefined): string {
  if (!name) return '';
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}
