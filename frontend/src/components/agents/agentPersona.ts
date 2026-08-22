// The ONE user-facing instructions limit: total characters across all
// paragraphs (mirrors normalizePersona). Per-line length and line count are
// deliberately unbounded — the cap maps to real prompt truncation.
export const MAX_PERSONA_INSTRUCTIONS_TOTAL_CHARS = 10_000;
export const MAX_PERSONA_PURPOSE_CHARS = 500;
// Counters stay hidden until the text approaches its limit: a gauge nobody is
// close to is noise, not information.
export const INSTRUCTIONS_HINT_THRESHOLD = Math.floor(MAX_PERSONA_INSTRUCTIONS_TOTAL_CHARS * 0.8);
export const PURPOSE_HINT_THRESHOLD = Math.floor(MAX_PERSONA_PURPOSE_CHARS * 0.8);

export function cleanPersonaLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseInstructionLines(draft: string): string[] {
  return draft.split('\n').map(cleanPersonaLine).filter(Boolean);
}

export function mergeInstructionsForDisplay(input: {
  instructions: string;
  escalationGuidance: string;
  outputStyleTone: string;
}): string {
  const lines = parseInstructionLines(input.instructions);
  const escalation = cleanPersonaLine(input.escalationGuidance);
  const tone = cleanPersonaLine(input.outputStyleTone);
  if (escalation) lines.push(escalation);
  if (tone) lines.push(tone);
  return lines.join('\n');
}

export type PersonaIdentityLimits = {
  purposeChars: number;
  instructionsChars: number;
  purposeNearLimit: boolean;
  instructionsNearLimit: boolean;
  purposeOverLimit: boolean;
  instructionsOverLimit: boolean;
};

export function measurePersonaIdentityLimits(input: {
  mission: string;
  instructionsDraft: string;
}): PersonaIdentityLimits {
  const purposeChars = cleanPersonaLine(input.mission).length;
  // Sum of the cleaned paragraph lengths — the same measure normalizePersona
  // enforces, so "10 000" means the same thing on both sides.
  const instructionsChars = parseInstructionLines(input.instructionsDraft)
    .reduce((total, line) => total + line.length, 0);
  return {
    purposeChars,
    instructionsChars,
    purposeNearLimit: purposeChars >= PURPOSE_HINT_THRESHOLD,
    instructionsNearLimit: instructionsChars >= INSTRUCTIONS_HINT_THRESHOLD,
    purposeOverLimit: purposeChars > MAX_PERSONA_PURPOSE_CHARS,
    instructionsOverLimit: instructionsChars > MAX_PERSONA_INSTRUCTIONS_TOTAL_CHARS,
  };
}

export function canPersistIdentity(input: {
  mission: string;
  instructionsDraft: string;
  instructionsTouched: boolean;
}): boolean {
  const limits = measurePersonaIdentityLimits(input);
  if (limits.purposeOverLimit) return false;
  if (input.instructionsTouched && limits.instructionsOverLimit) return false;
  return true;
}

export function personaIdentitySavePatch(input: {
  mission: string;
  instructionsStored: string;
  instructionsDraft: string;
  instructionsTouched: boolean;
  escalationGuidance: string;
  outputStyleTone: string;
  outputStyleLanguage: string;
  sharedContextEnabled: boolean;
  sharedContextProfileId: string | null;
}): {
  mission: string;
  instructions: string[];
  output_style: { tone: string; language: string };
  escalation_guidance: string;
  shared_context: { enabled: boolean; profile_id: string | null };
} {
  return {
    mission: input.mission,
    instructions: parseInstructionLines(input.instructionsTouched ? input.instructionsDraft : input.instructionsStored),
    output_style: {
      tone: input.instructionsTouched ? '' : input.outputStyleTone,
      language: input.outputStyleLanguage,
    },
    escalation_guidance: input.instructionsTouched ? '' : input.escalationGuidance,
    shared_context: {
      enabled: input.sharedContextEnabled,
      profile_id: input.sharedContextProfileId,
    },
  };
}

// Budget-clamp tokens carry their drop count (`total_guidance_chars_clamped:kind:N`)
// because bounds_applied is deduplicated across slices; the bare legacy token
// (no count) is read as 1. Across slices we keep the worst case.
function budgetDropCount(entry: string, kind: string): number {
  if (entry === `total_guidance_chars_clamped:${kind}`) return 1;
  const match = entry.match(new RegExp(`^total_guidance_chars_clamped:${kind}:(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

export function droppedSharedContextLineCount(bounds: string[] | undefined | null): number {
  if (!bounds?.length) return 0;
  let fromCap = 0;
  let fromBudget = 0;
  for (const entry of bounds) {
    const match = entry.match(/^shared_context_lines_clamped:(\d+)->(\d+)$/);
    if (match) fromCap = Math.max(fromCap, Number(match[1]) - Number(match[2]));
    fromBudget = Math.max(fromBudget, budgetDropCount(entry, 'shared_context'));
  }
  return fromCap + fromBudget;
}

export function droppedInstructionLineCount(bounds: string[] | undefined | null): number {
  if (!bounds?.length) return 0;
  let fromCap = 0;
  let fromBudget = 0;
  for (const entry of bounds) {
    const match = entry.match(/^instructions_clamped:(\d+)->(\d+)$/);
    if (match) fromCap = Math.max(fromCap, Number(match[1]) - Number(match[2]));
    fromBudget = Math.max(fromBudget, budgetDropCount(entry, 'instructions'));
  }
  return fromCap + fromBudget;
}

// Lines that reach the model, but shortened: the compiler hard-truncates
// shared-context lines at 500 chars and emits one token per affected line.
export function truncatedSharedContextLineCount(bounds: string[] | undefined | null): number {
  if (!bounds?.length) return 0;
  const lines = new Set<number>();
  for (const entry of bounds) {
    const match = entry.match(/^shared_context_line_(\d+)_chars_clamped$/);
    if (match) lines.add(Number(match[1]));
  }
  return lines.size;
}

export function collectEffectivePromptBounds(prompt: {
  bounds_applied?: string[];
  prompt_profile?: Record<string, unknown>;
  tasks?: Partial<Record<string, { bounds_applied?: string[] }>>;
} | null | undefined): string[] {
  const lists: string[][] = [];
  if (Array.isArray(prompt?.bounds_applied)) lists.push(prompt.bounds_applied);
  const profileBounds = prompt?.prompt_profile?.bounds_applied;
  if (Array.isArray(profileBounds)) lists.push(profileBounds as string[]);
  for (const task of Object.values(prompt?.tasks ?? {})) {
    if (Array.isArray(task?.bounds_applied)) lists.push(task.bounds_applied);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (typeof item !== 'string' || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
