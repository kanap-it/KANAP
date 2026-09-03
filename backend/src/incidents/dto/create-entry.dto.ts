import { z } from 'zod';
import { DateTimeString, parseWith } from './parse';

/**
 * Journal note. Kind is always `note`; other kinds are created by the services.
 */
export const CreateEntrySchema = z.object({
  content: z.string().trim().min(1, 'Content is required'),
  occurred_at: DateTimeString.optional(),
});

export type CreateEntryInput = z.input<typeof CreateEntrySchema>;
export type CreateEntryDto = z.output<typeof CreateEntrySchema>;

export function parseCreateEntry(input: unknown): CreateEntryDto {
  return parseWith(CreateEntrySchema, input);
}
