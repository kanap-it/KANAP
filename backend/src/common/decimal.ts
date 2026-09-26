/**
 * Exact decimal arithmetic for money, on bigint.
 *
 * A `Decimal` holds its value as an integer count of 10^-20 units, so
 * quantity × price × days and indexation never go through binary floating
 * point. The scale is fixed and wide enough for a product to stay exact:
 * days (1 decimal) × quantity (3) × unit price (4) × (1 + index / 100) with a
 * 4-decimal index (6) needs 14 fractional digits. Inputs with more than 20
 * fractional digits are refused instead of being silently rounded.
 *
 * A product that would need more than 20 digits is rescaled half away from
 * zero; money is rounded to cents once, by `toCents()`, at the point the
 * caller documents.
 */

export const DECIMAL_SCALE_DIGITS = 20;
const SCALE = 10n ** BigInt(DECIMAL_SCALE_DIGITS);

// Exponents beyond this bound are refused: `String(number)` never goes past
// ±324, and a huge exponent would make the bigint power explode.
const MAX_EXPONENT = 400;

const LITERAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

/**
 * Parse a decimal literal into `mantissa / 10^scale` (scale may be negative).
 * Numbers are read through `String(value)`, their shortest round-trip form, so
 * `1.005` is the decimal 1.005 and not the binary double just below it.
 * Accepts whitespace and `_` as digit group separators and a comma as the
 * decimal separator.
 */
export function parseDecimalLiteral(value: string | number | bigint): { mantissa: bigint; scale: number } {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`Invalid amount: '${value}'`);
  }
  const raw = String(value);
  const sanitized = raw.trim().replace(/\s+/g, '').replace(/_/g, '').replace(/,/g, '.');
  const match = LITERAL.exec(sanitized);
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new Error(`Invalid amount: '${raw}'`);
  }
  const [, sign, intDigits, fracDigits = '', expDigits] = match;
  const exponent = expDigits == null ? 0 : Number(expDigits);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_EXPONENT) {
    throw new Error(`Invalid amount: '${raw}'`);
  }
  const digits = BigInt(`${intDigits}${fracDigits}` || '0');
  return { mantissa: sign === '-' ? -digits : digits, scale: fracDigits.length - exponent };
}

/** Integer division rounded half away from zero (divisor > 0). */
export function divRoundHalfAway(numerator: bigint, divisor: bigint): bigint {
  const quotient = numerator / divisor;
  const remainder = numerator % divisor;
  const twice = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twice < divisor) return quotient;
  return numerator < 0n ? quotient - 1n : quotient + 1n;
}

/** Express `mantissa / 10^scale` in units of 10^-target, rounding half away from zero. */
export function rescale(mantissa: bigint, scale: number, target: number): bigint {
  if (scale <= target) return mantissa * 10n ** BigInt(target - scale);
  return divRoundHalfAway(mantissa, 10n ** BigInt(scale - target));
}

export class Decimal {
  private constructor(readonly units: bigint) {}

  static readonly ZERO = new Decimal(0n);

  /** Exact value of a decimal literal; more than 20 significant fractional digits are refused. */
  static from(value: string | number | bigint | Decimal): Decimal {
    if (value instanceof Decimal) return value;
    const { mantissa, scale } = parseDecimalLiteral(value);
    if (scale > DECIMAL_SCALE_DIGITS && mantissa % 10n ** BigInt(scale - DECIMAL_SCALE_DIGITS) !== 0n) {
      throw new Error(`Invalid amount: '${String(value)}' has more than ${DECIMAL_SCALE_DIGITS} decimals`);
    }
    return new Decimal(rescale(mantissa, scale, DECIMAL_SCALE_DIGITS));
  }

  static fromCents(cents: bigint): Decimal {
    return new Decimal(cents * 10n ** BigInt(DECIMAL_SCALE_DIGITS - 2));
  }

  add(other: string | number | bigint | Decimal): Decimal {
    return new Decimal(this.units + Decimal.from(other).units);
  }

  sub(other: string | number | bigint | Decimal): Decimal {
    return new Decimal(this.units - Decimal.from(other).units);
  }

  mul(other: string | number | bigint | Decimal): Decimal {
    return new Decimal(divRoundHalfAway(this.units * Decimal.from(other).units, SCALE));
  }

  /** `this × (1 + pct / 100)`: an index or a price increase of `pct` percent. */
  withPct(pct: string | number | bigint | Decimal): Decimal {
    const factor = 100n * SCALE + Decimal.from(pct).units;
    return new Decimal(divRoundHalfAway(this.units * factor, 100n * SCALE));
  }

  /** The value in cents, rounded half away from zero. */
  toCents(): bigint {
    return divRoundHalfAway(this.units, 10n ** BigInt(DECIMAL_SCALE_DIGITS - 2));
  }

  /** Plain decimal notation without trailing zeros, e.g. `612`, `-0.005`. */
  toString(): string {
    const negative = this.units < 0n;
    const digits = (negative ? -this.units : this.units).toString().padStart(DECIMAL_SCALE_DIGITS + 1, '0');
    const intPart = digits.slice(0, -DECIMAL_SCALE_DIGITS);
    const fracPart = digits.slice(-DECIMAL_SCALE_DIGITS).replace(/0+$/, '');
    const text = fracPart ? `${intPart}.${fracPart}` : intPart;
    return negative ? `-${text}` : text;
  }
}
