import { AiEntityFilterRegistry, AiQueryEntityType } from '../ai-filter.types';
import { applicationsRegistry } from './applications.registry';
import { assetsRegistry } from './assets.registry';
import { companiesRegistry } from './companies.registry';
import { contractsRegistry } from './contracts.registry';
import { departmentsRegistry } from './departments.registry';
import { documentsRegistry } from './documents.registry';
import { locationsRegistry } from './locations.registry';
import { projectsRegistry } from './projects.registry';
import { requestsRegistry } from './requests.registry';
import { spendItemsRegistry } from './spend-items.registry';
import { suppliersRegistry } from './suppliers.registry';
import { tasksRegistry } from './tasks.registry';
import { usersRegistry } from './users.registry';

export const aiEntityRegistries: Record<AiQueryEntityType, AiEntityFilterRegistry> = {
  applications: applicationsRegistry,
  assets: assetsRegistry,
  companies: companiesRegistry,
  contracts: contractsRegistry,
  departments: departmentsRegistry,
  documents: documentsRegistry,
  locations: locationsRegistry,
  projects: projectsRegistry,
  requests: requestsRegistry,
  spend_items: spendItemsRegistry,
  suppliers: suppliersRegistry,
  tasks: tasksRegistry,
  users: usersRegistry,
};

export function getAiEntityRegistry(entityType: AiQueryEntityType): AiEntityFilterRegistry {
  return aiEntityRegistries[entityType];
}
