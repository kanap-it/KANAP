# Applications

Applications is your central registry for documenting the IT application landscape. It covers business applications, productivity tools, infrastructure services, and everything in between. Use it to track ownership, environments, integrations, and compliance information across your entire portfolio.

## Application categories

Every application or service belongs to a **category** that describes its primary purpose. This classification helps different stakeholders filter and focus on what matters to them.

| Category | Description | Examples |
|----------|-------------|----------|
| **Line-of-business** | Core business applications that support specific business processes | SAP, Salesforce, Workday, custom ERP |
| **Productivity** | End-user tools for daily work, including utilities and collaboration | Office 365, Acrobat Reader, Teams, Slack, Chrome |
| **Security** | Tools for protecting systems, data, and access | CrowdStrike, Okta, SIEM platforms, firewalls |
| **Analytics** | Reporting, business intelligence, and data warehouse tools | Power BI, Tableau, Snowflake |
| **Development** | Tools used by developers and DevOps teams | Python, Git, Jenkins, VS Code, Docker |
| **Integration** | Platforms that connect systems and move data | MuleSoft, Kafka, API gateways, ETL tools |
| **Infrastructure** | Foundational services that other systems depend on | PostgreSQL, Redis, Kubernetes, storage systems |

**Tips for classification**:
- Choose based on the application's **primary purpose**, not who manages it
- When in doubt, ask: "What is this tool mainly used for?"
- Categories can be customized in **Cartographie SI > Paramètres** to match your organization's terminology

### Filtering by stakeholder

Different teams can use categories to focus on their area of responsibility:

| Stakeholder | Suggested filter |
|-------------|-----------------|
| Cybersecurity | Security category, or high criticality across all categories |
| Service Desk | Productivity + Line-of-business (user-facing applications) |
| Infrastructure | Infrastructure + Integration |
| Enterprise Architecture | All categories |

---

## Premiers pas

Navigate to **Cartographie SI > Applications** to see your list. Click **New App / Service** to create your first entry.

**Required fields**:
  - **Name**: A recognizable name for the application or service
  - **Category**: The primary purpose of this application (see categories above)

**Strongly recommended**:
  - **Vendor**: The supplier providing the software (links to your Suppliers master data)
  - **Criticality**: How important this is to your business (Business critical, High, Medium, Low)
  - **Lifecycle**: Current status (Active, Proposed, Deprecated, Retired)
  - **Category**: The application's primary purpose (Line-of-business, Productivity, Security, etc.)

**Optional but useful**:
  - **Publisher**: The software publisher (e.g., Microsoft, SAP, Oracle)
  - **Description**: What this application does
  - **Version**: Current version number (e.g., "4.2.1", "2023", "Q1 2024")
  - **Go Live Date** / **End of Support** / **Retired Date**: Version lifecycle dates
  - **Licensing**: License terms and notes
  - **Notes**: Free-form internal notes

Once you save, l'espace de travail unlocks all tabs for detailed documentation.

**Tip**: Start by documenting your most critical applications. Use the **Instances** tab to capture which environments exist (Prod, QA, Dev), then link assets and interfaces as you go.

---

## Travailler avec la liste

The Applications grid provides a comprehensive view of your application portfolio.

**Top scope filter**:
  - **My apps** (default): shows apps where you are listed in **Ownership & Audience** as either a **Business Owner** or **IT Owner**. Multi-owner entries are supported.
  - **My team's apps**: shows apps where any member of your Portfolio team is listed as Business Owner or IT Owner. Your own ownership is also included in this scope.
  - **All apps**: shows the full Applications grid (with the standard default lifecycle filter behavior).
  - If you are not assigned to a Portfolio team, **My team's apps** is disabled
  - Your selection is remembered across sessions -- returning to the page restores your last choice

**Default columns**:
  - **Name**: Application name with category badge and suite membership
  - **Category**: The application's primary purpose (Line-of-business, Productivity, etc.)
  - **Environments**: Chips showing active environments (Prod, Pre-prod, QA, Test, Dev, Sandbox)
  - **Lifecycle**: Current status
  - **Criticality**: Business importance level
  - **Publisher**: Software publisher
  - **Derived Users (Y)**: Calculated user count for the current year
  - **Created**: When the record was created

**Default sort**:
  - **Name** ascending (A to Z)

**Additional columns** (via column chooser):
  - **Suites**: Parent suites this application belongs to
  - **Supplier**: Linked supplier name
  - **Business Owners** / **IT Owners**: Assigned owners
  - **Hosting**: Derived from server locations assigned to app instances
  - **External Facing**: Whether the app is internet-accessible
  - **SSO Enabled** / **MFA Enabled**: Authentication features
  - **Data Integration / ETL**: Whether the app participates in data integrations
  - **OPEX Items** / **CAPEX Items** / **Contracts**: Linked spend and contracts
  - **Components**: Child applications (if this is a suite)
  - **Data Class** / **Contains PII** / **Data Residency**: Compliance information

**Filtering**:
  - Category, Environments, Lifecycle, Criticality, Hosting, External Facing, SSO Enabled, MFA Enabled, Data Class, and Contains PII use checkbox set filters
  - Floating filter shows `All`, `None`, or `N selected` with an **x** to clear
  - Retired applications are hidden by default; use the Lifecycle filter to include Retired

**Actions**:
  - **New App / Service**: Create a new entry (requires manager permission)
  - **Importer CSV**: Bulk import from CSV file (requires admin permission)
  - **Exporter CSV**: Export the list to CSV (requires admin permission)
  - **Copy item**: Duplicate a selected application with all its relations (requires manager permission)
  - **Delete Selected**: Remove selected applications (requires admin permission)

---

## The Applications espace de travail

Click any row in the list to open l'espace de travail. It has nine tabs:

### Overview

The Overview tab captures the core identity of your application.

**What you can edit**:
  - **Name**: The application's display name
  - **Description**: What this application does
  - **Category**: The application's primary purpose (configurable in IT Landscape Settings)
  - **Supplier**: Link to a supplier from your master data
  - **Publisher**: The software publisher
  - **Criticality**: Business critical, High, Medium, or Low
  - **Lifecycle**: Current status (configurable in IT Landscape Settings)
  - **Can have child apps**: Enable this to use this application as a "suite" that groups other applications
  - **Licensing**: License terms and notes
  - **Notes**: Free-form notes

**Version Information** (displayed in a separate section):
  - **Version**: Current version identifier (free text, e.g., "4.2.1", "2023")
  - **Go Live Date**: When this version went or will go live
  - **End of Support**: When vendor support ends for this version
  - **Retired Date**: When this version was actually decommissioned

**Version history**: If this application was created from another version (using the **Create New Version** feature), a version timeline appears at the top of the Overview tab. Click any version chip to navigate to that version.

**Suite membership**: If an application belongs to a suite, you'll see the suite badge in the list. The "Can have child apps" toggle becomes disabled when an application belongs to a parent suite -- remove the suite relationship first to re-enable it.

---

### Instances

The Instances tab documents where your application runs across different environments.

**Environments** (in order): Production, Pre-prod, QA, Test, Dev, Sandbox

**For each instance you can capture**:
  - **Base URL**: The access URL for this environment
  - **Region** / **Zone**: Geographic deployment information
  - **Lifecycle**: Instance-specific status (Active, Deprecated, etc.)
  - **SSO Enabled** / **MFA Supported**: Authentication capabilities
  - **Status**: Enabled or Disabled
  - **Notes**: Environment-specific notes

**Bulk actions**:
  - **Copy from Prod**: Quickly create instances for other environments based on your Production setup
  - **Bulk Apply**: Apply changes to multiple environments at once

**Tip**: Instance changes save immediately -- no need to click the main Save button.

---

### Servers

The Servers tab shows which infrastructure assets support each application instance.

**How it works**:
  - Select an environment to see its asset assignments
  - Add assets using the **Add Server** button
  - Each assignment captures the **Asset**, **Role** (e.g., Web, Database, Application), and optional **Notes**
  - Click an asset name to navigate to the Asset espace de travail

**Tip**: Ensure your assets are documented in the Assets page first, then link them here.

---

### Interfaces

The Interfaces tab shows all integrations where this application participates -- either as source, target, or middleware.

**What you'll see**:
  - Interfaces grouped by environment (Prod, Pre-prod, QA, etc.)
  - For each interface: **Name**, **Source Application**, **Target Application**, and **Via Middleware** indicator
  - Click any interface or application name to navigate to its espace de travail

**Tip**: Interfaces are managed from the Interfaces page. This tab provides a convenient read-only view of all integrations involving this application.

---

### Ownership & Audience

The Ownership & Audience tab documents who's responsible and who uses this application.

**Business Owners**: The business stakeholders accountable for this application
  - Add multiple owners; each shows their job title

**IT Owners**: The IT team members responsible for technical support
  - Add multiple owners; each shows their job title

**Audience**: Which parts of your organization use this application
  - Select a **Company** and optionally a **Department**
  - The system calculates the number of users based on your master data metrics (IT Users or Headcount)
  - Add multiple rows to capture all audiences

**Number of Users**: Choose between:
  - **Derived**: Automatically calculated from the Audience selections
  - **Manual**: Override with a specific number

---

### Technical & Support

The Technical & Support tab captures technical details and support contacts.

**Technical information**:
  - **Suites**: Parent suites this application belongs to
  - **Access Methods**: How users access this application (multi-select). Options are configurable in [IT Landscape Settings](it-ops-settings.md#access-methods). Default options include:
    - Web
    - Locally installed application
    - Mobile application
    - Proprietary HMI (industrial interface)
    - Terminal / CLI
    - VDI / Remote Desktop
    - Kiosk
  - **External Facing**: Whether the application is accessible from the internet
  - **Data Integration / ETL**: Whether the application participates in data integration pipelines

**Support information**:
  - Add support contacts with their **Role** (e.g., Account Manager, Technical Support)
  - Contacts are linked from your Contacts master data
  - Each contact shows their **Email**, **Phone**, and **Mobile**
  - **Support notes**: Free-form notes about support arrangements

---

### Relations

The Relations tab links this application to your financial, contract, and project data.

**Available links**:
  - **OPEX Items**: Recurring costs associated with this application
  - **CAPEX Items**: Capital expenditure projects
  - **Contracts**: Vendor contracts
  - **Projects**: Portfolio projects linked to this application
  - **Relevant websites**: External links and documentation
  - **Attachments**: Upload files by drag-and-drop or file picker. Downloaded by clicking the file chip.

**If this is a Suite**:
  - You'll also see a **Components** section listing child applications
  - Manage child applications by enabling "Can have child apps" in the Overview tab

---

### Base de connaissances

The Knowledge tab connects this application to your organization's knowledge base. You can link existing knowledge documents or create new ones directly from l'espace de travail.

This is useful for attaching runbooks, architecture decisions, operational procedures, or any internal documentation that relates to the application.

**Tip**: Knowledge documents are shared across the organization. Linking one here does not restrict its visibility -- it simply creates a convenient cross-reference.

---

### Compliance

The Compliance tab captures data protection and regulatory information.

**What you can edit**:
  - **Data Class**: Sensitivity level (Public, Internal, Confidential, Restricted)
  - **Last DR Test**: Date of the most recent disaster recovery test
  - **Contains PII**: Whether the application stores personally identifiable information
  - **Data Residency**: Countries where data is stored (multi-select)

**Tip**: Data Classes are configurable in **Cartographie SI > Paramètres**. Customize them to match your organization's data classification policy.

---

## Version management

KANAP offers **two ways to manage application versions**, depending on how your organization handles upgrades:

| Approach | Best for | What happens |
|----------|----------|--------------|
| **Simple** | Most applications | Update the version fields in place -- same record, new version number |
| **Sophisticated** | Major migrations | Create a new application record with lineage tracking -- run old and new versions side by side |

### Simple version tracking (in-place updates)

For most applications -- where you upgrade and the old version simply goes away -- just update the version fields in the **Overview** tab:
  - **Version**: Enter the current version (e.g., "4.2.1", "2023", "Q1 2024")
  - **Go Live Date**: When this version went or will go live
  - **End of Support**: When vendor support ends
  - **Retired Date**: When you actually decommissioned this version

This approach keeps everything in a single record. When you upgrade, update the version fields and you're done. History is tracked in the audit log.

**Use this when**: upgrades happen in place with no overlap -- one version replaces another.

### Creating a new version (parallel migrations)

For major application upgrades where you need to run old and new versions in parallel across different environments (e.g., SAP S/4HANA 1909 in Prod while 2023 is in QA), use the **Create New Version** feature:

1. Open the application you want to upgrade
2. Save any pending changes (the button is disabled if you have unsaved edits)
3. Click **Create New Version** in the header
4. Complete the three-step wizard:
   - **Step 1 - Version Details**: Enter the new application name, version, and dates
   - **Step 2 - Copy Options**: Choose what to copy from the source (owners, companies, departments, etc.)
   - **Step 3 - Interfaces**: Select which interfaces to migrate to the new version
5. Click **Create Version**

The new version is created as a separate application with:
  - A **Proposed** lifecycle (ready to configure before go-live)
  - A link to the predecessor (shown in the version timeline)
  - Copied data based on your selections
  - Duplicated interfaces pointing to the new version

### Version timeline

When an application has version lineage (predecessor or successors), a version timeline appears at the top of the **Overview** tab:

  - Each version shows as a chip with its version number
  - The current version is highlighted
  - Retired versions appear with strikethrough styling
  - Click any chip to navigate to that version

### What gets copied

When creating a new version, you can choose to copy:
  - **Owners** (Business & IT)
  - **Companies** (Audience)
  - **Departments**
  - **Data Residency**
  - **Links** (Documentation)
  - **Support Contacts**
  - **OPEX/CAPEX Items** - enabled by default
  - **Contracts** - enabled by default
  - **Instances** (Environments) - optional, disabled by default
  - **Bindings** (environment connections) - optional, only available when Instances is selected

**Not copied** (must be set up fresh):
  - Suite membership
  - Attachments
  - Asset assignments

### Interface migration

During version creation, you can select specific interfaces to migrate:
  - The wizard shows all interfaces where this application is the source or target
  - Selected interfaces are duplicated with references updated to the new version
  - The original interfaces remain linked to the old version
  - Each migrated interface includes all its relations: legs, owners, companies, key identifiers, links, and data residency
  - The new interface starts with a "Proposed" lifecycle

**Copying bindings**: If you select both "Instances" and "Bindings" in Step 2, interface bindings are also copied:
  - Bindings are mapped to the new application's instances (same environments)
  - Environment-specific details (endpoints, authentication, job names) are cleared for fresh configuration
  - Binding status is reset to "Proposed"

**ETL/Middleware applications**: If the application has "Data Integration / ETL" enabled, the wizard also shows interfaces that *flow through* this application as middleware. These are interfaces where another source sends data to another target via your ETL. Copying these creates new interface definitions for the upgraded ETL, with middleware references properly updated.

**Tip**: Use this when upgrading your ERP or ETL: migrate the critical interfaces and optionally copy bindings to get a head start on environment configuration.

---

## Copying applications

There are two ways to copy an application in KANAP:

### Copy Item (from Applications grid)

Use this when you want to create an independent duplicate of an application -- typically to create a similar application entry without version lineage.

1. Select an application in the grid
2. Click **Copy item**
3. The system creates a copy with " (copy)" appended to the name
4. You're navigated to the new application to make changes

**What gets copied**: All core fields (except last DR test date), owners, companies, departments, suites, OPEX/CAPEX items, contracts, links, data residency, and support contacts.

**What does NOT get copied**: Instances, interfaces, asset assignments, attachments, version fields (version, go-live date, end of support).

### Comparison: Copy Item vs Create New Version

| Aspect | Copy Item | Create New Version |
|--------|-----------|-------------------|
| **Purpose** | Create independent duplicate | Create version with lineage |
| **User options** | None (automatic) | Step-by-step wizard |
| **Lineage** | No predecessor link | Sets predecessor_id |
| **Lifecycle** | Preserved | Reset to Proposed |
| **Name** | " (copy)" suffix | User-specified |

**What gets copied - Relations**:

| Relation | Copy Item | Create New Version |
|----------|-----------|-------------------|
| Owners (business & IT) | Yes | Optional (default: yes) |
| Companies (audience) | Yes | Optional (default: yes) |
| Departments | Yes | Optional (default: yes) |
| Data Residency | Yes | Optional (default: yes) |
| Links (documentation) | Yes | Optional (default: yes) |
| Support Contacts | Yes | Optional (default: yes) |
| Suites (membership) | Yes | No |
| OPEX Items | Yes | Optional (default: yes) |
| CAPEX Items | Yes | Optional (default: yes) |
| Contracts | Yes | Optional (default: yes) |
| Instances | No | Optional (default: no) |
| Bindings | No | Optional (default: no) |
| Interfaces | No | User-selected |
| Asset Assignments | No | No |
| Attachments | No | No |

**What gets copied - Core fields**:

| Field | Copy Item | Create New Version |
|-------|-----------|-------------------|
| Description | Yes | Yes |
| ETL enabled | Yes | Yes |
| Support notes | Yes | Yes |
| Last DR test | No | No |
| Version fields | No | User-specified |
| Users override | Yes | Reset to null |
| Users year | Yes | Reset to current year |

---

## Import/export CSV

Maintain your application inventory at scale using CSV import and export. This feature supports bulk operations for initial data loading, periodic updates from external systems, and data extraction for reporting.

### Accessing CSV features

From the Applications list:
  - **Exporter CSV**: Download applications to a CSV file
  - **Importer CSV**: Upload a CSV file to create or update applications
  - **Download Template**: Get a blank CSV with correct headers

**Permissions required**: `applications:admin` for import/export operations.

### Export options

**Presets** (pre-configured field selections):

| Preset | Description |
|--------|-------------|
| **Full Export** | All exportable fields including computed/read-only data (timestamps, data residency, user metrics) |
| **Data Enrichment** | Only importable fields -- ideal for round-trip editing workflows |

**Template export**: Downloads headers only -- useful for preparing import files with the correct structure. The template includes all importable fields.

**Custom selection**: Choose specific fields to include in your export.

### Import workflow

1. **Prepare your file**: Use UTF-8 encoding with semicolon (`;`) separators. Download a template to ensure correct headers.

2. **Choose import settings**:
   - **Mode**:
     - `Enrich` (default): Empty cells preserve existing values -- only update what you specify
     - `Replace`: Empty cells clear existing values -- full replacement of all fields
   - **Operation**:
     - `Upsert` (default): Create new applications or update existing ones
     - `Update only`: Only modify existing applications, skip new ones
     - `Insert only`: Only create new applications, skip existing ones

3. **Validate first**: Click **Preflight** to validate your file without making changes. Review errors and warnings.

4. **Apply changes**: If validation passes, click **Import** to commit changes.

### Field reference

**Overview fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `id` | Application UUID | No | For updates; leave blank for new applications |
| `name` | Application name | Yes | Used as unique identifier for matching |
| `description` | What the application does | No | |
| `category` | Primary purpose | No | Accepts code or label from Settings |
| `supplier_name` | Vendor name | No | Must match existing supplier |
| `editor` | Software publisher | No | Free text (e.g., Microsoft, SAP) |
| `criticality` | Business importance | No | `business_critical`, `high`, `medium`, `low` |
| `lifecycle` | Current status | No | Accepts code or label from Settings |
| `is_suite` | Can have child apps | No | `true` or `false` |
| `status` | Enabled/disabled | No | `enabled` or `disabled` |

**Version fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `version` | Current version | Free text |
| `go_live_date` | When version went live | Date format: YYYY-MM-DD |
| `end_of_support_date` | Vendor support end date | Date format: YYYY-MM-DD |
| `retired_date` | Decommission date | Date format: YYYY-MM-DD |

**Technical fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `access_methods` | How users access | Comma-separated codes or labels from Settings (e.g., `web,mobile,vdi`) |
| `external_facing` | Internet accessible | `true` or `false` |
| `etl_enabled` | Data integration | `true` or `false` |
| `support_notes` | Support information | Free text |
| `licensing` | License terms | Free text |
| `notes` | Internal notes | Free text |

**Compliance fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `data_class` | Data classification | Accepts code or label from Settings |
| `last_dr_test` | Last DR test date | Date format: YYYY-MM-DD |
| `contains_pii` | Stores personal data | `true` or `false` |
| `data_residency` | Data storage countries | Export only (ISO codes) |

**Owner fields**:

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `business_owner_email_1` through `_4` | Business owner emails | Must match existing users by email |
| `it_owner_email_1` through `_4` | IT owner emails | Must match existing users by email |

**Export-only fields** (included in Full Export but not importable):

| CSV Column | Description |
|------------|-------------|
| `data_residency` | Data storage countries (ISO codes, comma-separated) |
| `users_mode` | User count method (`manual`, `it_users`, `headcount`) |
| `users_year` | Reference year for user calculations |
| `users_override` | Manual user count override |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

### Label and code acceptance

For fields configured in **Cartographie SI > Paramètres**, you can use either the internal code or the display label:

| Field | Example codes | Example labels |
|-------|---------------|----------------|
| Category | `lob`, `productivity`, `security` | `Line-of-business`, `Productivity`, `Security` |
| Lifecycle | `active`, `proposed`, `deprecated` | `Active`, `Proposed`, `Deprecated` |
| Data Class | `public`, `internal`, `confidential` | `Public`, `Internal`, `Confidential` |

The system automatically normalizes values during import, so `Line-of-business`, `line-of-business`, and `lob` all resolve to the same category.

### Matching and updates

Applications are matched by **name** (case-insensitive). When a match is found:
  - With `Enrich` mode: Only non-empty CSV values update the application
  - With `Replace` mode: All fields are updated, empty values clear existing data

If you include the `id` column with a valid UUID, matching uses ID first, then falls back to name.

### Limitations

  - **Instances not included**: Environment instances (Prod, QA, Dev) require espace de travail configuration
  - **Asset assignments excluded**: Server bindings must be set up in the Servers tab
  - **Interfaces excluded**: Integration definitions are not part of CSV import/export
  - **Maximum 4 owners per type**: Up to 4 business owners and 4 IT owners can be imported/exported
  - **User metrics are export-only**: Audience and user count fields (`users_mode`, `users_year`, `users_override`) are managed in l'espace de travail
  - **Data residency is export-only**: Country selections must be managed in the Compliance tab

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

  - **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
  - **In Excel**: Save As → CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
  - **General tip**: If you see garbled characters (`?¿`, `ï»¿`) at the start of your file, the encoding is incorrect.

### Example CSV

```csv
name;category;supplier_name;criticality;lifecycle;go_live_date;external_facing
Salesforce CRM;Line-of-business;Salesforce Inc;business_critical;Active;2020-01-15;true
Microsoft 365;Productivity;Microsoft;high;active;2019-06-01;false
Custom ERP;lob;;medium;Active;2018-03-20;false
```

---

## Conseils

  - **Start with critical apps**: Document your business-critical applications first, then work down the criticality levels.
  - **Use Suites for grouping**: Mark an application as a Suite to group related components (e.g., SAP modules under an SAP Suite).
  - **Link to spend early**: Connect OPEX and CAPEX items in the Relations tab to see the full cost picture.
  - **Keep environments current**: The Instances tab drives the environment chips in the list -- keep it updated for accurate visibility.
  - **Leverage category filtering**: Use the Category column filter to focus on specific application types (e.g., show only Line-of-business apps, or exclude Productivity tools).
  - **Attach knowledge early**: Link runbooks and architecture documents in the Knowledge tab so the team knows where to look during incidents.
