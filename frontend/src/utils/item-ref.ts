const PREFIXES = { task: 'T', project: 'PRJ', request: 'REQ', document: 'DOC', asset: 'AST', application: 'APP', location: 'LOC', connection: 'CONN' } as const;
type ItemType = keyof typeof PREFIXES;

export function formatItemRef(type: ItemType, itemNumber: number): string {
  return `${PREFIXES[type]}-${itemNumber}`;
}

export function buildItemPath(type: ItemType, idOrRef: string): string {
  const paths = {
    task: '/portfolio/tasks',
    project: '/portfolio/projects',
    request: '/portfolio/requests',
    document: '/knowledge',
    asset: '/it/assets',
    application: '/it/applications',
    location: '/it/locations',
    connection: '/it/connections',
  };
  return `${paths[type]}/${idOrRef}`;
}
