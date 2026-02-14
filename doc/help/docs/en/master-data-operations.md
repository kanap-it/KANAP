# Master Data Operations

Master Data Operations provide administrative tools to manage company and department metrics across fiscal years. These operations help you prepare annual budgets, protect finalized data, and maintain year-over-year consistency.

Access these tools at **Master Data → Master Data Ops**.

## Available operations

### Freeze / Unfreeze Data

Lock or unlock company and department metrics for a specific year to prevent accidental changes after data is finalized.

**Use cases**:
  - Protect finalized metrics after year-end close
  - Prevent edits during audit or reporting periods
  - Lock baseline data before starting next year's planning

**How it works**:
  1. Select the **year** you want to freeze or unfreeze
  2. Choose which data to freeze: **Companies** (headcount, IT users, turnover) or **Departments** (headcount)
  3. Click **Freeze Data** to lock the selected data, or **Unfreeze Data** to unlock it

**Status display**:
  - **Frozen**: Data cannot be edited (shown in red)
  - **Editable**: Data can be modified (shown as default)
  - Status cards show who froze the data and when

**Permissions**: You need admin access to Companies, Departments, or Budget Operations to freeze/unfreeze data.

**Important**: Freezing prevents edits to yearly metrics in the Details tab of Companies or Departments. It does not affect the Overview tab (name, description, etc.) or OPEX/CAPEX items.

### Master Data Copy

Copy company and department metrics from one year to another with a dry-run preview before committing changes.

**Use cases**:
  - Bootstrap next year's planning with current year's data
  - Copy baseline metrics forward when organizational structure remains stable
  - Save time by avoiding manual re-entry of recurring values

**How it works**:
  1. Select **Source Year** (where to copy from)
  2. Select **Data Sources** (Companies, Departments, or both)
  3. Select **Destination Year** (where to copy to)
  4. For Companies: Choose which **metrics** to copy (Headcount, IT Users, Turnover)
  5. Click **Dry Run** to preview what will be copied
  6. Review the preview table showing source values, current destination values, and new values
  7. Click **Copy Data** to apply the changes

**Preview table columns**:
  - **Type**: Company or Department
  - **Name**: Entity name
  - **Metric**: Which metric is being copied (Headcount, IT Users, Turnover)
  - **Source Value**: Value from the source year
  - **Current Destination**: Existing value in the destination year (if any)
  - **New Value**: Value that will be written (highlighted)
  - **Status**: Ready to copy or skipped (with reason)

**Skipped items**: Rows are skipped (shown in orange) when:
  - Source metric is null or empty
  - Destination year is frozen (must unfreeze first)
  - Entity is disabled and not active for the destination year

**Summary cards** show:
  - Total rows in the preview
  - Ready to copy (will be updated)
  - Skipped (excluded with reason)
  - Errors (if any)

**Permissions**: You need admin access to Companies or Departments (or Budget Operations) to copy their respective metrics.

**Frozen data protection**: You cannot copy data to a frozen year. Unfreeze the destination year first using the Freeze/Unfreeze tool.

**Tip**: Always run a Dry Run first. Review the preview table to verify which values will be overwritten, then click Copy Data to commit.

## CSV export

Both operations support **Export to CSV** via the export button in the toolbar. The Master Data Copy preview table can be exported to review the operation details offline or share with stakeholders.

## Common scenarios

### Scenario 1: Protecting finalized year-end data

Your 2024 budget is finalized and approved. You want to lock the data to prevent accidental changes.

**Steps**:
  1. Go to **Master Data → Master Data Ops → Freeze / Unfreeze Data**
  2. Select year **2024**
  3. Check **Companies** and **Departments**
  4. Click **Freeze Data**

**Result**: All company and department metrics for 2024 are now locked. Users cannot edit headcount, IT users, or turnover for 2024 until you unfreeze.

### Scenario 2: Bootstrapping 2025 budget with 2024 baseline

You want to start planning for 2025 using 2024's headcount and turnover as a starting point.

**Steps**:
  1. Go to **Master Data → Master Data Ops → Master Data Copy**
  2. Select **Source Year: 2024**
  3. Select **Destination Year: 2025**
  4. Select **Data Sources: Companies**
  5. Select **Company Metrics: Headcount, Turnover** (exclude IT Users if not needed)
  6. Click **Dry Run** to preview
  7. Review the table: verify source values look correct and check for skipped items
  8. Click **Copy Data**

**Result**: All companies now have 2024's headcount and turnover copied to 2025. You can then edit individual companies to adjust for expected growth or changes.

### Scenario 3: Copying only new companies to next year

You added 5 new companies mid-year in 2024. You want to copy their metrics to 2025 without overwriting existing 2025 data.

**Steps**:
  1. Run a **Dry Run** with Source Year 2024, Destination Year 2025, Companies, all metrics
  2. Review the **Current Destination** column in the preview table
  3. Rows with empty "Current Destination" are new; rows with values will be overwritten
  4. If you only want to copy new companies, you'll need to do this manually or accept the overwrite

**Note**: The Copy tool does not have a "skip if destination exists" option—it always overwrites. To selectively copy only new entities, use CSV export/import instead.

### Scenario 4: Unfreezing data to make corrections

You froze 2024 data but discovered an error in one company's headcount. You need to fix it.

**Steps**:
  1. Go to **Master Data → Master Data Ops → Freeze / Unfreeze Data**
  2. Select year **2024**
  3. Check **Companies**
  4. Click **Unfreeze Data**
  5. Edit the company's headcount in **Master Data → Companies → Details**
  6. Return to Freeze/Unfreeze and refreeze 2024 Companies when done

**Result**: The correction is made, and the data is re-locked to prevent further changes.

## Frequently asked questions

**Q: What happens if I freeze a year and then try to edit it?**
A: The Details tab for Companies or Departments will be read-only for that year. You'll see a message indicating the year is frozen. Unfreeze the year to make edits.

**Q: Does freezing affect OPEX or CAPEX items?**
A: No. Freezing only locks company and department yearly metrics (headcount, IT users, turnover). OPEX and CAPEX items are not affected.

**Q: Can I copy data to a frozen year?**
A: No. The Master Data Copy tool will block the operation and show an error. Unfreeze the destination year first.

**Q: What happens if I copy metrics and the destination year already has values?**
A: The copy operation **overwrites** existing values. Always run a Dry Run first to see which values will be replaced. The "Current Destination" column shows what will be lost.

**Q: Can I undo a copy operation?**
A: No. The copy operation is not reversible. Run a Dry Run first, and if needed, export a CSV backup of the destination year before copying.

**Q: Why are some rows skipped in the copy preview?**
A: Rows are skipped if the source metric is null, the entity is disabled for the destination year, or the destination is frozen. Check the "Status" column for the reason.

**Q: Can I copy metrics selectively (e.g., only headcount for some companies)?**
A: No. The copy operation applies to all companies or departments for the selected metrics. For selective copying, use CSV export/import.

**Q: Does the copy operation create new companies or departments?**
A: No. It only copies metrics for existing entities. If a company exists in the source year but not the destination year, that row is skipped.

**Q: Who can see freeze status?**
A: Anyone can view freeze status. Only users with admin access to Companies, Departments, or Budget Operations can freeze or unfreeze data.

**Q: Can I freeze future years?**
A: Yes. You can freeze any year within the available range (typically Y-1 to Y+5). This is useful for locking approved budgets before the year starts.

## Tips

  - **Always dry run first**: Review the preview before copying to avoid accidental overwrites
  - **Freeze after approval**: Lock data after budgets are finalized to prevent drift
  - **Unfreeze temporarily**: If you need to make corrections, unfreeze, edit, then refreeze
  - **Copy early in the cycle**: Start next year's planning by copying current year metrics, then adjust for expected changes
  - **Check permissions**: Ensure you have admin access to the scopes you want to freeze or copy
