import { BadRequestException } from '@nestjs/common';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';

export type ProviderBinding = {
  providerKind: string;
  providerKey: string;
  connectionKey: string;
};

export type MonitoringBinding = {
  providerKind: 'monitoring';
  providerKey: string;
  connectionKey: string;
};

export type ProviderBindingSource = Pick<AiAgentDefinition, 'provider_bindings_json'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Keep in sync with the frontend mirror in
// frontend/src/components/agents/agentControlPrimitives.tsx
// (providerBindingForDefinition) — same rejection semantics: a binding only
// resolves when provider_bindings_json[kind] carries a matching provider_kind
// and a non-empty provider_key; anything missing or malformed fails closed.
// There is deliberately no legacy scope_policy fallback here — ticketing keeps
// its own fallback in ticketing-binding.ts (resolveTicketingBinding).
export function resolveProviderBinding(definition: ProviderBindingSource, kind: string): ProviderBinding | null {
  const bindings = isRecord(definition.provider_bindings_json) ? definition.provider_bindings_json : {};
  const rawBinding = bindings[kind];
  const binding = isRecord(rawBinding) ? rawBinding : {};
  const providerKind = stringValue(binding.provider_kind) ?? kind;
  const providerKey = stringValue(binding.provider_key);
  if (providerKind === kind && providerKey) {
    const connectionKey = stringValue(binding.connection_id ?? binding.connectionId) ?? providerKey;
    return { providerKind, providerKey, connectionKey };
  }
  return null;
}

export function resolveMonitoringBinding(definition: ProviderBindingSource): MonitoringBinding | null {
  const binding = resolveProviderBinding(definition, 'monitoring');
  if (!binding) {
    return null;
  }
  return { providerKind: 'monitoring', providerKey: binding.providerKey, connectionKey: binding.connectionKey };
}

export function requireMonitoringBinding(
  definition: ProviderBindingSource,
  message = 'Agent has no monitoring provider binding.',
): MonitoringBinding {
  const binding = resolveMonitoringBinding(definition);
  if (!binding) {
    throw new BadRequestException(message);
  }
  return binding;
}
