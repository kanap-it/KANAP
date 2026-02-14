export type NormalisedPrice = {
  currency: string | null;
  billingScheme: string | null;
  tiersMode: string | null;
  unitAmount: number | null;
  tiers: Array<{
    upTo: number | null;
    unitAmount: number | null;
    flatAmount: number | null;
  }>;
};

function parseAmount(unit: any, decimal: any): number | null {
  if (typeof unit === 'number') return unit;
  if (typeof decimal === 'string' && decimal.trim().length) {
    const parsed = Number(decimal);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseUpTo(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value).toLowerCase();
  if (str === 'inf' || str === 'infinity') return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normaliseStripePrice(price: any): NormalisedPrice | null {
  if (!price || typeof price !== 'object') return null;
  const currency = price.currency ? String(price.currency).toUpperCase() : null;
  const billingScheme = price.billing_scheme ? String(price.billing_scheme) : null;
  const tiersMode = price.tiers_mode ? String(price.tiers_mode) : null;
  const unitAmount = parseAmount(price.unit_amount, price.unit_amount_decimal);
  const tiers = Array.isArray(price.tiers)
    ? price.tiers.map((tier: any) => ({
        upTo: parseUpTo(tier?.up_to),
        unitAmount: parseAmount(tier?.unit_amount, tier?.unit_amount_decimal),
        flatAmount: parseAmount(tier?.flat_amount, tier?.flat_amount_decimal),
      }))
    : [];

  return {
    currency,
    billingScheme,
    tiersMode,
    unitAmount,
    tiers,
  };
}

function selectVolumeTier(tiers: NormalisedPrice['tiers'], quantity: number): NormalisedPrice['tiers'][number] | null {
  if (!tiers.length) return null;
  for (const tier of tiers) {
    if (tier.upTo == null || quantity <= tier.upTo) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
}

function computeVolumeAmount(tiers: NormalisedPrice['tiers'], quantity: number): number | null {
  const tier = selectVolumeTier(tiers, quantity);
  if (!tier) return null;
  if (tier.unitAmount != null) return tier.unitAmount * quantity;
  if (tier.flatAmount != null) return tier.flatAmount;
  return null;
}

function computeGraduatedAmount(tiers: NormalisedPrice['tiers'], quantity: number): number | null {
  if (!tiers.length) return null;
  const ordered = [...tiers].sort((a, b) => {
    if (a.upTo == null && b.upTo == null) return 0;
    if (a.upTo == null) return 1;
    if (b.upTo == null) return -1;
    return a.upTo - b.upTo;
  });

  let remaining = quantity;
  let consumed = 0;
  let total = 0;

  for (const tier of ordered) {
    if (remaining <= 0) break;
    const limit = tier.upTo ?? Infinity;
    const upperBound = limit === Infinity ? Infinity : limit;
    const capacity = upperBound === Infinity ? remaining : Math.max(0, Math.min(remaining, upperBound - consumed));
    const applicable = upperBound === Infinity ? remaining : Math.min(remaining, capacity);
    if (applicable <= 0) {
      consumed = limit;
      continue;
    }
    if (tier.unitAmount != null) {
      total += tier.unitAmount * applicable;
    } else if (tier.flatAmount != null) {
      total += tier.flatAmount;
    } else {
      return null;
    }
    remaining -= applicable;
    consumed = limit === Infinity ? consumed + applicable : limit;
  }

  if (remaining > 0) {
    const lastTier = ordered[ordered.length - 1];
    if (lastTier.unitAmount != null) {
      total += lastTier.unitAmount * remaining;
    } else if (lastTier.flatAmount != null) {
      total += lastTier.flatAmount;
    } else {
      return null;
    }
  }

  return total;
}

export function computePriceAmount(price: NormalisedPrice, quantity: number): number | null {
  const seats = Math.max(0, Math.floor(quantity));
  if (!price.currency) return null;
  if (seats === 0) return 0;

  if (price.billingScheme === 'tiered') {
    if (price.tiersMode === 'volume') {
      return computeVolumeAmount(price.tiers, seats);
    }
    if (price.tiersMode === 'graduated') {
      return computeGraduatedAmount(price.tiers, seats);
    }
    // Unknown tiers_mode: fall back to volume interpretation
    const volumeAmount = computeVolumeAmount(price.tiers, seats);
    if (volumeAmount != null) return volumeAmount;
  }

  if (price.unitAmount != null) {
    return price.unitAmount * seats;
  }

  if (price.tiers.length) {
    const fallback = computeVolumeAmount(price.tiers, seats);
    if (fallback != null) return fallback;
  }

  return null;
}

export function computeStripePriceAmount(price: any, quantity: number): { amount: number | null; currency: string | null } {
  const normalised = normaliseStripePrice(price);
  if (!normalised) {
    return { amount: null, currency: null };
  }
  const amount = computePriceAmount(normalised, quantity);
  return { amount, currency: normalised.currency };
}
