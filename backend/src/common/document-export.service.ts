import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as AdmZip from 'adm-zip';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ExportFormat } from './dto/export.dto';

const execFileAsync = promisify(execFile);

const MAX_EXPORT_CONTENT_BYTES = 1_000_000;
const MAX_EMBEDDED_IMAGE_BYTES = 10 * 1024 * 1024;
const PANDOC_TIMEOUT_MS = 30_000;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const PANDOC_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const DEFAULT_FILENAME = 'document';
const IMAGE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_HTML_RE = /<img\b[^>]*>/gi;
const DATA_IMAGE_RE = /^data:image\/([a-z0-9.+-]+);base64,/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ODT_MAX_IMAGE_WIDTH_CM = 16;
const ODT_SIZE_RE = /^([0-9]*\.?[0-9]+)\s*(cm|mm|in|pt|px)$/i;

type ExportConfig = {
  extension: 'pdf' | 'docx' | 'odt';
  mimeType: string;
  pandocTarget: 'pdf' | 'docx' | 'odt';
};

type ExportImageFetchOptions = {
  imageFetchHeaders?: Record<string, string>;
};

@Injectable()
export class DocumentExportService {
  private readonly logger = new Logger(DocumentExportService.name);
  private readonly allowedImageHostPatterns = this.buildAllowedImageHostPatterns();
  private readonly mediaBaseUrl = this.resolveMediaBaseUrl();
  private readonly selfHostnames = this.buildSelfHostnames();

  async exportMarkdown(
    content: string,
    format: ExportFormat,
    title?: string,
    opts?: ExportImageFetchOptions,
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
    const safeTitle = this.sanitizeFilename(title || DEFAULT_FILENAME);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kanap-export-'));
    const inputFile = path.join(tempDir, 'input.md');
    const outputFile = path.join(tempDir, `output.${config.extension}`);

    try {
      const markdown = await this.normalizeMarkdownImages(normalized, tempDir, opts);
      await fs.writeFile(inputFile, markdown, 'utf8');

      const args = [
        '--from',
        'gfm',
        '--to',
        config.pandocTarget,
        '--standalone',
        '--output',
        outputFile,
        '--resource-path',
        tempDir,
      ];
      if (title && title.trim()) {
        args.push('--metadata', `title=${title.trim()}`);
      }
      if (config.pandocTarget === 'pdf') {
        args.push(
          '--pdf-engine=typst',
          '--pdf-engine-opt=--font-path=/usr/share/fonts',
          '--pdf-engine-opt=--font-path=/usr/local/share/fonts',
          '--variable=mainfont:Noto Sans',
          '--variable=sansfont:Noto Sans',
          '--variable=monofont:DejaVu Sans Mono',
        );
      }
      args.push(inputFile);

      await execFileAsync('pandoc', args, {
        cwd: tempDir,
        timeout: PANDOC_TIMEOUT_MS,
        maxBuffer: PANDOC_MAX_BUFFER_BYTES,
      });
      if (config.pandocTarget === 'odt') {
        await this.normalizeOdtImageFrames(outputFile).catch((error: any) => {
          const message = String(error?.message || error || 'unknown error');
          this.logger.warn(`ODT image post-processing skipped: ${message}`);
        });
      }

      const buffer = await fs.readFile(outputFile);
      return {
        buffer,
        mimeType: config.mimeType,
        extension: config.extension,
        filename: `${safeTitle}.${config.extension}`,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
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

  private async normalizeMarkdownImages(
    markdown: string,
    tempDir: string,
    opts?: ExportImageFetchOptions,
  ): Promise<string> {
    const cache = new Map<string, string>();
    return this.transformOutsideFencedCode(markdown, async (chunk) => {
      const withMarkdownImages = await this.localizeMarkdownImageSyntax(chunk, tempDir, cache, opts);
      return this.localizeHtmlImageTags(withMarkdownImages, tempDir, cache, opts);
    });
  }

  private async transformOutsideFencedCode(
    markdown: string,
    transform: (chunk: string) => Promise<string>,
  ): Promise<string> {
    const lines = String(markdown || '').split(/\r?\n/);
    const result: string[] = [];
    const textBuffer: string[] = [];
    let inFence = false;
    let fenceChar = '';
    let fenceLen = 0;

    const flushTextBuffer = async () => {
      if (textBuffer.length === 0) return;
      result.push(await transform(textBuffer.join('\n')));
      textBuffer.length = 0;
    };

    for (const line of lines) {
      const markerMatch = line.match(/^\s*([`~]{3,})/);
      if (markerMatch) {
        const marker = markerMatch[1];
        const markerChar = marker[0];
        const markerLen = marker.length;
        if (!inFence) {
          await flushTextBuffer();
          inFence = true;
          fenceChar = markerChar;
          fenceLen = markerLen;
          result.push(line);
          continue;
        }
        if (markerChar === fenceChar && markerLen >= fenceLen) {
          inFence = false;
          fenceChar = '';
          fenceLen = 0;
          result.push(line);
          continue;
        }
      }

      if (inFence) {
        result.push(line);
      } else {
        textBuffer.push(line);
      }
    }

    await flushTextBuffer();
    return result.join('\n');
  }

  private async localizeMarkdownImageSyntax(
    markdown: string,
    tempDir: string,
    cache: Map<string, string>,
    opts?: ExportImageFetchOptions,
  ): Promise<string> {
    const regex = new RegExp(IMAGE_MARKDOWN_RE.source, 'g');
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
      const whole = match[0];
      const alt = String(match[1] || '');
      const inner = String(match[2] || '');
      result += markdown.slice(lastIndex, match.index);
      const { target, suffix } = this.splitMarkdownTarget(inner);
      const normalizedTarget = this.normalizeAndValidateImageTarget(target);
      const localizedTarget = await this.materializeImageTarget(normalizedTarget, tempDir, cache, opts);
      const targetForMarkdown = /[\s()]/.test(localizedTarget)
        ? `<${localizedTarget}>`
        : localizedTarget;
      result += `![${alt}](${targetForMarkdown}${suffix})`;
      lastIndex = match.index + whole.length;
    }
    result += markdown.slice(lastIndex);
    return result;
  }

  private async localizeHtmlImageTags(
    markdown: string,
    tempDir: string,
    cache: Map<string, string>,
    opts?: ExportImageFetchOptions,
  ): Promise<string> {
    const regex = new RegExp(IMAGE_HTML_RE.source, 'gi');
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
      const wholeTag = match[0];
      result += markdown.slice(lastIndex, match.index);
      lastIndex = match.index + wholeTag.length;

      const rawSrc = this.readHtmlAttribute(wholeTag, 'src');
      if (!rawSrc) {
        result += wholeTag;
        continue;
      }

      const normalizedTarget = this.normalizeAndValidateImageTarget(rawSrc);
      const localizedTarget = await this.materializeImageTarget(normalizedTarget, tempDir, cache, opts);
      const rawAlt = this.readHtmlAttribute(wholeTag, 'alt') || '';
      const escapedAlt = this.escapeMarkdownAlt(rawAlt);
      const targetForMarkdown = /[\s()]/.test(localizedTarget)
        ? `<${localizedTarget}>`
        : localizedTarget;
      result += `![${escapedAlt}](${targetForMarkdown})`;
    }
    result += markdown.slice(lastIndex);
    return result;
  }

  private readHtmlAttribute(tag: string, attrName: string): string | null {
    const pattern = new RegExp(
      `\\b${attrName}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`,
      'i',
    );
    const match = String(tag || '').match(pattern);
    const raw = String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
    if (!raw) return null;
    return raw
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private async materializeImageTarget(
    normalizedTarget: string,
    tempDir: string,
    cache: Map<string, string>,
    opts?: ExportImageFetchOptions,
  ): Promise<string> {
    if (cache.has(normalizedTarget)) {
      return cache.get(normalizedTarget)!;
    }

    let localPath: string;
    if (DATA_IMAGE_RE.test(normalizedTarget)) {
      localPath = await this.materializeDataImageTarget(normalizedTarget, tempDir, cache.size + 1);
    } else {
      localPath = await this.materializeHttpImageTarget(normalizedTarget, tempDir, cache.size + 1, opts);
    }

    cache.set(normalizedTarget, localPath);
    return localPath;
  }

  private async materializeHttpImageTarget(
    target: string,
    tempDir: string,
    index: number,
    opts?: ExportImageFetchOptions,
  ): Promise<string> {
    const candidates = this.buildImageFetchCandidates(target);
    let lastError = '';

    for (const candidate of candidates) {
      let response: Response;
      try {
        const parsed = new URL(candidate);
        this.assertAllowedImageHost(parsed.hostname);
        response = await fetch(candidate, {
          headers: opts?.imageFetchHeaders,
          signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        });
      } catch (error: any) {
        lastError = String(error?.message || error || 'fetch failed');
        continue;
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const responseContentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (responseContentType && !responseContentType.startsWith('image/') && responseContentType !== 'application/octet-stream' && responseContentType !== 'application/pdf') {
        lastError = `unexpected content-type: ${responseContentType}`;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0) {
        lastError = 'empty image payload';
        continue;
      }
      if (buffer.length > MAX_EMBEDDED_IMAGE_BYTES) {
        throw new BadRequestException(`Image too large for export: ${target}`);
      }

      const extension = this.inferImageExtension(candidate, response.headers.get('content-type'));
      const relPath = path.posix.join('assets', `image-${index}.${extension}`);
      const absPath = path.join(tempDir, relPath);
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, buffer);
      return relPath;
    }

    const suffix = lastError ? ` (${lastError})` : '';
    throw new BadRequestException(`Unable to fetch image: ${target}${suffix}`);
  }

  private buildImageFetchCandidates(target: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const add = (value: string) => {
      const trimmed = String(value || '').trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      candidates.push(trimmed);
    };

    const parsed = new URL(target);
    const hasApiPrefix = parsed.pathname.startsWith('/api/');
    const backendPort = String(process.env.PORT || '8080').trim() || '8080';
    const isLoopback = LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());

    add(parsed.toString());

    if (hasApiPrefix) {
      const stripped = new URL(parsed.toString());
      stripped.pathname = stripped.pathname.replace(/^\/api/, '') || '/';
      add(stripped.toString());
    }

    if (isLoopback && parsed.port !== backendPort) {
      const backendDirect = new URL(parsed.toString());
      backendDirect.port = backendPort;
      add(backendDirect.toString());

      if (hasApiPrefix) {
        const backendStripped = new URL(backendDirect.toString());
        backendStripped.pathname = backendStripped.pathname.replace(/^\/api/, '') || '/';
        add(backendStripped.toString());
      }
    }

    const isSelfHost = this.selfHostnames.has(parsed.hostname.toLowerCase());
    if (isSelfHost && !isLoopback) {
      const backendDirect = new URL(parsed.toString());
      backendDirect.protocol = 'http:';
      backendDirect.hostname = '127.0.0.1';
      backendDirect.port = backendPort;
      add(backendDirect.toString());

      if (hasApiPrefix) {
        const backendStripped = new URL(backendDirect.toString());
        backendStripped.pathname = backendStripped.pathname.replace(/^\/api/, '') || '/';
        add(backendStripped.toString());
      }
    }

    return candidates;
  }

  private async materializeDataImageTarget(
    target: string,
    tempDir: string,
    index: number,
  ): Promise<string> {
    const match = target.match(DATA_IMAGE_RE);
    if (!match) {
      throw new BadRequestException('Invalid data image URI');
    }
    const metaEnd = target.indexOf(',');
    if (metaEnd < 0) {
      throw new BadRequestException('Invalid data image URI');
    }

    const base64Part = target.slice(metaEnd + 1);
    const buffer = Buffer.from(base64Part, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Invalid data image payload');
    }
    if (buffer.length > MAX_EMBEDDED_IMAGE_BYTES) {
      throw new BadRequestException('Embedded image is too large for export');
    }

    const extension = this.extensionFromMimeSubtype(match[1]);
    const relPath = path.posix.join('assets', `image-${index}.${extension}`);
    const absPath = path.join(tempDir, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
    return relPath;
  }

  private inferImageExtension(target: string, contentTypeHeader: string | null): string {
    const contentType = String(contentTypeHeader || '').split(';')[0].trim().toLowerCase();
    const fromMime = this.extensionFromMimeType(contentType);
    if (fromMime) return fromMime;

    try {
      const parsed = new URL(target);
      const ext = path.extname(parsed.pathname || '').toLowerCase().replace(/^\./, '');
      if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
    } catch {
      // ignore
    }

    return 'png';
  }

  private extensionFromMimeType(contentType: string): string | null {
    if (!contentType) return null;
    switch (contentType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      case 'image/svg+xml':
        return 'svg';
      case 'image/bmp':
        return 'bmp';
      default:
        return null;
    }
  }

  private extensionFromMimeSubtype(subtypeRaw: string): string {
    const subtype = String(subtypeRaw || '').trim().toLowerCase();
    if (!subtype) return 'png';
    if (subtype === 'jpeg') return 'jpg';
    if (subtype === 'svg+xml') return 'svg';
    if (/^[a-z0-9.+-]{1,32}$/.test(subtype)) {
      return subtype.replace(/\+xml$/, '').replace(/[+.]/g, '-');
    }
    return 'png';
  }

  private escapeMarkdownAlt(value: string): string {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]');
  }

  private async normalizeOdtImageFrames(odtPath: string): Promise<void> {
    const zip = new AdmZip(odtPath);
    const entry = zip.getEntry('content.xml');
    if (!entry) return;

    const originalXml = entry.getData().toString('utf8');
    let changed = false;
    const updatedXml = originalXml.replace(/<draw:frame\b[^>]*>/gi, (tag) => {
      const widthMatch = tag.match(/\bsvg:width="([^"]+)"/i);
      if (!widthMatch) return tag;

      const widthCm = this.odtSizeToCm(widthMatch[1]);
      if (!widthCm || widthCm <= ODT_MAX_IMAGE_WIDTH_CM) return tag;

      const ratio = ODT_MAX_IMAGE_WIDTH_CM / widthCm;
      let updatedTag = tag.replace(
        /\bsvg:width="[^"]+"/i,
        `svg:width="${this.cmToOdtSize(ODT_MAX_IMAGE_WIDTH_CM)}"`,
      );

      const heightMatch = updatedTag.match(/\bsvg:height="([^"]+)"/i);
      if (heightMatch) {
        const heightCm = this.odtSizeToCm(heightMatch[1]);
        if (heightCm) {
          updatedTag = updatedTag.replace(
            /\bsvg:height="[^"]+"/i,
            `svg:height="${this.cmToOdtSize(heightCm * ratio)}"`,
          );
        }
      }

      if (updatedTag !== tag) changed = true;
      return updatedTag;
    });

    if (!changed) return;
    zip.updateFile('content.xml', Buffer.from(updatedXml, 'utf8'));
    zip.writeZip(odtPath);
  }

  private odtSizeToCm(value: string): number | null {
    const match = String(value || '').trim().match(ODT_SIZE_RE);
    if (!match) return null;
    const size = Number(match[1]);
    if (!Number.isFinite(size) || size <= 0) return null;
    const unit = String(match[2] || '').toLowerCase();
    switch (unit) {
      case 'cm':
        return size;
      case 'mm':
        return size / 10;
      case 'in':
        return size * 2.54;
      case 'pt':
        return size * (2.54 / 72);
      case 'px':
        return size * (2.54 / 96);
      default:
        return null;
    }
  }

  private cmToOdtSize(cm: number): string {
    const normalized = Math.max(0.01, Math.round(cm * 100) / 100);
    const text = Number.isInteger(normalized)
      ? normalized.toFixed(0)
      : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${text}cm`;
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
      throw new BadRequestException('Inline base64 images are not supported. Upload image attachments first.');
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

    throw new BadRequestException('Only absolute HTTP(S) or root-relative image URLs are allowed');
  }

  private resolveMediaBaseUrl(): string | null {
    const candidates = [
      process.env.EXPORT_MEDIA_BASE_URL,
      process.env.APP_URL,
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

  private buildSelfHostnames(): Set<string> {
    const hosts = new Set<string>();
    for (const candidate of [
      process.env.EXPORT_MEDIA_BASE_URL,
      process.env.APP_URL,
      process.env.APP_BASE_URL,
      process.env.PUBLIC_APP_URL,
    ]) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;
      try {
        hosts.add(new URL(raw).hostname.toLowerCase());
      } catch {
        // ignore malformed entries
      }
    }
    return hosts;
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
      process.env.APP_URL,
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

    for (const host of LOOPBACK_HOSTS) {
      patterns.add(host);
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
