# Charts of Acacounts and Account Management

Charts of Accounts (CoA) organize your accounting structure by grouping accounts into named sets. Each company can be linked to a CoA, which determines which accounts are available when recording OPEX or CAPEX items.

## Why use Charts of Accounts?

Without CoAs, all accounts are available to all companies, making it easy to accidentally use the wrong account or mix accounting standards across entities. Charts of Accounts solve this by:

  - **Ensuring consistency**: Companies only see accounts from their assigned CoA
  - **Supporting multiple standards**: Different countries or business units can use different account structures
  - **Simplifying selection**: Account dropdowns show only relevant accounts, not your entire catalog
  - **Enabling templates**: Load pre-configured account sets from country-specific templates

**Example**: Your French subsidiary uses the French PCG (Plan Comptable Général), while your UK entity uses UK GAAP. Create two CoAs—one for each standard—and assign companies accordingly. When recording spend, users automatically see the correct accounts.

## The relationship: CoA → Company → Accounts

The hierarchy works like this:

```
Chart of Accounts (FR-2024)
  ↓ assigned to
Company (Acme France)
  ↓ used when recording
OPEX/CAPEX items → Account selection (filtered to FR-2024 accounts only)
```

**Key points**:
  - One CoA can be assigned to multiple companies
  - Each company has one CoA 
  - Accounts belong to one CoA
  - When you create/edit spend items, the account dropdown is filtered by the company's CoA

## Setting up Charts of Accounts

### Creating a CoA

You can create a CoA in two ways:

1. **From scratch**: Choose a Scope and then create an empty CoA.
   - **Scope**: `GLOBAL` (no country) or `COUNTRY` (requires a 2‑letter `country_iso`)
   - For `COUNTRY` scope, you may mark it as the default for that country. Only one default per country exists at a time.
   - You can later load accounts via CSV.
2. **From a template**: Load a pre-configured account set maintained by platform admins.
   - Global templates create a `GLOBAL`‑scoped CoA (no country field).
   - Country templates create a `COUNTRY`‑scoped CoA with the template’s country prefilled.

**Defaults**:
  - Per-country: You can mark one CoA as the default for each country. New companies from that country are automatically assigned to that CoA (you can change it later in the company's Overview tab).
  - Global fallback: Your workspace can have a Global Default CoA used for countries that don’t have a country-specific default yet. Country defaults take precedence; the global default applies everywhere else.

### Loading from templates

Templates are standard account sets managed by platform administrators. They can be:
  - Country‑specific (e.g., French PCG, UK GAAP)
  - Global (available for all countries)

**How it works**:
  - Go to **Master Data → Charts of Accounts**
  - Click **New** → **Copy from template**
- Select a template; global templates show as “ALL — …” (loads a `GLOBAL` CoA); country templates display their 2‑letter code
  - The system shows a preflight report (how many accounts will be inserted/updated)
  - Confirm to copy accounts into your CoA

**What gets copied**: Account numbers, names, descriptions, consolidation mappings, and status. The accounts become yours to edit—changes to the platform template won't affect your CoA unless you explicitly reload it.

**Tip**: After loading a template, you can add company-specific accounts, rename entries, or disable unused accounts. Templates provide a starting point, not a locked structure.

### Global Default CoA (Provisioning)

New workspaces can be provisioned with a preloaded CoA (for example, “IFRS‑Basic”) when a platform global template is marked “Loaded by default”. This CoA is created with scope `GLOBAL` (no country) and set as the tenant’s Global Default so that companies without a country default can use it immediately. You can edit or delete the preloaded accounts/CoA later as needed (subject to standard guardrails).

Global CoAs now appear as “Global” in the Charts of Accounts page (Scope column), with the Country column left blank. Only `GLOBAL` CoAs can be marked as the Global Default, and only `COUNTRY` CoAs can be set as a per-country default.

## Managing Accounts

### The Accounts page

The **Master Data → Accounts** page shows all accounts across all your Charts of Accounts (plus legacy accounts without a CoA).

**Key features**:
- **CoA column**: Shows which Chart of Accounts each account belongs to
  - **Filtering by CoA**: Click the filter icon in the CoA column to show only accounts from specific CoAs
  - **Deep linking**: Clicking "Open Accounts" from the Charts of Accounts page filters the list to that CoA
  - **Native name**: If an account has a `native_name` (original local-language name), hovering over the account name shows it as a tooltip

### Account numbers

Account numbers are stored as text but typically contain numeric values. When editing accounts:
  - You can enter numbers (e.g., `6011`) or text (e.g., `6011-TRAVEL`)
  - The system automatically converts numeric inputs to strings
  - Within a CoA, account numbers should be unique (enforced after backfill)

### Native names for multilingual support

Some countries require accounts to be recorded in the local language. Use the **Native Name** field to store the original name while keeping the English name in the main **Account Name** field.

**Example**: French account
  - **Account Name**: `Travel expenses` (English, for reporting)
  - **Native Name**: `Frais de déplacement` (French, for legal compliance)

The UI shows the English name by default with the native name as a tooltip. You can enable the "Native Name" column in the grid's column chooser if you need to see both at once.

## Consolidation accounts (Group-level reporting)

For multi-country organizations, daily work is done using local Charts of Accounts (French PCG, UK GAAP, German HGB, etc.), but group-level reporting often requires consolidation to a common standard like **IFRS** or **US GAAP**.

**Consolidation accounts** solve this by mapping local accounts to standardized consolidation accounts.

### How it works

Each account can have three consolidation fields:
  - **Consolidation Account Number**: The standardized account number (e.g., IFRS account `6200`)
  - **Consolidation Account Name**: The standardized name (e.g., `IT Services and Software`)
  - **Consolidation Account Description**: Optional details about the consolidation category

**Example mapping**:

| Country | Local CoA | Local Account | Local Name | → | Consolidation Account | Consolidation Name |
|---------|-----------|---------------|------------|---|----------------------|-------------------|
| France | FR-PCG | 6061 | Frais postaux | → | 6200 | IT Services and Software |
| UK | UK-GAAP | 5200 | Postage and courier | → | 6200 | IT Services and Software |
| Germany | DE-HGB | 4920 | Portokosten | → | 6200 | IT Services and Software |

All three local accounts map to the same IFRS consolidation account `6200`, enabling group-level aggregation.

### Why this matters

**Daily operations**: Users work with their familiar local accounts
  - French users select account `6061 - Frais postaux`
  - UK users select account `5200 - Postage and courier`
  - German users select account `4920 - Portokosten`

**Group reporting**: The system can roll up costs by consolidation account
  - All IT services costs across countries aggregate to `6200 - IT Services and Software`
  - Management sees a unified view regardless of local accounting differences
  - Statutory reporting per country still uses local accounts

### Setting up consolidation mappings

**Option 1: Templates**
If you load accounts from platform templates, consolidation mappings may already be included (depending on the template). Check the consolidation columns after loading.

**Option 2: CSV import**
When importing accounts, include the consolidation fields in your CSV:

```
coa_code;account_number;account_name;consolidation_account_number;consolidation_account_name;consolidation_account_description
FR-PCG;6061;Frais postaux;6200;IT Services and Software;
UK-GAAP;5200;Postage and courier;6200;IT Services and Software;
DE-HGB;4920;Portokosten;6200;IT Services and Software;
```

**Option 3: Manual entry**
Edit accounts individually and fill in the consolidation fields in the account workspace.

### Best practices

  - **Use a common standard**: IFRS is typical for European groups; US GAAP for American companies
  - **Maintain a consolidation chart**: Keep a separate reference document listing your consolidation accounts and what they represent
  - **Map at the right granularity**: Don't consolidate too broadly (loses insight) or too narrowly (too complex)
  - **Involve finance**: Consolidation account mappings should align with your group's financial reporting requirements
  - **Update systematically**: When you add local accounts, immediately map them to consolidation accounts

### Reporting with consolidation accounts

When building reports, you can choose to group by:
  - **Local accounts**: Shows country-specific detail (for local management)
  - **Consolidation accounts**: Shows group-level categories (for executive reporting)

This dual view lets you satisfy both local compliance requirements and group reporting needs without maintaining duplicate data.

## Legacy accounts (migration support)

**Legacy accounts** are accounts without a `coa_id` (created before Charts of Accounts were introduced).

**How they work**:
  - Companies WITHOUT a CoA can use legacy accounts
  - Companies WITH a CoA cannot use legacy accounts—they're filtered out automatically
  - Legacy accounts appear in the Accounts page with an empty CoA column

**Migration path**:
  1. Create or load Charts of Accounts for your companies
  2. Assign CoAs to companies (in Company Overview tab)
  3. Assign `coa_id` to your legacy accounts (via CSV import with `coa_code` or bulk edit)
  4. Update existing OPEX/CAPEX items that show "obsolete account" warnings

**Tip**: You don't have to migrate everything at once. Companies without a CoA continue to work with legacy accounts, allowing gradual adoption.

## Obsolete account warnings

When editing OPEX or CAPEX items, you might see:

```
⚠️ Obsolete account detected. The selected account does not belong to
the company's Chart of Accounts. Please update the account.
```

**Why this happens**:
  - The item's account belongs to CoA "A"
  - The item's company belongs to CoA "B"
  - Mismatch detected

**Common scenarios**:
  - You migrated a company to a new CoA but haven't updated old spend items yet
  - An account was manually reassigned to a different CoA
  - You're viewing historical data from before the CoA migration

**How to fix it**: Edit the item and select an account from the company's current Chart of Accounts. The warning will disappear once the account matches the company's CoA.

## Status and Disabled date

Accounts use the same lifecycle management as other master data:

  - **Enabled** by default
  - Set a **Disabled date** to stop using an account from a specific date
  - After the Disabled date:
      - The account no longer appears in selection dropdowns for new items
      - Historical data remains intact; existing items keep their account assignments
      - Reports for years when the account was active still include it

## Tenant deletion and CoA

When a workspace (tenant) is deleted by a platform administrator, all tenant‑owned accounting data is permanently removed as part of the purge process:
- Charts of Accounts (`chart_of_accounts`)
- Accounts (`accounts`)
- Links from companies to a CoA (`companies.coa_id`)

Deletion is immediate and irreversible. The tenant record remains for auditability, and its slug is cleared for reuse.

**Tip**: Prefer disabling over deleting. Deletion is only allowed if no OPEX/CAPEX items reference the account.

## CSV import/export

### Charts of Accounts

You can export a list of your CoAs (with metadata like code, name, country, default status) but not import CoAs directly via CSV. Create CoAs through the UI or load them from templates.

### Accounts (global)

The global **Accounts** page CSV includes a `coa_code` column to identify which CoA each account belongs to.

  - **Export**
      - **Template**: headers only (use this to prepare imports)
      - **Data**: all accounts with their CoA codes, account numbers, names, native names, descriptions, consolidation mappings, and status
  - **Import**
      - Start with **Preflight** (validates structure, encoding, required fields, duplicates)
      - If Preflight is OK, **Load** applies inserts/updates
      - **Matching**: by `(coa_code, account_number)` within your workspace
      - **Required fields**: `coa_code`, `account_number`, `account_name`
      - **Optional fields**: `native_name`, `description`, consolidation fields, `status`
      - Duplicates in the file (same coa_code + account_number) are deduplicated; first occurrence wins

**CSV schema** (semicolon `;` separated, UTF-8):
```
coa_code;account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```

### Accounts (CoA-scoped)

When you click "Open Accounts" from a specific CoA, the export/import buttons work on that CoA only.

  - **Export**: accounts from this CoA (no `coa_code` column needed)
  - **Import**: accounts are inserted/updated into this CoA automatically

**CSV schema** (CoA-scoped, semicolon `;` separated, UTF-8):
```
account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```

**Notes**:
  - Use **UTF-8 encoding** and **semicolons** as separators
  - The `coa_code` must match an existing Chart of Accounts in your workspace
  - Account numbers should be unique within a CoA
  - Status values: `enabled` or `disabled` (defaults to enabled)

## Working with the list

### Charts of Accounts page

  - **Key columns**: Code, Name, Country, Default (per country), Companies Count, Accounts Count
  - **Actions**: New (from scratch or template), Set Default, Delete (guarded), Open Accounts
  - **Guarded deletion**: You can only delete a CoA if no companies reference it and no OPEX/CAPEX items use its accounts

### Accounts page

  - **CoA column**: Shows which Chart of Accounts each account belongs to (or empty for legacy)
  - **Filtering**: Use the CoA filter to narrow down to specific Charts of Accounts
  - **Sorting**: Click column headers to sort (including by CoA code)
  - **Deep linking**: URL parameter `?coaId=X` automatically filters to that CoA (used when clicking "Open Accounts" from a CoA)

## Tips

  - **Start with templates**: If your country has a template, load it instead of building from scratch. You can always customize after loading.
  - **One default per country**: Set a default CoA for each country so new companies are automatically assigned to the right account structure.
  - **Native names for compliance**: Use the Native Name field if local regulations require accounts in the local language.
  - **Migrate gradually**: You don't have to convert everything at once. Companies without CoAs continue to work with legacy accounts.
  - **Fix obsolete accounts**: When you see warnings, update the account to match the company's current CoA. This keeps your data clean for reporting.
  - **Disable over delete**: Disabling accounts preserves history. Only delete accounts that were created by mistake and have never been used.
  - **CSV imports are additive**: Importing accounts adds new ones and updates existing ones (matched by coa_code + account_number). It doesn't delete accounts not in the file.
  - **Consolidation accounts are key for groups**: If you operate in multiple countries, set up consolidation mappings from day one. This makes group-level reporting effortless and keeps local users working with familiar accounts.
  - **IFRS as consolidation standard**: Most European groups use IFRS for consolidation. Define your IFRS chart once, then map each local account to its IFRS equivalent.

## Common scenarios

### Scenario 1: Multi-country organization

You have subsidiaries in France, UK, and Germany, each following local accounting standards.

**Setup**:
  1. Create three CoAs: `FR-PCG`, `UK-GAAP`, `DE-HGB` (or load from templates)
  2. Set each as the default for its country
  3. Assign companies to their respective CoAs
  4. New companies automatically get the right CoA; account selection is filtered accordingly

### Scenario 2: Migrating from legacy to CoA

You have 50 accounts and 5 companies, all set up before Charts of Accounts existed.

**Migration steps**:
  1. Create a CoA (e.g., `US-GAAP`)
  2. Export your accounts to CSV
  3. Add a `coa_code` column (e.g., `US-GAAP`) to all rows
  4. Import the updated CSV (accounts now belong to the CoA)
  5. Assign the CoA to your companies
  6. Edit any OPEX/CAPEX items showing "obsolete account" warnings

### Scenario 3: Switching a company to a new CoA

Your UK subsidiary switches from UK GAAP to IFRS.

**Steps**:
  1. Create a new CoA: `UK-IFRS` (or load from template)
  2. In the company's Overview tab, change Chart of Accounts to `UK-IFRS`
  3. Going forward, users can only select accounts from `UK-IFRS`
  4. Existing OPEX/CAPEX items keep their old accounts but show warnings
  5. Update items as needed (or leave historical data as-is if reporting allows)

### Scenario 4: Setting up group consolidation (multi-country)

Your group has subsidiaries in France, UK, and Germany. Each country uses its local accounting standard, but you need consolidated IFRS reporting.

**Setup**:
  1. Define your IFRS consolidation chart (e.g., `6000-6999` for IT costs)
      - `6100` - Hardware and infrastructure
      - `6200` - IT services and software
      - `6300` - Telecommunications
      - `6400` - IT personnel costs

  2. Create or load local CoAs for each country:
      - `FR-PCG` (French Plan Comptable Général)
      - `UK-GAAP` (UK Generally Accepted Accounting Principles)
      - `DE-HGB` (German Handelsgesetzbuch)

  3. Map local accounts to IFRS consolidation accounts:
      - FR-PCG `6183` (Matériel informatique) → IFRS `6100` (Hardware and infrastructure)
      - UK-GAAP `4200` (Computer equipment) → IFRS `6100` (Hardware and infrastructure)
      - DE-HGB `4855` (IT-Ausrüstung) → IFRS `6100` (Hardware and infrastructure)

  4. Import mappings via CSV or set them up in each account's workspace

**Result**:
  - French users work with French PCG accounts in their daily tasks
  - UK users work with UK GAAP accounts
  - German users work with HGB accounts
  - Group finance runs reports by consolidation account to see total spend in IFRS categories
  - Both local statutory reporting and group IFRS reporting work seamlessly from the same data

## Frequently asked questions

**Q: Can I have accounts that belong to multiple CoAs?**
A: No. Each account belongs to exactly one CoA (or none for legacy accounts). If you need the same account structure in multiple CoAs, load the template into each one or use CSV export/import with different `coa_code` values.

**Q: What happens if I delete a Chart of Accounts?**
A: Deletion is blocked if any companies reference it or any OPEX/CAPEX items use its accounts. Reassign companies and update items first, then you can delete the CoA. Deleting a CoA also deletes all accounts within it that aren't referenced elsewhere.

**Q: Can I rename account numbers?**
A: Yes, in the account's workspace. Changing the account number updates all references in OPEX/CAPEX items automatically (the account's UUID remains the same internally).

**Q: How do I see which companies use a specific CoA?**
A: The Charts of Accounts list shows a "Companies Count" column. Click the CoA to open its workspace for details, or filter the Companies page by CoA.

**Q: What if my country doesn't have a template?**
A: Create a CoA from scratch and add accounts manually or via CSV import. If you have a standard account list from a reliable source, you can import it directly.

**Q: Can I edit accounts that came from a template?**
A: Yes. Once you load a template, the accounts are copied into your CoA and become fully editable. Changes to the platform template don't affect your CoA unless you explicitly reload it (which overwrites your changes if you choose "overwrite" mode).

**Q: Are consolidation account mappings required?**
A: No, they're optional. If you only operate in one country or don't need group-level consolidation, you can leave these fields empty. Consolidation accounts are only needed for multi-country organizations that report at group level using a different standard than their local accounting.

**Q: Can multiple local accounts map to the same consolidation account?**
A: Yes, that's the whole point! Many local accounts across different CoAs can map to the same consolidation account. This is how you aggregate costs from different countries into a single consolidated category.

**Q: What happens if I change a consolidation mapping?**
A: Existing OPEX/CAPEX items don't store consolidation data directly—they reference the account, which has the consolidation mapping. When you change a mapping, all historical and future items using that account will report under the new consolidation account. Update mappings carefully if you need to preserve historical reporting categories.
