import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const MCP_KEY_PREFIX = 'kanap_mcp';

@Injectable()
export class McpApiKeyHashService {
  generate(): { rawKey: string; keyPrefix: string; keyHash: string } {
    const keyPrefix = randomBytes(6).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const rawKey = `${MCP_KEY_PREFIX}_${keyPrefix}_${secret}`;
    return {
      rawKey,
      keyPrefix,
      keyHash: this.hash(rawKey),
    };
  }

  hash(rawKey: string): string {
    return createHash('sha256').update(rawKey, 'utf8').digest('hex');
  }

  extractPrefix(rawKey: string): string | null {
    const match = rawKey.match(/^kanap_mcp_([a-f0-9]{12})_[A-Za-z0-9\-_]+$/);
    return match?.[1] ?? null;
  }

  matches(rawKey: string, storedHash: string): boolean {
    const rawBuffer = Buffer.from(this.hash(rawKey), 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (rawBuffer.length !== storedBuffer.length) return false;
    return timingSafeEqual(rawBuffer, storedBuffer);
  }
}
