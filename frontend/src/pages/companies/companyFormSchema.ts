import { z } from 'zod';
import { STATUS_ENABLED, STATUS_VALUES, StatusValue } from '../../constants/status';

const optionalString = (schema = z.string()) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    const result = schema.safeParse(v);
    return result.success ? result.data : null;
  }, z.string().nullable());

const optionalDateTime = () =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    return typeof v === 'string' ? v : null;
  }, z.string().datetime().nullable());

export const companyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  coa_id: optionalString(),
  country_iso: z.preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.string().min(1, 'Country ISO is required').length(2, 'Country ISO must be 2 letters'),
  ),
  city: z.string().min(1, 'City is required'),
  postal_code: optionalString(),
  address1: optionalString(),
  address2: optionalString(),
  reg_number: optionalString(),
  vat_number: optionalString(),
  state: optionalString(),
  base_currency: z.preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z
      .string()
      .min(1, 'Base currency is required')
      .length(3, 'Currency code must be 3 letters'),
  ),
  status: z.enum(STATUS_VALUES).default(STATUS_ENABLED),
  disabled_at: optionalDateTime(),
  notes: optionalString(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export type CompanyInput = {
  name: string;
  coa_id?: string | null;
  country_iso: string;
  city?: string | null;
  postal_code?: string | null;
  address1?: string | null;
  address2?: string | null;
  reg_number?: string | null;
  vat_number?: string | null;
  state?: string | null;
  base_currency: string;
  status: StatusValue;
  disabled_at?: string | null;
  notes?: string | null;
};

export function normalizeEmptyToNull<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === '') out[k] = null;
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = normalizeEmptyToNull(v as any);
    else out[k] = v;
  });
  return out;
}
