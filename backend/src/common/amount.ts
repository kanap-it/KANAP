export type AmountInput = string | number | bigint | null | undefined;

/**
 * Convert an arbitrary numeric-like input into cents (integer with 2 decimal precision).
 * Values are rounded half-up at the third decimal to avoid floating artifacts.
 */
export function toCents(value: AmountInput): bigint {
  if (value == null) return 0n;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0n;
    return BigInt(Math.round(value * 100));
  }

  const str = value.toString().trim();
  if (str === '') return 0n;

  const sanitized = str
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/,/g, '.');

  // Fast-path: if parsing as number still works safely, reuse Number logic.
  const maybeNumber = Number(sanitized);
  if (Number.isFinite(maybeNumber) && Math.abs(maybeNumber) < Number.MAX_SAFE_INTEGER / 200) {
    return BigInt(Math.round(maybeNumber * 100));
  }

  const neg = sanitized.startsWith('-');
  const unsigned = neg ? sanitized.slice(1) : sanitized;
  const [intPartRaw, decRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const decNormalized = (decRaw + '00').slice(0, 3);
  const major = intPart === '' ? '0' : intPart;
  const centsBase = major + decNormalized.slice(0, 2);
  let cents = BigInt(centsBase || '0');

  const roundingDigit = decNormalized.charCodeAt(2) - 48;
  if (roundingDigit >= 5) cents += 1n;

  return neg ? -cents : cents;
}

export function addCents(current: bigint, value: AmountInput): bigint {
  return current + toCents(value);
}

export function formatCents(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const str = abs.toString().padStart(3, '0');
  const intPart = str.length > 2 ? str.slice(0, -2) : '0';
  const decPart = str.slice(-2);
  const formatted = decPart === '00' ? intPart : `${intPart}.${decPart}`;
  return neg ? `-${formatted}` : formatted;
}

export function formatAmount(value: AmountInput): string {
  return formatCents(toCents(value));
}
