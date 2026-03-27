# Interfaces

Interfaces document the logical data flows between your applications. Unlike direct code connections, an Interface represents a business integration -- the "why" and "what" of data exchange -- independent of the technical implementation. Each Interface can have multiple environment-specific bindings that define the actual endpoints and configurations.

## Getting started

Navigate to **IT Landscape > Interfaces** to see your integration registry. Click **Add Interface** to create your first entry.

**Required fields**:

- **Interface ID**: A unique identifier (e.g., `INT-CRM-ERP-001`)
- **Name**: A descriptive name for the integration
- **Business Purpose**: Why this integration exists
- **Source Application**: Where data originates
- **Target Application**: Where data flows to
- **Data Category**: The type of data being transferred

**Strongly recommended**:

- **Business Process**: Which business process this interface supports
- **Lifecycle**: Current status (Active, Deprecated, etc.)

**Tip**: Start by documenting your production interfaces. Use the Bindings & Connections tab to add environment-specific bindings once the logical interface is defined.

---

## Working with the list

The Interfaces grid shows your integration registry at a glance.

**Default columns**:

- **Interface ID**: The unique identifier (click to open workspace)
- **Name**: Interface name (click to open workspace)
- **Environments**: Colored chips showing which environments have bindings configured (e.g., PROD, QA, DEV)
- **Source App**: The source application
- **Target App**: The target application
- **Lifecycle**: Current status
- **Criticality**: Business importance
- **Created**: When the record was created

**Additional columns** (via column chooser):

- **Business Process**: Linked business process
- **Data Category**: Type of data being transferred
- **Contains PII**: Whether the interface handles personal data
- **Env Coverage**: Number of environments with bindings
- **Bindings**: Total number of environment bindings

**Filtering**:

- Quick search: Searches across all text columns
- Column filters: Filter by lifecycle, criticality, data category, business process, contains PII, and more

**Actions**:

- **Add Interface**: Create a new interface (requires `applications:manager`)
- **Duplicate Interface**: Create a copy of a selected interface (requires `applications:manager`). Select exactly one row to enable this action. A dialog lets you choose whether to copy environment bindings -- see [Copying interfaces](#copying-interfaces) below.
- **Delete Selected**: Remove selected interfaces (requires `applications:admin`). A checkbox option lets you also delete related bindings; if unchecked, interfaces with bindings will not be deleted.

---

## The Interfaces workspace

Click any row to open the workspace. It has six tabs.

### Overview

The Overview tab captures the interface's identity and business context.

**What you can edit**:

- **Interface ID**: Unique identifier
- **Name**: Display name
- **Business Process**: Link to a business process from master data
- **Business Purpose**: Free-text description of why this integration exists
- **Source Application** / **Target Application**: The connected apps
- **Data Category**: The type of data being transferred
- **Integration Route Type**: Direct or Via Middleware
- **Middleware Applications**: If the route type is Via Middleware, select the middleware platforms involved (only applications flagged as ETL/middleware appear here)
- **Lifecycle**: Current status
- **Overview Notes**: Additional context or summary

**Tip**: Data Category and Integration Route Type shape what's available on later tabs. Set them early.

---

### Ownership & Criticality

This tab documents who's responsible for the interface and how important it is.

**Business Owners**: Business stakeholders accountable for the integration. Each row shows the user, their last name, first name, and job title (read-only, pulled from the user record). Add or remove rows as needed.

**IT Owners**: Technical team members responsible for maintenance. Same layout as business owners.

**Criticality & Impact**:

- **Criticality**: Business critical, High, Medium, or Low
- **Impact of Failure**: Free-text description of what happens if this interface goes down

**Impacted Companies**: Which companies or legal entities are affected by this interface. Select from your master data.

---

### Functional Definition

The Functional Definition tab captures the business logic of the integration.

**What you can document**:

- **Business Objects**: What data entities are transferred (free text)
- **Main Use Cases**: Primary scenarios this interface supports
- **Functional Rules**: High-level business rules governing the data flow
- **Key Identifiers**: Source and destination identifier mappings. Each row maps a source identifier to a destination identifier, with optional notes. Use this to document cross-system ID relationships (e.g., SAP Material Number maps to CRM Product ID).
- **Dependencies**: Upstream and downstream interfaces that this flow depends on. Select other interfaces from your registry.
- **Functional Documentation Links**: Add URLs to external documentation (Confluence, SharePoint, etc.)
- **Functional Attachments**: Upload specification documents directly

---

### Technical Definition

The Technical Definition tab defines how the integration works at a technical level.

**Legs template**: A table defining the data flow legs (Extract, Transform, Load, or Direct). Each leg specifies:

- **Leg type**: EXTRACT, TRANSFORM, LOAD, or DIRECT
- **From / To**: Which role handles each step (Source app, Target app, or Middleware)
- **Trigger Type**: What initiates this leg (e.g., scheduled, event-driven, manual)
- **Pattern**: The integration pattern (e.g., batch, real-time, pub/sub)
- **Format**: The data format (e.g., JSON, XML, CSV, flat file)
- **Job Name**: An optional job or process name

Legs are templates shared across all environments. The actual endpoints and credentials go in the Bindings & Connections tab.

**Additional fields**:

- **Core Transformations (summary)**: How data is transformed between source and target
- **Error Handling (summary)**: How errors are managed and escalated

**Documentation**:

- **Technical Documentation Links**: Add URLs to technical specs
- **Technical Attachments**: Upload technical documents

**Tip**: If no legs appear, make sure you've selected source and target applications and an integration route type on the Overview tab. Legs are generated automatically from the route type.

---

### Bindings & Connections

This tab manages environment-specific bindings. It presents a matrix of environments and legs, letting you configure each combination independently.

**How it works**:

- Each environment (Prod, Pre-prod, QA, Test, Dev, Sandbox, or custom) can have bindings for each leg
- Environments are discovered automatically from your application instances, or you can add custom environments
- Click an empty cell to create a binding, or click an existing one to edit it

**Binding fields**:

- **Source Instance** / **Target Instance**: Which application instances to use in this environment
- **Status**: Enabled, Disabled, or Testing
- **Source Endpoint** / **Target Endpoint**: Technical endpoints (URLs, paths, queue names, etc.)
- **Trigger Details**: Environment-specific trigger configuration
- **Env Job Name**: Override the template job name for this environment
- **Authentication Mode**: How the binding authenticates
- **Monitoring URL**: Link to monitoring or observability for this binding
- **Integration Tool Application**: If applicable, the integration tool used
- **Env Notes**: Environment-specific notes

**Connection linking**: Each binding can be linked to infrastructure connections from your connection registry. This lets you trace the full path from logical interface to physical network connections.

---

### Data & Compliance

The Data & Compliance tab captures data protection and security information.

**What you can edit**:

- **Data Classification**: Sensitivity level (Public, Internal, Confidential, Restricted)
- **Contains PII**: Whether personal data is transferred. When checked, a **PII Description** field appears for you to detail what PII is included.
- **Typical Data**: Description of a typical data payload
- **Audit & Logging**: How the interface is audited
- **Security Controls (summary)**: Security measures in place
- **Data Residency**: Comma-separated ISO 2-letter country codes where data flows (e.g., FR, DE, US)

---

## Copying interfaces

There are two ways to copy interfaces in KANAP:

### Duplicate Interface (from Interfaces page)

Use this when you want to create an independent copy of an interface -- typically to create a similar interface between the same or different applications.

1. Select an interface in the grid
2. Click **Duplicate Interface**
3. Choose whether to copy environment bindings:
   - **Without bindings**: Creates a clean copy -- just the interface definition, legs, owners, and metadata
   - **With bindings**: Also copies environment bindings, but clears environment-specific details (endpoints, authentication, job names) so you can configure them fresh

**What gets copied**:

| Data | Copied |
|------|--------|
| Interface definition (name, apps, route type) | Yes |
| Legs (extract/transform/load/direct) | Yes |
| Middleware applications | Yes |
| Owners (business & IT) | Yes |
| Impacted companies | Yes |
| Dependencies | Yes |
| Key identifiers | Yes |
| Links (documentation) | Yes |
| Data residency | Yes |
| Bindings | Optional |
| Attachments | No |

**Naming**: The copy gets " - copy" appended to both name and Interface ID.

### Version Migration (from Application versioning)

Use this when upgrading an application to a new version and you need to migrate interfaces to the new version. See [Applications > Version management](applications.md#version-management) for details.

**Key differences from Duplicate**:

| Aspect | Duplicate | Version Migration |
|--------|-----------|-------------------|
| Purpose | Create independent copy | Migrate to new app version |
| App references | Unchanged | Updated to new version |
| Middleware references | Unchanged | Updated if app is middleware |
| Dependencies* | Copied | Not copied |
| Bindings | Optional (instances unchanged) | Optional (instances mapped to new app) |
| Lifecycle | Preserved | Reset to Proposed |
| Name suffix | " - copy" | " (new version)" |

*Dependencies are upstream/downstream interface relationships (e.g., "Order Sync must run before Invoice Sync").

---

## Tips

- **Document the "why" first**: Focus on business purpose before technical details. Technical specs can come later.
- **Use environment bindings**: Don't create separate interfaces for each environment -- use one interface with multiple bindings.
- **Link to business processes**: Connecting interfaces to business processes helps with impact analysis.
- **Keep middleware explicit**: If data flows through middleware, model it explicitly with the Via Middleware route type to see the true data path.
- **Use duplicate for similar interfaces**: When creating a new interface that's similar to an existing one, use **Duplicate Interface** to copy all settings, then modify what's different. Optionally include bindings to get a head start on environment configuration.
- **Track cross-system IDs**: Use Key Identifiers on the Functional Definition tab to map how records are identified across source and target systems.
