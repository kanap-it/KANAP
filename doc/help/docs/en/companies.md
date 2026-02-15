# Companies

Companies are the foundation of your master data. They're the entities you allocate IT spend to and report chargebacks for.

When your workspace is created, it starts with one company named after your organization. Its country is the one you selected during trial signup, and it will auto‑assign to the default Chart of Accounts for that country when available. You can rename it or add more.

## Getting started

  - Create a company or open the existing one, then fill the essentials:
      - **Country** (ISO code), **City**, **Base Currency** (ISO code)
      - **Name** (what your teams recognize)
      - **Chart of Accounts** (automatically assigned based on country, but can be changed)
  - That's enough to start. You can add address, registration/VAT, and notes later as needed.

**Tip**: City and Base Currency are required; keep names unique to avoid confusion in imports and selection lists.

## Chart of Accounts

Each company can be linked to a **Chart of Accounts** (CoA), which defines the set of accounts available when recording OPEX or CAPEX items for that company.

**How it works**:
  - When you create a company, it's automatically assigned to the default CoA for its country (if one exists).
  - You can change the CoA assignment in the company's **Overview** tab using the Chart of Accounts selector.
  - The CoA you select determines which accounts appear in the account dropdown when creating or editing spend items for this company.

**What this means for your workflow**:
  - **Companies WITH a CoA**: When recording OPEX/CAPEX, you can only select accounts that belong to that company's Chart of Accounts. This ensures accounting consistency.
  - **Companies WITHOUT a CoA** (legacy): Can use accounts that don't belong to any Chart of Accounts. This supports gradual migration to the CoA system.
  - **Changing CoAs**: If you switch a company to a different CoA, existing spend items keep their current accounts (with a warning if they don't match the new CoA), but new items will use accounts from the new CoA.

**Setting up Charts of Accounts**:
  - Go to **Master Data → Charts of Accounts** to view, create, or manage your CoA sets.
  - You can create CoAs from scratch or load them from platform templates (country-specific standard account sets).
  - Each country can have one default CoA that's automatically assigned to new companies from that country.

**Tip**: If you see an "**obsolete account**" warning when editing OPEX/CAPEX items, it means the account doesn't belong to the company's current Chart of Accounts. Update the account to one from the correct CoA to resolve this.

## Status and Disabled date

Use the **Disabled date** to control when a company stops being "active."

  - **Enabled** by default. You can also schedule a future Disabled date.
  - After the Disabled date:
      - It no longer appears in selection lists for new allocations and is excluded from reports for strictly later years.
      - Historical data remains intact; the company still appears in reports covering years when it was active.
  - **Prefer disabling over deleting**. Deletion is only possible if nothing references the company (e.g., no allocations or spend).

## Yearly metrics (the "Details" tab)

Many parts of the app are year‑aware. Companies have metrics per year:

  - **Headcount** (required for the year)
  - **IT users** (optional)
  - **Turnover** (optional, in millions of the company's base currency)

**Where it matters**:

  - Allocations can use Headcount, IT users, or Turnover to distribute costs across companies for a given year.
  - Reports use these metrics for KPIs and ratios.
  - Only companies active for a year are considered for that year's allocation and reporting.

**Freeze and copy**:

  - You can **freeze** a year once finalized to prevent edits.
  - Use **Master Data Administration** to copy metrics from one year to another (choose which metrics to copy). Frozen years can't be overwritten.

## Working with the list

  - Use the **Year** selector at the top to view Headcount / IT users / Turnover for that year.
  - Quick search and column filters help you slice the list.
  - Click a row to open the workspace (**Overview** for general info, **Details** for yearly metrics).

## CSV import/export

Keep large sets in sync with your source systems using CSV (semicolon `;` separated).

  - **Export**
      - **Template**: header‑only file you can fill in (includes dynamic columns for Y‑1, Y, Y+1 based on the selected year).
      - **Data**: current companies plus their metrics for Y‑1/Y/Y+1.
  - **Import**
      - Start with **Preflight** (validates headers, encoding, required fields, duplicates, and metrics).
      - If Preflight is OK, **Load** will apply inserts/updates.
      - Matching is by company **name** (within your workspace). Duplicates in the file are deduplicated by name (first occurrence wins).
      - **Required fields**: Name, Country (2 letters), Base Currency (3 letters), City.
      - **Optional field**: `coa_code` (references a Chart of Accounts; if omitted, the default CoA for the country is used).
      - **Metrics**: If you provide any metrics for a year, Headcount is required for that year; IT users and Turnover are optional. Turnover accepts up to 3 decimals and must be expressed in millions of the company's base currency.

**Notes**:

  - Use **UTF‑8 encoding** and **semicolons** as separators.
  - The list refreshes automatically after a successful load.
  - If importing with `coa_code`, ensure the Chart of Accounts exists in your workspace first.

## Tips

  - **Disable over delete**: keep history consistent and reports meaningful.
  - **Chart of Accounts**: Assign CoAs to companies to ensure consistent account usage across OPEX/CAPEX items.
  - **Turnover**: enter values in millions of the company's base currency (e.g., 2.5 = 2.5 million in that currency).
  - **Headcount** is the most common allocation driver; keep it up to date for the current year.
  - If you **freeze metrics**, you can still review them, but edits are blocked until you unfreeze.
  - When migrating to Chart of Accounts, you can do it gradually—companies without a CoA continue to work with legacy accounts.
