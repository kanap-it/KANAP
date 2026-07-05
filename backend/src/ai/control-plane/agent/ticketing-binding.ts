import { BadRequestException } from '@nestjs/common';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';

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
  const bindings = isRecord(definition.provider_bindings_json) ? definition.provider_bindings_json : {};
  const ticketing = isRecord(bindings.ticketing) ? bindings.ticketing : {};
  const providerKind = stringValue(ticketing.provider_kind) ?? 'ticketing';
  const providerKey = stringValue(ticketing.provider_key);
  if (providerKind === 'ticketing' && providerKey) {
    const connectionKey = stringValue(ticketing.connection_id ?? ticketing.connectionId) ?? providerKey;
    return { providerKind, providerKey, connectionKey };
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
