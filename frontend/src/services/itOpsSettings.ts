import api from '../api';

export type ItOpsEnumOption = {
  code: string;
  label: string;
  deprecated?: boolean;
  category?: string;
  // UI-only helper for stable row keys; ignored by backend
  localId?: string;
};

export type OperatingSystemOption = ItOpsEnumOption & {
  standardSupportEnd?: string; // YYYY-MM-DD
  extendedSupportEnd?: string; // YYYY-MM-DD
};

export type ConnectionTypeOption = ItOpsEnumOption & {
  typicalPorts?: string;
};

export type AssetKindOption = ItOpsEnumOption & {
  is_physical?: boolean;
};

export type DomainOption = {
  code: string;
  label: string;
  dns_suffix: string;
  deprecated?: boolean;
  system?: boolean;
  // UI-only helper for stable row keys; ignored by backend
  localId?: string;
};

export type SubnetOption = {
  location_id: string;    // Mandatory, references locations table
  cidr: string;           // e.g., "192.168.1.0/24" (mandatory)
  vlan_number?: number;   // Optional VLAN ID (1-4094)
  network_zone: string;   // Mandatory, references networkSegments code
  description?: string;   // Optional one-line description
  deprecated?: boolean;
  // UI-only helper for stable row keys; ignored by backend
  localId?: string;
};

export type ItOpsSettings = {
  applicationCategories: ItOpsEnumOption[];
  dataClasses: ItOpsEnumOption[];
  networkSegments: ItOpsEnumOption[];
  entities: ItOpsEnumOption[];
  serverKinds: AssetKindOption[];
  serverProviders: ItOpsEnumOption[];
  serverRoles: ItOpsEnumOption[];
  hostingTypes: ItOpsEnumOption[];
  lifecycleStates: ItOpsEnumOption[];
  interfaceProtocols: ItOpsEnumOption[];
  interfaceDataCategories: ItOpsEnumOption[];
  interfaceTriggerTypes: ItOpsEnumOption[];
  interfacePatterns: ItOpsEnumOption[];
  interfaceFormats: ItOpsEnumOption[];
  interfaceAuthModes: ItOpsEnumOption[];
  operatingSystems: OperatingSystemOption[];
  connectionTypes: ConnectionTypeOption[];
  subnets: SubnetOption[];
  domains: DomainOption[];
  ipAddressTypes: ItOpsEnumOption[];
  accessMethods: ItOpsEnumOption[];
};

export async function fetchItOpsSettings(): Promise<ItOpsSettings> {
  const res = await api.get('/it-ops/settings');
  return res.data as ItOpsSettings;
}

export async function updateItOpsSettings(payload: Partial<ItOpsSettings>): Promise<ItOpsSettings> {
  const res = await api.patch('/it-ops/settings', payload);
  return res.data as ItOpsSettings;
}

export async function resetItOpsSettingsToDefaults(): Promise<ItOpsSettings> {
  const res = await api.post('/it-ops/settings/reset');
  return res.data as ItOpsSettings;
}
