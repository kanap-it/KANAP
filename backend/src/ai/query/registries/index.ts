import { AiEntityFilterRegistry, AiQueryEntityType } from '../ai-filter.types';
import { accountsRegistry } from './accounts.registry';
import { analyticsCategoriesRegistry } from './analytics-categories.registry';
import { applicationsRegistry } from './applications.registry';
import { assetsRegistry } from './assets.registry';
import { businessProcessesRegistry } from './business-processes.registry';
import { capexItemsRegistry } from './capex-items.registry';
import { chartOfAccountsRegistry } from './chart-of-accounts.registry';
import { companiesRegistry } from './companies.registry';
import { connectionsRegistry } from './connections.registry';
import { contactsRegistry } from './contacts.registry';
import { contractsRegistry } from './contracts.registry';
import { departmentsRegistry } from './departments.registry';
import { documentsRegistry } from './documents.registry';
import { interfacesRegistry } from './interfaces.registry';
import { locationsRegistry } from './locations.registry';
import { projectsRegistry } from './projects.registry';
import { requestsRegistry } from './requests.registry';
import { spendItemsRegistry } from './spend-items.registry';
import { suppliersRegistry } from './suppliers.registry';
import { tasksRegistry } from './tasks.registry';
import { usersRegistry } from './users.registry';

export const aiEntityRegistries: Record<AiQueryEntityType, AiEntityFilterRegistry> = {
  accounts: accountsRegistry,
  analytics_categories: analyticsCategoriesRegistry,
  applications: applicationsRegistry,
  assets: assetsRegistry,
  business_processes: businessProcessesRegistry,
  capex_items: capexItemsRegistry,
  chart_of_accounts: chartOfAccountsRegistry,
  companies: companiesRegistry,
  connections: connectionsRegistry,
  contacts: contactsRegistry,
  contracts: contractsRegistry,
  departments: departmentsRegistry,
  documents: documentsRegistry,
  interfaces: interfacesRegistry,
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
