import { csv as ifrsV1 } from './ifrs-v1';
import { csv as ifrsV2 } from './ifrs-v2';
import { csv as frPcgV1 } from './fr-pcg-v1';
import { csv as frPcgV2 } from './fr-pcg-v2';
import { csv as deSkr03V1 } from './de-skr03-v1';
import { csv as deSkr03V2 } from './de-skr03-v2';
import { csv as gbUkgaapV1 } from './gb-ukgaap-v1';
import { csv as gbUkgaapV2 } from './gb-ukgaap-v2';
import { csv as esPgcV1 } from './es-pgc-v1';
import { csv as esPgcV2 } from './es-pgc-v2';
import { csv as itPdcV1 } from './it-pdc-v1';
import { csv as itPdcV2 } from './it-pdc-v2';
import { csv as nlRgsV1 } from './nl-rgs-v1';
import { csv as nlRgsV2 } from './nl-rgs-v2';
import { csv as bePcmnV1 } from './be-pcmn-v1';
import { csv as bePcmnV2 } from './be-pcmn-v2';
import { csv as chKmuV1 } from './ch-kmu-v1';
import { csv as chKmuV2 } from './ch-kmu-v2';
import { csv as usUsgaapV1 } from './us-usgaap-v1';
import { csv as usUsgaapV2 } from './us-usgaap-v2';

export interface TemplateDefinition {
  country_iso: string | null;
  template_code: string;
  template_name: string;
  version: string;
  is_global: boolean;
  loaded_by_default: boolean;
  csv: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  // IFRS (Global)
  { country_iso: null, template_code: 'IFRS',      template_name: 'IFRS',                                    version: '1.0', is_global: true,  loaded_by_default: true,  csv: ifrsV1 },
  { country_iso: null, template_code: 'IFRS',      template_name: 'IFRS',                                    version: '2.0', is_global: true,  loaded_by_default: false, csv: ifrsV2 },
  // France
  { country_iso: 'FR', template_code: 'FR-PCG',    template_name: 'Plan Comptable General',                  version: '1.0', is_global: false, loaded_by_default: false, csv: frPcgV1 },
  { country_iso: 'FR', template_code: 'FR-PCG',    template_name: 'Plan Comptable General',                  version: '2.0', is_global: false, loaded_by_default: false, csv: frPcgV2 },
  // Germany
  { country_iso: 'DE', template_code: 'DE-SKR03',  template_name: 'Standardkontenrahmen 03',                 version: '1.0', is_global: false, loaded_by_default: false, csv: deSkr03V1 },
  { country_iso: 'DE', template_code: 'DE-SKR03',  template_name: 'Standardkontenrahmen 03',                 version: '2.0', is_global: false, loaded_by_default: false, csv: deSkr03V2 },
  // United Kingdom
  { country_iso: 'GB', template_code: 'GB-UKGAAP', template_name: 'UK GAAP',                                 version: '1.0', is_global: false, loaded_by_default: false, csv: gbUkgaapV1 },
  { country_iso: 'GB', template_code: 'GB-UKGAAP', template_name: 'UK GAAP',                                 version: '2.0', is_global: false, loaded_by_default: false, csv: gbUkgaapV2 },
  // Spain
  { country_iso: 'ES', template_code: 'ES-PGC',    template_name: 'Plan General de Contabilidad',            version: '1.0', is_global: false, loaded_by_default: false, csv: esPgcV1 },
  { country_iso: 'ES', template_code: 'ES-PGC',    template_name: 'Plan General de Contabilidad',            version: '2.0', is_global: false, loaded_by_default: false, csv: esPgcV2 },
  // Italy
  { country_iso: 'IT', template_code: 'IT-PDC',    template_name: 'Piano dei Conti',                         version: '1.0', is_global: false, loaded_by_default: false, csv: itPdcV1 },
  { country_iso: 'IT', template_code: 'IT-PDC',    template_name: 'Piano dei Conti',                         version: '2.0', is_global: false, loaded_by_default: false, csv: itPdcV2 },
  // Netherlands
  { country_iso: 'NL', template_code: 'NL-RGS',    template_name: 'Rekeningschema (RGS)',                    version: '1.0', is_global: false, loaded_by_default: false, csv: nlRgsV1 },
  { country_iso: 'NL', template_code: 'NL-RGS',    template_name: 'Rekeningschema (RGS)',                    version: '2.0', is_global: false, loaded_by_default: false, csv: nlRgsV2 },
  // Belgium
  { country_iso: 'BE', template_code: 'BE-PCMN',   template_name: 'Plan Comptable Minimum Normalise',        version: '1.0', is_global: false, loaded_by_default: false, csv: bePcmnV1 },
  { country_iso: 'BE', template_code: 'BE-PCMN',   template_name: 'Plan Comptable Minimum Normalise',        version: '2.0', is_global: false, loaded_by_default: false, csv: bePcmnV2 },
  // Switzerland
  { country_iso: 'CH', template_code: 'CH-KMU',    template_name: 'Kontenrahmen KMU',                        version: '1.0', is_global: false, loaded_by_default: false, csv: chKmuV1 },
  { country_iso: 'CH', template_code: 'CH-KMU',    template_name: 'Kontenrahmen KMU',                        version: '2.0', is_global: false, loaded_by_default: false, csv: chKmuV2 },
  // United States
  { country_iso: 'US', template_code: 'US-USGAAP', template_name: 'US GAAP',                                 version: '1.0', is_global: false, loaded_by_default: false, csv: usUsgaapV1 },
  { country_iso: 'US', template_code: 'US-USGAAP', template_name: 'US GAAP',                                 version: '2.0', is_global: false, loaded_by_default: false, csv: usUsgaapV2 },
];
