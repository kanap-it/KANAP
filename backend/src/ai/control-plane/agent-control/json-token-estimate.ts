/**
 * Token estimate for a JSON payload handed to an LLM stage.
 *
 * This has to be one function: it defines a budgeting contract shared by the agentic
 * stages, and the margin comment that lived on each of the six former copies said so
 * ("keep the margin aligned with synthesis") — a single tuning change had to be applied
 * six times, and a missed copy silently changed what a prompt was allowed to carry.
 *
 * 3.5 chars per token rather than 4: multilingual text plus JSON overhead undercounts at
 * /4. That is deliberately different from the rougher `Math.ceil(text.length / 4)` used by
 * ai-context-budget.helper.ts for plain text, so the two are not interchangeable.
 */
export function estimateJsonTokens(value: unknown): number {
  return Math.max(1, Math.ceil(JSON.stringify(value ?? {}).length / 3.5));
}
