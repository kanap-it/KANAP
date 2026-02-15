# Interfaces

Interfaces document the logical data flows between your applications. Unlike direct code connections, an Interface represents a business integration—the "why" and "what" of data exchange—independent of the technical implementation. Each Interface can have multiple environment-specific bindings that define the actual endpoints and configurations.

## Getting started

Navigate to **IT Operations → Interfaces** to see your integration registry. Click **Add Interface** to create your first entry.

**Required fields**:
  - **Interface ID**: A unique identifier (e.g., `INT-CRM-ERP-001`)
  - **Name**: A descriptive name for the integration
  - **Source Application**: Where data originates
  - **Target Application**: Where data flows to

**Strongly recommended**:
  - **Business Process**: Which business process this interface supports
  - **Criticality**: How important this integration is
  - **Lifecycle**: Current status (Active, Deprecated, etc.)

**Tip**: Start by documenting your production interfaces. Use the Environments tab to add environment-specific bindings once the logical interface is defined.

---

## Working with the list

The Interfaces grid shows your integration registry at a glance.

**Default columns**:
  - **Interface ID**: The unique identifier
  - **Name**: Interface name (click to open workspace)
  - **Environments**: Chips showing which environments have bindings configured
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

**Actions**:
  - **Add Interface**: Create a new interface (requires manager permission)
  - **Duplicate Interface**: Create a copy of a selected interface (requires manager permission). Select exactly one interface to enable this action. A dialog lets you choose whether to copy environment bindings (see [Copying interfaces](#copying-interfaces) below).
  - **Delete Selected**: Remove selected interfaces (requires admin permission). A checkbox option lets you delete related bindings if they exist.

---

## The Interfaces workspace

Click any row to open the workspace. It has six tabs:

### Overview

The Overview tab captures the interface's identity and business context.

**What you can edit**:
  - **Interface ID**: Unique identifier
  - **Name**: Display name
  - **Source Application** / **Target Application**: The connected apps
  - **Integration Route Type**: Direct or Via Middleware
  - **Middleware Applications**: If via middleware, which middleware platforms
  - **Business Process**: Link to a business process from master data
  - **Business Purpose**: Why this integration exists
  - **Lifecycle**: Current status
  - **Criticality**: Business importance
  - **Impact of Failure**: What happens if this interface fails
  - **Overview Notes**: Additional context

---

### Ownership

The Ownership tab documents who's responsible for the interface.

**Business Owners**: Business stakeholders accountable for the integration
**IT Owners**: Technical team members responsible for maintenance
**Impacted Companies**: Which companies/entities are affected by this interface

---

### Functional

The Functional tab captures the business logic of the integration.

**What you can document**:
  - **Business Objects**: What data entities are transferred
  - **Main Use Cases**: Primary scenarios this interface supports
  - **Functional Rules**: Business rules governing the data flow
  - **Key Identifiers**: Source and destination identifier mappings
  - **Dependencies**: Upstream and downstream interfaces this depends on
  - **Functional Documentation Links**: Links to external documentation
  - **Functional Attachments**: Upload specification documents

---

### Technical

The Technical tab defines how the integration works.

**Legs Template**: Define the data flow legs (Extract, Transform, Load, or Direct)
  - Each leg specifies: From → To, Trigger Type, Pattern, Format, Job Name
  - Legs are templates shared across all environments

**Additional fields**:
  - **Core Transformations Summary**: How data is transformed
  - **Error Handling Summary**: How errors are managed
  - **Technical Documentation Links**: Links to technical specs
  - **Technical Attachments**: Upload technical documents

**Tip**: The legs template defines the structure; environment-specific details (endpoints, credentials) go in the Environments tab.

---

### Environments

The Environments tab manages environment-specific bindings.

**How it works**:
  - Each environment (Prod, Pre-prod, QA, etc.) can have bindings
  - Bindings connect app instances to the interface legs
  - For each binding, specify endpoints, status, job names, and notes

**Binding fields**:
  - **Source Instance** / **Target Instance**: Which app instances
  - **Source Endpoint** / **Target Endpoint**: Technical endpoints
  - **Status**: Enabled, Disabled, Testing
  - **Environment Job Name**: Environment-specific job name override
  - **Notes**: Environment-specific notes

---

### Compliance

The Compliance tab captures data protection information.

**What you can edit**:
  - **Data Class**: Sensitivity level (Public, Internal, Confidential, Restricted)
  - **Contains PII**: Whether personal data is transferred
  - **PII Description**: What PII is included if applicable
  - **Typical Data**: Description of typical data payload
  - **Data Residency**: Countries where data flows
  - **Audit Logging**: How the interface is audited
  - **Security Controls Summary**: Security measures in place

---

## Copying interfaces

There are two ways to copy interfaces in KANAP:

### Duplicate Interface (from Interfaces page)

Use this when you want to create an independent copy of an interface—typically to create a similar interface between the same or different applications.

1. Select an interface in the grid
2. Click **Duplicate Interface**
3. Choose whether to copy environment bindings:
   - **Without bindings**: Creates a clean copy—just the interface definition, legs, owners, and metadata
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

Use this when upgrading an application to a new version and need to migrate interfaces to the new version. See [Applications → Version management](applications.md#version-management) for details.

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
  - **Use environment bindings**: Don't create separate interfaces for each environment—use one interface with multiple bindings.
  - **Link to business processes**: Connecting interfaces to business processes helps with impact analysis.
  - **Keep middleware explicit**: If data flows through middleware, model it explicitly to see the true data path.
  - **Use duplicate for similar interfaces**: When creating a new interface that's similar to an existing one, use **Duplicate Interface** to copy all settings, then modify what's different. Optionally include bindings to get a head start on environment configuration.
