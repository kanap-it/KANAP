import { AiEntityFilterRegistry, AiQueryEntityType } from '../ai-filter.types';
import { applicationsRegistry } from './applications.registry';
import { assetsRegistry } from './assets.registry';
import { documentsRegistry } from './documents.registry';
import { projectsRegistry } from './projects.registry';
import { requestsRegistry } from './requests.registry';
import { tasksRegistry } from './tasks.registry';

export const aiEntityRegistries: Record<AiQueryEntityType, AiEntityFilterRegistry> = {
  applications: applicationsRegistry,
  assets: assetsRegistry,
  documents: documentsRegistry,
  projects: projectsRegistry,
  requests: requestsRegistry,
  tasks: tasksRegistry,
};

export function getAiEntityRegistry(entityType: AiQueryEntityType): AiEntityFilterRegistry {
  return aiEntityRegistries[entityType];
}
