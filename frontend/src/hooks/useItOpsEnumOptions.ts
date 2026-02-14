import { useCallback, useMemo } from 'react';
import { useItOpsSettings } from './useItOpsSettings';
import { ItOpsEnumOption } from '../services/itOpsSettings';

type FieldKey =
  | 'applicationCategory'
  | 'dataClass'
  | 'networkSegment'
  | 'entity'
  | 'serverKind'
  | 'serverProvider'
  | 'serverRole'
  | 'hostingType'
  | 'lifecycleStatus'
  | 'interfaceProtocol'
  | 'interfaceDataCategory'
  | 'interfaceTriggerType'
  | 'interfacePattern'
  | 'interfaceFormat'
  | 'interfaceAuthMode'
  | 'operatingSystem'
  | 'domain'
  | 'ipAddressType'
  | 'accessMethod';

export function useItOpsEnumOptions() {
  const { data } = useItOpsSettings();
  const settings = data;

  const byField = useMemo<Record<FieldKey, ItOpsEnumOption[]>>(() => ({
    applicationCategory: settings?.applicationCategories ?? [],
    dataClass: settings?.dataClasses ?? [],
    networkSegment: settings?.networkSegments ?? [],
    entity: settings?.entities ?? [],
    serverKind: settings?.serverKinds ?? [],
    serverProvider: settings?.serverProviders ?? [],
    serverRole: settings?.serverRoles ?? [],
    hostingType: settings?.hostingTypes ?? [],
    lifecycleStatus: settings?.lifecycleStates ?? [],
    interfaceProtocol: settings?.interfaceProtocols ?? [],
    interfaceDataCategory: settings?.interfaceDataCategories ?? [],
    interfaceTriggerType: settings?.interfaceTriggerTypes ?? [],
    interfacePattern: settings?.interfacePatterns ?? [],
    interfaceFormat: settings?.interfaceFormats ?? [],
    interfaceAuthMode: settings?.interfaceAuthModes ?? [],
    operatingSystem: settings?.operatingSystems ?? [],
    domain: settings?.domains ?? [],
    ipAddressType: settings?.ipAddressTypes ?? [],
    accessMethod: settings?.accessMethods ?? [],
  }), [settings]);

  const labelFor = useCallback((field: FieldKey, code?: string | null): string => {
    if (!code) return '';
    const list = byField[field] || [];
    const found = list.find((o) => o.code === code);
    if (!found) return String(code);
    return found.deprecated ? `${found.label} (deprecated)` : found.label;
  }, [byField]);

  return { settings, byField, labelFor };
}

export default useItOpsEnumOptions;
