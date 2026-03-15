import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../common/storage/storage.service';

export interface EmailBranding {
  primaryColor: string;
  logoBuffer: Buffer;
  logoContentType: string;
  logoCid: string;
  /** True when a tenant has their own custom logo (show "Powered by KANAP" in footer). */
  isCustom: boolean;
}

const DEFAULT_PRIMARY_COLOR = '#2D69E0';
const LOGO_CID = 'kanap-branding-logo';

let cachedDefaultLogo: Buffer | null = null;
let didSearchDefaultLogo = false;

function getDefaultLogo(): Buffer {
  if (cachedDefaultLogo) return cachedDefaultLogo;

  if (didSearchDefaultLogo) return Buffer.alloc(0);
  didSearchDefaultLogo = true;

  const candidates = [
    path.join(__dirname, 'assets', 'kanap-logo.png'),
    path.join(process.cwd(), 'dist', 'email', 'assets', 'kanap-logo.png'),
    path.join(process.cwd(), 'src', 'email', 'assets', 'kanap-logo.png'),
  ];

  for (const candidate of candidates) {
    try {
      cachedDefaultLogo = fs.readFileSync(candidate);
      return cachedDefaultLogo;
    } catch {
      // Try the next known runtime/layout path.
    }
  }

  cachedDefaultLogo = Buffer.alloc(0);
  return cachedDefaultLogo;
}

export function getDefaultEmailBranding(): EmailBranding {
  return {
    primaryColor: DEFAULT_PRIMARY_COLOR,
    logoBuffer: getDefaultLogo(),
    logoContentType: 'image/png',
    logoCid: LOGO_CID,
    isCustom: false,
  };
}

/**
 * Resolve email branding for a tenant.
 * If branding has a custom logo, loads it from S3.
 * Falls back to KANAP defaults.
 */
export async function resolveEmailBranding(
  branding: { logo_storage_path?: string; primary_color_light?: string | null } | null | undefined,
  storage: StorageService,
): Promise<EmailBranding> {
  if (!branding) return getDefaultEmailBranding();

  const primaryColor = branding.primary_color_light || DEFAULT_PRIMARY_COLOR;

  if (branding.logo_storage_path) {
    try {
      const obj = await storage.getObjectStream(branding.logo_storage_path);
      const chunks: Buffer[] = [];
      for await (const chunk of obj.stream as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const logoBuffer = Buffer.concat(chunks);
      if (logoBuffer.length > 0) {
        return {
          primaryColor,
          logoBuffer,
          logoContentType: obj.contentType || 'image/png',
          logoCid: LOGO_CID,
          isCustom: true,
        };
      }
    } catch {
      // Fall through to default logo
    }
  }

  // Tenant may have a custom color but no logo (or logo load failed)
  return {
    primaryColor,
    logoBuffer: getDefaultLogo(),
    logoContentType: 'image/png',
    logoCid: LOGO_CID,
    isCustom: primaryColor !== DEFAULT_PRIMARY_COLOR,
  };
}
