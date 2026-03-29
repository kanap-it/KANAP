# Actifs

Assets document your infrastructure inventory -- physical servers, virtual machines, containers, cloud instances, and network devices. Link assets to applications, locations, connections, and financial records to build a complete picture of your IT infrastructure.

## Premiers pas

Navigate to **Cartographie SI > Actifs** to see your asset inventory. Click **Add asset** to create your first entry.

**Required fields**:
- **Name**: A unique asset name or hostname
- **Asset Type**: Web server, database, application server, network device, etc.
- **Location**: Where the asset is hosted (determines provider, hosting type, and country)

**Strongly recommended**:
- **Lifecycle**: Current status (Active, Deprecated, Retired, etc.)
- **Environment**: Which environment this asset belongs to (Prod, Pre-prod, QA, etc.)

**Tip**: Use consistent naming conventions that include environment and role information (e.g., `prod-web-01`, `dev-db-master`). When creating a new asset, the hostname is automatically derived from the name you type.

---

## Travailler avec la liste

The asset list gives you a filterable, sortable overview of every asset in your inventory.

**Default columns**:

| Column | What it shows |
|--------|---------------|
| **Name** | Asset name (click to open espace de travail) |
| **Asset Type** | The asset's role (e.g., Virtual Machine, Physical Server) |
| **Cluster** | Cluster membership, or a "Cluster" badge if this asset is a cluster |
| **Environment** | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| **Location** | Where the asset is hosted |
| **Hosting** | Hosting type (derived from location) |
| **OS** | Operating system |
| **Network Zone** | Network segment (derived from subnet) |
| **Lifecycle** | Current lifecycle status |
| **Assignments** | Number of application assignments |
| **Created** | When the record was created |

**Additional columns** (hidden by default, available via column chooser):
- **Sub-location**: Specific area within the location (building, room, rack)
- **Go-live**: Date the asset went into production
- **End-of-life**: Planned or actual retirement date

**Filtering**:

Most columns support checkbox set filters for quick multi-select filtering. Filter options update dynamically based on other active filters and the search query, so you only see values that exist in the current result set.

| Column | Notes |
|--------|-------|
| Asset Type | Filter by one or more asset types |
| Cluster | Includes "(No cluster)" for standalone assets |
| Environment | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| Location | Includes "(No location)" for unassigned assets |
| Sub-location | Includes "(No sub-location)" for assets without one |
| Hosting | Filter by hosting type |
| OS | Filter by operating system |
| Network Zone | Filter by network segment |
| Lifecycle | Filter by lifecycle status |

**Tip**: Combine filters across columns to narrow results. For example, filter by Environment = "Prod" and Lifecycle = "Active" to see only active production assets.

**Actions**:
- **Add asset**: Create a new asset (requires `infrastructure:member`)
- **Importer CSV** / **Exporter CSV**: Bulk operations (requires `infrastructure:admin`)
- **Delete selected**: Remove selected assets (requires `infrastructure:admin`)

---

## Clusters

Assets can be organized into clusters:

- **Regular asset**: An individual infrastructure instance
- **Cluster**: A group of assets acting as a single logical unit

When creating or editing an asset, toggle **This server represents a cluster** to mark it as a cluster. Cluster assets can be endpoints in connections, but application instances should be assigned to member hosts, not to the cluster itself.

Cluster members are managed from the **Technical** tab of the cluster's espace de travail.

---

## The Assets espace de travail

Click any row to open l'espace de travail. The header shows the asset name, a "Cluster" badge (when applicable), and your position in the list (e.g., "3 of 47"). Use the arrow buttons to navigate to the previous or next asset without returning to the list.

### Overview

The Overview tab captures the asset's identity and location.

**What you can edit**:
- **Name**: Asset hostname or identifier
- **Asset Type**: Role (Web Server, Database, Application Server, etc.)
- **Is Cluster**: Toggle to mark this asset as a cluster
- **Location**: Link to a Location record (required). Selecting a location automatically populates the read-only fields below.
- **Sub-location**: When the selected location has sub-locations defined (buildings, rooms, racks), this dropdown appears so you can specify exactly where the asset sits within the location.
- **Lifecycle**: Current status (Active, Deprecated, Retired, etc.)
- **Go-live date**: When the asset entered production
- **End-of-life date**: Planned or actual retirement date
- **Notes**: Free-form notes about the asset

**Read-only fields** (derived from the selected location):
- **Hosting type**: On-premises, colocation, cloud, etc.
- **Cloud provider / Operating company**: For cloud locations, shows the cloud provider; for on-premises, shows the operating company
- **Country**: Country of the location
- **City**: City of the location

---

### Technical

The Technical tab organizes network identity and configuration into logical sections.

**Environment**:
- **Environment**: Prod, Pre-prod, QA, Test, Dev, or Sandbox

**Cluster sections**:
- If this asset **is a cluster**: Shows the **Members** table listing all member assets (Name, Environment, Status, Operating System). Click **Edit members** to add or remove members through a search dialog.
- If this asset **is not a cluster**: Shows **Cluster membership** -- which clusters this asset belongs to, if any.

**Identity**:
- **Hostname**: The asset's network hostname. Automatically pre-filled from the asset name on creation; you can override it at any time. Required when a domain is selected.
- **Domain**: The Active Directory or DNS domain the asset belongs to. Choose from domains configured in **Paramètres > Cartographie SI**. System options include "Workgroup" (standalone) and "N/A" (not applicable).
- **FQDN**: Fully Qualified Domain Name, automatically computed from hostname and domain DNS suffix. Read-only.
- **Aliases**: Additional DNS names or aliases for this asset. Type and press Enter to add.
- **Operating System**: OS type and version (e.g., Windows Server 2022, Ubuntu 24.04 LTS). Disabled for clusters -- OS is defined per member. When selected, shows standard and extended support end dates.

**IP Addresses**:

Assets support multiple IP addresses, each with its own network configuration:

- Click **Add IP Address** to add a new entry
- **Type**: The purpose of the IP address (Host, IPMI, Management, iSCSI, or custom types from Settings)
- **IP Address**: The address itself
- **Subnet**: Network subnet from the configured list (filtered to the asset's location)
- **Network Zone**: Automatically derived from the selected subnet (read-only)
- **VLAN**: Automatically derived from the selected subnet (read-only)

This lets you document multiple network interfaces per asset -- for example, a physical server with both a host IP and an IPMI management address on different subnets.

---

### Hardware

*Only visible for physical asset types.*

Tracks physical hardware details:
- **Serial number**
- **Manufacturer**
- **Model**
- **Purchase date**
- **Rack location** (e.g., Row A, Rack 12)
- **Rack unit** (e.g., U1-U4)
- **Notes**

---

### Support

*Only visible for physical asset types.*

Tracks vendor support and contact information:
- **Vendor**: Select from the supplier directory
- **Support contract**: Link to a contract record
- **Support tier**: Free text (e.g., Gold, Silver, 24x7)
- **Support expiry**: Expiration date
- **Notes**

**Support contacts**: A table where you can add contacts from the contact directory, each with a role label. The table displays each contact's email, phone, and mobile automatically.

---

### Relations

The Relations tab lets you define how this asset connects to other records across KANAP.

**Asset relations**:
- **Depends on**: Other assets this one depends on (e.g., a database server)
- **Contains**: Assets contained within this one (e.g., servers in a rack)
- **Contained by** / **Depended on by**: Read-only reverse views showing which other assets reference this one

**Financials**:
- **OPEX items**: Link to operational expenditure items
- **CAPEX items**: Link to capital expenditure items
- **Contracts**: Link to contract records

**Projects**: Link to portfolio projects related to this asset.

**Relevant websites**: Add URLs with optional descriptions -- useful for vendor portals, monitoring dashboards, or documentation links.

**Attachments**: Drag and drop files or click **Select files** to upload. Click an attachment chip to download it.

---

### Base de connaissances

Attach knowledge articles to this asset. If you have the `knowledge:member` permission, you can create new articles directly from this tab.

---

### Assignments

View and manage which applications run on this asset. Each assignment links the asset to an application instance (a specific environment of an application).

**To add an assignment**:
1. Click **Add assignment**
2. Select an **Application**
3. Choose an **Environment** (instance)
4. Select a **Role** (from the server role list in Settings)
5. Optionally set a **Since date** and **Notes**

Cluster assets cannot host application assignments -- assign member hosts instead.

Each assignment row shows the application name (clickable to navigate to it), environment, role, since date, and notes. You can edit or remove assignments from the actions column.

---

### Connections

A read-only view of all connections involving this asset. Each row shows:

| Column | What it shows |
|--------|---------------|
| **Connection ID** | Clickable link to the connection espace de travail |
| **Name** | Connection name |
| **Topology** | Server to Server or Multi-server |
| **Protocols** | Protocol chips |
| **Source** | Source endpoint label |
| **Destination** | Destination endpoint label |
| **Lifecycle** | Connection lifecycle status |

To manage connections, navigate to **Cartographie SI > Connexions**.

---

## Import/export CSV

Maintain your asset inventory at scale using CSV import and export. This feature supports bulk operations for initial data loading, periodic updates from external systems, and data extraction for reporting.

### Accessing CSV features

From the Assets list:
- **Exporter CSV**: Download assets to a CSV file
- **Importer CSV**: Upload a CSV file to create or update assets

**Permissions required**: `infrastructure:admin` for import/export operations.

### Export options

| Option | Description |
|--------|-------------|
| **Full Export** | All exportable fields -- use for reporting and complete data extraction |
| **Data Enrichment** | All importable fields -- matches the import template format, ideal for round-trip editing (export, modify, re-import) |
| **Custom Selection** | Choose specific fields to include in your export |

**Template download** (from Import dialog): Downloads a blank CSV with all importable field headers -- use this to prepare import files with the correct structure.

### Import workflow

1. **Prepare your file**: Use UTF-8 encoding with semicolon (`;`) separators. Download a template to ensure correct headers.

2. **Choose import settings**:
   - **Mode**:
     - `Enrich` (default): Empty cells preserve existing values -- only update what you specify
     - `Replace`: Empty cells clear existing values -- full replacement of all fields
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

For fields configured in **Paramètres > Cartographie SI**, you can use either the internal code or the display label:

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
- **Relations not included**: Application assignments, connections, financial links, and attachments must be managed in l'espace de travail

### Troubleshooting

**"File isn't properly formatted" error**: This usually indicates an encoding issue. Ensure your CSV is saved as **UTF-8**:

- **In LibreOffice**: When opening a CSV, select `UTF-8` in the Character set dropdown (not "Japanese (Macintosh)" or other encodings). When saving, check "Edit filter settings" and choose UTF-8.
- **In Excel**: Save As > CSV UTF-8 (Comma delimited), then open in a text editor to change commas to semicolons.
- **General tip**: If you see garbled characters at the start of your file, the encoding is incorrect.

### Example CSV

```csv
name;location_code;kind;environment;status;hostname;domain;ip_1_type;ip_1_address
PROD-WEB-01;NYC-DC1;Virtual Machine;prod;Active;prodweb01;corp;Host IP;10.0.1.10
PROD-DB-01;NYC-DC1;vm;prod;active;proddb01;corp;host;10.0.1.20
```

---

## Conseils

- **Name consistently**: Include environment, role, and sequence in asset names for easy identification.
- **Use clusters**: Group related assets (e.g., web cluster, database cluster) to simplify management.
- **Track lifecycle**: Mark deprecated and retired assets to maintain accurate inventory counts.
- **Link to locations**: Assign assets to locations for geographic reporting and DR planning.
- **Assign to applications**: Link assets to application instances to understand what runs where.
- **Use the Relations tab**: Connect assets to OPEX/CAPEX items, contracts, and projects for financial visibility.
- **Attach documentation**: Upload configuration files, architecture diagrams, or vendor docs directly to the asset.
