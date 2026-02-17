const PREFIXES = { task: 'T', project: 'PRJ', request: 'REQ' } as const;
type ItemType = keyof typeof PREFIXES;

export function formatItemRef(type: ItemType, itemNumber: number): string {
  return `${PREFIXES[type]}-${itemNumber}`;
}

export function buildItemPath(type: ItemType, idOrRef: string): string {
  const paths = {
    task: '/portfolio/tasks',
    project: '/portfolio/projects',
    request: '/portfolio/requests',
  };
  return `${paths[type]}/${idOrRef}`;
}
