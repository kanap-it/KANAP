import { z } from 'zod';
import type { TFunction } from 'i18next';

const optStr = <T extends z.ZodTypeAny>(schema: T = z.string() as unknown as T) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    const result = schema.safeParse(v);
    return result.success ? result.data : null;
  }, schema.nullable());

const e164Regex = /^\+?[1-9]\d{6,14}$/; // simple E.164 check (7-15 digits, optional leading +)

export const SUPPLIER_CONTACT_ROLE_OPTIONS = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'technical', label: 'Technical' },
  { value: 'support', label: 'Support' },
  { value: 'other', label: 'Other' },
] as const;

export function createContactFormSchema(t: TFunction) {
  return z.object({
    first_name: optStr(z.string().max(200)),
    last_name: optStr(z.string().max(200)),
    job_title: optStr(z.string().max(200)),
    email: z.string().email(t('master-data:formSchemas.contact.emailRequired')).max(320),
    phone: optStr(z.string().max(100)).refine((v) => !v || e164Regex.test(v.replace(/\s+/g, '')), {
      message: t('master-data:formSchemas.contact.invalidPhone'),
    }),
    mobile: optStr(z.string().max(100)).refine((v) => !v || e164Regex.test(v.replace(/\s+/g, '')), {
      message: t('master-data:formSchemas.contact.invalidMobile'),
    }),
    country: optStr(z.string().length(2, t('master-data:formSchemas.contact.countryCodeLength'))),
    supplier_id: optStr(z.string().uuid()),
    supplier_role: optStr(z.enum(['commercial', 'technical', 'support', 'other'])),
    notes: optStr(z.string().max(2000)),
    active: z.boolean().default(true),
  }).superRefine((values, ctx) => {
    if (values.supplier_id && !values.supplier_role) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('master-data:formSchemas.contact.selectContactType'), path: ['supplier_role'] });
    }
    if (values.supplier_role && !values.supplier_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('master-data:formSchemas.contact.chooseSupplier'), path: ['supplier_id'] });
    }
  });
}

/** @deprecated Use createContactFormSchema(t) for i18n support */
export const contactFormSchema = createContactFormSchema(((key: string) => key) as unknown as TFunction);

export type ContactFormValues = z.infer<typeof contactFormSchema>;
