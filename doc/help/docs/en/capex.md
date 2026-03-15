# CAPEX

CAPEX (Capital Expenditure) items are your investments in long-term assets: hardware purchases, software licenses with multi-year value, infrastructure projects, and equipment. This is where you plan capital budgets, track project spending, and allocate costs across your organization.

The CAPEX workspace helps you manage each capital item from initial budgeting through execution and reporting -- all in one place with year-by-year budget columns, flexible allocation methods, and direct links to projects, contracts, and contacts.

## Getting started

Navigate to **Budget Management > CAPEX** to see your list. Click **New** to create your first item.

**Required fields**:

- **Description**: What you are investing in (e.g., "New Server Infrastructure", "ERP Software License")
- **PP&E Type**: Property, Plant & Equipment classification -- Hardware or Software
- **Investment Type**: Purpose of the investment (see options below)
- **Priority**: Business priority level (see options below)
- **Currency**: ISO code (e.g., USD, EUR). Defaults to your workspace CAPEX currency; you can override per item
- **Effective Start**: When this investment begins (DD/MM/YYYY)
- **Paying Company**: Which company is making the investment (required for accounting)

**Strongly recommended**:

- **Account**: The general ledger account for this capital expenditure. Only accounts from the paying company's Chart of Accounts will appear
- **Supplier**: The vendor or supplier for this investment. Select from your master data suppliers

**Optional but useful**:

- **Effective End**: When this asset's useful life ends or project completes (leave blank for ongoing assets)
- **Notes**: Free-form internal notes about the investment

Once you save, the workspace unlocks all tabs: **Overview**, **Budget**, **Allocations**, **Tasks**, and **Relations**.

**Tip**: You can create items quickly and fill in budgets and allocations later. Start with the essentials and iterate.

---

## Investment types

CAPEX items must be classified by investment type. This helps analyze capital spending patterns:

- **Replacement**: Replacing existing assets that are obsolete or end-of-life
- **Capacity**: Adding capacity to support business growth or increased demand
- **Productivity**: Improving efficiency or reducing operational costs
- **Security**: Enhancing security posture, compliance, or risk mitigation
- **Conformity**: Meeting regulatory or compliance requirements
- **Business Growth**: Enabling new products, markets, or business capabilities
- **Other**: Investments that do not fit the above categories

**Priority levels**:

- **Mandatory**: Must be done (regulatory, critical infrastructure, security)
- **High**: Strong business case, high ROI or strategic importance
- **Medium**: Valuable but can be deferred if needed
- **Low**: Nice to have, can be postponed

---

## Working with the CAPEX list

The CAPEX list (at **Budget Management > CAPEX**) is your main view for browsing, filtering, and navigating capital items.

### Default columns

| Column | What it shows |
|---|---|
| **Description** | Name of the investment |
| **Company** | Paying company |
| **PP&E Type** | Hardware or Software |
| **Investment Type** | Purpose of the investment |
| **Priority** | Business priority level |
| **Y Allocation** | Current-year allocation method label |
| **Y Budget** | Current-year planned capital budget (reporting currency) |
| **Y Landing** | Current-year final actual capital expenditure (reporting currency) |
| **Y+1 Budget** | Next-year planned capital budget (reporting currency) |

### Additional columns

These columns are hidden by default. Show them from the column chooser (hamburger menu in the grid header):

| Column | What it shows |
|---|---|
| **Y+1 Allocation** | Next-year allocation method label |
| **Y-1 Landing** | Prior-year final actual capital expenditure |
| **Currency** | Item-level currency code |
| **Start** | Effective start date |
| **End** | Effective end date |
| **Notes** | Free-form notes |
| **Task** | Title of the most recent task linked to this item |
| **Enabled** | Status (enabled or disabled) |

### Quick search

The search box at the top searches across description, notes, PP&E type, investment type, priority, currency, and status. Results update in real time as you type.

### Column filters

Each filterable column header has a filter icon. **Company**, **PP&E Type**, **Investment Type**, **Priority**, and **Currency** use checkbox set filters with **All**, **None**, and a clear button. Multiple filters combine with AND logic.

### Sorting

Click a column header to sort ascending or descending. The list remembers your last sort when you return.

### Totals row

The pinned row at the bottom shows totals for all budget columns. Totals respect your current filters and search. All amounts are converted to your reporting currency, shown in the page title (e.g., "CAPEX (EUR)").

### Deep linking

Click any cell in a row to open the workspace on the tab most relevant to that column:

- **Description**, **Company**, **PP&E Type**, **Investment Type**, **Priority**: Opens **Overview**
- **Y Budget**, **Y Landing**: Opens **Budget** tab for the current year
- **Y-1 Landing**: Opens **Budget** tab for the prior year
- **Y+1 Budget**: Opens **Budget** tab for next year
- **Y Allocation**: Opens **Allocations** tab for the current year
- **Y+1 Allocation**: Opens **Allocations** tab for next year
- **Task**: Opens the **Tasks** tab

### Status filter

Use the **Show: Enabled / Disabled / All** toggle above the grid to control lifecycle scope (defaults to **Enabled**). Pick **Disabled** to review archived investments or **All** to include both states. Totals update immediately.

### Search context preservation

Your list context -- sort order, search text, and active filters -- is preserved when you open an item and restored when you return to the list. This means you can drill into several items in sequence without losing your place.

### Prev/Next navigation

When you open an item, the workspace shows **Prev** and **Next** buttons. These navigate through the list in the current sort order, respecting filters and search. The counter (e.g., "Item 3 of 47") shows your position in the filtered list.

**Tip**: Use column filters and quick search to build focused views (e.g., "All hardware investments with high priority"), then navigate item-by-item with **Prev**/**Next** to review budgets.

---

## The CAPEX workspace

Click any row in the list to open the workspace. It has five tabs, each focused on a specific aspect of the capital item.

### Overview

This tab shows all the general information about the CAPEX item.

**What you can edit**:

- **Description**: What you are investing in (multiline text)
- **Paying Company**: Autocomplete from your Companies
- **Account**: Filtered by the paying company's Chart of Accounts
- **Supplier**: Autocomplete from your master data suppliers
- **PP&E Type**: Hardware or Software
- **Investment Type**: Replacement, Capacity, Productivity, Security, Conformity, Business Growth, or Other
- **Priority**: Mandatory, High, Medium, or Low
- **Currency**: Defaults to workspace CAPEX currency; shows only allowed currencies
- **Effective Start** and **Effective End**: Date fields in DD/MM/YYYY format
- **Notes**: Free-form internal notes

**Status and lifecycle**:

- Use the **Enabled** toggle or set a **Disabled date** to control when the item appears in reports and selection lists
- Disabled items are excluded from reports for years strictly after the disabled date
- Historical data remains intact; you will still see disabled items in reports covering years when they were active

**Save and Reset**:

- Changes are **not** saved automatically
- Click **Save** to persist your edits, or **Reset** to discard them
- If you try to navigate away with unsaved changes, you will be prompted to save or discard

**Tip**: If you see an "obsolete account" warning, it means the selected account does not belong to the paying company's Chart of Accounts. Choose a different account to resolve the warning.

---

### Budget

The Budget tab is where you enter financial data per year. It supports multiple budget columns and two input modes: **Flat totals** (annual total) and **Manual by month** (12-month breakdown).

**Year selection**:

- Use the year tabs at the top to switch between Y-2, Y-1, Y (current year), Y+1, and Y+2
- Each year has its own version, allocation method, and amounts
- Switching years with unsaved changes prompts a save/discard dialog

**Budget columns** (all years):

- **Budget**: Initial planned capital budget
- **Revision**: Mid-year budget update (e.g., after scope changes or reforecasts)
- **Follow-up**: Expected actual spending (your best estimate as the year progresses)
- **Landing**: Final actual capital expenditure after year-end close

**Flat vs Manual by month mode**:

- **Flat totals**: Enter one total per column; amounts are spread evenly across 12 months for allocation purposes
- **Manual by month**: Enter amounts per month (Jan through Dec) for granular project spend tracking
- Toggle between modes using the radio buttons at the top of the tab
- When switching modes, the system calculates monthly values from the flat total (equal spread) or sums monthly values back to a flat total

**Freeze behavior**:

- If a year's budget is frozen (via Budget Administration), inputs are disabled and show a "frozen" label
- You can still view frozen data; admins can unfreeze via **Budget Management > Budget Administration > Freeze/Unfreeze**

**Delete and redistribute** (manual by month mode only):

- Click the delete icon next to a month to zero out that month and redistribute its value across other unlocked months
- Useful for removing placeholder months or adjusting project timelines
- Locked months (previously deleted in this session) are excluded from redistribution

**Notes field**:

- Each year's budget version has a **Notes** field for year-specific comments (e.g., "Deferred to Q2 due to vendor delays")

**How to use it**:

1. Select the year you are planning for
2. Choose Flat totals or Manual by month mode
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

1. **Headcount (Default)**: Splits capital spend proportionally by each company's headcount for the selected year. Requires all active companies to have headcount > 0. Percentages update automatically when you edit company metrics.

2. **IT Users**: Splits spend proportionally by each company's IT user count for the selected year. Useful for IT infrastructure investments that scale with IT staff.

3. **Turnover**: Splits spend proportionally by each company's turnover (revenue) for the selected year. Useful for business-wide platforms or infrastructure.

4. **Manual by Company**: You select which companies receive this capital investment. Choose a driver (Headcount, IT Users, or Turnover) to calculate percentages among the selected companies. Only the selected companies are included in the split. The system auto-prefills all enabled companies on first use; remove companies that do not benefit from this investment.

5. **Manual by Department**: You select specific company/department pairs. Percentages are calculated from each department's headcount. Useful when a capital investment benefits only certain departments (e.g., manufacturing equipment).

**How percentages work**:

- For **auto methods** (Headcount, IT Users, Turnover): percentages are computed on every page load from the latest company metrics. You do not edit them directly.
- For **manual methods**: you pick the companies or departments, and the system calculates percentages based on your chosen driver and the current metrics.
- Percentages reflect live data. If you update a company's headcount, allocations recalculate immediately.

**Viewing allocations**:

- The grid shows: Company, Department (if applicable), Percentage
- The total percentage should equal 100%; warnings appear if metrics are missing or sum to zero

**How to use it**:

1. Select the year
2. Choose an allocation method from the dropdown
3. If using a manual method, select the companies or departments (remove any that do not benefit from this investment)
4. Click **Save** to persist the method and selection

**Common issues**:

- **"Missing metrics" error**: One or more companies have zero or missing headcount/IT users/turnover for the selected year. Fill in the metrics in **Master Data > Companies** (Details tab).
- **"Total is not 100%"**: Usually caused by missing metrics. Fix the company data and reload allocations.

**Tip**: Use Headcount for most items (it is simplest and updates automatically). Reserve Manual by Company for investments that benefit only specific entities (e.g., regional data center). Use Manual by Department for highly targeted investments.

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
- Having CAPEX manager access does not automatically grant task editing rights; check with your admin if you cannot create tasks
- Tasks can also be viewed and managed from **Portfolio > Tasks**, which shows all tasks across your organization
- The latest task title is also shown in the list view's **Task** column (hidden by default)

**Tip**: Use tasks to capture action items during capital planning or approval cycles. Set due dates to track procurement milestones and implementation deadlines.

---

### Relations

The Relations tab links this CAPEX item to related objects: Projects, Contracts, Contacts, Relevant Websites, and Attachments.

**Projects**:

- Use the autocomplete to link one or more projects
- This helps group capital spend by project in reports and enables project accounting
- Remove a project by clicking the X on its chip, then save

**Contracts**:

- Use the autocomplete to link one or more contracts
- When linked, the contract name appears for quick reference
- Contracts can also link to multiple CAPEX items (many-to-many relationship)
- Remove contracts by clicking the X on the chip, then save

**Contacts**:

- Link contacts to this CAPEX item with a role: **Commercial**, **Technical**, **Support**, or **Other**
- Click **Add** to select a contact from your master data and assign a role
- Contacts inherited from the supplier are shown with a filled chip; manually added contacts show an outlined chip
- Click a contact row to open the contact workspace
- Remove a contact by clicking the delete icon in the Actions column

**Relevant websites**:

- Add URLs related to this investment (e.g., vendor product pages, technical documentation, internal wikis)
- Each link has an optional **Description** field for context
- Click **Add URL** to add more links
- Links are saved when you click **Save** at the top of the workspace

**Attachments**:

- Upload files related to this capital item (e.g., quotes, vendor proposals, technical specs, approval memos)
- Drag and drop files into the attachment area, or click **Select files** to browse
- All files are stored securely and can be downloaded by clicking the file name
- Delete attachments by clicking the X on the file chip (requires `capex:manager` permission)
- Attachments are saved immediately upon upload (no need to click Save)

**Why link?**:

- **Projects**: Roll up capital spend by project for project accounting and reporting
- **Contracts**: Track which capital items are covered by purchase agreements or service contracts
- **Contacts**: Keep vendor and stakeholder contact details associated with the investment
- **Websites & Attachments**: Centralize all investment-related documentation and references for easy access

**Tip**: Upload vendor quotes, approval memos, and technical specs as attachments. Link contracts for procurement tracking. Use contacts to keep vendor representatives associated with each capital item.

---

## CSV import/export

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

- **Unique key**: CAPEX items are identified by `description`. If a description already exists, it is **skipped** (no updates).
- **Insert-only**: The importer only creates new items; it will not update existing ones. Use the UI to edit existing items.
- **References**: `company_name` must match a Company by name (case-insensitive).
- **PP&E Type**: Must be `hardware` or `software` (case-insensitive).
- **Investment Type**: Must be one of: `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` (case-insensitive).
- **Priority**: Must be `mandatory`, `high`, `medium`, or `low` (case-insensitive).
- **Budgets**: Budget columns populate Y-1, Y, and Y+1 versions. Amounts are spread evenly across 12 months (flat mode).

**Common errors**:

- **"Company not found"**: Create the company in **Master Data > Companies** first, then re-import.
- **"Invalid ppe_type"**: Use `hardware` or `software` exactly.
- **"Invalid investment_type"**: Use one of the 7 valid investment types (see list above).
- **"Invalid priority"**: Use `mandatory`, `high`, `medium`, or `low`.
- **"Invalid currency"**: Use 3-letter ISO codes (USD, EUR, GBP) that are allowed in your workspace currency settings.
- **"Header mismatch"**: Download a fresh template; headers must match exactly (including order).

**Tip**: Start with the template export, fill in a few rows, and run a preflight to catch issues early. Fix errors in the CSV and re-upload until preflight passes, then load.

---

## Status and lifecycle

Every CAPEX item has a **status** (Enabled or Disabled) and an optional **Disabled date** that controls when it appears in reports and selection lists.

**How it works**:

- **Enabled**: The item is active and appears everywhere (lists, reports, allocations)
- **Disabled date**: When set, the item is disabled at the end of that day
- After the disabled date:
  - The item no longer appears in selection lists for new contracts or allocations
  - It is excluded from reports for years strictly after the disabled date
  - Historical data remains intact; the item still appears in reports covering years when it was active

**Setting status**:

- In the **Overview** tab, use the **Enabled** toggle or set a **Disabled date**
- You can schedule a future disabled date (useful for planned asset disposals or end-of-life dates)

**Viewing disabled items**:

- By default, the CAPEX list shows only **Enabled** items
- Use the **Show: Enabled / Disabled / All** toggle to change the scope

**When to disable vs delete**:

- **Prefer disabling**: Keeps history intact, ensures reports remain consistent, and supports audit trails
- **Delete only if**: The item was created by mistake and has no budgets, allocations, or tasks
- Deletion is guarded: you cannot delete an item that has budget data, allocations, tasks, or is referenced by contracts

**Tip**: Use the Disabled date to mark assets that have been fully depreciated, disposed of, or projects that have completed. Do not delete unless it is a true mistake.

---

## Permissions

CAPEX access is controlled by three levels:

- `capex:reader` -- View CAPEX list, open items, see budgets and allocations (read-only)
- `capex:manager` -- Create and edit CAPEX items, update budgets and allocations, upload attachments, manage links and contacts
- `capex:admin` -- All manager rights plus CSV import, budget operations (freeze, copy, reset), and bulk delete

Additionally:

- Tasks have separate permissions (`tasks:member` to create/edit tasks on CAPEX items)
- Users with `tasks:reader` can view tasks but not create or edit them

If you cannot perform an action (e.g., the **Import CSV** button is missing), check with your workspace admin to review your role permissions.

---

## Tips

- **Start simple**: Create items with just the essentials (description, PP&E type, investment type, company), then add budgets and allocations as you plan.
- **Use Headcount allocation**: For most capital investments, Headcount is enough. Reserve manual allocations for investments that benefit specific companies or departments only.
- **Link contracts**: If you manage capital purchases via contracts, link them in the Relations tab for procurement tracking.
- **Upload documentation**: Use the attachments feature to store vendor quotes, approval memos, and technical specs alongside the item.
- **Classify accurately**: Use Investment Type and Priority consistently to enable meaningful capital spend analysis and prioritization.
- **Keep company metrics current**: Allocations depend on company headcount, IT users, and turnover. Outdated metrics cause allocation errors.
- **Use CSV for bulk setup**: If you are migrating from another system or have many capital items, start with CSV import.
- **Disable, do not delete**: Preserve history by disabling items when assets are disposed of or projects complete.
- **Review the totals row**: Before finalizing capital budgets, check the pinned totals row to ensure your capital spend adds up as expected.
- **Use deep linking**: Click directly on a budget or allocation column in the list to jump straight to that tab and year.
- **Track spend timing**: For large projects with phased spending, use manual by month mode to track spend against project milestones.
- **Freeze after year-end**: Use Budget Administration to freeze prior year budgets once actuals are finalized, preventing accidental edits.
