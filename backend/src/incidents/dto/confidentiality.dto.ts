import { z } from 'zod';
import { parseWith } from './parse';

export const IncidentConfidentialitySchema = z.object({
  confidential: z.boolean(),
});

export type IncidentConfidentialityInput = z.input<typeof IncidentConfidentialitySchema>;
export type IncidentConfidentialityDto = z.output<typeof IncidentConfidentialitySchema>;

export function parseIncidentConfidentiality(input: unknown): IncidentConfidentialityDto {
  return parseWith(IncidentConfidentialitySchema, input);
}
