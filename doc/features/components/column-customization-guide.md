# Column Customization Guide

## Overview

The ServerDataGrid component now supports user-customizable column visibility, ordering, and persistence. This guide explains how to implement and use these features.

## Features

### Column Visibility Control
- Users can show/hide columns using a custom Material-UI popover-based column chooser (AG Grid Community compatible)
- Required columns cannot be hidden
- Default hidden columns are hidden by default but can be shown
- Column preferences are automatically saved to localStorage

### Column State Persistence
- Column visibility, width, order, and pinning are automatically saved
- Preferences persist across browser sessions
- Each grid instance can have its own preference key
- **Per-user scoping**: Preferences are scoped by tenant and user so they don't bleed across users sharing the same browser. Storage key pattern: `grid-columns:{tenantSlug}:{userId}:{pageKey}`

### User Interface
- **Column Chooser Button**: Click the "Choose Columns" button to open a custom Material-UI popover with column options
- **Reset Columns Button**: Restore default column configuration
- **Custom Popover**: Community Edition compatible column chooser with checkboxes
- **Drag & Drop**: Reorder columns by dragging headers (AG Grid native feature)

## Quick Filter

- A global quick filter input appears above the grid when `enableSearch` is true (default).
- User input is debounced (400ms) and synchronized to the URL via the `q` parameter.
- The server receives `q` on all data requests and should apply it in addition to any column filters (AG Grid `filterModel`).
- Search intent: treat `q` as a global search across the table’s content (not just a single field).
  - Simple lists: OR across several relevant text fields at the DB level (combine with column filters via AND).
  - Derived/summary lists (e.g., OPEX summary): compute derived/display fields first, then apply `q` across both base and derived fields in-memory; if `q` is present, perform in-memory sort + paginate to keep ordering consistent.
  

Example backend pattern (NestJS + TypeORM):
```ts
// Merge AG Grid filters AND quick search q
const { q, filters } = parsePagination(query);
const where: any = {};
if (filters && Object.keys(filters).length > 0) {
  Object.assign(where, buildWhereFromAgFilters(filters));
}
if (q) {
  // Apply your quick search fields; here we search by name
  where.name = ILike(\`%\${q}%\`);
}
```

## Closed-Choice Checkbox Filters (Set Filters)

Use the shared checkbox filter for columns with a fixed set of choices (Status, Type, Source, Category, Stream, Company, etc.). This replaces text "contains" filters with a list of values and works with AG Grid Community.

### Frontend: CheckboxSetFilter

```ts
import CheckboxSetFilter from '../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../components/CheckboxSetFloatingFilter';

{
  field: 'status',
  headerName: 'Status',
  filter: CheckboxSetFilter,
  floatingFilterComponent: CheckboxSetFloatingFilter,
  filterParams: {
    getValues: getScopedValues('status'),
    searchable: false,
  },
}
```

Behavior:
- **All** selects every value. With `treatAllAsUnfiltered: true` (default), this clears the filter back to unfiltered.
- **Clear** selects nothing (shows nothing).
- The floating filter shows `All`, `None`, or `N selected` and includes an **x** icon to clear the filter without reopening the list.
- When unfiltered, all values are selected by default (implicit “All”).

### Scoped Values Pattern

Closed-choice filters are most useful when the checkbox list is scoped by the current grid context (search, filters, scope controls). Expose a `getValues` function that queries a `filter-values` endpoint and excludes the current column filter so users can see alternate options.

```ts
const getScopedValues = (field: string) => async ({ context }: any) => {
  const state = context.getQueryState();
  const filters = { ...(state.filters || {}) };
  delete filters[field];
  const params = {
    fields: field,
    ...(state.extraParams || {}),
    q: state.q || undefined,
    filters: Object.keys(filters).length ? JSON.stringify(filters) : undefined,
  };
  const res = await api.get('/tasks/filter-values', { params });
  return (res.data?.[field] || []).map((value: string | null) => ({ value }));
};
```

### Filter Model Contract

Checkbox filters send a Set filter model:

```ts
{
  filterType: 'set',
  values: ['open', 'in_progress'] // empty array means "none selected"
}
```

Ensure the backend understands `filterType: 'set'` and treats an empty array as "match nothing".

**Default-filtered columns**: If a grid applies a default filter (e.g., hide Done/Retired), pass `treatAllAsUnfiltered: false` so selecting All does not clear the filter.

## Implementation

### Enhanced Column Definitions

Use `EnhancedColDef<T>` instead of `ColDef<T>` for additional column properties:

```typescript
import { EnhancedColDef } from '../components/ServerDataGrid';

const columns: EnhancedColDef<any>[] = [
  { 
    field: 'name', 
    headerName: 'Name', 
    flex: 1, 
    required: true // Cannot be hidden
  },
  { 
    field: 'description', 
    headerName: 'Description', 
    width: 200, 
    defaultHidden: true // Hidden by default
  },
  { 
    field: 'actions', 
    headerName: 'Actions', 
    width: 120, 
    required: true, 
    pinned: 'right' // Always pinned to right
  },
];
```

### ServerDataGrid Props

New props for column customization:

```typescript
<ServerDataGrid
  columns={columns}
  endpoint="/api/data"
  queryKey="data"
  
  // Column customization props
  enableColumnChooser={true}              // Enable column chooser UI
  columnPreferencesKey="my-grid"          // localStorage key for persistence
  requiredColumns={['name', 'actions']}   // Columns that cannot be hidden
  defaultHiddenColumns={['created_at']}   // Columns hidden by default
  onColumnStateChange={handleColumnChange} // Callback for state changes
/>
```

### Column Properties

#### `required: boolean`
- Columns marked as required cannot be hidden by users
- Useful for essential columns like names, IDs, or action buttons
- Overrides `defaultHidden` setting

#### `defaultHidden: boolean`
- Columns are hidden by default but can be shown by users
- Useful for optional/detailed information columns
- Can be overridden by saved user preferences

#### `category: string`
- Groups columns in the column chooser (future enhancement)
- Helps organize large numbers of columns

## Usage Examples

### Basic Implementation

```typescript
export default function MyPage() {
  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80, required: true },
    { field: 'name', headerName: 'Name', flex: 1, required: true },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150, defaultHidden: true },
    { field: 'created_at', headerName: 'Created', width: 180, defaultHidden: true },
    { field: 'actions', headerName: 'Actions', width: 120, required: true, pinned: 'right' },
  ], []);

  return (
    <ServerDataGrid
      columns={columns}
      endpoint="/users"
      queryKey="users"
      columnPreferencesKey="users-grid"
      enableColumnChooser={true}
      requiredColumns={['id', 'name', 'actions']}
      defaultHiddenColumns={['phone', 'created_at']}
    />
  );
}
```

### Advanced Configuration

```typescript
export default function AdvancedPage() {
  const [columnState, setColumnState] = useState<ColumnState[]>([]);
  
  const handleColumnStateChange = useCallback((newState: ColumnState[]) => {
    setColumnState(newState);
    // Custom logic for column state changes
    console.log('Column state changed:', newState);
  }, []);

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', flex: 1, required: true },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'priority', headerName: 'Priority', width: 100, defaultHidden: true },
    { field: 'assignee', headerName: 'Assignee', width: 150, defaultHidden: true },
    { field: 'due_date', headerName: 'Due Date', width: 120, defaultHidden: true },
    { field: 'actions', headerName: 'Actions', width: 120, required: true, pinned: 'right' },
  ], []);

  return (
    <ServerDataGrid
      columns={columns}
      endpoint="/tasks"
      queryKey="tasks"
      columnPreferencesKey="tasks-grid"
      enableColumnChooser={true}
      onColumnStateChange={handleColumnStateChange}
    />
  );
}
```

## User Experience

### Column Chooser Panel
1. Click the column icon (⚏) in the grid toolbar
2. The column chooser panel opens on the right side
3. Check/uncheck columns to show/hide them
4. Drag columns to reorder them
5. Changes are automatically saved

### Reset Functionality
1. Click "Reset Columns" button to restore defaults
2. All customizations are cleared
3. Grid returns to original column configuration

### Persistence
- Column preferences are automatically saved to localStorage
- Preferences include: visibility, width, order, and pinning
- Each grid instance uses its own storage key, scoped per tenant and user: `grid-columns:{tenantSlug}:{userId}:{pageKey}`
- Preferences persist across browser sessions and page reloads
- Switching tenants or users loads independent preferences
- **Migration**: On first load after deployment, legacy unscoped keys (`grid-columns-{pageKey}`) are automatically migrated to the new scoped key and the old key is deleted. The first logged-in user inherits the existing prefs; subsequent users on the same browser start fresh.

## Best Practices

### Column Design
- Mark essential columns as `required: true`
- Hide detailed/optional columns by default
- Pin action columns to the right
- Use meaningful column headers
- Set appropriate default widths

### Performance
- Use stable column definitions (wrap in `useMemo`)
- Provide unique `columnPreferencesKey` for each grid
- Avoid frequent column definition changes

### User Experience
- Provide clear column headers
- Group related columns together
- Consider mobile responsiveness
- Test with different column combinations

## AG Grid ColumnDef Warnings

AG Grid Community Edition warns on unknown `ColDef` properties. Our `EnhancedColDef` adds `required`, `defaultHidden`, and `category` for app-level behavior. Internally, `ServerDataGrid` maps these properties into each column's `context` before passing them to AG Grid, which removes the warnings while preserving the public API. Consumers should continue to declare columns using `EnhancedColDef` as documented; no changes are required.

## Migration Guide

### From Standard ServerDataGrid

1. Update imports:
```typescript
// Before
import ServerDataGrid from '../components/ServerDataGrid';
import { ColDef } from 'ag-grid-community';

// After
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
```

2. Update column definitions:
```typescript
// Before
const columns: ColDef[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
];

// After
const columns: EnhancedColDef<any>[] = [
  { field: 'name', headerName: 'Name', flex: 1, required: true },
];
```

3. Add column customization props:
```typescript
<ServerDataGrid
  // ... existing props
  columnPreferencesKey="my-page"
  enableColumnChooser={true}
  requiredColumns={['name']}
/>
```

## Troubleshooting

### Common Issues

**Columns not persisting**
- Ensure `columnPreferencesKey` is provided
- Check browser localStorage is enabled
- Verify unique keys for different grids
- Column state is scoped per tenant/user — logging in as a different user will show that user's preferences (or defaults if none saved)

**Required columns being hidden**
- Check `required: true` is set in column definition
- Verify `requiredColumns` prop includes the field name
- Required columns override saved preferences

**Column chooser not appearing**
- Ensure `enableColumnChooser={true}` is set
- Check AG Grid Community edition limitations
- Verify sidebar configuration is correct

### Browser Compatibility
- localStorage is required for persistence
- Modern browsers support all features
- Graceful fallback when localStorage unavailable

## Future Enhancements

- Column grouping by category
- Export/import column configurations
- Advanced column filtering options
- Column templates and presets
