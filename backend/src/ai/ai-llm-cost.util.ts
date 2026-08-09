// Shared LLM cost math for the model registry (PR 2 of the AI model registry
// plan). Replaces the flat TOKEN_COST_EUR constant that was duplicated across
// every LLM stage service and priced all models — including free local ones —
// at the same made-up rate.
//
// Prices are €/Mtok as stored on the resolved model. A model with no prices
// (or 0/0 — local, self-hosted, or the platform builtin) costs 0: cost caps
// then never trigger for it, and the token caps remain the protection.

export type LlmTokenPrices = {
  priceInputEurPerMtok: number | null;
  priceOutputEurPerMtok: number | null;
};

export function llmCostEur(
  inputTokens: number,
  outputTokens: number,
  prices: LlmTokenPrices | null | undefined,
): number {
  const priceIn = prices?.priceInputEurPerMtok ?? 0;
  const priceOut = prices?.priceOutputEurPerMtok ?? 0;
  if (priceIn <= 0 && priceOut <= 0) return 0;
  const cost = (Math.max(0, inputTokens) * Math.max(0, priceIn)
    + Math.max(0, outputTokens) * Math.max(0, priceOut)) / 1_000_000;
  return Number(cost.toFixed(6));
}
