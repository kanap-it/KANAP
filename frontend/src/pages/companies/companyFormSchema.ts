import { z } from 'zod';
import type { TFunction } from 'i18next';
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

export function createCompanyFormSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('master-data:formSchemas.company.nameRequired')),
    coa_id: optionalString(),
    country_iso: z.preprocess(
      (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      z.string().min(1, t('master-data:formSchemas.company.countryIsoRequired')).length(2, t('master-data:formSchemas.company.countryIsoLength')),
    ),
    city: z.string().min(1, t('master-data:formSchemas.company.cityRequired')),
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
        .min(1, t('master-data:formSchemas.company.baseCurrencyRequired'))
        .length(3, t('master-data:formSchemas.company.currencyCodeLength')),
    ),
    status: z.enum(STATUS_VALUES).default(STATUS_ENABLED),
    disabled_at: optionalDateTime(),
    notes: optionalString(),
  });
}

/** @deprecated Use createCompanyFormSchema(t) for i18n support */
export const companyFormSchema = createCompanyFormSchema(((key: string) => key) as unknown as TFunction);

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
