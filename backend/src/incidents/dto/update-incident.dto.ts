import { z } from 'zod';
import { IncidentFieldsSchema } from './create-incident.dto';
import { parseWith } from './parse';

/**
 * Partial update (autosave). Status moves forward only; backward moves go through reopen.
 */
export const UpdateIncidentSchema = IncidentFieldsSchema.partial();

export type UpdateIncidentInput = z.input<typeof UpdateIncidentSchema>;
export type UpdateIncidentDto = z.output<typeof UpdateIncidentSchema>;

export function parseUpdateIncident(input: unknown): UpdateIncidentDto {
  return parseWith(UpdateIncidentSchema, input);
}
