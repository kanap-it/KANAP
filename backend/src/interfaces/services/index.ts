// Base utilities (internal)
export {
  InterfacesBaseService,
  ServiceOpts,
  CRITICALITIES,
  ROUTE_TYPES,
  ENVIRONMENTS,
  EnvironmentValue,
  Lifecycle,
  Criticality,
  RouteType,
} from './interfaces-base.service';

// Specialized sub-services
export { InterfacesListService } from './interfaces-list.service';
export { InterfacesCrudService } from './interfaces-crud.service';
export { InterfaceBindingsManagementService } from './interface-bindings.service';
export { InterfaceMappingsService } from './interface-mappings.service';
export { InterfaceSyncService } from './interface-sync.service';

// Main facade service
export { InterfacesService } from './interfaces.service';
