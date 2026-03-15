# Budget Administration

Budget Administration gives you a set of tools for managing and transforming budget data across years and columns. These are the operations you reach for during budget planning cycles -- preparing next year's numbers, locking approved budgets, and managing year-over-year transitions.

## Where to find it

- Path: **Budget Management > Administration**
- Permissions: Most operations require `budget_ops:admin`

The landing page shows four cards, each linking to a dedicated tool:

| Tool | Purpose |
|------|---------|
| **Freeze / Unfreeze Data** | Lock budget columns to prevent changes |
| **Copy Budget Columns** | Copy data between years and columns with adjustments |
| **Copy Allocations** | Copy allocation methods from one year to another |
| **Reset Budget Column** | Clear all data from a specific column |

---

## Freeze / Unfreeze Data

Lock budget columns so they cannot be edited, imported into, or modified in any way. Freezing protects approved figures from accidental changes.

### When to use it

- After the annual budget is approved
- When closing a fiscal period
- To protect actuals from being modified

### How it works

1. **Select a year** from the dropdown (range: current year minus one through current year plus four)
2. **Select scopes**: tick **OPEX**, **CAPEX**, or both
3. **Select columns** for each scope: Budget, Revision, Actual, Landing (all four are selected by default)
4. Click **Freeze Data** to lock, or **Unfreeze Data** to unlock

### What freezing does

- Prevents edits to frozen columns in OPEX and CAPEX workspaces
- Blocks CSV imports to frozen columns
- Blocks copy and reset operations targeting frozen columns
- Does **not** affect read access -- data remains visible

### Current status

Below the controls, two cards show the real-time freeze state for every column in OPEX and CAPEX. Each column displays either **Frozen** (in red) or **Editable**.

### Permissions

Without `budget_ops:admin` you can still view the freeze status, but the controls are disabled. An info banner explains what is needed.

---

## Copy Budget Columns

Copy budget data from one year and column to another, with an optional percentage adjustment. This is the primary tool for seeding next year's budget from the current one.

### When to use it

- Preparing next year's budget from the current year
- Creating a revision from the approved budget
- Rolling forward projections with an inflation factor

### Fields

| Field | Description |
|-------|-------------|
| **Source Year** | Year to copy from (range: current year minus one through current year plus five) |
| **Source Column** | Budget, Revision, Follow-up, or Landing |
| **Destination Year** | Year to copy to (same range) |
| **Destination Column** | Budget, Revision, Follow-up, or Landing |
| **Percentage Increase** | Adjustment applied to copied values (e.g., `3` = +3%). Defaults to 0. Accepts decimals. |
| **Overwrite existing data** | Toggle. When off, items that already have a value in the destination are skipped. When on, all destination values are replaced. |

### Two-step process: Dry Run, then Copy

1. Click **Dry Run** to generate a preview without changing any data
2. Review the preview grid, which shows:
   - **Product** name (items tagged `[SKIP]` will not be modified)
   - **Source value** (from the source year/column)
   - **Current destination value**
   - **Preview value** (what the destination will become after copy)
3. When you are satisfied, click **Copy Data** to apply

The **Copy Data** button is only enabled after a successful dry run.

### Summary statistics

Below the grid, a stats bar shows:

- **Total items** in the dataset
- **Items to be processed** (non-skipped)
- **Source total** (sum of source values)
- **Current destination total**
- **Preview total** (shown after dry run)

### Overwrite behavior

| Overwrite | Destination has data | Result |
|-----------|---------------------|--------|
| Off | Yes | Skipped |
| Off | No (zero) | Copied |
| On | Yes | Replaced |
| On | No (zero) | Copied |

### Frozen column protection

If the destination column is frozen, both **Dry Run** and **Copy Data** are disabled. An error banner tells you to unfreeze first.

---

## Copy Allocations

Copy allocation methods and percentages from one year to another for all OPEX items. This saves you from re-entering chargeback configurations when setting up a new fiscal year.

### When to use it

- Preparing next year's budget with the same cost allocations
- Rolling forward chargeback configurations
- Setting up a new fiscal year

### Fields

| Field | Description |
|-------|-------------|
| **Source Year** | Year to copy allocations from (range: current year minus one through current year plus five) |
| **Destination Year** | Year to copy allocations to (same range). Must differ from Source Year. |
| **Overwrite existing data** | Toggle. When off, items that already have allocations in the destination are skipped. |

### Two-step process: Dry Run, then Copy

1. Click **Dry Run** to see a preview
2. The preview grid shows each OPEX item with:
   - **Product** name
   - **Action** -- what will happen (Will copy, Skip -- no source year, Skip -- no allocations in source, Skip -- destination has data, Error)
   - **Source** method and label
   - **Destination** current method and label
   - **Result after copy** -- what the destination will look like
3. Click **Copy Data** to apply

### Validation

- Source and destination years must be different. If they match, a warning banner appears and both buttons are disabled.
- Changing any filter clears the preview, requiring a fresh dry run.

### Summary

After a dry run, a banner shows the count of items ready to copy, skipped, and errored. If items were skipped because the destination already has allocations, a separate warning suggests enabling overwrite.

---

## Reset Budget Column

Clear all data from a specific budget column for a given year. This is a destructive operation -- use it when you need to start fresh.

### When to use it

- Starting fresh with budget planning
- Correcting mass data entry errors
- Clearing test data

### Fields

| Field | Description |
|-------|-------------|
| **Year** | The fiscal year to clear (range: current year minus one through current year plus five) |
| **Budget Column** | Budget, Revision, Follow-up, or Landing |

### Preview

The page loads a grid showing every OPEX item and its current value in the selected column. Items with data are highlighted in red. Below the grid, three stats appear:

- **Total items**
- **Items with data** (will be cleared)
- **Current total value**

### Confirmation

Clicking **Clear Column** opens a confirmation dialog that shows:

- The column and year being reset
- The number of items affected
- The total value being deleted
- A clear warning that this action cannot be undone

You must click **Clear Column** in the dialog to proceed, or **Cancel** to abort.

### Safety features

- The **Clear Column** button is disabled when there is no data to clear
- Frozen columns cannot be reset -- unfreeze first
- The confirmation dialog requires explicit acknowledgement

---

## Workflow Example: Annual Budget Cycle

Here is a typical sequence using these tools:

### 1. End of Year N

1. Freeze Year N Actuals (protect historical data)
2. Copy N Budget to N+1 Budget (with a percentage increase for inflation)
3. Copy N Allocations to N+1

### 2. During Budget Planning (N+1)

1. Teams edit the N+1 Budget column
2. CFO reviews and approves

### 3. Budget Approval

1. Freeze N+1 Budget (lock the approved budget)
2. Copy N+1 Budget to N+1 Revision (starting point for in-year tracking)

### 4. Mid-Year Revision

1. Teams update N+1 Revision with forecast changes
2. When finalized, freeze N+1 Revision

---

## Tips

- **Always dry-run first**: Copy Budget Columns and Copy Allocations both support a dry run. Use it every time to verify the outcome before committing.
- **Freeze after approval**: Locking columns after approval maintains your audit trail and prevents accidental edits.
- **Use percentage adjustments**: When copying between years, apply an inflation or growth factor so you do not have to adjust every line manually.
- **Check freeze status before bulk operations**: Frozen columns block copy and reset operations. If a button is greyed out, check the Freeze page first.
- **Reset with caution**: Column reset is irreversible. Double-check the year and column before confirming.
