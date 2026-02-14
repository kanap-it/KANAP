// Base utilities (internal)
export {
  ConnectionsBaseService,
  ServiceOpts,
  Topology,
  LegInput,
  ENVIRONMENTS,
  EnvironmentValue,
  CONNECTION_CRITICALITIES,
} from './connections-base.service';

// Specialized sub-services
export { ConnectionsListService } from './connections-list.service';
export { ConnectionsCrudService } from './connections-crud.service';
export { ConnectionsLegsService } from './connections-legs.service';

// Main facade service
export { ConnectionsService } from './connections.service';
