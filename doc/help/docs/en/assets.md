# Assets

Assets document your infrastructure inventory—physical servers, virtual machines, containers, cloud instances, and network devices. Link assets to applications, locations, and connections to build a complete picture of your IT infrastructure.

## Getting started

Navigate to **IT Operations → Assets** to see your asset inventory. Click **Add Asset** to create your first entry.

**Required fields**:
  - **Name**: A unique asset name or hostname
  - **Asset Type**: Web server, database, application server, network device, etc.
  - **Provider**: On-premises, AWS, Azure, GCP, etc.
  - **Environment**: Which environment this asset belongs to

**Strongly recommended**:
  - **Lifecycle**: Current status (Active, Deprecated, Retired)
  - **Location**: Where the asset is hosted

**Tip**: Use consistent naming conventions that include environment and role information (e.g., `prod-web-01`, `dev-db-master`).

---

## Working with the list

**Default columns**:
  - **Name**: Asset name (click to open workspace)
  - **Asset Type**: The asset's role
  - **Cluster**: Cluster membership or "Cluster" badge if this is a cluster
  - **Environment**: Prod, Pre-prod, QA, Test, Dev, Sandbox
  - **Location**: Where the asset is hosted
  - **Hosting**: Hosting type (derived from location)
  - **OS**: Operating system
  - **Network Zone**: Network segment (derived from first IP address)
  - **Lifecycle**: Current status
  - **Assignments**: Number of application assignments
  - **Created**: When the record was created

**Actions**:
  - **Add Asset**: Create a new asset (requires `infrastructure:member` permission)
  - **Import CSV** / **Export CSV**: Bulk operations (requires `infrastructure:admin` permission)
  - **Delete Selected**: Remove selected assets (requires `infrastructure:admin` permission)

### Filtering

Most columns support **checkbox set filters** for quick multi-select filtering:

| Column | Filter Type | Notes |
|--------|-------------|-------|
| Asset Type | Checkbox set | Filter by one or more asset types |
| Cluster | Checkbox set | Filter by cluster membership; includes "(No cluster)" for standalone assets |
| Environment | Checkbox set | Filter by environment (Prod, Pre-prod, QA, etc.) |
| Location | Checkbox set | Filter by location; includes "(No location)" for unassigned |
| Hosting | Checkbox set | Filter by hosting type |
| OS | Checkbox set | Filter by operating system |
| Network Zone | Checkbox set | Filter by network segment |
| Lifecycle | Checkbox set | Filter by lifecycle status |

**Filter behavior**:
  - **Default**: All values are selected (unfiltered)
  - **Select one or more**: Shows assets matching any selected value
  - **All button**: Selects all options; when all values are selected the filter clears back to unfiltered
  - **Clear button**: Deselects all options (shows nothing)
  - **Floating filter label**: Shows `All`, `None`, or `N selected` with an **x** to clear the filter
  - **Scoped values**: Filter options dynamically update based on other active filters and search

**Tip**: Combine filters across columns to narrow results. For example, filter by Environment = "Prod" and Lifecycle = "Active" to see only active production assets.

---

## Clusters

Assets can be organized into clusters:

**Regular asset**: An individual infrastructure instance
**Cluster**: A group of assets acting as a single logical unit

When creating an asset:
- Check **Is Cluster** to mark it as a cluster
- Or select an existing cluster in the **Cluster** field to make it a member

Cluster members inherit some properties from the cluster while maintaining their own identity.

---

## The Assets workspace

Click any row to open the workspace.

### Overview

**Identity fields**:
  - **Name**: Asset hostname
  - **Asset Type**: Role (Web, Database, Application, etc.)
  - **Provider**: Hosting provider (automatically derived from location)
  - **Environment**: Which environment
  - **Location**: Link to a Location record
  - **Lifecycle**: Current status

**Cluster settings**:
  - **Is Cluster**: Whether this asset represents a cluster
  - **Cluster**: Which cluster this asset belongs to (if any)

**Notes**: Free-form notes about the asset

### Technical

The Technical tab organizes asset configuration into logical sections.

**Environment**:
  - **Operating System**: OS type and version (e.g., Windows Server 2022, Ubuntu 24.04 LTS)

**Identity**:
  - **Hostname**: The asset's network hostname (required when a domain is selected)
  - **Domain**: The Active Directory or DNS domain the asset belongs to. Choose from domains configured in Settings → IT Operations. System options include "Workgroup" (standalone) and "N/A" (not applicable for this asset type).
  - **FQDN**: Fully Qualified Domain Name, automatically computed from hostname and domain DNS suffix. Read-only.
  - **Aliases**: Additional DNS names or aliases for this asset. Type and press Enter to add.

**IP Addresses**:

Assets support multiple IP addresses, each with its own network configuration:

  - **Add IP Address**: Click to add a new IP entry (button at top of list)
  - **Type**: The purpose of the IP address (Host, IPMI, Management, iSCSI, or custom types from Settings)
  - **IP Address**: The IP address itself; validated against the selected subnet
  - **Subnet**: Network subnet from the configured list (per location)
  - **Network Zone**: Automatically derived from the selected subnet (read-only)
  - **VLAN**: Automatically derived from the selected subnet (read-only)

This allows you to document multiple network interfaces per asset—for example, a physical server with both a host IP and an IPMI management address on different subnets.

---

## Application assignments

Assets can be assigned to application instances:

1. Open an Application workspace
2. Go to the **Servers** tab
3. Add asset assignments for each environment's instances

This creates a two-way relationship—you can see:
- From the Application: Which assets host each instance
- From the Asset: Which applications run on it (via the Assignments count)

---

## Connection mapping

Assets participate in Connections:

1. Create a Connection
2. Set the Source Asset and Destination Asset
3. Or for multi-asset connections, add all participating assets

The Connection Map visualizes these relationships.

---

## CSV import/export

Maintain your asset inventory at scale using CSV import and export. This feature supports bulk operations for initial data loading, periodic updates from external systems, and data extraction for reporting.

### Accessing CSV features

From the Assets list:
  - **Export CSV**: Download assets to a CSV file
  - **Import CSV**: Upload a CSV file to create or update assets
  - **Download Template**: Get a blank CSV with correct headers

**Permissions required**: `infrastructure:admin` for import/export operations.

### Export options

Three export modes are available:

| Option | Description |
|--------|-------------|
| **Full Export** | All exportable fields—use for reporting and complete data extraction |
| **Data Enrichment** | All importable fields—matches the import template format, ideal for round-trip editing (export → modify → re-import) |
| **Custom Selection** | Choose specific fields to include in your export |

**Template download** (from Import dialog): Downloads a blank CSV with all importable field headers—use this to prepare import files with the correct structure.

### Import workflow

1. **Prepare your file**: Use UTF-8 encoding with semicolon (`;`) separators. Download a template to ensure correct headers.

2. **Choose import settings**:
   - **Mode**:
     - `Enrich` (default): Empty cells preserve existing values—only update what you specify
     - `Replace`: Empty cells clear existing values—full replacement of all fields
   - **Operation**:
     - `Upsert` (default): Create new assets or update existing ones
     - `Update only`: Only modify existing assets, skip new ones
     - `Insert only`: Only create new assets, skip existing ones

3. **Validate first**: Click **Preflight** to validate your file without making changes. Review errors and warnings.

4. **Apply changes**: If validation passes, click **Import** to commit changes.

### Field reference

**Core fields**:

| CSV Column | Description | Required | Notes |
|------------|-------------|----------|-------|
| `id` | Asset UUID | No | For updates; leave blank for new assets |
| `name` | Asset name | Yes | Used as unique identifier for matching |
| `location_code` | Location code | Yes | Must match an existing location code |
| `kind` | Asset type | Yes | Accepts code or label (e.g., `vm` or `Virtual Machine`) |
| `environment` | Environment | Yes | `prod`, `pre_prod`, `qa`, `test`, `dev`, `sandbox` |
| `status` | Lifecycle status | No | Accepts code or label (e.g., `active` or `Active`) |
| `is_cluster` | Is this a cluster | No | `true` or `false` |
| `hostname` | Network hostname | No | |
| `domain` | DNS domain | No | Accepts code or label from Settings |
| `aliases` | DNS aliases | No | Comma-separated list |
| `operating_system` | OS type | No | Accepts code or label from Settings |
| `cluster` | Cluster membership | No | Name of parent cluster |
| `notes` | Free-form notes | No | |

**IP Address fields** (up to 4 addresses per asset):

| CSV Column | Description | Notes |
|------------|-------------|-------|
| `ip_1_type` | IP address type | Accepts code or label (e.g., `host` or `Host IP`) |
| `ip_1_address` | IP address | |
| `ip_1_subnet_cidr` | Subnet in CIDR notation | |
| `ip_2_type` through `ip_4_type` | Additional IP types | Same pattern for slots 2-4 |
| `ip_2_address` through `ip_4_address` | Additional addresses | |
| `ip_2_subnet_cidr` through `ip_4_subnet_cidr` | Additional subnets | |

### Label and code acceptance

For fields configured in **IT Operations → Settings**, you can use either the internal code or the display label:

| Field | Example codes | Example labels |
|-------|---------------|----------------|
| Asset Type (`kind`) | `vm`, `physical`, `container` | `Virtual Machine`, `Physical Server`, `Container` |
| Lifecycle (`status`) | `active`, `inactive`, `decommissioned` | `Active`, `Inactive`, `Decommissioned` |
| Operating System | `windows_2022`, `ubuntu_24` | `Windows Server 2022`, `Ubuntu 24.04 LTS` |
| Domain | `corp`, `dmz` | `Corporate Domain`, `DMZ` |
| IP Address Type | `host`, `ipmi`, `mgmt` | `Host IP`, `IPMI`, `Management` |

The system automatically normalizes values during import, so `Virtual Machine`, `virtual machine`, and `vm` all resolve to the same asset type.

### Matching and updates

Assets are matched by **name** (case-insensitive). When a match is found:
  - With `Enrich` mode: Only non-empty CSV values update the asset
  - With `Replace` mode: All fields are updated, empty values clear existing data

If you include the `id` column with a valid UUID, matching uses ID first, then falls back to name.

### Derived fields

Some fields are computed and cannot be imported:
  - **Provider**: Automatically derived from the asset's location
  - **FQDN**: Computed from hostname + domain

### Limitations

  - **Maximum 4 IP addresses**: Assets support up to 4 IP address entries via CSV
  - **Cluster assignment by name**: Use the cluster name, not ID, in the `cluster` column
  - **Location required**: Every asset must have a valid location code
  - **Relations not included**: Application assignments and connections must be managed in the workspace

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

  - **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
  - **In Excel**: Save As → CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
  - **General tip**: If you see garbled characters (`?¿`, `ï»¿`) at the start of your file, the encoding is incorrect.

### Example CSV

```csv
name;location_code;kind;environment;status;hostname;domain;ip_1_type;ip_1_address
PROD-WEB-01;NYC-DC1;Virtual Machine;prod;Active;prodweb01;corp;Host IP;10.0.1.10
PROD-DB-01;NYC-DC1;vm;prod;active;proddb01;corp;host;10.0.1.20
```

---

## Tips

  - **Name consistently**: Include environment, role, and sequence in asset names for easy identification.
  - **Use clusters**: Group related assets (e.g., web cluster, database cluster) to simplify management.
  - **Track lifecycle**: Mark deprecated and retired assets to maintain accurate inventory.
  - **Link to locations**: Assign assets to locations for geographic reporting and DR planning.
  - **Assign to applications**: Link assets to application instances to understand what runs where.
