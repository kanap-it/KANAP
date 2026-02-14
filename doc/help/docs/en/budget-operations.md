# Budget Operations

Budget Operations provides powerful tools for managing and transforming your budget data across years and columns. Use these tools during budget planning cycles to prepare data, lock approved budgets, and manage year-over-year transitions.

## Where to find it

Navigate to **Budget Management → Budget Operations** to access the operations hub.

**Permissions**: Most operations require `budget_ops:admin` permission.

---

## Available Operations

The Budget Operations landing page provides access to four tools:

| Tool | Purpose |
|------|---------|
| **Freeze / Unfreeze Data** | Lock budget columns to prevent changes |
| **Copy Budget Columns** | Copy data between years and columns with adjustments |
| **Copy Allocations** | Copy allocation methods from one year to another |
| **Reset Budget Column** | Clear all data from a specific column |

---

## Freeze / Unfreeze Data

Lock budget columns to prevent accidental changes after approval.

### When to use
- After the annual budget is approved
- When closing a fiscal period
- To protect actuals from being modified

### How it works

1. **Select a year**: Choose the fiscal year to freeze
2. **Select scopes**: Choose OPEX, CAPEX, or both
3. **Select columns**: Choose which columns to freeze:
   - Budget
   - Revision
   - Actual
   - Landing
4. **Freeze** or **Unfreeze**: Apply the lock or unlock

### What freezing does
- Prevents edits to frozen columns in OPEX and CAPEX workspaces
- Displays a lock icon next to frozen columns
- Blocks CSV imports to frozen columns
- Does NOT affect read access—data remains visible

### Current status
The page shows the current freeze state for each column, so you can see at a glance what's locked.

---

## Copy Budget Columns

Copy budget data from one year/column to another, with optional percentage adjustments.

### When to use
- Preparing next year's budget from current year
- Creating a revision from the approved budget
- Rolling forward projections

### How it works

1. **Source**: Select year and column to copy from
2. **Destination**: Select year and column to copy to
3. **Percentage increase**: Apply an adjustment (e.g., +3% for inflation)
4. **Overwrite**: Choose whether to replace existing data

### Preview before applying
The tool shows a preview of what will be copied:
- Source values
- Destination values (current)
- Preview values (after copy)
- Items that will be skipped

### Options

| Option | Effect |
|--------|--------|
| **Overwrite OFF** | Only copy to items with no existing value |
| **Overwrite ON** | Replace all destination values |
| **Percentage** | Apply adjustment (e.g., 3 = +3%) |

### Frozen column protection
If the destination column is frozen, the copy operation is blocked. Unfreeze first if needed.

---

## Copy Allocations

Copy allocation methods and percentages from one year to another.

### When to use
- Preparing next year's budget with same cost allocations
- Rolling forward chargeback configurations
- Setting up a new fiscal year

### How it works

1. **Source year**: Year to copy allocations from
2. **Destination year**: Year to copy allocations to
3. **Overwrite**: Whether to replace existing allocations

### What gets copied
- Allocation methods (by headcount, by revenue, etc.)
- Allocation percentages to each company/department
- Custom allocation rules

### Preview
The tool shows which OPEX items will have allocations copied and which will be skipped:
- **Will copy**: Source has allocations, destination is empty (or overwrite is on)
- **Skip – no allocations in source**: Nothing to copy
- **Skip – destination has data**: Would overwrite, but overwrite is off

---

## Reset Budget Column

Clear all data from a specific budget column for a year.

### When to use
- Starting fresh with budget planning
- Correcting mass data entry errors
- Clearing test data

### How it works

1. **Select year**: The fiscal year to clear
2. **Select column**: Budget, Revision, Follow-up, or Landing
3. **Preview**: See which items have data and totals
4. **Confirm**: Acknowledge the destructive action

### Safety features
- Shows preview of what will be cleared
- Displays total value that will be deleted
- Requires explicit confirmation
- Frozen columns cannot be reset (unfreeze first)

### Warning
This operation is **destructive and cannot be undone**. The confirmation dialog shows:
- Number of items affected
- Total value being cleared
- Column and year being reset

---

## Workflow Example: Annual Budget Cycle

Here's a typical workflow using these tools:

### 1. End of Year N

```
1. Freeze Year N Actuals (protect historical data)
2. Copy N Budget → N+1 Budget (+inflation adjustment)
3. Copy N Allocations → N+1
```

### 2. During Budget Planning (N+1)

```
1. Teams edit N+1 Budget column
2. CFO reviews and approves
```

### 3. Budget Approval

```
1. Freeze N+1 Budget (lock approved budget)
2. Copy N+1 Budget → N+1 Revision (starting point)
```

### 4. Mid-Year Revision

```
1. Teams update N+1 Revision with forecast changes
2. When finalized, freeze N+1 Revision
```

---

## Tips

  - **Preview before applying**: All operations show a preview—check it carefully before confirming.
  - **Freeze approved data**: Lock columns after approval to maintain audit trail.
  - **Use percentage adjustments**: Apply inflation or growth when copying between years.
  - **Check freeze status**: Frozen columns block most operations—check status first.
  - **Document major changes**: Note in the system when you perform bulk operations.
