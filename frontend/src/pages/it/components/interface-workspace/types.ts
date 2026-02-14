export type InterfaceOwner = {
  id?: string;
  __tid?: string;
  user_id: string;
  owner_type: 'business' | 'it';
};

export type InterfaceCompany = {
  id?: string;
  company_id: string;
};

export type InterfaceDependency = {
  id?: string;
  related_interface_id: string;
  direction: 'upstream' | 'downstream';
};

export type InterfaceKeyIdentifier = {
  id?: string;
  source_identifier: string;
  destination_identifier: string;
  identifier_notes?: string | null;
};

export type InterfaceDataResidency = {
  id?: string;
  country_iso: string;
};

export type InterfaceLink = {
  id: string;
  kind: string;
  description: string | null;
  url: string;
};

export type InterfaceAttachment = {
  id: string;
  kind: string;
  original_filename: string;
  size: number;
  uploaded_at: string;
};

export type InterfaceLeg = {
  id: string;
  interface_id: string;
  leg_type: 'extract' | 'transform' | 'load' | 'direct';
  from_role: string;
  to_role: string;
  trigger_type: string;
  integration_pattern: string;
  data_format: string;
  job_name: string | null;
  order_index: number;
};

export type InterfaceOption = {
  id: string;
  name: string;
  interface_id?: string;
};

export type ApplicationOption = {
  id: string;
  name: string;
  lifecycle: string;
  criticality: string;
};

export type InterfaceDetail = {
  id: string;
  interface_id: string;
  name: string;
  business_process_id: string | null;
  business_purpose: string;
  source_application_id: string;
  target_application_id: string;
  data_category: string;
  integration_route_type: 'direct' | 'via_middleware';
  lifecycle: string;
  overview_notes: string | null;
  criticality: string;
  impact_of_failure: string | null;
  business_objects: any | null;
  main_use_cases: string | null;
  functional_rules: string | null;
  core_transformations_summary: string | null;
  error_handling_summary: string | null;
  data_class: string;
  contains_pii: boolean;
  pii_description: string | null;
  typical_data: string | null;
  audit_logging: string | null;
  security_controls_summary: string | null;
  source_application_name?: string | null;
  target_application_name?: string | null;
  business_process_name?: string | null;
  middleware_application_ids?: string[];
  owners?: InterfaceOwner[];
  companies?: InterfaceCompany[];
  dependencies?: InterfaceDependency[];
  key_identifiers?: InterfaceKeyIdentifier[];
  data_residency?: InterfaceDataResidency[];
  links?: InterfaceLink[];
  attachments?: InterfaceAttachment[];
  legs?: InterfaceLeg[];
};

export type TabKey = 'overview' | 'ownership' | 'functional' | 'technical' | 'environments' | 'compliance';

export interface InterfaceTabProps {
  data: InterfaceDetail | null;
  update: (patch: Partial<InterfaceDetail>) => void;
  markDirty: () => void;
}
