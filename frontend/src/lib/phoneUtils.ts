const DIAL_PREFIX = /^(\+|00)\d{1,4}/;

// Normalize any user-entered dial code to the +<digits> format
export function normalizeDialCode(input: string | null | undefined): string | null {
  const raw = (input || '').toString().trim();
  if (!raw) return null;
  const numeric = raw.replace(/[^+\d]/g, '');
  if (!numeric) return null;
  const withPlus = numeric.startsWith('+') ? numeric : `+${numeric.replace(/^0+/, '')}`;
  return withPlus === '+' ? null : withPlus;
}

// Split a full phone string into dial code and the remaining local number
export function splitPhone(input: string | null | undefined): { code: string | null; rest: string } {
  const raw = (input || '').toString().trim();
  const match = DIAL_PREFIX.exec(raw);
  if (!match) return { code: null, rest: raw };
  const rawCode = match[0];
  const code = rawCode.startsWith('00') ? `+${rawCode.slice(2)}` : rawCode;
  const rest = raw.slice(rawCode.length).trim();
  return { code, rest };
}

// Combine a dial code with a local number, omitting empty parts
export function combineDialCode(code: string | null | undefined, rest: string | null | undefined): string {
  const normalizedCode = normalizeDialCode(code);
  const local = (rest || '').toString().trim();
  if (normalizedCode && local) return `${normalizedCode} ${local}`.trim();
  if (normalizedCode) return normalizedCode;
  return local;
}

// Replace any existing dial prefix in the current value with the provided code
export function replaceDialCode(currentValue: string | null | undefined, code: string | null | undefined): string {
  const { rest } = splitPhone(currentValue);
  return combineDialCode(code, rest);
}

const DIAL_CODE_TO_ISO: Record<string, string> = {
  '+1': 'US',
  '+20': 'EG',
  '+27': 'ZA',
  '+30': 'GR',
  '+31': 'NL',
  '+32': 'BE',
  '+33': 'FR',
  '+34': 'ES',
  '+36': 'HU',
  '+39': 'IT',
  '+40': 'RO',
  '+41': 'CH',
  '+43': 'AT',
  '+44': 'GB',
  '+45': 'DK',
  '+46': 'SE',
  '+47': 'NO',
  '+48': 'PL',
  '+49': 'DE',
  '+51': 'PE',
  '+52': 'MX',
  '+53': 'CU',
  '+54': 'AR',
  '+55': 'BR',
  '+56': 'CL',
  '+57': 'CO',
  '+58': 'VE',
  '+60': 'MY',
  '+61': 'AU',
  '+62': 'ID',
  '+63': 'PH',
  '+64': 'NZ',
  '+65': 'SG',
  '+66': 'TH',
  '+81': 'JP',
  '+82': 'KR',
  '+84': 'VN',
  '+86': 'CN',
  '+90': 'TR',
  '+91': 'IN',
  '+92': 'PK',
  '+93': 'AF',
  '+94': 'LK',
  '+95': 'MM',
  '+98': 'IR',
  '+351': 'PT',
  '+352': 'LU',
  '+353': 'IE',
  '+354': 'IS',
  '+355': 'AL',
  '+356': 'MT',
  '+357': 'CY',
  '+358': 'FI',
  '+359': 'BG',
  '+370': 'LT',
  '+371': 'LV',
  '+372': 'EE',
  '+373': 'MD',
  '+374': 'AM',
  '+375': 'BY',
  '+376': 'AD',
  '+377': 'MC',
  '+378': 'SM',
  '+380': 'UA',
  '+381': 'RS',
  '+382': 'ME',
  '+383': 'XK',
  '+385': 'HR',
  '+386': 'SI',
  '+387': 'BA',
  '+389': 'MK',
  '+420': 'CZ',
  '+421': 'SK',
  '+423': 'LI',
};

export function guessCountryFromDialCode(code: string | null | undefined): string | null {
  const normalized = normalizeDialCode(code);
  if (!normalized) return null;
  return DIAL_CODE_TO_ISO[normalized] || null;
}
