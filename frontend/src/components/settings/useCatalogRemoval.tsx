import React from 'react';
import { fetchCatalogUsage, type CatalogUsage, type CatalogUsageKey } from '../../services/itOpsSettings';
import CatalogUsageDialog from './CatalogUsageDialog';

type Pending = { name: string; usage: CatalogUsage | null; failed?: boolean; onRetire: () => void };

/**
 * Removal of a catalog value, protected by the usage check: an unsaved or unused value is removed at once,
 * a used value opens the dialog whose only way out is "no longer offered". `dialog` must be rendered by the caller.
 */
export function useCatalogRemoval(usageList: string | undefined) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const requestRemoval = React.useCallback(async (args: { name: string; key: CatalogUsageKey | null; onRemove: () => void; onRetire: () => void }) => {
    if (!usageList || !args.key || ('code' in args.key && !args.key.code)) { args.onRemove(); return; }
    setPending({ name: args.name, usage: null, onRetire: args.onRetire });
    try {
      const usage = await fetchCatalogUsage(usageList, args.key);
      if (usage.total === 0) { setPending(null); args.onRemove(); return; }
      setPending({ name: args.name, usage, onRetire: args.onRetire });
    } catch {
      setPending({ name: args.name, usage: null, failed: true, onRetire: args.onRetire });
    }
  }, [usageList]);
  // React events bubble through portals: keep the dialog's submit from reaching a form that hosts the editor.
  const dialog = pending && (pending.usage || pending.failed)
    ? <div onSubmit={(event) => event.stopPropagation()}><CatalogUsageDialog open name={pending.name} usage={pending.usage} failed={pending.failed} onRetire={() => { pending.onRetire(); setPending(null); }} onClose={() => setPending(null)} /></div>
    : null;
  return { requestRemoval, dialog, checking: !!pending && !pending.usage && !pending.failed };
}
