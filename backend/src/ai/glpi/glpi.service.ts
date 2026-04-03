import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AiSecretCipherService } from '../ai-secret-cipher.service';
import { AiSettingsService } from '../ai-settings.service';
import {
  GlpiConnectionOverrides,
  GlpiDocument,
  GlpiSession,
  GlpiTestResult,
  GlpiTicket,
} from './glpi.types';

const GLPI_TIMEOUT_MS = 10_000;
const GLPI_MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

type ResolvedGlpiSettings = {
  baseUrl: string;
  userToken: string;
  appToken: string | null;
};

function textOrNull(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const normalized = textOrNull(value);
  if (!normalized) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new BadRequestException('GLPI URL must be a valid HTTP(S) URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('GLPI URL must use http:// or https://.');
  }
  if (parsed.username || parsed.password) {
    throw new BadRequestException('GLPI URL must not include embedded credentials.');
  }

  parsed.search = '';
  parsed.hash = '';
  parsed.pathname = `${(parsed.pathname || '/').replace(/\/+$/, '') || ''}/`;
  return parsed.toString();
}

function stringifyGlpiValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return textOrNull(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => stringifyGlpiValue(item))
      .filter((item): item is string => !!item);
    return items.length > 0 ? items.join(', ') : null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textOrNull(record.completename)
      ?? textOrNull(record.name)
      ?? textOrNull(record.label)
      ?? textOrNull(record.value)
      ?? null;
  }
  return null;
}

function parseNumericGlpiValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>;
    return parseNumericGlpiValue(record.id ?? record.value ?? null);
  }
  return null;
}

function decodeFilenameComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

@Injectable()
export class GlpiService {
  private readonly logger = new Logger(GlpiService.name);

  constructor(
    private readonly settingsService: AiSettingsService,
    private readonly cipher: AiSecretCipherService,
  ) {}

  async initSession(
    tenantId: string,
    manager: EntityManager,
    overrides?: GlpiConnectionOverrides,
  ): Promise<GlpiSession> {
    const settings = await this.resolveSettings(tenantId, manager, overrides);
    const payload = await this.requestJson(
      this.buildUrl(settings.baseUrl, 'apirest.php/initSession'),
      {
        headers: this.buildInitHeaders(settings.userToken, settings.appToken),
      },
    );
    const sessionToken = textOrNull((payload as Record<string, unknown>)?.session_token);
    if (!sessionToken) {
      throw new BadRequestException('GLPI did not return a session token.');
    }

    return {
      baseUrl: settings.baseUrl,
      sessionToken,
      appToken: settings.appToken,
    };
  }

  async getTicket(
    session: GlpiSession,
    ticketId: number,
  ): Promise<GlpiTicket> {
    const payload = await this.requestJson(
      this.buildUrl(session.baseUrl, `apirest.php/Ticket/${ticketId}`),
      {
        headers: this.buildSessionHeaders(session),
      },
      { notFoundMessage: `GLPI ticket #${ticketId} was not found.` },
    );

    const record = this.expectRecord(payload, 'GLPI ticket');
    const resolvedTicketId = parseNumericGlpiValue(record.id) ?? ticketId;
    return {
      id: resolvedTicketId,
      name: textOrNull(record.name),
      content_html: textOrNull(record.content),
      status: stringifyGlpiValue(record.status),
      priority: parseNumericGlpiValue(record.priority),
      urgency: stringifyGlpiValue(record.urgency),
      type: parseNumericGlpiValue(record.type),
      glpi_url: this.buildUrl(session.baseUrl, `front/ticket.form.php?id=${resolvedTicketId}`),
    };
  }

  async fetchDocument(
    session: GlpiSession,
    sourceUrl: string,
  ): Promise<GlpiDocument> {
    const resolvedUrl = this.resolveSameOriginUrl(session.baseUrl, sourceUrl);
    const response = await this.request(
      resolvedUrl.toString(),
      {
        headers: this.buildSessionHeaders(session),
      },
    );

    if (!response.ok) {
      throw this.createHttpError(response.status, null, `Unable to fetch GLPI image ${resolvedUrl.toString()}.`);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > GLPI_MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('GLPI image exceeds the 20 MB inline image limit.');
    }

    const buffer = await this.readResponseBuffer(response, GLPI_MAX_DOCUMENT_BYTES);
    if (buffer.length === 0) {
      throw new BadRequestException('GLPI image is empty.');
    }

    const mimeType = textOrNull(response.headers.get('content-type'))?.split(';')[0]?.trim().toLowerCase()
      || 'application/octet-stream';

    return {
      buffer,
      mimeType,
      filename: this.resolveFilename(response, resolvedUrl),
    };
  }

  async killSession(session: GlpiSession): Promise<void> {
    try {
      await this.request(
        this.buildUrl(session.baseUrl, 'apirest.php/killSession'),
        {
          headers: this.buildSessionHeaders(session),
        },
      );
    } catch (error: any) {
      this.logger.debug(`Failed to close GLPI session: ${String(error?.message || error || 'unknown error')}`);
    }
  }

  async testConnection(
    tenantId: string,
    overrides?: GlpiConnectionOverrides,
    manager?: EntityManager,
  ): Promise<GlpiTestResult> {
    const startedAt = Date.now();
    let session: GlpiSession | null = null;

    try {
      if (!manager) {
        throw new BadRequestException('Tenant manager is required for GLPI connection testing.');
      }
      session = await this.initSession(tenantId, manager, overrides);
      return {
        ok: true,
        message: 'GLPI connection succeeded.',
        latency_ms: Date.now() - startedAt,
      };
    } catch (error: any) {
      return {
        ok: false,
        message: this.getErrorMessage(error),
        latency_ms: Date.now() - startedAt,
      };
    } finally {
      if (session) {
        await this.killSession(session);
      }
    }
  }

  private async resolveSettings(
    tenantId: string,
    manager: EntityManager,
    overrides?: GlpiConnectionOverrides,
  ): Promise<ResolvedGlpiSettings> {
    const settings = await this.settingsService.find(tenantId, { manager });
    const baseUrl = normalizeBaseUrl(overrides?.glpi_url ?? settings?.glpi_url ?? null);

    let userToken = textOrNull(overrides?.glpi_user_token);
    if (!userToken && settings?.glpi_user_token_encrypted) {
      try {
        userToken = this.cipher.decrypt(settings.glpi_user_token_encrypted);
      } catch (error: any) {
        throw new BadRequestException(
          `Stored GLPI user token cannot be decrypted: ${String(error?.message || error || 'unknown error')}`,
        );
      }
    }

    let appToken = textOrNull(overrides?.glpi_app_token);
    if (!appToken && settings?.glpi_app_token_encrypted) {
      try {
        appToken = this.cipher.decrypt(settings.glpi_app_token_encrypted);
      } catch (error: any) {
        throw new BadRequestException(
          `Stored GLPI app token cannot be decrypted: ${String(error?.message || error || 'unknown error')}`,
        );
      }
    }

    if (!baseUrl) {
      throw new BadRequestException('GLPI URL is required.');
    }
    if (!userToken) {
      throw new BadRequestException('GLPI user token is required.');
    }

    return { baseUrl, userToken, appToken };
  }

  private buildInitHeaders(
    userToken: string,
    appToken: string | null,
  ): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `user_token ${userToken}`,
      ...(appToken ? { 'App-Token': appToken } : {}),
    };
  }

  private buildSessionHeaders(
    session: GlpiSession,
  ): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Session-Token': session.sessionToken,
      ...(session.appToken ? { 'App-Token': session.appToken } : {}),
    };
  }

  private buildUrl(baseUrl: string, pathOrUrl: string): string {
    return new URL(pathOrUrl, baseUrl).toString();
  }

  private resolveSameOriginUrl(baseUrl: string, candidate: string): URL {
    const normalized = textOrNull(candidate);
    if (!normalized) {
      throw new BadRequestException('GLPI image URL is missing.');
    }

    const resolved = new URL(normalized, baseUrl);
    const base = new URL(baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      throw new BadRequestException('GLPI image URL must use http:// or https://.');
    }
    if (resolved.origin !== base.origin) {
      throw new BadRequestException('GLPI image URL must stay on the configured GLPI origin.');
    }
    if (resolved.username || resolved.password) {
      throw new BadRequestException('GLPI image URL must not include embedded credentials.');
    }

    return resolved;
  }

  private expectRecord(payload: unknown, label: string): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException(`${label} response was malformed.`);
    }
    return payload as Record<string, unknown>;
  }

  private async requestJson(
    url: string,
    init: RequestInit,
    opts?: { notFoundMessage?: string },
  ): Promise<unknown> {
    const response = await this.request(url, init);
    const raw = await response.text();
    const payload = this.safeParseJson(raw, {
      requestUrl: url,
      responseUrl: response.url || url,
      contentType: response.headers.get('content-type'),
      status: response.status,
    });

    const mappedError = this.extractGlpiError(payload);
    if (!response.ok) {
      throw this.createHttpError(response.status, mappedError, opts?.notFoundMessage);
    }
    if (mappedError) {
      throw new BadRequestException(mappedError);
    }

    return payload;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(GLPI_TIMEOUT_MS),
      });
    } catch (error: any) {
      throw new BadRequestException(
        `GLPI request failed: ${String(error?.message || error || 'request failed')}`,
      );
    }
  }

  private safeParseJson(
    raw: string,
    meta?: {
      requestUrl?: string | null;
      responseUrl?: string | null;
      contentType?: string | null;
      status?: number | null;
    },
  ): unknown {
    const text = String(raw || '').trim();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch {
      const contentType = textOrNull(meta?.contentType);
      const redirected = meta?.responseUrl && meta.requestUrl && meta.responseUrl !== meta.requestUrl
        ? ` Redirected to ${meta.responseUrl}.`
        : '';
      const prefix = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      const status = meta?.status ? ` HTTP ${meta.status}.` : '';

      this.logger.warn(
        `GLPI returned non-JSON content for ${meta?.requestUrl || 'unknown request'}`
        + `${meta?.responseUrl && meta?.responseUrl !== meta?.requestUrl ? ` -> ${meta.responseUrl}` : ''}`
        + `${contentType ? ` [${contentType}]` : ''}`,
      );

      if (contentType?.toLowerCase().includes('text/html') || text.startsWith('<!DOCTYPE html') || text.startsWith('<html')) {
        throw new BadRequestException(
          `GLPI returned HTML instead of JSON.${status}`
          + ` Check that the GLPI URL is the base GLPI URL and that the REST API is enabled.`
          + redirected,
        );
      }

      throw new BadRequestException(
        `GLPI returned a non-JSON response.${status}`
        + `${contentType ? ` Content-Type: ${contentType}.` : ''}`
        + `${prefix ? ` Response starts with: ${prefix}.` : ''}`
        + redirected,
      );
    }
  }

  private extractGlpiError(payload: unknown): string | null {
    if (Array.isArray(payload) && payload.length > 0) {
      const code = textOrNull(payload[0]);
      const detail = textOrNull(payload[1]);
      if (code?.startsWith('ERROR_')) {
        return this.mapGlpiError(code, detail);
      }
    }
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const code = textOrNull(record.code ?? record.error ?? null);
      const detail = textOrNull(record.message ?? record.error_message ?? null);
      if (code?.startsWith('ERROR_')) {
        return this.mapGlpiError(code, detail);
      }
      if (record.success === false && detail) {
        return detail;
      }
    }
    return null;
  }

  private mapGlpiError(code: string, detail: string | null): string {
    const suffix = detail ? ` ${detail}` : '';
    switch (code) {
      case 'ERROR_SESSION_TOKEN_INVALID':
        return `GLPI session token is invalid.${suffix}`.trim();
      case 'ERROR_GLPI_LOGIN_USER_TOKEN':
        return `GLPI user token is invalid.${suffix}`.trim();
      case 'ERROR_APP_TOKEN_PARAMETERS_MISSING':
      case 'ERROR_WRONG_APP_TOKEN_PARAMETER':
        return `GLPI app token is invalid.${suffix}`.trim();
      case 'ERROR_NOT_FOUND':
        return `GLPI resource was not found.${suffix}`.trim();
      default:
        return `GLPI request failed (${code}).${suffix}`.trim();
    }
  }

  private createHttpError(
    status: number,
    message: string | null,
    notFoundMessage?: string,
  ): Error {
    if (status === 404 && notFoundMessage) {
      return new NotFoundException(notFoundMessage);
    }
    return new BadRequestException(message || `GLPI request failed with HTTP ${status}.`);
  }

  private resolveFilename(response: Response, url: URL): string {
    const contentDisposition = response.headers.get('content-disposition') || '';
    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeFilenameComponent(utf8Match[1]);
    }

    const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    if (quotedMatch?.[1]) {
      return quotedMatch[1];
    }

    const bareMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    if (bareMatch?.[1]) {
      return bareMatch[1].trim();
    }

    const fallback = decodeFilenameComponent(url.pathname.split('/').pop() || '').trim();
    return fallback || 'glpi-image';
  }

  private async readResponseBuffer(response: Response, maxBytes: number): Promise<Buffer> {
    if (!response.body) {
      return Buffer.alloc(0);
    }

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
          throw new BadRequestException('GLPI image exceeds the 20 MB inline image limit.');
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks, total);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'GLPI connection failed.';
  }
}
