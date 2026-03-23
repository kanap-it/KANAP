import { z } from 'zod';
import type { TFunction } from 'i18next';
import { STATUS_DISABLED, STATUS_ENABLED, STATUS_VALUES, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../constants/status';

const optStr = (schema = z.string()) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    const result = schema.safeParse(v);
    return result.success ? result.data : null;
  }, z.string().nullable());

const optDateTime = () =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    return typeof v === 'string' ? v : null;
  }, z.string().datetime().nullable());

export function createSupplierFormSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('master-data:formSchemas.supplier.nameRequired')),
    erp_supplier_id: optStr(),
    notes: optStr(),
    status: z.enum(STATUS_VALUES).default(STATUS_ENABLED),
    disabled_at: optDateTime(),
  });
}

/** @deprecated Use createSupplierFormSchema(t) for i18n support */
export const supplierFormSchema = createSupplierFormSchema(((key: string) => key) as unknown as TFunction);

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
export type SupplierInput = {
  name: string;
  erp_supplier_id?: string | null;
  notes?: string | null;
  status: StatusValue;
  disabled_at?: string | null;
};

function normalizeEmptyToNull<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === '') out[k] = null;
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = normalizeEmptyToNull(v as any);
    else out[k] = v;
  });
  return out;
}

// Note: UI form removed; this file now only exports schema and types.
// Keep normalizeEmptyToNull exported for potential reuse.
export { normalizeEmptyToNull };
