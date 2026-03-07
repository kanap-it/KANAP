const PREFIXES = { task: 'T', project: 'PRJ', request: 'REQ', document: 'DOC' } as const;
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
  };
  return `${paths[type]}/${idOrRef}`;
}
