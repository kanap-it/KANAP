/**
 * Small shared helpers for the agent control service.
 *
 * These were the base layer of a 2,650-line module-level header inside
 * ai-agent-control.service.ts that every other concern in the file depended on. They have
 * no dependencies of their own, which is what makes them the first block that can move.
 */

import { BadRequestException } from '@nestjs/common';
import { isRecord } from '../../../common/object-guards';


/** Targeting fields the options endpoint accepts, and the cap on how many it returns. */
export const TARGETING_OPTION_FIELDS = new Set(['status', 'priority', 'type', 'category', 'entity', 'group', 'technician']);
export const MONITORING_TARGETING_OPTION_FIELDS = new Set(['status', 'severity', 'ack_state', 'group', 'device', 'check_type']);
export const TARGETING_OPTIONS_MAX_LIMIT = 50;

export type AgentControlTargetingOptionField = 'status' | 'priority' | 'type' | 'category' | 'entity' | 'group' | 'technician';
// Monitoring flavor served through the same targeting-options endpoint for SRE
// definitions: enum fields resolve from describeReferenceEnums, catalog fields
// (group/device/check_type) from searchReferenceCatalog on the bound provider.
export type AgentControlMonitoringTargetingOptionField = 'status' | 'severity' | 'ack_state' | 'group' | 'device' | 'check_type';

export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function trimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Operator input for a manual agent run on a ticket: '64', '#64' and 'ticket:64' are all
// accepted. Wildcards are rejected up front (the work-item table forbids them by constraint).
export function manualTicketRef(value: unknown): string | null {
  const raw = trimmedString(value) ?? '';
  const stripped = raw.replace(/^ticket:/i, '').replace(/^#/, '').trim();
  if (!stripped || stripped.includes('*')) return null;
  return stripped;
}

export function approvalDecisionReason(value: unknown, fallback: string): string {
  const trimmed = trimmedString(value);
  if (!trimmed) return fallback;
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

export function cleanTargetingOptionField(value: unknown): AgentControlTargetingOptionField {
  const field = trimmedString(value)?.toLowerCase();
  if (!field || !TARGETING_OPTION_FIELDS.has(field)) {
    throw new BadRequestException('Unsupported targeting option field.');
  }
  return field as AgentControlTargetingOptionField;
}

export function cleanMonitoringTargetingOptionField(value: unknown): AgentControlMonitoringTargetingOptionField {
  const field = trimmedString(value)?.toLowerCase();
  if (!field || !MONITORING_TARGETING_OPTION_FIELDS.has(field)) {
    throw new BadRequestException('Unsupported targeting option field.');
  }
  return field as AgentControlMonitoringTargetingOptionField;
}

export function cleanTargetingOptionLimit(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return 20;
  }
  return Math.max(1, Math.min(Math.floor(parsed), TARGETING_OPTIONS_MAX_LIMIT));
}

export function cleanTargetingOptionQuery(value: unknown): string {
  const raw = trimmedString(value);
  return raw ? raw.slice(0, 120) : '';
}

export function providerKeyFromBindings(
  bindings: Record<string, unknown> | null | undefined,
  kind: string,
): string | null {
  if (!bindings) return null;
  const entry = bindings[kind];
  if (!isRecord(entry)) return null;
  return typeof entry.provider_key === 'string' && entry.provider_key.trim()
    ? entry.provider_key.trim()
    : null;
}

export function adapterData<T>(value: unknown): T | null {
  if (!isRecord(value) || value.ok !== true || !('data' in value)) {
    return null;
  }
  return value.data as T;
}

export function adapterFailureMessage(value: unknown): string | null {
  if (!isRecord(value) || value.ok !== false) {
    return null;
  }
  return typeof value.message === 'string' && value.message.trim().length > 0
    ? value.message.trim()
    : 'Provider request failed.';
}

export function safeLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value as number)));
}

export function clampText(value: string | null | undefined, max: number): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

export function stripHeadlineTags(value: string | null | undefined): string {
  return clampText(String(value ?? '').replace(/<\/?b>/g, ''), 280);
}
