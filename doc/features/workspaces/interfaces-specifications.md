# Interface Entity Specification

One record = one end-to-end business interface (e.g. “PLM → ERP Item Master Sync”).
Sections (mirrored by the Interface workspace tabs):
1. Overview
2. Business Ownership & Criticality
3. Functional Definition
4. Technical Definition
5. Environments
6. Data & Compliance

## 0. Entity & Relationships

> **Visualization:** See [Interface Map Visualization](./interface-map-visualization.md) for details on how these relationships are graphed.

**Entity name:** `Interface`
**Relations:**
- `source_application` → `Application` (single)
- `target_application` → `Application` (single)
- `middleware_applications` → `Application` (multi, ETL/middleware flagged)
- `business_process` → `BusinessProcess`
- `impacted_companies` → `Company` (multi)
- `business_owners` / `it_owners` → `User` (multi)
- `dependencies_upstream` / `dependencies_downstream` → `Interface` (multi)
- Environment-specific data → `Environment` (per section 5)

**Cardinality note**
- One Interface always models one **source** → one **main target**. If the same source fan-outs to multiple targets, those are modeled as separate Interface records sharing the same `source_application` (and optionally the same `business_process` and `interface_id` prefix).

**Configurable lists**
- All enum fields used by Interfaces (e.g. `data_category`, `trigger_type`, `integration_pattern`, `data_format`, `authentication_mode`, `data_classification`) are tenant-configurable via IT Landscape settings. The default sets are provided out-of-the-box; tenants can extend or deprecate values without breaking existing records.

### Duplicate Interface

The **Duplicate Interface** action creates a copy of an existing interface, useful when creating similar interfaces that share most configuration.

**Endpoint:** `POST /interfaces/:id/duplicate`
**Permission:** `manager` level on `applications`
**Body:** `{ copyBindings?: boolean }`

**What gets copied:**

| Category | Copied? | Notes |
|----------|---------|-------|
| Core fields | Yes | All fields except `id`, `tenant_id`, `created_at`, `updated_at` |
| `interface_id` | Yes (modified) | Suffixed with `-copy` (or `-copy-2`, `-copy-3` if collision) |
| `name` | Yes (modified) | Suffixed with ` - copy` |
| Interface legs | Yes | All leg customizations (job_name, trigger_type, integration_pattern, data_format) |
| Middleware applications | Yes | Same middleware apps linked |
| Owners (business + IT) | Yes | Same owners assigned |
| Impacted companies | Yes | Same companies linked |
| Dependencies (upstream/downstream) | Yes | Same interface references |
| Key identifiers | Yes | Source/destination mappings preserved |
| Documentation links | Yes | Same URLs copied |
| Data residency | Yes | Same country codes |
| Environment bindings | Optional | If `copyBindings=true`: instance references preserved, env-specific fields cleared |

**What does NOT get copied:**

| Category | Reason |
|----------|--------|
| Attachments | Files are not duplicated; user can re-upload if needed |
| Audit timestamps | `created_at` and `updated_at` are auto-generated for the new record |

**Binding copy behavior (when `copyBindings=true`):**
- Instance references (`source_instance_id`, `target_instance_id`, `integration_tool_application_id`) are preserved
- Status is reset to `proposed`
- Environment-specific fields are cleared: `source_endpoint`, `target_endpoint`, `trigger_details`, `env_job_name`, `authentication_mode`, `monitoring_url`, `env_notes`

**Behavior:**
1. User selects exactly one interface in the grid
2. Clicks "Duplicate Interface" button
3. Dialog appears with option to copy environment bindings
4. User confirms; system creates new interface with `-copy` suffix
5. If `{interface_id}-copy` already exists, system tries `-copy-2`, `-copy-3`, etc.
6. Grid refreshes showing the new interface
7. User can navigate to the duplicate to modify fields and configure bindings

### Interface Migration (Application Versioning)

When creating a new version of an application (via `POST /applications/:id/create-version`), users can select interfaces to migrate to the new version.

**Endpoint:** `GET /applications/:id/interfaces-for-migration`
**Permission:** `reader` level on `applications`

**Returns:** List of interfaces where this application is the source, target, or middleware (if ETL-enabled).

| Field | Description |
|-------|-------------|
| `id` | Interface ID |
| `name` | Interface name |
| `interface_id` | Interface code |
| `lifecycle` | Interface lifecycle status |
| `source_app_name` | Source application name |
| `target_app_name` | Target application name |
| `app_role` | `'source'` / `'target'` / `'both'` / `'via_middleware'` - indicates this app's role in the interface |

**Migration Behavior:**

When interfaces are selected during version creation:
1. Each selected interface is duplicated
2. Interface ID and name are suffixed with ` (new version)` or ` (via NewAppName)` for middleware
3. `source_application_id`, `target_application_id`, or middleware references are updated to point to the new app version (based on `app_role`)
4. Lifecycle is reset to `proposed`
5. The original interface remains linked to the old version

**What gets migrated:**
- All core fields
- Legs (trigger type, integration pattern, data format, job name)
- Middleware applications (with app references updated)
- Owners (business + IT)
- Impacted companies
- Key identifiers
- Documentation links
- Data residency
- Bindings (optional, if user selects "Copy bindings" and "Copy instances" in the wizard)

**What does NOT get migrated:**
- Dependencies (interface references may not apply to new version context)
- Attachments

**Binding migration (when enabled):**
- Instance IDs are mapped from old app instances to new app instances (same environments)
- For via_middleware interfaces, ETL instance references are properly mapped
- Status is reset to `proposed`
- Environment-specific fields are cleared for fresh configuration

**Use Case Example:**
When upgrading SAP S/4HANA from 1909 to 2023:
1. Open SAP S/4HANA 1909 application
2. Click "Create New Version"
3. In Step 2, optionally select "Copy instances" and "Copy bindings"
4. In Step 3, select the interfaces to migrate
5. Interfaces like "PLM → ERP Item Master Sync" are duplicated with updated references
6. Original interface continues to serve the old version until retired
7. If bindings were copied, configure the environment-specific details for the new version

### Comparison: Duplicate vs Version Migration

| Aspect | Duplicate | Version Migration |
|--------|-----------|-------------------|
| **Purpose** | Create independent copy | Migrate to new app version |
| **App references** | Unchanged | Updated to new version |
| **Middleware references** | Unchanged | Updated if app is middleware |
| **Dependencies*** | Copied | Not copied |
| **Bindings** | Optional (same instances) | Optional (instances mapped to new app) |
| **Lifecycle** | Preserved | Reset to Proposed |
| **Name/ID suffix** | " - copy" | " (new version)" or " (via AppName)" |

*Dependencies are upstream/downstream interface relationships (e.g., "Order Sync must complete before Invoice Sync can run").

## 1. Overview

### Fields (Overview tab)

|Field name|Label|Type|Required|Default / Behavior|
|---|---|---|---|---|
|`interface_id`|Interface ID|String (unique)|Yes|User-entered or generated (e.g. `IF-ERP-PLM-001`).|
|`name`|Name|String|Yes|Clear, business-oriented (e.g. “PLM → ERP Item Master Sync”).|
|`business_process`|Business Process|Ref → `BusinessProcess`|Yes|Dropdown (e.g. order-to-cash, procure-to-pay…). Managed in settings.|
|`business_purpose`|Business Purpose|Multi-line text|Yes|2–3 lines describing what it does in business terms.|
|`source_application`|Source Application|Ref → `Application`|Yes|Single application.|
|`target_application`|Target Application|Ref → `Application`|Yes|One main target application. Additional targets are modeled as separate Interfaces.|
|`data_category`|Data Category|Enum|Yes|Values configurable in settings (IT Ops). Default list: Master Data / Transactional / Reporting / Control.|
|`integration_route_type`|Integration route type|Enum|Yes|Values: `Direct` / `Via middleware`.|
|`middleware_applications`|Middleware application(s)|Multi-ref → `Application`|If needed|Only editable/visible when `integration_route_type = Via middleware`. Filter apps flagged ETL/middleware.|
|`lifecycle`|Lifecycle|Enum|Yes|Options come from the tenant’s IT Ops lifecycle settings (defaults: Proposed, Active, Deprecated, Retired). Default = Active when both source/target apps are Active, otherwise Proposed.|
|`overview_notes`|Notes|Short multi-line text|No|3 lines max (or character limit).|

---

## 2. Business Ownership & Criticality

### Fields (Ownership & Criticality tab)

|Field name|Label|Type|Required|Default / Behavior|
|---|---|---|---|---|
|`business_owners`|Business owner(s)|Multi-ref → `User`|Yes|Pre-fill from `BusinessProcess` owners if available. Editable.|
|`it_owners`|IT owner(s) / technical contact|Multi-ref → `User`|Yes|Pre-fill from `BusinessProcess` IT owners if available. Editable.|
|`criticality`|Criticality|Enum|Yes|Default = highest criticality of `source_application` and `target_application`. Editable.|
|`impacted_companies`|Impacted companies|Multi-ref → `Company`|No|Multiple selection.|
|`impact_of_failure`|Impact of failure|Short multi-line text|No|2 lines describing business impact if the interface fails.|

---

## 3. Functional Definition

### Fields (Functional Definition tab)

|Field name|Label|Type|Required|Behavior / Notes|
|---|---|---|---|---|
|`business_objects`|Business objects|Multi-line text|No|Free-text list of main business objects (e.g. Item, BOM, Customer, Sales Order, Work Order).|
|`main_use_cases`|Main use cases|Multi-line / bullets|No|Short bullet list (e.g. create items, update lifecycle status…).|
|`key_identifiers`|Key Identifiers / Cross-System IDs|Repeated row (mini-table)|No|See table below.|
|`functional_rules`|Functional rules (high-level)|Multi-line / bullets|No|3–10 bullets (filtering rules, business rules).|
|`dependencies_upstream`|Upstream dependencies|Multi-ref → `Interface`|No|Dropdown of interfaces. Multiple selection.|
|`dependencies_downstream`|Downstream dependencies|Multi-ref → `Interface`|No|Dropdown of interfaces. Multiple selection.|
|`functional_doc_urls`|External documentation URLs|Multi-value URL list|No|Architecture diagrams, operational procedures, test cases, vendor documentation… (backed by `interface_links` with `kind='functional'`).|
|`functional_doc_attachments`|External documentation attachments|File list|No|Same scope as above (backed by `interface_attachments` with `kind='functional'`).|

### `key_identifiers` mini-table

| Column name              | Label                  | Type   | Required | Example                               |
| ------------------------ | ---------------------- | ------ | -------- | ------------------------------------- |
| `source_identifier`      | Source identifier      | String | Yes      | `PLM Item ID`                         |
| `destination_identifier` | Destination identifier | String | Yes      | `ERP Material No.`                    |
| `identifier_notes`       | Notes                  | String | No       | `Initial zeros removed in transform.` |

---

## 4. Technical Definition

### 4.1 Technical Overview (Legs, Technical Definition tab)

The technical overview is a **template** used by all environments.
Common leg columns:
- `leg_type` (read-only enum: EXTRACT / TRANSFORM / LOAD / DIRECT)
- `from_component` (read-only, usually application or middleware name)
- `to_component` (read-only)
- `trigger_type` (enum, values configurable in settings)
- `integration_pattern` (enum, values configurable in settings)
- `data_format` (enum, values configurable in settings)
- `job_name` (string, only meaningful for some legs)

In the UI, the **Technical Definition** tab surfaces these legs as a small table.  
For each leg, users can edit `trigger_type`, `integration_pattern`, `data_format`, and `job_name`.  
These template values are reused read-only in the Environments tab for every environment/leg combination.

#### Case A – Integration route type = Via middleware
Three legs are auto-created:
1. **EXTRACT leg**

|Field|Value / Behavior|
|---|---|
|`leg_type`|`EXTRACT` (read-only)|
|`from_component`|`source_application` (read-only)|
|`to_component`|Selected `middleware_application` (if multiple, main one or user selection)|
|`trigger_type`|Enum (configurable list: Event-based, Scheduled, On-demand, Real-time, etc.)|
|`integration_pattern`|Enum from configuration (REST API, File batch, etc.)|
|`data_format`|Enum from configuration (CSV, XML, JSON, etc.)|
|`job_name`|Optional string (ETL job/flow name, if relevant at template level)|

2. **TRANSFORM leg**

|Field|Value / Behavior|
|---|---|
|`leg_type`|`TRANSFORM` (read-only)|
|`from_component`|Middleware (read-only)|
|`to_component`|Middleware (read-only)|
|`trigger_type`|Enum (configurable)|
|`integration_pattern`|Enum (e.g. “Internal ETL job”, “DB staging”)|
|`data_format`|Enum (e.g. “Relational tables”, “Internal format”)|
|`job_name`|Optional string|

3. **LOAD leg**

|Field|Value / Behavior|
|---|---|
|`leg_type`|`LOAD` (read-only)|
|`from_component`|Middleware (read-only)|
|`to_component`|Destination system (derived from `target_application`; label typically shown as `Source → Target`)| 
|`trigger_type`|Enum (configurable)|
|`integration_pattern`|Enum (REST API, File batch, etc.)|
|`data_format`|Enum (CSV, XML, JSON, IDoc, etc.)|
|`job_name`|Optional string|

#### Case B – Integration route type = Direct

One leg is created:

|Field|Value / Behavior|
|---|---|
|`leg_type`|`DIRECT` (read-only)|
|`from_component`|`source_application` (read-only)|
|`to_component`|Destination system (derived from `target_application`; label typically shown as `Source → Target`)| 
|`trigger_type`|Enum (configurable)|
|`integration_pattern`|Enum (REST API, SOAP, File batch, etc.)|
|`data_format`|Enum (CSV, XML, JSON, etc.)|
|`job_name`|Editable string (job / connector name)|

---

### 4.2 Technical External Documentation

|Field name|Label|Type|Required|Notes|
|---|---|---|---|---|
|`technical_docs_urls`|Technical documentation URLs|Multi-value URL list|No|Mapping files, schemas, technical design, SOPs (backed by `interface_links` with `kind='technical'`).|
|`technical_docs_attachments`|Technical documentation files|File list|No|Same scope as above (backed by `interface_attachments` with `kind='technical'`).|

---

### 4.3 Technical Notes

|Field name|Label|Type|Required|Notes|
|---|---|---|---|---|
|`core_transformations_summary`|Core Transformations (summary)|Multi-line text|No|Unit conversions, code/value mappings, filtering rules, enrichments, etc.|
|`error_handling_summary`|Error Handling (high-level)|Multi-line text|No|Retry behavior, dead-letter queues, error report locations, typical failure patterns.|

_(High-level monitoring concepts are described implicitly here and concretely per environment in section 5.)_

---

## 5. Environments (Environments tab)

Users explicitly declare which `Environment`s (e.g. `DEV`, `TEST`, `PREPROD`, `PROD`) they want to document for a given interface.

Environment lifecycle in the UI:
- The Environments tab starts empty (no sections).
- The user clicks **Add environment** to choose an environment code.
  - The picker only shows environments where:
    - For **Direct** routes: both the source and target applications have at least one `AppInstance` in that environment.
    - For **Via middleware** routes: the source, target, and at least one middleware application have an `AppInstance` in that environment.
- For each selected environment, the UI renders a subsection reusing the legs from the Technical Overview.
- Environments can be removed:
  - If the environment has bindings, deleting it deletes all associated `interface_bindings` rows for that environment.
  - If it has no bindings, the section is just removed from the UI.

Each environment reuses the **legs** from the Technical Overview and adds environment-specific config shown alongside each leg in the binding grid.

### 5.1 Common env leg fields

For each leg (EXTRACT / TRANSFORM / LOAD / DIRECT) in a given environment:

|Field name|Label|Type|Required|Notes|
|---|---|---|---|---|
|`source_endpoint`|Source Endpoint|String/URL|No|File path, URL, queue name… Used for EXTRACT / LOAD / DIRECT legs.|
|`target_endpoint`|Target Endpoint|String/URL|No|File path, URL, queue name… Used for EXTRACT / LOAD / DIRECT legs.|
|`trigger_details`|Trigger details|Text|No|Cron expression, event description, batch window, etc.|
|`env_job_name`|Job Name|String|No|Env-specific job/flow ID.|
|`authentication_mode`|Authentication Mode|Enum|No|Values from configuration: service account / OAuth2 / API key / certificate / etc.|
|`monitoring_url`|Monitoring URL|URL|No|Link to monitoring/alerting dashboard.|
|`env_notes`|Notes|Multi-line|No|Free text: specifics for this environment.|
|`integration_tool_application_id`|Integration tool|Application reference|No|Optional ETL / integration tool application used to run this leg in the given environment. Only shown for `via_middleware` routes and defaults from the middleware applications defined on the Overview tab.|

### 5.2 Route-specific behavior

#### If `integration_route_type = Via middleware`

For each environment:
- Show 3 legs: EXTRACT, TRANSFORM, LOAD.
    
For each leg, the grid renders a single row with:
- A **Technical template** area (read-only): `leg_type`, from/to component, `trigger_type`, `integration_pattern`, `data_format`, `job_name` (from Technical Overview).
- A **Binding** area (editable env-specific data):
    - EXTRACT: `source_endpoint`, `target_endpoint`, `trigger_details`, `env_job_name`, `authentication_mode`, `monitoring_url`, `env_notes`, optional `integration_tool_application_id`.
    - TRANSFORM: `env_job_name`, `monitoring_url`, `env_notes`, optional `integration_tool_application_id`.
    - LOAD: `source_endpoint`, `target_endpoint`, `trigger_details`, `env_job_name`, `authentication_mode`, `monitoring_url`, `env_notes`, optional `integration_tool_application_id`.
        
#### If `integration_route_type = Direct`

For each environment:
- One leg (DIRECT).
For this leg, the grid renders a single row with:
- A **Technical template** area (read-only) based on the DIRECT leg from the Technical tab.
- A **Binding** area with editable env-specific data:
    - `source_endpoint`, `target_endpoint`, `trigger_details`, `env_job_name`, `authentication_mode`, `monitoring_url`, `env_notes`. The `integration_tool_application_id` field is not shown for direct routes.

---

## 6. Data & Compliance (Data & Compliance tab)

### Fields

|Field name|Label|Type|Required|Notes|
|---|---|---|---|---|
|`data_classification` (`data_class`)|Data Classification|Enum|Yes|Same scale as Applications (e.g. Public / Internal / Confidential / Restricted). Backed by `interfaces.data_class` with codes from IT Ops `dataClasses`.|
|`contains_pii`|Contains PII|Boolean (Yes/No)|Yes|Indicates whether personal data is present.|
|`pii_description`|PII description|Short text|No|Only visible if `contains_pii = Yes`. One-line description.|
|`typical_data`|Typical data|String or multi-enum|No|Examples: customer master, financial, sales order, HR, etc.|
|`data_residency`|Data residency|Structured field|No|Same model as apps (country/region list, etc.).|
|`audit_logging`|Audit & Logging|Multi-line text|No|Where logs are stored, retention, how to access them.|
|`security_controls_summary`|Security Controls (summary)|Multi-line text|No|Authentication method, encryption in transit (HTTPS/SFTP/VPN/none), network restrictions.|
