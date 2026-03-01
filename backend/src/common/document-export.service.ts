import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ExportFormat } from './dto/export.dto';

const execFileAsync = promisify(execFile);

const MAX_EXPORT_CONTENT_BYTES = 1_000_000;
const PANDOC_TIMEOUT_MS = 30_000;
const PANDOC_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const DEFAULT_FILENAME = 'document';
const IMAGE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

type ExportConfig = {
  extension: 'pdf' | 'docx' | 'odt';
  mimeType: string;
  pandocTarget: 'pdf' | 'docx' | 'odt';
};

@Injectable()
export class DocumentExportService {
  private readonly logger = new Logger(DocumentExportService.name);
  private readonly allowedImageHostPatterns = this.buildAllowedImageHostPatterns();
  private readonly mediaBaseUrl = this.resolveMediaBaseUrl();

  async exportMarkdown(
    content: string,
    format: ExportFormat,
    title?: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string; filename: string }> {
    const normalized = String(content || '');
    const sizeBytes = Buffer.byteLength(normalized, 'utf8');
    if (!normalized.trim()) {
      throw new BadRequestException('content is required');
    }
    if (sizeBytes > MAX_EXPORT_CONTENT_BYTES) {
      throw new BadRequestException(`content exceeds ${MAX_EXPORT_CONTENT_BYTES} bytes`);
    }

    const config = this.getExportConfig(format);
    const markdown = this.normalizeMarkdownImages(normalized);
    const safeTitle = this.sanitizeFilename(title || DEFAULT_FILENAME);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kanap-export-'));
    const inputFile = path.join(tempDir, 'input.md');
    const outputFile = path.join(tempDir, `output.${config.extension}`);

    try {
      await fs.writeFile(inputFile, markdown, 'utf8');

      const args = [
        '--from',
        'gfm',
        '--to',
        config.pandocTarget,
        '--standalone',
        '--output',
        outputFile,
      ];
      if (title && title.trim()) {
        args.push('--metadata', `title=${title.trim()}`);
      }
      if (config.pandocTarget === 'pdf') {
        args.push('--pdf-engine=typst');
      }
      args.push(inputFile);

      await execFileAsync('pandoc', args, {
        cwd: tempDir,
        timeout: PANDOC_TIMEOUT_MS,
        maxBuffer: PANDOC_MAX_BUFFER_BYTES,
      });

      const buffer = await fs.readFile(outputFile);
      return {
        buffer,
        mimeType: config.mimeType,
        extension: config.extension,
        filename: `${safeTitle}.${config.extension}`,
      };
    } catch (error: any) {
      const stderr = String(error?.stderr || error?.message || 'unknown error');
      this.logger.error(`Pandoc export failed (${format}): ${stderr}`);
      throw new InternalServerErrorException('Document export failed');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private getExportConfig(format: ExportFormat): ExportConfig {
    switch (format) {
      case 'pdf':
        return {
          extension: 'pdf',
          mimeType: 'application/pdf',
          pandocTarget: 'pdf',
        };
      case 'docx':
        return {
          extension: 'docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          pandocTarget: 'docx',
        };
      case 'odt':
        return {
          extension: 'odt',
          mimeType: 'application/vnd.oasis.opendocument.text',
          pandocTarget: 'odt',
        };
      default:
        throw new BadRequestException('Unsupported export format');
    }
  }

  private normalizeMarkdownImages(markdown: string): string {
    return markdown.replace(IMAGE_MARKDOWN_RE, (_full, alt: string, rawInner: string) => {
      const { target, suffix } = this.splitMarkdownTarget(rawInner);
      const normalizedTarget = this.normalizeAndValidateImageTarget(target);
      const targetForMarkdown = /[\s()]/.test(normalizedTarget)
        ? `<${normalizedTarget}>`
        : normalizedTarget;
      return `![${alt}](${targetForMarkdown}${suffix})`;
    });
  }

  private splitMarkdownTarget(rawInner: string): { target: string; suffix: string } {
    const inner = String(rawInner || '').trim();
    if (!inner) {
      throw new BadRequestException('Invalid image markdown syntax');
    }

    if (inner.startsWith('<')) {
      const close = inner.indexOf('>');
      if (close <= 1) {
        throw new BadRequestException('Invalid image markdown syntax');
      }
      return {
        target: inner.slice(1, close).trim(),
        suffix: inner.slice(close + 1),
      };
    }

    const splitAt = inner.search(/\s/);
    if (splitAt < 0) {
      return { target: inner, suffix: '' };
    }

    return {
      target: inner.slice(0, splitAt).trim(),
      suffix: inner.slice(splitAt),
    };
  }

  private normalizeAndValidateImageTarget(rawTarget: string): string {
    const target = String(rawTarget || '').trim();
    if (!target) {
      throw new BadRequestException('Image URL cannot be empty');
    }

    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(target)) {
      return target;
    }
    if (/^data:/i.test(target)) {
      throw new BadRequestException('Unsupported image URI scheme');
    }

    if (/^\/\//.test(target)) {
      const parsed = new URL(`https:${target}`);
      this.assertAllowedImageHost(parsed.hostname);
      return parsed.toString();
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      const parsed = new URL(target);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new BadRequestException('Unsupported image URI scheme');
      }
      this.assertAllowedImageHost(parsed.hostname);
      return parsed.toString();
    }

    if (target.startsWith('/')) {
      if (!this.mediaBaseUrl) {
        throw new BadRequestException('Relative image URLs require EXPORT_MEDIA_BASE_URL or APP_BASE_URL');
      }
      const parsed = new URL(target, this.mediaBaseUrl);
      this.assertAllowedImageHost(parsed.hostname);
      return parsed.toString();
    }

    throw new BadRequestException('Only absolute HTTP(S), data:image, or root-relative image URLs are allowed');
  }

  private resolveMediaBaseUrl(): string | null {
    const candidates = [
      process.env.EXPORT_MEDIA_BASE_URL,
      process.env.APP_BASE_URL,
      process.env.PUBLIC_APP_URL,
    ];
    for (const candidate of candidates) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;
      try {
        return new URL(raw).origin;
      } catch {
        // ignore malformed entries
      }
    }
    return null;
  }

  private buildAllowedImageHostPatterns(): string[] {
    const patterns = new Set<string>();
    const rawList = String(process.env.EXPORT_ALLOWED_IMAGE_HOSTS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const entry of rawList) {
      patterns.add(this.normalizeHostPattern(entry));
    }

    const urlCandidates = [
      process.env.EXPORT_MEDIA_BASE_URL,
      process.env.APP_BASE_URL,
      process.env.PUBLIC_APP_URL,
    ];
    for (const candidate of urlCandidates) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;
      try {
        patterns.add(new URL(raw).hostname.toLowerCase());
      } catch {
        // ignore malformed entries
      }
    }

    if (patterns.size === 0) {
      patterns.add('localhost');
      patterns.add('127.0.0.1');
      patterns.add('::1');
    }

    return [...patterns];
  }

  private normalizeHostPattern(pattern: string): string {
    const value = String(pattern || '').trim().toLowerCase();
    if (!value) return '';
    if (value.includes('://')) {
      try {
        return new URL(value).hostname.toLowerCase();
      } catch {
        return value;
      }
    }
    return value;
  }

  private assertAllowedImageHost(hostname: string): void {
    const host = String(hostname || '').trim().toLowerCase();
    if (!host) {
      throw new BadRequestException('Invalid image host');
    }

    const allowed = this.allowedImageHostPatterns.some((pattern) => {
      if (!pattern) return false;
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1).toLowerCase(); // ".example.com"
        return host.endsWith(suffix) && host.length > suffix.length;
      }
      return host === pattern;
    });

    if (!allowed) {
      throw new BadRequestException(`Image host is not allowed: ${host}`);
    }
  }

  private sanitizeFilename(value: string): string {
    const cleaned = String(value || DEFAULT_FILENAME)
      .trim()
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+/, '')
      .replace(/_+$/, '');
    return cleaned || DEFAULT_FILENAME;
  }
}
