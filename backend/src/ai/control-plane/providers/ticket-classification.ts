import { TicketClassificationContext } from './provider.types';

export function classificationContextWithoutCatalogue(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { options, ...current } = value as Record<string, unknown>;
  return current;
}

export function classificationDriftSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const current = value as Record<string, unknown>;
  return {
    ticketId: current.ticketId ?? null,
    type: current.type ?? null,
    priority: current.priority ?? null,
    urgency: current.urgency ?? null,
    category: current.categoryKey ?? current.category ?? null,
    service: current.service ?? null,
    impact: current.impact ?? null,
  };
}

// Catalogue keys are the write identity. Labels are accepted only for categories;
// current enum labels are resolved too (e.g. "Very high" -> "very_high").
export function resolvePlannerClassificationProposal(
  context: Record<string, unknown> | null,
  action: { proposed?: Record<string, string> },
): { proposed: Record<string, string> | null; reason: string | null } {
  const options = context?.options as TicketClassificationContext['options'];
  const proposed: Record<string, string> = {};
  let valid = 0;
  for (const [field, raw] of Object.entries(action.proposed ?? {})) {
    if (!['type', 'priority', 'urgency', 'category'].includes(field)) continue;
    const catalogue = field === 'category' ? options?.categories : field === 'type' ? options?.types : options?.priorities;
    if (!Array.isArray(catalogue) || typeof raw !== 'string') continue;
    const value = raw.trim();
    const byKey = catalogue.find((item) => item.key === value);
    const byLabel = field === 'category' ? catalogue.filter((item) => item.label.trim().toLowerCase() === value.toLowerCase()) : [];
    const match = byKey ?? (byLabel.length === 1 ? byLabel[0] : null);
    if (!match) continue;
    valid += 1;
    const current = String((field === 'category' ? context?.categoryKey ?? context?.category : context?.[field]) ?? '').trim();
    const currentKey = catalogue.find((item) => item.key === current)?.key
      ?? catalogue.find((item) => item.label.trim().toLowerCase() === current.toLowerCase())?.key;
    if (currentKey !== match.key) proposed[field] = match.key;
  }
  return Object.keys(proposed).length > 0
    ? { proposed, reason: null }
    : { proposed: null, reason: valid ? 'classification_unchanged' : 'classification_field_not_in_catalogue' };
}
