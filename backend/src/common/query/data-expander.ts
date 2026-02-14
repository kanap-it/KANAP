/**
 * Configuration for a single expansion.
 *
 * @template T - The type of the item being expanded
 * @template R - The type of the related data being loaded
 */
export interface ExpandConfig<T, R> {
  /** The key in the includes array that triggers this expansion */
  key: string;
  /** Function to extract IDs from items for batch loading */
  getIds: (items: T[]) => string[];
  /** Function to load related data by IDs, returns a Map of id -> data */
  loader: (ids: string[]) => Promise<Map<string, R>>;
  /** Function to attach loaded data to each item */
  attach: (item: T, data: R | undefined) => void;
}

/**
 * A utility class for batch-loading and attaching related data to items.
 * This implements the DataLoader pattern for efficient N+1 query prevention.
 *
 * @template T - The type of the items being expanded
 *
 * @example
 * ```typescript
 * const expander = new DataExpander<Application>([
 *   {
 *     key: 'supplier',
 *     getIds: (items) => items.map(i => i.supplier_id).filter(Boolean),
 *     loader: async (ids) => {
 *       const suppliers = await supplierRepo.findByIds(ids);
 *       return new Map(suppliers.map(s => [s.id, s]));
 *     },
 *     attach: (item, supplier) => {
 *       (item as any).supplier = supplier || null;
 *     },
 *   },
 *   {
 *     key: 'owners',
 *     getIds: (items) => items.map(i => i.id),
 *     loader: async (ids) => {
 *       const owners = await ownerRepo.findByApplicationIds(ids);
 *       const map = new Map<string, Owner[]>();
 *       for (const owner of owners) {
 *         const list = map.get(owner.application_id) || [];
 *         list.push(owner);
 *         map.set(owner.application_id, list);
 *       }
 *       return map as any;
 *     },
 *     attach: (item, owners) => {
 *       (item as any).owners = owners || [];
 *     },
 *   },
 * ]);
 *
 * // Expand only requested includes
 * await expander.expand(items, ['supplier', 'owners']);
 * ```
 */
export class DataExpander<T> {
  private configs: Map<string, ExpandConfig<T, any>>;

  constructor(configs: ExpandConfig<T, any>[]) {
    this.configs = new Map(configs.map(c => [c.key, c]));
  }

  /**
   * Expand items with related data for the specified includes.
   *
   * @param items - The items to expand
   * @param includes - Array of include keys (e.g., ['supplier', 'owners'])
   * @returns The same items array, with related data attached
   */
  async expand(items: T[], includes: string[]): Promise<T[]> {
    if (items.length === 0) return items;
    if (includes.length === 0) return items;

    // Filter to only configured expansions
    const requestedConfigs = includes
      .map(key => this.configs.get(key))
      .filter((c): c is ExpandConfig<T, any> => c !== undefined);

    // Run all expansions in parallel
    await Promise.all(
      requestedConfigs.map(async config => {
        // Extract IDs for this expansion
        const ids = config.getIds(items);
        const uniqueIds = [...new Set(ids.filter(Boolean))];

        if (uniqueIds.length === 0) {
          // No IDs to load, attach undefined/default to all items
          for (const item of items) {
            config.attach(item, undefined);
          }
          return;
        }

        // Load related data
        const dataMap = await config.loader(uniqueIds);

        // Attach to each item
        // The attach function is responsible for extracting the correct key from the item
        // to look up in the dataMap
        for (const item of items) {
          // The attach function handles the lookup logic
          // For simple cases: item.supplier_id -> dataMap.get(item.supplier_id)
          // For complex cases: item.id -> dataMap.get(item.id) for aggregated data
          config.attach(item, dataMap);
        }
      }),
    );

    return items;
  }

  /**
   * Check if an expansion key is configured.
   */
  hasExpansion(key: string): boolean {
    return this.configs.has(key);
  }

  /**
   * Get all configured expansion keys.
   */
  getExpansionKeys(): string[] {
    return [...this.configs.keys()];
  }
}

/**
 * Helper to create an ExpandConfig for a simple foreign key relationship.
 * This handles the common case of loading a single related entity by foreign key.
 *
 * @template T - The item type
 * @template R - The related entity type
 *
 * @example
 * ```typescript
 * const supplierExpansion = createForeignKeyExpansion<Application, Supplier>({
 *   key: 'supplier',
 *   foreignKey: 'supplier_id',
 *   loader: async (ids) => {
 *     const suppliers = await supplierRepo.findByIds(ids);
 *     return new Map(suppliers.map(s => [s.id, s]));
 *   },
 *   targetProperty: 'supplier',
 * });
 * ```
 */
export function createForeignKeyExpansion<T extends Record<string, any>, R>(options: {
  key: string;
  foreignKey: keyof T;
  loader: (ids: string[]) => Promise<Map<string, R>>;
  targetProperty: string;
  defaultValue?: R | null;
}): ExpandConfig<T, any> {
  return {
    key: options.key,
    getIds: (items: T[]) =>
      items.map(item => item[options.foreignKey] as string).filter(Boolean),
    loader: options.loader as (ids: string[]) => Promise<Map<string, any>>,
    attach: (item: T, dataMap: Map<string, R> | undefined) => {
      const id = item[options.foreignKey] as string;
      (item as any)[options.targetProperty] = dataMap?.get(id) ?? options.defaultValue ?? null;
    },
  };
}

/**
 * Helper to create an ExpandConfig for a one-to-many relationship.
 * This handles loading multiple related entities for each item.
 *
 * @template T - The item type
 * @template R - The related entity type
 *
 * @example
 * ```typescript
 * const ownersExpansion = createOneToManyExpansion<Application, Owner>({
 *   key: 'owners',
 *   primaryKey: 'id',
 *   loader: async (ids) => {
 *     const owners = await ownerRepo.createQueryBuilder('o')
 *       .where('o.application_id IN (:...ids)', { ids })
 *       .getMany();
 *     const map = new Map<string, Owner[]>();
 *     for (const owner of owners) {
 *       const list = map.get(owner.application_id) || [];
 *       list.push(owner);
 *       map.set(owner.application_id, list);
 *     }
 *     return map;
 *   },
 *   targetProperty: 'owners',
 * });
 * ```
 */
export function createOneToManyExpansion<T extends Record<string, any>, R>(options: {
  key: string;
  primaryKey: keyof T;
  loader: (ids: string[]) => Promise<Map<string, R[]>>;
  targetProperty: string;
  defaultValue?: R[];
}): ExpandConfig<T, any> {
  return {
    key: options.key,
    getIds: (items: T[]) =>
      items.map(item => item[options.primaryKey] as string).filter(Boolean),
    loader: options.loader as (ids: string[]) => Promise<Map<string, any>>,
    attach: (item: T, dataMap: Map<string, R[]> | undefined) => {
      const id = item[options.primaryKey] as string;
      (item as any)[options.targetProperty] = dataMap?.get(id) ?? options.defaultValue ?? [];
    },
  };
}

/**
 * Helper to create an ExpandConfig for aggregated/computed data.
 * This handles loading computed data (like counts) for each item.
 *
 * @template T - The item type
 * @template R - The aggregated data type
 *
 * @example
 * ```typescript
 * const countsExpansion = createAggregateExpansion<Application, { spend_count: number; capex_count: number }>({
 *   key: 'counts',
 *   primaryKey: 'id',
 *   loader: async (ids) => {
 *     const rows = await query(`
 *       SELECT application_id,
 *         (SELECT COUNT(*) FROM application_spend_items WHERE application_id = a.id) as spend_count,
 *         (SELECT COUNT(*) FROM application_capex_items WHERE application_id = a.id) as capex_count
 *       FROM applications a WHERE a.id = ANY($1)
 *     `, [ids]);
 *     return new Map(rows.map(r => [r.application_id, { spend_count: r.spend_count, capex_count: r.capex_count }]));
 *   },
 *   attach: (item, data) => {
 *     Object.assign(item, data || { spend_count: 0, capex_count: 0 });
 *   },
 * });
 * ```
 */
export function createAggregateExpansion<T extends Record<string, any>, R>(options: {
  key: string;
  primaryKey: keyof T;
  loader: (ids: string[]) => Promise<Map<string, R>>;
  attach: (item: T, data: R | undefined) => void;
}): ExpandConfig<T, any> {
  return {
    key: options.key,
    getIds: (items: T[]) =>
      items.map(item => item[options.primaryKey] as string).filter(Boolean),
    loader: options.loader as (ids: string[]) => Promise<Map<string, any>>,
    attach: (item: T, dataMap: Map<string, R> | undefined) => {
      const id = item[options.primaryKey] as string;
      options.attach(item, dataMap?.get(id));
    },
  };
}
