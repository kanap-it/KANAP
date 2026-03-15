import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';
import * as path from 'path';

const MAX_REMOTE_INLINE_IMAGE_BYTES = 20 * 1024 * 1024;
const REMOTE_IMAGE_FETCH_TIMEOUT_MS = 15_000;

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const DISALLOWED_ADDRESS_BLOCKLIST = new BlockList();
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('0.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('10.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('100.64.0.0', 10, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('127.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('169.254.0.0', 16, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('172.16.0.0', 12, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.0.0.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.0.2.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.168.0.0', 16, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('198.18.0.0', 15, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('198.51.100.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('203.0.113.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('224.0.0.0', 4, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('::', 128, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('::1', 128, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('fc00::', 7, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('fe80::', 10, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('ff00::', 8, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('2001:db8::', 32, 'ipv6');

@Injectable()
export class RemoteInlineImageImportService {
  async importFromUrl(sourceUrl: string): Promise<Express.Multer.File> {
    const url = this.parseSourceUrl(sourceUrl);
    await this.assertPublicHost(url.hostname);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        redirect: 'error',
        signal: AbortSignal.timeout(REMOTE_IMAGE_FETCH_TIMEOUT_MS),
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Unable to fetch remote image: ${String(error?.message || error || 'request failed')}`,
      );
    }

    if (!response.ok) {
      throw new BadRequestException(`Unable to fetch remote image: HTTP ${response.status}`);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_INLINE_IMAGE_BYTES) {
      throw new BadRequestException('Image size exceeds 20 MB limit');
    }

    const buffer = await this.readResponseBuffer(response, MAX_REMOTE_INLINE_IMAGE_BYTES);
    if (buffer.length === 0) {
      throw new BadRequestException('Remote image is empty');
    }

    const mimeType = String(response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const originalName = this.deriveOriginalName(url, mimeType);

    return {
      fieldname: 'file',
      originalname: originalName,
      encoding: '7bit',
      mimetype: mimeType || 'application/octet-stream',
      size: buffer.length,
      buffer,
      destination: '',
      filename: path.basename(originalName),
      path: '',
      stream: undefined as any,
    };
  }

  private parseSourceUrl(sourceUrl: string): URL {
    const normalized = String(sourceUrl || '').trim();
    if (!normalized) {
      throw new BadRequestException('Image URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new BadRequestException('Invalid image URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Only HTTP(S) image URLs are supported');
    }

    if (parsed.username || parsed.password) {
      throw new BadRequestException('Image URL credentials are not allowed');
    }

    return parsed;
  }

  private async assertPublicHost(hostname: string): Promise<void> {
    const host = String(hostname || '').trim().toLowerCase();
    if (!host) {
      throw new BadRequestException('Invalid image host');
    }

    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
      throw new BadRequestException('Private image hosts are not allowed');
    }

    if (this.isBlockedAddress(host)) {
      throw new BadRequestException('Private image hosts are not allowed');
    }

    let addresses: Array<{ address: string }>;
    try {
      addresses = await lookup(host, { all: true, verbatim: true });
    } catch {
      throw new BadRequestException('Unable to resolve image host');
    }

    if (!addresses.length) {
      throw new BadRequestException('Unable to resolve image host');
    }

    if (addresses.some(({ address }) => this.isBlockedAddress(address))) {
      throw new BadRequestException('Private image hosts are not allowed');
    }
  }

  private isBlockedAddress(address: string): boolean {
    const family = isIP(address);
    if (!family) return false;
    return DISALLOWED_ADDRESS_BLOCKLIST.check(address, family === 6 ? 'ipv6' : 'ipv4');
  }

  private deriveOriginalName(url: URL, mimeType: string): string {
    const rawName = path.posix.basename(url.pathname || '');
    let safeName = this.sanitizeFilename(rawName);

    if (!safeName) {
      safeName = 'imported-image';
    }

    if (!path.extname(safeName)) {
      const extension = MIME_EXTENSION_MAP[mimeType] || '';
      if (extension) {
        safeName = `${safeName}${extension}`;
      }
    }

    return safeName;
  }

  private sanitizeFilename(value: string): string {
    let decoded = String(value || '').trim();
    if (!decoded) return '';

    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Keep the original value when decoding fails.
    }

    return path.basename(decoded).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  }

  private async readResponseBuffer(response: Response, maxBytes: number): Promise<Buffer> {
    if (!response.body) return Buffer.alloc(0);

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.byteLength === 0) continue;

        total += value.byteLength;
        if (total > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation failures when enforcing the size limit.
          }
          throw new BadRequestException('Image size exceeds 20 MB limit');
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks, total);
  }
}
