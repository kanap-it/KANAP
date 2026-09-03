import { z } from 'zod';
import { parseWith } from './parse';

/**
 * Mandatory reason for reopen / cancel.
 */
export const IncidentReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required'),
});

export type IncidentReasonInput = z.input<typeof IncidentReasonSchema>;
export type IncidentReasonDto = z.output<typeof IncidentReasonSchema>;

export function parseIncidentReason(input: unknown): IncidentReasonDto {
  return parseWith(IncidentReasonSchema, input);
}
