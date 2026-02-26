# CAPEX

CAPEX (Capital Expenditure) items are your investments in long-term assets: hardware purchases, software licenses with multi-year value, infrastructure projects, and equipment. This is where you plan capital budgets, track project spending, and allocate costs across your organization.

The CAPEX workspace helps you manage each capital item from initial budgeting through execution and reporting—all in one place with year-by-year budget columns, flexible allocation methods, and direct links to projects and contracts.

## Getting started

Navigate to **Budget Management → CAPEX** to see your list. Click **New** to create your first item.

**Required fields**:
  - **Description**: What you're investing in (e.g., "New Server Infrastructure", "ERP Software License")
  - **PP&E Type**: Property, Plant & Equipment classification—Hardware or Software
  - **Investment Type**: Purpose of the investment (see options below)
  - **Priority**: Business priority level (see options below)
  - **Currency**: ISO code (e.g., USD, EUR). Defaults to your workspace CAPEX currency; you can override per item
  - **Effective Start**: When this investment begins (YYYY-MM-DD)
  - **Paying Company**: Which company is making the investment (required for accounting)

**Strongly recommended**:
  - **Account**: The general ledger account for this capital expenditure. Only accounts from the paying company's Chart of Accounts will appear

**Optional but useful**:
  - **Effective End**: When this asset's useful life ends or project completes (leave blank for ongoing assets)
  - **Notes**: Free-form internal notes about the investment
  - **Priority**: Business priority (Mandatory, High, Medium, Low)

Once you save, the workspace unlocks all tabs: **Overview**, **Budget**, **Allocations**, **Tasks**, and **Relations**.

**Tip**: You can create items quickly and fill in budgets and allocations later. Start with the essentials and iterate.

---

## Investment Types

CAPEX items must be classified by investment type. This helps analyze capital spending patterns:

- **Replacement**: Replacing existing assets that are obsolete or end-of-life
- **Capacity**: Adding capacity to support business growth or increased demand
- **Productivity**: Improving efficiency or reducing operational costs
- **Security**: Enhancing security posture, compliance, or risk mitigation
- **Conformity**: Meeting regulatory or compliance requirements
- **Business Growth**: Enabling new products, markets, or business capabilities
- **Other**: Investments that don't fit the above categories

**Priority Levels**:
- **Mandatory**: Must be done (regulatory, critical infrastructure, security)
- **High**: Strong business case, high ROI or strategic importance
- **Medium**: Valuable but can be deferred if needed
- **Low**: Nice to have, can be postponed

---

## The CAPEX workspace

Click any row in the list to open the workspace. It has five tabs, each focused on a specific aspect of the capital item.

### Overview

This tab shows all the general information about the CAPEX item.

**What you can edit**:
  - Description (what you're investing in)
  - Paying Company (autocomplete from your Companies)
  - Account (filtered by the paying company's Chart of Accounts)
  - PP&E Type (Hardware or Software)
  - Investment Type (7 options: replacement, capacity, productivity, security, conformity, business_growth, other)
  - Priority (Mandatory, High, Medium, Low)
  - Currency (defaults to workspace CAPEX currency; shows only allowed currencies)
  - Effective start and end dates
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

The Budget tab is where you enter financial data per year. It supports multiple budget columns and two input modes: **flat** (annual total) and **manual by month** (12-month breakdown).

**Year selection**:
  - Use the year tabs at the top to switch between Y-2, Y-1, Y (current year), Y+1, and Y+2
  - Each year has its own version, allocation method, and amounts
  - Switching years with unsaved changes prompts a save/discard dialog

**Budget columns** (all years):
  - **Budget**: Initial planned capital budget
  - **Revision**: Mid-year budget update (e.g., after scope changes or reforecasts)
  - **Follow-up**: Expected actual spending (your best estimate as the year progresses)
  - **Landing**: Final actual capital expenditure after year-end close

**Note**: Unlike OPEX, all CAPEX years use the same four columns. CAPEX doesn't vary column availability by year since capital planning typically follows a consistent process.

**Flat vs Manual by month mode**:
  - **Flat**: Enter one total per column; amounts are spread evenly across 12 months for allocation purposes
  - **Manual by month**: Enter amounts per month (Jan–Dec) for granular project spend tracking
  - Toggle between modes using the buttons at the top of the tab
  - When switching modes, the system calculates monthly values from the flat total (equal spread) or sums monthly values back to a flat total

**Freeze behavior**:
  - If a year's budget is frozen (via Budget Administration), inputs are disabled
  - You can still view frozen data; admins can unfreeze via **Budget Management → Budget Administration → Freeze/Unfreeze**

**Delete and redistribute** (manual by month mode only):
  - Click the delete icon next to a month to zero out that month and redistribute its value across other unlocked months
  - Useful for removing placeholder months or adjusting project timelines
  - Locked months (previously deleted in this session) are excluded from redistribution

**Notes field**:
  - Each year's budget version has a **Notes** field for year-specific comments (e.g., "Deferred to Q2 due to vendor delays")

**How to use it**:
  1. Select the year you're planning for
  2. Choose flat or manual by month mode
  3. Fill in the relevant columns (Budget for initial planning, Follow-up for tracking, Landing for actuals)
  4. Click **Save** to persist your changes

**Tip**: For most items, flat mode is faster. Use manual by month mode when you need to track project spend timing or phased rollouts.

---

### Allocations

The Allocations tab distributes the capital expenditure across your companies and departments. This drives chargeback reports and helps allocate asset costs.

**Year selection**:
  - Works the same as Budget: use year tabs to switch between Y-2, Y-1, Y, Y+1, Y+2
  - Each year can have a different allocation method

**Allocation methods**:

1. **Headcount (Default)**
   - Splits capital spend proportionally by each company's headcount for the selected year
   - Requires all active companies to have headcount > 0
   - Percentages update automatically when you edit company metrics

2. **IT Users**
   - Splits spend proportionally by each company's IT user count for the selected year
   - Requires all active companies to have IT users > 0
   - Useful for IT infrastructure investments that scale with IT staff

3. **Turnover**
   - Splits spend proportionally by each company's turnover (revenue) for the selected year
   - Requires all active companies to have turnover > 0
   - Useful for business-wide platforms or infrastructure

4. **Manual by Company**
   - You select which companies receive this capital investment
   - Choose a driver (Headcount, IT Users, or Turnover) to calculate percentages among the selected companies
   - Only the selected companies are included in the split; percentages are recomputed from their metrics
   - The system auto-prefills all enabled companies on first use; remove companies that don't benefit from this investment

5. **Manual by Department**
   - You select specific company/department pairs
   - Percentages are calculated from each department's headcount
   - Useful when a capital investment benefits only certain departments (e.g., manufacturing equipment)

**How percentages work**:
  - For **auto methods** (Headcount, IT Users, Turnover): percentages are computed on every page load from the latest company metrics. You don't edit them directly.
  - For **manual methods**: you pick the companies or departments, and the system calculates percentages based on your chosen driver and the current metrics.
  - **Important**: Percentages reflect live data. If you update a company's headcount, allocations recalculate immediately.

**Viewing allocations**:
  - The grid shows: Company, Department (if applicable), Percentage
  - The total percentage should equal 100%; warnings appear if metrics are missing or sum to zero

**How to use it**:
  1. Select the year
  2. Choose an allocation method from the dropdown
  3. If using a manual method, select the companies or departments (remove any that don't benefit from this investment)
  4. Click **Save** to persist the method and selection

**Common issues**:
  - **"Missing metrics" error**: One or more companies have zero or missing headcount/IT users/turnover for the selected year. Fill in the metrics in **Master Data → Companies** (Details tab).
  - **"Total is not 100%"**: Usually caused by missing metrics. Fix the company data and reload allocations.

**Tip**: Use Headcount for most items (it's simplest and updates automatically). Reserve Manual by Company for investments that benefit only specific entities (e.g., regional data center). Use Manual by Department for highly targeted investments.

---

### Tasks

The Tasks tab helps you track to-dos and follow-ups related to this CAPEX item (e.g., "Vendor selection by Q2", "Complete installation by June", "Obtain board approval").

**Task list**:
  - Shows all tasks linked to this CAPEX item
  - Columns: Title, Status, Priority, Due Date, Actions
  - Click a task title to open the full task workspace
  - Default filter shows active tasks (hides done and cancelled)

**Filtering**:
  - Click the filter icon to show/hide filter controls
  - **Status filter**: All, Active (hides done/cancelled), or a specific status
  - Click the clear button to reset filters

**Creating a task**:
  - Click **Add Task** to open the task creation workspace
  - The task is automatically linked to this CAPEX item
  - Fill in the title, description, priority, assignee, and due date in the task workspace

**Deleting a task**:
  - Click the delete icon in the Actions column
  - Confirm the deletion in the dialog

**Notes**:
  - Tasks are independent objects with their own permissions (`tasks:member` to create/edit)
  - Having CAPEX manager access doesn't automatically grant task editing rights; check with your admin if you can't create tasks
  - Tasks can also be viewed and managed from **Portfolio → Tasks**, which shows all tasks across your organization

**Tip**: Use tasks to capture action items during capital planning or approval cycles. Set due dates to track procurement milestones and implementation deadlines.

---

### Relations

The Relations tab links this CAPEX item to related objects: Projects, Contracts, Relevant Websites, and Attachments.

**Project ID**:
  - Enter a Project ID (UUID) to associate this capital expenditure with a project
  - This helps group capital spend by project in reports and enables project accounting
  - Clear the field and save to unlink

**Contracts**:
  - Use the autocomplete to link one or more contracts
  - When linked, the contract name appears in the CAPEX list for quick reference
  - Contracts can also link to multiple CAPEX items (many-to-many relationship)
  - Remove contracts by clicking the X on the chip, then save

**Relevant websites**:
  - Add URLs related to this investment (e.g., vendor product pages, technical documentation, internal wikis)
  - Each link has an optional Description field for context
  - Click **Add URL** to add more links
  - Links are saved when you click **Save** at the top of the workspace

**Attachments**:
  - Upload files related to this capital item (e.g., quotes, vendor proposals, technical specs, approval memos, photos)
  - Drag and drop files into the attachment area, or click **Select files** to browse
  - All files are stored securely and can be downloaded by clicking the file name
  - Delete attachments by clicking the X on the file chip (requires CAPEX manager permission)
  - Attachments are saved immediately upon upload (no need to click Save)

**Why link?**:
  - **Contracts**: Track which capital items are covered by purchase agreements or service contracts
  - **Projects**: Roll up capital spend by project for project accounting and reporting
  - **Websites & Attachments**: Centralize all investment-related documentation and references for easy access

**Tip**: Upload vendor quotes, approval memos, and technical specs as attachments. Link contracts for procurement tracking. Use Project ID to enable project-based capital reporting.

---

## Working with the CAPEX list

The CAPEX list (at **Budget Management → CAPEX**) is your main view for browsing, filtering, and navigating capital items.

**Key features**:

**Quick Search**:
  - The search box at the top searches across description, notes, PP&E type, investment type, priority, currency, and status
  - Filters the list in real-time as you type

**Column Filters**:
  - Each column header has a filter icon (three dots)
  - Company, PP&E Type, Investment Type, Priority, and Currency use checkbox set filters with `All`, `None`, and an **x** to clear
  - Use filters to slice by Company, PP&E Type, Investment Type, Priority, Status, or numeric ranges (e.g., Y Budget > 100000)
  - Multiple filters combine (AND logic)

**Sorting**:
  - Click a column header to sort ascending/descending
  - The list remembers your last sort when you return

**Column Chooser**:
  - Click the hamburger menu (☰) in the grid to show/hide columns
  - Default visible columns: Description, Company, PP&E Type, Investment Type, Priority, Allocation (Y and Y+1), Budget columns (Y Budget, Y Landing, Y+1 Budget)
  - Hidden by default: Status (add it from the column chooser for advanced filters), Currency, Effective Start/End, Notes, Y-1 Landing, Created/Updated timestamps

**Totals Row**:
  - The pinned row at the bottom shows totals for all budget columns (respects filters and search)
  - All amounts are converted to your reporting currency (shown in the page title)
  - Useful for quickly seeing aggregate capital spend across the filtered list

**Deep Linking**:
  - Click any column to open the workspace on the relevant tab:
    - **Description, Company, PP&E Type, Investment Type, Priority**: Opens **Overview**
    - **Budget columns** (Y Budget, Y Landing, etc.): Opens **Budget** tab for that year
    - **Allocation**: Opens **Allocations** tab for the selected year (Y or Y+1)
  - This makes navigation fast—click the data point you want to see or edit

**Status Filter**:
  - Use the **Show: Enabled / Disabled / All** toggle above the grid to control lifecycle scope (defaults to **Enabled**)
  - Pick **Disabled** to review archived investments or **All** to include both states (totals update immediately)
  - For advanced combinations, re-enable the Status column via the Column Chooser and use its filter

**Prev/Next Navigation**:
  - When you open an item, the workspace shows **Prev** and **Next** buttons
  - These navigate through the list in the current sort order, respecting filters and search
  - Your list context (sort, filters, search) is preserved when you close the workspace

**Tip**: Use column filters + quick search to build focused views (e.g., "All hardware investments over $100k with high priority"), then navigate item-by-item with Prev/Next to review budgets.

---

## CSV Import/Export

You can bulk-load CAPEX items via CSV to speed up initial setup or sync with external systems.

**Export**:
  1. Click **Export CSV** in the CAPEX list
  2. Choose:
     - **Template**: Headers only (use this to create a blank CSV to fill in)
     - **Data**: All current CAPEX items with budgets for Y-1, Y, and Y+1

**CSV structure**:
  - Delimiter: semicolon `;` (not comma)
  - Encoding: UTF-8 (save as "CSV UTF-8" in Excel)
  - Headers: `description;ppe_type;investment_type;priority;currency;effective_start;effective_end;status;disabled_at;notes;company_name;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Import**:
  1. Click **Import CSV** in the CAPEX list
  2. Upload your CSV file (drag-and-drop or file picker)
  3. Click **Preflight** to validate:
     - Headers match exactly
     - Companies exist in your workspace
     - Required fields (description, ppe_type, investment_type, priority, currency, effective_start, company_name) are present
     - No duplicate descriptions
  4. Review the preflight report (shows counts and up to 5 sample errors)
  5. If OK, click **Load** to import

**Important notes**:
  - **Unique key**: CAPEX items are identified by `description`. If a description already exists, it's **skipped** (no updates).
  - **Insert-only**: The importer only creates new items; it won't update existing ones. Use the UI to edit existing items.
  - **References**: `company_name` must match a Company by name (case-insensitive).
  - **PP&E Type**: Must be `hardware` or `software` (case-insensitive).
  - **Investment Type**: Must be one of: `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` (case-insensitive).
  - **Priority**: Must be `mandatory`, `high`, `medium`, or `low` (case-insensitive).
  - **Budgets**: Budget columns populate Y-1, Y, and Y+1 versions. Amounts are spread evenly across 12 months (flat mode).

**Common errors**:
  - **"Company not found"**: Create the company in **Master Data → Companies** first, then re-import.
  - **"Invalid ppe_type"**: Use `hardware` or `software` exactly.
  - **"Invalid investment_type"**: Use one of the 7 valid investment types (see list above).
  - **"Invalid priority"**: Use `mandatory`, `high`, `medium`, or `low`.
  - **"Invalid currency"**: Use 3-letter ISO codes (USD, EUR, GBP) that are allowed in your workspace currency settings.
  - **"Header mismatch"**: Download a fresh template; headers must match exactly (including order).

**Tip**: Start with the template export, fill in a few rows, and run a preflight to catch issues early. Fix errors in the CSV and re-upload until preflight passes, then load.

---

## Status and Lifecycle

Every CAPEX item has a **status** (Enabled or Disabled) and an optional **Disabled date** that controls when it appears in reports and selection lists.

**How it works**:
  - **Enabled**: The item is active and appears everywhere (lists, reports, allocations)
  - **Disabled date**: When set, the item is disabled at the end of that day (23:59 local time)
  - After the disabled date:
    - The item no longer appears in selection lists for new contracts or allocations
    - It's excluded from reports for years strictly after the disabled date
    - Historical data remains intact; the item still appears in reports covering years when it was active

**Setting status**:
  - In the **Overview** tab, use the **Enabled** toggle or set a **Disabled date**
  - You can schedule a future disabled date (useful for planned asset disposals or end-of-life dates)

**Viewing disabled items**:
  - By default, the CAPEX list shows only **Enabled** items (filtered by Status = Enabled)
  - Clear or change the Status filter to see disabled items

**When to disable vs delete**:
  - **Prefer disabling**: Keeps history intact, ensures reports remain consistent, and supports audit trails
  - **Delete only if**: The item was created by mistake and has no budgets, allocations, or tasks
  - Deletion is guarded: you can't delete an item that has budget data, allocations, tasks, or is referenced by contracts

**Tip**: Use the Disabled date to mark assets that have been fully depreciated, disposed of, or projects that have completed. Don't delete unless it's a true mistake.

---

## Tips and Best Practices

1. **Start simple**: Create items with just the essentials (description, PP&E type, investment type, company), then add budgets and allocations as you plan.

2. **Use the Headcount allocation method**: For most capital investments, Headcount is enough. Reserve manual allocations for investments that benefit specific companies/departments only (e.g., regional equipment).

3. **Link contracts**: If you manage capital purchases via contracts, link them in the Relations tab. It makes procurement tracking easier.

4. **Upload documentation**: Use the attachments feature to store vendor quotes, approval memos, and technical specs. This centralizes all investment-related documents.

5. **Classify investments accurately**: Use Investment Type and Priority consistently to enable meaningful capital spend analysis and prioritization.

6. **Keep company metrics up to date**: Allocations depend on company headcount, IT users, and turnover. Outdated metrics cause allocation errors.

7. **Use CSV for bulk setup**: If you're migrating from another system or have many capital items, start with CSV import. Export a template, fill it in, and preflight before loading.

8. **Disable, don't delete**: Preserve history by disabling items when assets are disposed of or projects complete. Delete only if it's a mistake.

9. **Review the totals row**: Before finalizing capital budgets, check the pinned totals row in the list to ensure your capital spend adds up as expected.

10. **Use quick search + filters**: Build focused views (e.g., "All hardware investments > $50k with mandatory priority") and navigate item-by-item with Prev/Next.

11. **Track project spend with manual by month**: For large projects with phased spending, use manual by month mode to track spend timing against project milestones.

12. **Freeze budgets after year-end close**: Use Budget Administration to freeze prior year budgets once actuals are finalized, preventing accidental edits.

---

## Permissions

CAPEX access is controlled by three levels:

- **Reader**: View CAPEX list, open items, see budgets and allocations (read-only)
- **Manager**: Create and edit CAPEX items, update budgets and allocations, upload attachments, manage links
- **Admin**: All manager rights + CSV import, budget operations (freeze, copy, reset), bulk delete

Additionally:
- **Tasks** have separate permissions (`tasks:member` to create/edit tasks on CAPEX items)
- **Users with tasks:reader** can view tasks but not create or edit them

If you can't perform an action (e.g., Import CSV button is missing), check with your workspace admin to review your role permissions.

---

## Need help?

- **CSV issues**: Download a fresh template, ensure UTF-8 encoding, and run preflight to see detailed errors.
- **Allocation errors**: Check that all companies have the required metrics (headcount, IT users, turnover) for the selected year.
- **Obsolete account warning**: The account doesn't belong to the paying company's Chart of Accounts; pick a different account.
- **Missing buttons/tabs**: Your role may not have the required permission level (manager or admin). Contact your workspace admin.
