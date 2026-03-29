# OPEX

OPEX (Operating Expenditure) items are your recurring IT costs: software licenses, cloud subscriptions, maintenance contracts, and services. This is where you plan budgets, track actuals, and allocate costs across your organization.

The OPEX espace de travail helps you manage each spend item from initial budgeting through execution and reporting -- all in one place with year-by-year budget columns, flexible allocation methods, and direct links to suppliers, contracts, applications, and projects.

## Premiers pas

Navigate to **Gestion budgétaire > OPEX** to see your list. Click **Nouveau** to create your first item.

**Required fields**:
  - **Product Name**: What you are spending on (e.g., "Salesforce Licenses", "AWS Compute")
  - **Supplier**: Who you are paying. Links to your Suppliers master data
  - **Currency**: ISO code (e.g., USD, EUR). Defaults to your espace de travail currency; you can override per item
  - **Paying Company**: Which company is paying the supplier (required for accounting)
  - **Account**: The general ledger account for this spend. Only accounts from the paying company's Chart of Accounts will appear
  - **Effective Start**: When this spend begins (DD/MM/YYYY)

**Optional but useful**:
  - **Description**: Additional context or notes about the spend
  - **Effective End**: When this spend stops (leave blank for ongoing items)
  - **IT Owner** / **Business Owner**: Who is responsible
  - **Analytics Category**: Custom grouping for reporting (e.g., "Infrastructure", "Business Apps"). New categories can be created on the fly
  - **Notes**: Free-form internal notes

Once you save, l'espace de travail unlocks all tabs: **Overview**, **Budget**, **Allocations**, **Tasks**, and **Relations**.

**Tip**: You can create items quickly and fill in budgets and allocations later. Start with the essentials and iterate.

---

## Working with the OPEX list

The OPEX list (at **Gestion budgétaire > OPEX**) is your main view for browsing, filtering, and navigating spend items.

**Default columns**:
  - **Product Name**: The item name (links to the Overview tab)
  - **Supplier**: The supplier name
  - **Paying Company**: Which company pays for this item
  - **Contract**: The latest linked contract name (links to the Contract espace de travail)
  - **Account**: The GL account number and name
  - **Allocation**: The allocation method label for the current year (links to the Allocations tab)
  - **Y Budget**: Current-year budget amount (links to the Budget tab for this year)
  - **Y Landing**: Current-year landing amount (links to the Budget tab for this year)
  - **Task**: The latest task title (links to the Tasks tab)

**Additional columns** (hidden by default, toggle via the column chooser):
  - **Y-1 Budget / Y-1 Landing**: Prior-year figures
  - **Y Revision / Y Follow-up**: Current-year revision and follow-up amounts
  - **Y+1 Budget / Y+1 Revision**: Next-year figures
  - **Y+2 Budget**: Two-years-out budget
  - **Enabled**: Item status (enabled or disabled)
  - **Description**: Item description
  - **Currency**: ISO currency code
  - **Effective Start / Effective End**: Start and end dates
  - **IT Owner / Business Owner**: Responsible users
  - **Analytics**: Analytics category name
  - **Project ID**: Linked project identifier
  - **Notes**: Internal notes
  - **Created / Updated**: Timestamps

**Filtering**:
  - **Quick search**: Searches across product name, supplier, description, and other text fields. Filters the list in real-time as you type
  - **Column filters**: Click the filter icon in any column header. **Paying Company**, **Account**, **Allocation**, **Currency**, **IT Owner**, **Business Owner**, and **Analytics** use checkbox set filters (multi-select). Other columns use text or number filters
  - **Status scope**: Use the **Show: Enabled / Disabled / All** toggle above the grid (defaults to **Enabled**)

**Sorting**:
  - Click a column header to sort ascending/descending
  - Default sort is by **Y Budget** descending
  - The list remembers your last sort, search, and filters when you return

**Totals row**:
  - The pinned row at the bottom shows totals for all budget columns
  - Totals respect your current filters and search

**Deep linking**:
  - Clicking any cell opens l'espace de travail on the most relevant tab:
    - **Product Name**, **Supplier**, **Paying Company**, **Account**, and other general columns: Opens the **Overview** tab
    - **Budget columns** (Y Budget, Y Landing, Y-1 Budget, etc.): Opens the **Budget** tab pre-set to that year
    - **Allocation**: Opens the **Allocations** tab for the current year
    - **Task**: Opens the **Tasks** tab
    - **Contract**: Opens the linked Contract espace de travail directly (not the OPEX espace de travail)

**Actions**:
  - **Nouveau**: Create a new OPEX item (requires `opex:manager`)
  - **Importer CSV**: Bulk-load items from CSV (requires `opex:admin`)
  - **Exporter CSV**: Export items to CSV (requires `opex:admin`)
  - **Delete Selected**: Bulk-delete selected items (requires `opex:admin`; select rows via checkboxes)

**Prev/Next navigation**:
  - When you open an item, l'espace de travail shows **Préc** and **Suiv** buttons
  - These navigate through the list in the current sort order, respecting filters and search
  - Your list context (sort, filters, search) is preserved when you close l'espace de travail

**Tip**: Use column filters + quick search to build focused views (e.g., "All cloud spend over 10k"), then navigate item-by-item with Prev/Next to review budgets.

---

## The OPEX espace de travail

Click any row in the list to open l'espace de travail. It has five tabs arranged vertically on the left, each focused on a specific aspect of the spend item.

### Overview

This tab shows all the general information about the spend item.

**What you can edit**:
  - **Product Name** (required)
  - **Description**
  - **Supplier** (autocomplete from your Suppliers master data; required)
  - **Currency** (defaults to espace de travail currency; shows only allowed currencies)
  - **Paying Company** (autocomplete from your Companies; required)
  - **Account** (filtered by the paying company's Chart of Accounts; required)
  - **Effective Start** and **Effective End** (date fields)
  - **IT Owner** and **Business Owner** (autocomplete from enabled users)
  - **Analytics Category** (autocomplete; creates new categories on the fly)
  - **Notes**

**Status and lifecycle**:
  - Use the **Enabled** toggle or set a **Disabled date** to control when the item appears in reports and selection lists
  - Disabled items are excluded from reports for years strictly after the disabled date
  - Historical data remains intact; you will still see disabled items in reports covering years when they were active

**Save and Reset**:
  - Changes are **not** saved automatically
  - Click **Enregistrer** to persist your edits, or **Réinitialiser** to discard them
  - If you try to navigate away or switch tabs with unsaved changes, you will be prompted to save or discard

**Tip**: If you see an "Obsolete account" warning, it means the selected account does not belong to the paying company's Chart of Accounts. Choose a different account to resolve the warning.

---

### Budget

The Budget tab is where you enter financial data per year. It supports multiple budget columns and two input modes: **Flat** (annual totals) and **Manual** (monthly breakdown).

**Year selection**:
  - Use the year tabs at the top to switch between Y-2, Y-1, Y (current year), Y+1, and Y+2
  - Each year has its own version, mode, and amounts
  - Switching years with unsaved changes prompts a save/discard dialog

**Budget columns**:
  - **Budget (planned)**: Initial annual budget approved at the start of the year
  - **Revision (committed)**: Mid-year budget update (e.g., after a reforecast)
  - **Follow-up (actual)**: Expected actual spend (your best estimate as the year progresses)
  - **Landing (expected landing)**: Final actual spend after year-end close

**Flat vs Manual mode**:
  - **Flat**: Enter one total per column; amounts are spread evenly across 12 months for allocation purposes
  - **Manual**: Enter amounts per month (Jan-Dec) for each column, plus a **Forecast** column for additional planning
  - Toggle between modes using the radio buttons at the top of the tab

**Freeze behavior**:
  - If a year's budget columns are frozen (via Budget Administration), the corresponding inputs become read-only
  - You can still view frozen data; admins can unfreeze via **Budget Management > Budget Administration > Freeze/Unfreeze**
  - Each column can be frozen independently (Budget, Revision, Follow-up, Landing)

**Notes field**:
  - Each year's budget version has a **Notes** field for year-specific comments (e.g., "Includes 10% price increase in Q3")

**How to use it**:
  1. Select the year you are planning for
  2. Choose Flat or Manual mode
  3. Fill in the relevant columns (Budget for initial planning, Follow-up for tracking, Landing for actuals)
  4. Click **Enregistrer** to persist your changes

**Tip**: For most items, Flat mode is faster. Use Manual mode when the spend varies significantly by month (e.g., seasonal licensing, one-time setup fees).

---

### Allocations

The Allocations tab distributes the spend across your companies and departments. This drives chargeback reports and cost-per-user KPIs.

**Year selection**:
  - Works the same as Budget: use year tabs to switch between Y-2, Y-1, Y, Y+1, Y+2
  - Each year can have a different allocation method

**Allocation methods**:

| Method | How it works |
|---|---|
| **Headcount (Default)** | Splits spend proportionally by each company's headcount for the selected year. This is the default method. No manual selection required -- percentages are computed automatically from company metrics. |
| **IT Users** | Splits spend proportionally by each company's IT user count for the selected year. |
| **Turnover** | Splits spend proportionally by each company's turnover (revenue) for the selected year. |
| **Manual by Company** | You select which companies receive this spend and choose a driver (Headcount, IT Users, or Turnover) to calculate percentages among the selected companies only. |
| **Manual by Department** | You select specific company/department pairs. Percentages are calculated from each department's headcount. Useful when a spend item benefits only certain departments (e.g., a CRM used by Sales). |

**How percentages work**:
  - For **automatic methods** (Headcount, IT Users, Turnover): percentages are computed from the latest company metrics on every page load. You do not edit them directly
  - For **manual methods**: you pick the companies or departments, and the system calculates percentages based on your chosen driver and the current metrics
  - Percentages reflect live data. If you update a company's headcount, allocations recalculate immediately
  - The total percentage indicator shows a running total. For auto methods the remainder is auto-distributed; for manual methods the preview uses live metrics

**How to use it**:
  1. Select the year
  2. Choose an allocation method from the dropdown
  3. If using Manual by Company, pick an allocation driver (Headcount, IT Users, or Turnover) and select companies
  4. If using Manual by Department, select company/department pairs
  5. Click **Enregistrer** to persist the method and selection

**Common issues**:
  - **"Missing metrics" error**: One or more companies have zero or missing headcount/IT users/turnover for the selected year. Fill in the metrics in **Données de référence > Sociétés** (Details tab)
  - **"Total is not 100%"**: Usually caused by missing metrics. Fix the company data and reload allocations

**Tip**: Use Headcount (Default) for most items -- it is the simplest and updates automatically. Reserve manual methods for spend that benefits specific companies or departments only.

---

### Tâches

The Tasks tab helps you track to-dos and follow-ups related to this OPEX item (e.g., "Renew license by Q3", "Review usage metrics").

**Task list**:
  - Shows all tasks linked to this OPEX item
  - Columns: **Title**, **Status**, **Priority**, **Due Date**, **Actions**
  - Click a task title to open the full espace de travail de la tâche
  - Default filter shows active tasks (hides done and cancelled)

**Filtering**:
  - Click the filter icon to show/hide filter controls
  - **Status filter**: All, Active (hides done/cancelled), Open, In Progress, Pending, In Testing, Done, or Cancelled
  - Click the clear button to reset filters

**Creating a task**:
  - Click **Add Task** to open the task creation espace de travail
  - The task is automatically linked to this OPEX item
  - Fill in the title, description, priority, assignee, and due date in the espace de travail de la tâche

**Deleting a task**:
  - Click the delete icon in the Actions column
  - Confirm the deletion in the dialog

**Notes**:
  - Tasks are independent objects with their own permissions (`tasks:member` to create/edit)
  - Having OPEX manager access does not automatically grant task editing rights; check with your admin if you cannot create tasks
  - Tasks can also be viewed and managed from **Portefeuille > Tâches**, which shows all tasks across your organization

**Tip**: Use tasks to capture action items during budget reviews or contract renewals. Set due dates to track upcoming deadlines.

---

### Relations

The Relations tab links this OPEX item to related objects: Projects, Applications, Contracts, Contacts, Relevant Websites, and Attachments.

**Projects**:
  - Use the autocomplete to link one or more projects from your Portfolio
  - This helps group spend by project in reports and enables project accounting
  - Remove projects by clicking the X on the chip, then save

**Applications**:
  - Use the autocomplete to link one or more applications from your IT catalogue
  - Linked application names appear as clickable chips that open the Application espace de travail
  - This helps track which OPEX items fund which applications or services

**Contracts**:
  - Use the autocomplete to link one or more contracts
  - When linked, the contract name appears in the OPEX list **Contract** column for quick reference
  - Contracts can link to multiple OPEX items (many-to-many relationship)
  - Remove contracts by clicking the X on the chip, then save

**Contacts**:
  - Add supplier contacts related to this spend item
  - Each contact has a **Role** (Commercial, Technical, Support, or Other)
  - Contacts can come from the supplier's contact list or be added manually
  - Useful for tracking who to reach out to for renewals, support issues, or negotiations

**Relevant websites**:
  - Add URLs related to this spend item (e.g., vendor portals, documentation, admin consoles, internal wikis)
  - Each link has an optional **Description** field for context
  - Click **Add URL** to add more links

**Attachments**:
  - Upload files related to this spend item (e.g., contracts, invoices, quotes, SOWs, technical specs)
  - Drag and drop files into the attachment area, or click **Select files** to browse
  - All files are stored securely and can be downloaded by clicking the file name
  - Delete attachments by clicking the X on the file chip (requires `opex:manager`)
  - Attachments are saved immediately upon upload (no need to click **Enregistrer**)

**Save behavior**:
  - **Projects**, **Applications**, **Contracts**, **Relevant Websites**: Saved when you click **Enregistrer** at the top of l'espace de travail
  - **Contacts**: Managed inline (add/remove actions save immediately)
  - **Attachments**: Saved immediately upon upload

**Tip**: Link contracts to track renewals across multiple OPEX items. Add vendor portal URLs for quick access. Upload quotes and invoices as attachments to centralize all spend-related documentation.

---

## Import/export CSV

You can bulk-load OPEX items via CSV to speed up initial setup or sync with external systems.

**Export**:
  1. Click **Exporter CSV** in the OPEX list
  2. Choose:
     - **Template**: Headers only (use this to create a blank CSV to fill in)
     - **Data**: All current OPEX items with budgets for Y-1, Y, and Y+1

**CSV structure**:
  - Delimiter: semicolon `;` (not comma)
  - Encoding: UTF-8 (save as "CSV UTF-8" in Excel)
  - Headers: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Import**:
  1. Click **Importer CSV** in the OPEX list
  2. Upload your CSV file (drag-and-drop or file picker)
  3. Click **Preflight** to validate:
     - Headers match exactly
     - Suppliers, accounts, and users exist in your espace de travail
     - Required fields (product_name, currency, effective_start, paying_company) are present
     - No duplicate product_name + supplier combinations
  4. Review the preflight report (shows counts and up to 5 sample errors)
  5. If OK, click **Load** to import

**Important notes**:
  - **Unique key**: OPEX items are identified by `(product_name, supplier_name)`. If a combination already exists, it is **skipped** (no updates)
  - **Insert-only**: The importer only creates new items; it will not update existing ones. Use the UI to edit existing items
  - **References**: `supplier_name` must match a Supplier by name (case-insensitive). `account_number` must match an Account. `owner_it_email` and `owner_business_email` must match enabled users by email
  - **Analytics Category**: If the category does not exist, it is created automatically during import
  - **Budgets**: Budget columns populate Y-1, Y, and Y+1 versions. Amounts are spread evenly across 12 months (flat mode)

**Common errors**:
  - **"Supplier not found"**: Create the supplier in **Données de référence > Fournisseurs** first, then re-import
  - **"Account not found"**: Add the account in **Données de référence > Plans comptables**, then re-import
  - **"Invalid currency"**: Use 3-letter ISO codes (USD, EUR, GBP) that are allowed in your espace de travail currency settings
  - **"Header mismatch"**: Download a fresh template; headers must match exactly (including order)

**Tip**: Start with the template export, fill in a few rows, and run a preflight to catch issues early. Fix errors in the CSV and re-upload until preflight passes, then load.

---

## Status and Lifecycle

Every OPEX item has a **status** (Enabled or Disabled) and an optional **Disabled date** that controls when it appears in reports and selection lists.

**How it works**:
  - **Enabled**: The item is active and appears everywhere (lists, reports, allocations)
  - **Disabled date**: When set, the item is disabled at the end of that day
  - After the disabled date:
    - The item no longer appears in selection lists for new contracts or allocations
    - It is excluded from reports for years strictly after the disabled date
    - Historical data remains intact; the item still appears in reports covering years when it was active

**Setting status**:
  - In the **Overview** tab, use the **Enabled** toggle or set a **Disabled date**
  - You can schedule a future disabled date (useful for planned end-of-contract items)

**Viewing disabled items**:
  - By default, the OPEX list shows only **Enabled** items
  - Use the **Show: Disabled** or **Show: All** toggle to see disabled items

**When to disable vs delete**:
  - **Prefer disabling**: Keeps history intact, ensures reports remain consistent, and supports audit trails
  - **Delete only if**: The item was created by mistake and has no budgets, allocations, or tasks
  - Deletion is guarded: you cannot delete an item that is referenced by contracts, tasks, or has budget data

**Tip**: Use the Disabled date to sunset OPEX items when contracts end or services are discontinued. Do not delete unless it is a true mistake.

---

## Conseils and Best Practices

1. **Start simple**: Create items with just the essentials (product name, supplier, paying company, account), then add budgets and allocations as you plan.

2. **Use the default allocation method**: For most items, Headcount (Default) is enough. Reserve manual allocations for spend that benefits specific companies or departments only.

3. **Link contracts**: If you manage spend via contracts, link them in the Relations tab. It makes renewals easier to track.

4. **Link applications**: Associate OPEX items with the applications or services they fund. This provides a clear cost-to-application mapping.

5. **Upload documentation**: Use the Attachments feature to store vendor contracts, quotes, invoices, and SOWs.

6. **Add vendor portal links**: Use Relevant Websites to link to vendor admin consoles, support portals, and documentation for quick access.

7. **Track contacts**: Add supplier contacts with roles (Commercial, Technical, Support) so your team knows who to call for each spend item.

8. **Leverage analytics categories**: Tag items with categories (Infrastructure, Business Apps, Security) to group spend in reports.

9. **Keep company metrics up to date**: Allocations depend on company headcount, IT users, and turnover. Outdated metrics cause allocation errors.

10. **Use CSV for bulk setup**: If you are migrating from another system or have hundreds of items, start with CSV import. Export a template, fill it in, and preflight before loading.

11. **Disable, do not delete**: Preserve history by disabling items when they are no longer active. Delete only if it is a mistake.

12. **Review the totals row**: Before finalizing budgets, check the pinned totals row in the list to ensure your spend adds up as expected.

13. **Use deep linking**: Click directly on a budget column in the list to jump to the Budget tab for that year. Click the Task column to jump to Tasks. This saves navigation time.

14. **Freeze budgets after year-end close**: Use Budget Administration to freeze prior-year budgets once actuals are finalized, preventing accidental edits.

---

## Autorisations

OPEX access is controlled by three levels:

- `opex:reader` -- View the OPEX list, open items, see budgets and allocations (read-only), download attachments
- `opex:manager` -- Create and edit OPEX items, update budgets and allocations, upload and delete attachments, manage relations and links
- `opex:admin` -- All manager rights plus CSV import/export, budget operations (freeze, copy, reset), and bulk delete

Additionally:
- Tasks have separate permissions (`tasks:member` to create/edit tasks on OPEX items)
- Users with `tasks:reader` can view tasks but not create or edit them

If you cannot perform an action (e.g., **Importer CSV** button is missing, cannot upload attachments), check with your espace de travail admin to review your role permissions.

---

## Need help?

- **CSV issues**: Download a fresh template, ensure UTF-8 encoding, and run preflight to see detailed errors
- **Allocation errors**: Check that all companies have the required metrics (headcount, IT users, turnover) for the selected year
- **Obsolete account warning**: The account does not belong to the paying company's Chart of Accounts; pick a different account
- **Missing buttons or tabs**: Your role may not have the required permission level (manager or admin). Contact your espace de travail admin
