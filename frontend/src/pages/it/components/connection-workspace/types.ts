import { ServerOption } from '../../../../components/fields/ServerSelect';

export type TabKey = 'overview' | 'layers' | 'compliance' | 'interfaces';

export type ConnectionLeg = {
  id?: string;
  order_index: number;
  layer_type: string;
  source_server_id: string | null;
  source_entity_code: string | null;
  destination_server_id: string | null;
  destination_entity_code: string | null;
  protocol_codes: string[];
  protocol_labels?: string[];
  port_override: string | null;
  notes: string | null;
};

export type ConnectionDetail = {
  id: string;
  connection_id: string;
  name: string;
  purpose: string | null;
  topology: 'server_to_server' | 'multi_server';
  source_server_id: string | null;
  source_entity_code: string | null;
  destination_server_id: string | null;
  destination_entity_code: string | null;
  lifecycle: string;
  notes: string | null;
  protocol_codes: string[];
  servers?: ServerOption[];
  source_server?: ServerOption | null;
  destination_server?: ServerOption | null;
  criticality: string;
  data_class: string;
  contains_pii: boolean;
  risk_mode: 'manual' | 'derived';
  effective_criticality?: string;
  effective_data_class?: string;
  effective_contains_pii?: boolean;
  derived_interface_count?: number;
  legs?: ConnectionLeg[];
};

export type EntityOption = { label: string; code: string };

export type LinkedInterfaceBinding = {
  id: string;
  binding_id: string;
  interface_id: string;
  interface_code: string;
  interface_name: string;
  environment: string;
  leg_type: string;
  source_endpoint: string | null;
  target_endpoint: string | null;
  pattern: string;
  binding_status: string;
  interface_lifecycle: string;
  interface_criticality: string;
  interface_data_class: string;
  interface_contains_pii: boolean;
};

export interface ConnectionTabProps {
  data: ConnectionDetail | null;
  update: (patch: Partial<ConnectionDetail>) => void;
  isCreate: boolean;
  loading?: boolean;
}

export type SourceTargetOption = {
  label: string;
  value: string;
  kind: 'entity' | 'cluster' | 'server';
  isCluster?: boolean;
};
