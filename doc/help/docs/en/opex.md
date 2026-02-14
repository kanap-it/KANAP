# OPEX

OPEX (Operating Expenditure) items are your recurring IT costs: software licenses, cloud subscriptions, maintenance contracts, and services. This is where you plan budgets, track actuals, and allocate costs across your organization.

The OPEX workspace helps you manage each spend item from initial budgeting through execution and reporting—all in one place with year-by-year budget columns, flexible allocation methods, and direct links to suppliers, contracts, and projects.

## Getting started

Navigate to **Budget Management → OPEX** to see your list. Click **New** to create your first item.

**Required fields**:
  - **Product Name**: What you're spending on (e.g., "Salesforce Licenses", "AWS Compute")
  - **Currency**: ISO code (e.g., USD, EUR). Defaults to your workspace currency; you can override per item
  - **Effective Start**: When this spend begins (YYYY-MM-DD)
  - **Paying Company**: Which company is paying the supplier (required for accounting)

**Strongly recommended**:
  - **Supplier**: Who you're paying. Links to your Suppliers master data
  - **Account**: The general ledger account for this spend. Only accounts from the paying company's Chart of Accounts will appear

**Optional but useful**:
  - **Description**: Additional context or notes about the spend
  - **Effective End**: When this spend stops (leave blank for ongoing items)
  - **IT Owner** / **Business Owner**: Who's responsible
  - **Analytics Category**: Custom grouping for reporting (e.g., "Infrastructure", "Business Apps")
  - **Notes**: Free-form internal notes

Once you save, the workspace unlocks all tabs: **Overview**, **Budget**, **Allocations**, **Tasks**, and **Relations**.

**Tip**: You can create items quickly and fill in budgets and allocations later. Start with the essentials and iterate.

---

## The OPEX workspace

Click any row in the list to open the workspace. It has five tabs, each focused on a specific aspect of the spend item.

### Overview

This tab shows all the general information about the spend item.

**What you can edit**:
  - Product name, description
  - Supplier (autocomplete from your Suppliers master data)
  - Paying Company (autocomplete from your Companies)
  - Account (filtered by the paying company's Chart of Accounts)
  - Currency (defaults to workspace currency; shows only allowed currencies)
  - Effective start and end dates
  - IT Owner and Business Owner (autocomplete from enabled users)
  - Analytics Category (autocomplete; creates new categories on the fly)
  - Notes

**Status and lifecycle**:
  - Use the **Enabled** toggle or set a **Disabled date** to control when the item appears in reports and selection lists
  - Disabled items are excluded from reports for years strictly after the disabled date
  - Historical data remains intact; you'll still see disabled items in reports covering years when they were active

**Save and Reset**:
  - Changes are **not** saved automatically
  - Click **Save** to persist your edits, or **Reset** to discard them
  - If you try to navigate away with unsaved changes, you'll be prompted to save or discard

**Tip**: If you see an "obsolete account" warning, it means the selected account doesn't belong to the paying company's Chart of Accounts. Choose a different account to resolve the warning.

---

### Budget

The Budget tab is where you enter financial data per year. It supports multiple budget columns and two input modes: **flat** (annual total) and **monthly** (12-month breakdown).

**Year selection**:
  - Use the year tabs at the top to switch between Y-1, Y (current year), Y+1, and Y+2
  - Each year has its own version, allocation method, and amounts
  - Switching years with unsaved changes prompts a save/discard dialog

**Budget columns** (varies by year):
  - **Y-1** (prior year): Budget, Landing
  - **Y** (current year): Budget, Revision, Follow-up, Landing
  - **Y+1** (next year): Budget, Revision
  - **Y+2** (future year): Budget

**What each column means**:
  - **Budget**: Initial annual budget approved at the start of the year
  - **Revision**: Mid-year budget update (e.g., after a reforecast)
  - **Follow-up**: Expected actual spend (your best estimate as the year progresses)
  - **Landing**: Final actual spend after year-end close

**Flat vs Monthly mode**:
  - **Flat**: Enter one total per column; amounts are spread evenly across 12 months for allocation purposes
  - **Monthly**: Enter amounts per month (Jan–Dec) for more granular planning
  - Toggle between modes using the buttons at the top of the tab
  - When switching modes, the system calculates monthly values from the flat total (equal spread) or sums monthly values back to a flat total

**Freeze behavior**:
  - If a year's budget is frozen (via Budget Operations), inputs are disabled
  - You can still view frozen data; admins can unfreeze via **Budget Management → Budget Operations → Freeze/Unfreeze**

**Notes field**:
  - Each year's budget version has a **Notes** field for year-specific comments (e.g., "Includes 10% price increase in Q3")

**How to use it**:
  1. Select the year you're planning for
  2. Choose flat or monthly mode
  3. Fill in the relevant columns (Budget for initial planning, Follow-up for tracking, Landing for actuals)
  4. Click **Save** to persist your changes

**Tip**: For most items, flat mode is faster. Use monthly mode when you know the spend varies significantly by month (e.g., seasonal licensing, one-time setup fees).

---

### Allocations

The Allocations tab distributes the spend across your companies and departments. This drives chargeback reports and cost-per-user KPIs.

**Year selection**:
  - Works the same as Budget: use year tabs to switch between Y-1, Y, Y+1, Y+2
  - Each year can have a different allocation method

**Allocation methods**:

1. **Default** (inherits tenant rule)
   - Uses your workspace's default allocation rule for the selected year (typically Headcount)
   - The rule is set in **Master Data → Allocation Rules**; it applies to all OPEX/CAPEX items that use "Default"
   - Percentages are calculated automatically from company metrics (headcount, IT users, or turnover) based on the rule

2. **Headcount**
   - Splits spend proportionally by each company's headcount for the selected year
   - Requires all active companies to have headcount > 0
   - Percentages update automatically when you edit company metrics

3. **IT Users**
   - Splits spend proportionally by each company's IT user count for the selected year
   - Requires all active companies to have IT users > 0

4. **Turnover**
   - Splits spend proportionally by each company's turnover (revenue) for the selected year
   - Requires all active companies to have turnover > 0

5. **Manual by Company**
   - You select which companies receive this spend
   - Choose a driver (Headcount, IT Users, or Turnover) to calculate percentages among the selected companies
   - Only the selected companies are included in the split; percentages are recomputed from their metrics

6. **Manual by Department**
   - You select specific company/department pairs
   - Percentages are calculated from each department's headcount
   - Useful when a spend item benefits only certain departments (e.g., a CRM used by Sales)

**How percentages work**:
  - For **auto methods** (Default, Headcount, IT Users, Turnover): percentages are computed on every page load from the latest company metrics. You don't edit them directly.
  - For **manual methods**: you pick the companies or departments, and the system calculates percentages based on your chosen driver and the current metrics.
  - **Important**: Percentages reflect live data. If you update a company's headcount, allocations recalculate immediately.

**Viewing allocations**:
  - The grid shows: Company, Department (if applicable), Percentage, Source (Auto or Manual)
  - Auto rows are derived; manual rows surface the companies/departments you selected
  - The total percentage should equal 100%; warnings appear if metrics are missing or sum to zero

**How to use it**:
  1. Select the year
  2. Choose an allocation method from the dropdown
  3. If using a manual method, select the companies or departments
  4. Click **Save** to persist the method and selection

**Common issues**:
  - **"Missing metrics" error**: One or more companies have zero or missing headcount/IT users/turnover for the selected year. Fill in the metrics in **Master Data → Companies** (Details tab).
  - **"Total is not 100%"**: Usually caused by missing metrics. Fix the company data and reload allocations.

**Tip**: Use Default or Headcount for most items (they're simplest and update automatically). Reserve manual methods for spend that benefits specific companies or departments only.

---

### Tasks

The Tasks tab helps you track to-dos and follow-ups related to this OPEX item (e.g., "Renew license by Q3", "Review usage metrics").

**Task list**:
  - Shows all tasks linked to this OPEX item
  - Columns: Title, Status, Priority, Due Date, Actions
  - Click a task title to open the full task workspace
  - Default filter shows active tasks (hides done and cancelled)

**Filtering**:
  - Click the filter icon to show/hide filter controls
  - **Status filter**: All, Active (hides done/cancelled), or a specific status
  - Click the clear button to reset filters

**Creating a task**:
  - Click **Add Task** to open the task creation workspace
  - The task is automatically linked to this OPEX item
  - Fill in the title, description, priority, assignee, and due date in the task workspace

**Deleting a task**:
  - Click the delete icon in the Actions column
  - Confirm the deletion in the dialog

**Notes**:
  - Tasks are independent objects with their own permissions (`tasks:member` to create/edit)
  - Having OPEX manager access doesn't automatically grant task editing rights; check with your admin if you can't create tasks
  - Tasks can also be viewed and managed from **My Workspace → Tasks**, which shows all tasks across your organization

**Tip**: Use tasks to capture action items during budget reviews or contract renewals. Set due dates to track upcoming deadlines.

---

### Relations

The Relations tab links this OPEX item to related objects: Projects, Contracts, Relevant Websites, and Attachments.

**Project ID**:
  - Enter a Project ID (UUID) to associate this spend with a project
  - This helps group spend by project in reports and enables project accounting
  - Clear the field and save to unlink

**Contracts**:
  - Use the autocomplete to link one or more contracts
  - When linked, the contract name appears in the OPEX list for quick reference
  - Contracts can also link to multiple OPEX items (many-to-many relationship)
  - Remove contracts by clicking the X on the chip, then save

**Relevant websites**:
  - Add URLs related to this spend item (e.g., vendor portals, documentation, admin consoles, internal wikis)
  - Each link has an optional Description field for context
  - Click **Add URL** to add more links
  - Links are saved when you click **Save** at the top of the workspace

**Attachments**:
  - Upload files related to this spend item (e.g., contracts, invoices, quotes, SOWs, technical specs)
  - Drag and drop files into the attachment area, or click **Select files** to browse
  - All files are stored securely and can be downloaded by clicking the file name
  - Delete attachments by clicking the X on the file chip (requires OPEX manager permission)
  - Attachments are saved immediately upon upload (no need to click Save)

**Why link?**:
  - **Contracts**: Track which spend items are covered by purchase agreements or service contracts
  - **Projects**: Roll up spend by project for project accounting and chargeback
  - **Websites & Attachments**: Centralize all spend-related documentation and references for easy access

**Tip**: Upload vendor contracts, quotes, and invoices as attachments. Add links to vendor portals or admin consoles for quick access. Link contracts to track renewals across multiple OPEX items.

---

## Working with the OPEX list

The OPEX list (at **Budget Management → OPEX**) is your main view for browsing, filtering, and navigating spend items.

**Key features**:

**Quick Search**:
  - The search box at the top searches across product name, supplier, description, and other text fields
  - Filters the list in real-time as you type

**Column Filters**:
  - Each column header has a filter icon (three dots)
  - Paying Company, Account, Allocation, Currency, IT Owner, Business Owner, and Analytics use checkbox set filters (multi-select) with `All`, `None`, and an **x** to clear
  - Use filters to slice by Supplier, Account, Status, or numeric ranges (e.g., Y Budget > 50000)
  - Multiple filters combine (AND logic)

**Sorting**:
  - Click a column header to sort ascending/descending
  - The list remembers your last sort when you return

**Column Chooser**:
  - Click the hamburger menu (☰) in the grid to show/hide columns
  - Default visible columns: Product Name, Supplier, Paying Company, Contract, Account, Allocation, Budget columns (Y Budget, Y Landing, Y+1 Budget), Task
  - Hidden by default: Status (add it back if you need advanced filtering), Description, Currency, Effective Start/End, IT Owner, Business Owner, Analytics, Project ID, Notes, Created/Updated timestamps, and additional budget years

**Totals Row**:
  - The pinned row at the bottom shows totals for all budget columns (respects filters and search)
  - Useful for quickly seeing aggregate spend across the filtered list

**Deep Linking**:
  - Click any column to open the workspace on the relevant tab:
    - **Product Name, Supplier, Account**: Opens **Overview**
    - **Budget columns** (Y Budget, Y Landing, etc.): Opens **Budget** tab for that year
    - **Allocation**: Opens **Allocations** tab for the current year
    - **Task**: Opens **Tasks** tab
    - **Contract**: Opens the Contract workspace (if linked)
  - This makes navigation fast—click the data point you want to see or edit

**Status Filter**:
  - Use the **Show: Enabled / Disabled / All** toggle above the grid to control lifecycle scope (defaults to **Enabled**)
  - Pick **Disabled** to review archived items or **All** to include both states; totals update automatically
  - For advanced combinations (e.g., filter to Disabled + Supplier), add the Status column via the Column Chooser and use its filter

**Prev/Next Navigation**:
  - When you open an item, the workspace shows **Prev** and **Next** buttons
  - These navigate through the list in the current sort order, respecting filters and search
  - Your list context (sort, filters, search) is preserved when you close the workspace

**Tip**: Use column filters + quick search to build focused views (e.g., "All cloud spend over $10k"), then navigate item-by-item with Prev/Next to review budgets.

---

## CSV Import/Export

You can bulk-load OPEX items via CSV to speed up initial setup or sync with external systems.

**Export**:
  1. Click **Export CSV** in the OPEX list
  2. Choose:
     - **Template**: Headers only (use this to create a blank CSV to fill in)
     - **Data**: All current OPEX items with budgets for Y-1, Y, and Y+1

**CSV structure**:
  - Delimiter: semicolon `;` (not comma)
  - Encoding: UTF-8 (save as "CSV UTF-8" in Excel)
  - Headers: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Import**:
  1. Click **Import CSV** in the OPEX list
  2. Upload your CSV file (drag-and-drop or file picker)
  3. Click **Preflight** to validate:
     - Headers match exactly
     - Suppliers, accounts, and users exist in your workspace
     - Required fields (product_name, currency, effective_start, paying_company) are present
     - No duplicate product_name + supplier combinations
  4. Review the preflight report (shows counts and up to 5 sample errors)
  5. If OK, click **Load** to import

**Important notes**:
  - **Unique key**: OPEX items are identified by `(product_name, supplier_name)`. If a combination already exists, it's **skipped** (no updates).
  - **Insert-only**: The importer only creates new items; it won't update existing ones. Use the UI to edit existing items.
  - **References**: `supplier_name` must match a Supplier by name (case-insensitive). `account_number` must match an Account. `owner_it_email` and `owner_business_email` must match enabled users by email.
  - **Analytics Category**: If the category doesn't exist, it's created automatically during import.
  - **Budgets**: Budget columns populate Y-1, Y, and Y+1 versions. Amounts are spread evenly across 12 months (flat mode).

**Common errors**:
  - **"Supplier not found"**: Create the supplier in **Master Data → Suppliers** first, then re-import.
  - **"Account not found"**: Add the account in **Master Data → Accounts** or **Charts of Accounts**, then re-import.
  - **"Invalid currency"**: Use 3-letter ISO codes (USD, EUR, GBP) that are allowed in your workspace currency settings.
  - **"Header mismatch"**: Download a fresh template; headers must match exactly (including order).

**Tip**: Start with the template export, fill in a few rows, and run a preflight to catch issues early. Fix errors in the CSV and re-upload until preflight passes, then load.

---

## Status and Lifecycle

Every OPEX item has a **status** (Enabled or Disabled) and an optional **Disabled date** that controls when it appears in reports and selection lists.

**How it works**:
  - **Enabled**: The item is active and appears everywhere (lists, reports, allocations)
  - **Disabled date**: When set, the item is disabled at the end of that day (23:59 local time)
  - After the disabled date:
    - The item no longer appears in selection lists for new contracts or allocations
    - It's excluded from reports for years strictly after the disabled date
    - Historical data remains intact; the item still appears in reports covering years when it was active

**Setting status**:
  - In the **Overview** tab, use the **Enabled** toggle or set a **Disabled date**
  - You can schedule a future disabled date (useful for planned end-of-contract items)

**Viewing disabled items**:
  - By default, the OPEX list shows only **Enabled** items (filtered by Status = Enabled)
  - Clear or change the Status filter to see disabled items

**When to disable vs delete**:
  - **Prefer disabling**: Keeps history intact, ensures reports remain consistent, and supports audit trails
  - **Delete only if**: The item was created by mistake and has no budgets, allocations, or tasks
  - Deletion is guarded: you can't delete an item that's referenced by contracts, tasks, or has budget data

**Tip**: Use the Disabled date to sunset OPEX items when contracts end or services are discontinued. Don't delete unless it's a true mistake.

---

## Tips and Best Practices

1. **Start simple**: Create items with just the essentials (product name, supplier, paying company), then add budgets and allocations as you plan.

2. **Use the default allocation method**: For most items, Default or Headcount is enough. Reserve manual allocations for spend that benefits specific companies/departments only.

3. **Link contracts**: If you manage spend via contracts, link them in the Relations tab. It makes renewals easier to track.

4. **Upload documentation**: Use the attachments feature to store vendor contracts, quotes, invoices, and SOWs. This centralizes all spend-related documents.

5. **Add vendor portal links**: Use the Relevant Websites feature to link to vendor admin consoles, support portals, and documentation for quick access.

6. **Leverage analytics categories**: Tag items with categories (Infrastructure, Business Apps, Security) to group spend in reports.

7. **Keep company metrics up to date**: Allocations depend on company headcount, IT users, and turnover. Outdated metrics cause allocation errors.

8. **Use CSV for bulk setup**: If you're migrating from another system or have hundreds of items, start with CSV import. Export a template, fill it in, and preflight before loading.

9. **Disable, don't delete**: Preserve history by disabling items when they're no longer active. Delete only if it's a mistake.

10. **Review the totals row**: Before finalizing budgets, check the pinned totals row in the list to ensure your spend adds up as expected.

11. **Use quick search + filters**: Build focused views (e.g., "All cloud spend > $50k with missing allocations") and navigate item-by-item with Prev/Next.

12. **Freeze budgets after year-end close**: Use Budget Operations to freeze Y-1 budgets once actuals are finalized, preventing accidental edits.

---

## Permissions

OPEX access is controlled by three levels:

- **Reader**: View OPEX list, open items, see budgets and allocations (read-only), download attachments
- **Manager**: Create and edit OPEX items, update budgets and allocations, upload attachments, manage links
- **Admin**: All manager rights + CSV import, budget operations (freeze, copy, reset), bulk delete

Additionally:
- **Tasks** have separate permissions (tasks:manager to create/edit tasks on OPEX items)
- **Users with tasks:reader** can view tasks but not create or edit them

If you can't perform an action (e.g., Import CSV button is missing, can't upload attachments), check with your workspace admin to review your role permissions.

---

## Need help?

- **CSV issues**: Download a fresh template, ensure UTF-8 encoding, and run preflight to see detailed errors.
- **Allocation errors**: Check that all companies have the required metrics (headcount, IT users, turnover) for the selected year.
- **Obsolete account warning**: The account doesn't belong to the paying company's Chart of Accounts; pick a different account.
- **Missing buttons/tabs**: Your role may not have the required permission level (manager or admin). Contact your workspace admin.
