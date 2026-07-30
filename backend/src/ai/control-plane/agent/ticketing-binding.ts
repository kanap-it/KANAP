import { BadRequestException } from '@nestjs/common';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';
import { resolveProviderBinding } from './provider-binding';

export type TicketingBinding = {
  providerKind: 'ticketing';
  providerKey: string;
  connectionKey: string;
};

type TicketingBindingSource = Pick<AiAgentDefinition, 'provider_bindings_json'> & Partial<Pick<AiAgentDefinition, 'scope_policy_json'>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Keep in sync with the frontend mirror in
// frontend/src/components/agents/agentControlPrimitives.tsx
// (ticketingProviderKeyForDefinition) — the UI derives the same provider key
// to decide which actions to enable.
export function resolveTicketingBinding(definition: TicketingBindingSource): TicketingBinding | null {
  // The provider_bindings_json branch is the generic resolution shared by every
  // provider kind; only the legacy scope_policy fallback below is ticketing-specific.
  const bound = resolveProviderBinding(definition, 'ticketing');
  if (bound) {
    return { providerKind: 'ticketing', providerKey: bound.providerKey, connectionKey: bound.connectionKey };
  }

  const scopePolicy = isRecord(definition.scope_policy_json) ? definition.scope_policy_json : {};
  const scopeProviderKind = stringValue(scopePolicy.provider_kind) ?? 'ticketing';
  const scopeProviderKey = stringValue(scopePolicy.provider_key);
  const targetKind = stringValue(scopePolicy.target_kind);
  if (scopeProviderKind !== 'ticketing' || !scopeProviderKey || (targetKind && targetKind !== 'ticket')) {
    return null;
  }
  return { providerKind: 'ticketing', providerKey: scopeProviderKey, connectionKey: scopeProviderKey };
}

export function requireTicketingBinding(
  definition: TicketingBindingSource,
  message = 'Agent has no ticketing provider binding.',
): TicketingBinding {
  const binding = resolveTicketingBinding(definition);
  if (!binding) {
    throw new BadRequestException(message);
  }
  return binding;
}
