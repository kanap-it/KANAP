import api from '../api';

export type ItOpsEnumOption = {
  code: string;
  label: string;
  deprecated?: boolean;
  category?: string;
  // UI-only helper for stable row keys; ignored by backend
  localId?: string;
};

export type ClassificationLevel = ItOpsEnumOption & {
  description: string;
  rank: number;
};

export type BusinessCriticalityLevel = ClassificationLevel & {
  maxMtdMinutes: number | null;
};

export type RecoveryWave = Omit<ClassificationLevel, 'rank'> & {
  order: number;
};

export type ClassificationVersions = {
  business: number;
  cyber: number;
  confidentiality: number;
  recovery: number;
};

export type ApplicationClassificationCatalog = {
  businessCriticalityLevels: BusinessCriticalityLevel[];
  businessMtdPresets: number[];
  cyberCriticalityLevels: ClassificationLevel[];
  dataClasses: ClassificationLevel[];
  recoveryWaves: RecoveryWave[];
  classificationVersions: ClassificationVersions;
  classificationSettingsRevision: number;
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

export type GraphTier = 'top' | 'upper' | 'center' | 'lower' | 'bottom';

export type ServerRoleOption = ItOpsEnumOption & {
  graph_tier?: GraphTier;
};

export type EntityOption = ItOpsEnumOption & {
  graph_tier?: GraphTier;
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
  entities: EntityOption[];
  serverKinds: AssetKindOption[];
  serverProviders: ItOpsEnumOption[];
  serverRoles: ServerRoleOption[];
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
  incidentCategories: ItOpsEnumOption[];
  businessCriticalityLevels: BusinessCriticalityLevel[];
  businessMtdPresets: number[];
  cyberCriticalityLevels: ClassificationLevel[];
  recoveryWaves: RecoveryWave[];
  classificationVersions: ClassificationVersions;
  classificationSettingsRevision: number;
};

export type ClassificationSettingsPatch = Pick<ApplicationClassificationCatalog,
  'businessCriticalityLevels' | 'businessMtdPresets' | 'cyberCriticalityLevels' | 'dataClasses' | 'recoveryWaves'
> & { expectedClassificationSettingsRevision: number };

export type ClassificationPreview = {
  affectedApplications: number;
  transitions: Array<{ from: string | null; to: string | null; count: number }>;
  classificationVersions: ClassificationVersions;
  classificationSettingsRevision: number;
};

export async function fetchItOpsSettings(): Promise<ItOpsSettings> {
  const res = await api.get('/it-ops/settings');
  return res.data as ItOpsSettings;
}

export async function updateItOpsSettings(payload: Partial<ItOpsSettings>): Promise<ItOpsSettings> {
  const res = await api.patch('/it-ops/settings', payload);
  return res.data as ItOpsSettings;
}

export async function fetchApplicationClassificationCatalog(): Promise<ApplicationClassificationCatalog> {
  const res = await api.get('/applications/classification-catalog');
  return res.data as ApplicationClassificationCatalog;
}

export async function previewClassificationSettings(payload: ClassificationSettingsPatch): Promise<ClassificationPreview> {
  const res = await api.post('/it-ops/settings/classification-preview', payload);
  return res.data as ClassificationPreview;
}

export async function resetItOpsSettingsToDefaults(): Promise<ItOpsSettings> {
  const current = await fetchItOpsSettings();
  const res = await api.post('/it-ops/settings/reset', { expectedClassificationSettingsRevision: current.classificationSettingsRevision });
  return res.data as ItOpsSettings;
}
