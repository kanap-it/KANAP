import { z } from 'zod';
import { INCIDENT_SEVERITIES } from '../incident.entity';
import { DateTimeString, parseWith } from './parse';

/** Statuses a user can set directly. `cancelled` only through POST /incidents/:id/cancel. */
export const SettableIncidentStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;

const nullableText = z.string().nullable().optional();

/**
 * Editable incident fields, shared by create and update.
 */
export const IncidentFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  category: nullableText,
  severity: z.enum(INCIDENT_SEVERITIES),
  status: z.enum(SettableIncidentStatuses),
  started_at: DateTimeString.nullable(),
  detected_at: DateTimeString,
  resolved_at: DateTimeString.nullable(),
  closed_at: DateTimeString.nullable(),
  reporter_user_id: z.string().uuid().nullable(),
  owner_user_id: z.string().uuid().nullable(),
  description: nullableText,
  impact: nullableText,
  root_cause: nullableText,
  corrective_actions: nullableText,
  lessons_learned: nullableText,
  source_ref: nullableText,
  personal_data_affected: z.boolean(),
  authority_notification_required: z.boolean(),
  authority_notified_at: DateTimeString.nullable(),
  notified_parties: nullableText,
});

export const CreateIncidentSchema = IncidentFieldsSchema.partial().extend({
  title: z.string().trim().min(1, 'Title is required'),
  severity: z.enum(INCIDENT_SEVERITIES),
});

export type CreateIncidentInput = z.input<typeof CreateIncidentSchema>;
export type CreateIncidentDto = z.output<typeof CreateIncidentSchema>;

export function parseCreateIncident(input: unknown): CreateIncidentDto {
  return parseWith(CreateIncidentSchema, input);
}
