# IT Operations Settings

The **IT Operations Settings** page lets you customize the dropdown values used throughout IT Operations. These lists control what options appear when users create or edit Applications, Interfaces, Assets, Connections, and Locations. Changes here apply to all users in your workspace.

## Where to find it

- Workspace: **IT Operations**
- Path: **IT Operations → Settings**
- Permissions:
  - You need at least `settings:reader` to view the page.
  - You need `settings:admin` to change values.

If you don't see the **Settings** entry in the IT Operations drawer, ask your administrator to grant you the appropriate permissions.

## How the page is organized

Settings are grouped into three collapsible sections:

1. **Locations** - Lists used when creating or editing Locations.
2. **Assets & Connections** - Lists for Assets, Connections, and related infrastructure data.
3. **Apps, Services & Interfaces** - Lists used across Applications, App Instances, Interfaces, and Bindings.

Each list appears as an expandable panel. Click a panel header to expand it and see the values. Only one section loads its content when you first expand it, which keeps the page fast even when you have many lists.

### Editor controls

Each list has its own controls at the top:

- **Add item** - Inserts a new row at the top of the list, focused and ready to type.
- **Save changes** - Saves your edits to the server. Enabled when you have unsaved changes.
- **Reset** - Reverts the list to the last saved state (not factory defaults).

For long lists (more than 25 rows), the table virtualizes rows, showing about 20 at a time with smooth scrolling and sticky headers.

---

## Locations

### Cloud Providers

Cloud providers available for Assets and cloud-type Locations (e.g., AWS, Azure, GCP).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Assets workspace → Overview tab → **Provider** field
- Locations workspace → Overview tab → **Cloud provider** (when hosting type is cloud)

### Hosting Types

Location hosting models (e.g., On-prem, Colocation, Public Cloud, Private Cloud, SaaS).

**Columns**: Label, Code, Category (On-prem/Colocation or Cloud/SaaS), Deprecated flag

**Where used**:
- Locations workspace → Overview tab → **Hosting Type** field

The category determines which fields appear when editing a Location:
- **On-prem / Colocation** shows Operating Company and Datacenter fields
- **Cloud / SaaS** shows Cloud Provider, Region, and Additional information fields

---

## Assets & Connections

### Connection Types

A two-level catalog of connection protocols organized by category, with typical ports.

**Columns**: Category (e.g., Database, Remote Access), Label, Code, Typical ports, Deprecated flag

**Where used**:
- Connections workspace → **Connection Type** selector

The **Typical ports** field is free text - you can enter single ports (`443`), lists (`80, 443`), ranges (`9101-9103`), or placeholders like `multiple` or `specify`.

Default categories include: Application, Authentication, Backup, Database, Email, File Sharing, File Transfer, Messaging, Monitoring, Network Services, Remote Access, Replication, Storage, VPN / Tunnel, Generic.

### Domains

Active Directory or DNS domains that assets can belong to. Used to compute the fully qualified domain name (FQDN) for each asset.

**Columns**: Name, Code, DNS Suffix, Deprecated flag

**Where used**:
- Assets workspace → Technical tab → **Domain** selector
- Assets workspace → Technical tab → **FQDN** (auto-computed from hostname + DNS suffix)

**System entries** (cannot be modified or deleted):
- **Workgroup** - For standalone assets not joined to a domain
- **N/A** - For asset types where domain membership doesn't apply (e.g., network devices, racks)

**Auto-fill behavior**: When adding a new domain, the Code and DNS Suffix fields auto-fill based on the Name you enter. You can override these values if needed.

**Example**: A domain named "Corporate AD" with DNS suffix `corp.example.com` would produce an FQDN of `hostname.corp.example.com` for an asset with hostname `web-server-01`.

### Entities

Source and target entities for data flows and access patterns (e.g., Internal Users, Internet, Partner Networks, External Systems).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Connections workspace → **Source Entity** and **Target Entity** fields
- Connection Map → entities appear as flow endpoints

### IP Address Types

Types of IP addresses that can be assigned to assets. Useful for distinguishing between different network interfaces like host IPs, management interfaces, and storage networks.

**Columns**: Label, Code, Deprecated flag

**Default values**: Host, IPMI, Management, iSCSI

**Where used**:
- Assets workspace → Technical tab → **IP Addresses** section → **Type** dropdown

Assets can have multiple IP addresses, each with its own type. For example, a physical server might have:
- A **Host** IP for application traffic
- An **IPMI** IP for out-of-band management
- An **iSCSI** IP for storage network connectivity

### Network Zones

Network zones used to categorize subnets and describe asset connectivity (e.g., LAN, DMZ, Industrial LAN, WiFi, Public Cloud, Guest, Management, Storage, VPN).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Subnets list → **Network Zone** selector
- Assets workspace → Technical tab → **Network Zone** (auto-populated when subnet is selected)

### Subnets

Define network subnets with CIDR notation, optional VLAN assignments, and network zone classification. Each subnet belongs to a specific Location.

**Columns**: Location, CIDR, VLAN (1-4094), Network Zone, Description, Deprecated flag

**Where used**:
- Assets workspace → Technical tab → **Subnet** selector

**Validation rules**:
- CIDR must be valid IPv4 notation (e.g., `192.168.1.0/24`)
- VLAN numbers must be between 1 and 4094
- CIDR and VLAN numbers are unique per location (same values can exist at different locations)

**Auto-population**: When you select a subnet on an Asset, the Network Zone is automatically populated from the subnet's configuration.

### Operating Systems

Catalog of operating systems for Assets, including support lifecycle dates.

**Columns**: Name, Code, Standard Support end date, Extended Support end date, Deprecated flag

**Where used**:
- Assets workspace → Technical tab → **Operating System** selector (helper text shows support dates)

Dates are stored as `YYYY-MM-DD` but displayed and edited as `DD/MM/YYYY`.

Default entries include Windows Server versions, Ubuntu LTS, RHEL, Debian, and SLES with appropriate support dates.

### Asset Roles

Roles assigned to assets when linking them to application instances (e.g., Web server, Database server, Worker).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Applications workspace → Servers tab → **Role** dropdown when linking an asset to an instance

### Asset Types

Logical types for infrastructure assets (e.g., Physical server, Virtual machine, Container, Serverless, Appliance).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Assets workspace → Overview tab → **Type** field

---

## Apps, Services & Interfaces

### Access Methods

Methods by which users access applications (e.g., Web browser, Mobile app, VDI session).

**Columns**: Label, Code, Deprecated flag

**Default values**: Web, Locally installed application, Mobile application, Proprietary HMI (industrial interface), Terminal / CLI, VDI / Remote Desktop, Kiosk

**Where used**:
- Applications workspace → Technical & Support tab → **Access Methods** multi-select field

**Tip**: Customize access methods to match how your organization categorizes application access. For example, add "Citrix" or "Thin Client" if those are common access patterns in your environment.

### Application Categories

Categories that describe the primary purpose of each application or service.

**Columns**: Label, Code, Deprecated flag

**Default values**: Line-of-business, Productivity, Security, Analytics, Development, Integration, Infrastructure

**Where used**:
- Applications workspace → Overview tab → **Category** field
- Applications list → **Category** column and filter

**Tip**: Customize categories to match your organization's terminology. For example, rename "Line-of-business" to "Business Applications" if that's how your team refers to them.

### Data Classes

Data classification levels for Applications and Interfaces.

**Columns**: Label, Code, Deprecated flag

**Locked codes**: The built-in levels (Public, Internal, Confidential, Restricted) cannot be deleted or deprecated.

**Where used**:
- Applications workspace → Compliance tab → **Data Class** field
- Interfaces workspace → Overview tab → **Data Class** field
- Applications list → **Data Class** column

### Integration Patterns

Integration patterns for Interface legs (e.g., REST API, File batch, Queue, DB staging).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interface legs → **Pattern** field

### Interface Authentication Modes

Authentication modes for Interface bindings (e.g., Service account, OAuth2, API key, Certificate).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interface bindings → **Auth Mode** field

### Interface Data Categories

Business data categories for Interfaces (e.g., Master Data, Transactional, Reporting, Control).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interfaces workspace → **Data Category** field

### Interface Data Formats

Payload formats for Interface legs (e.g., CSV, JSON, XML, IDoc, Binary).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interface legs → **Format** field

### Interface Protocols

Technical protocols for Interface bindings (e.g., HTTP/REST, gRPC, SFTP, Kafka, Database).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interface bindings → **Protocol** field (legacy bindings)

### Interface Trigger Types

Trigger mechanisms for Interface legs (e.g., Event-based, Scheduled, Real-time, Manual).

**Columns**: Label, Code, Deprecated flag

**Where used**:
- Interface legs → **Trigger** field

### Lifecycle Statuses

Shared lifecycle states for Applications, App Instances, Interfaces, Interface Bindings, and Assets.

**Columns**: Label, Code, Deprecated flag

**Locked codes**: The built-in statuses (Proposed, Active, Deprecated, Retired) cannot be deleted or have their codes changed.

**Where used**:
- Applications, App Instances, Interfaces, Interface Bindings, Assets → **Status** fields

---

## How changes affect existing data

- **Existing records keep their stored codes** - Changing a label only changes what users see, not the underlying data.
- **Deprecated values**:
  - Remain valid for records that already use them.
  - Are hidden from dropdowns when creating new records.
  - Still appear during edits if the record already uses that value.
- **New values** become immediately available in the relevant dropdowns and are validated server-side.

This approach lets you evolve your taxonomy over time without breaking existing records.

---

## Quick reference: which list powers which field

| List | Where it's used |
|------|-----------------|
| **Access Methods** | Applications (Technical & Support tab → Access Methods) |
| **Application Categories** | Applications (Category) |
| **Cloud Providers** | Assets (Provider), Locations (Cloud provider) |
| **Connection Types** | Connections (Connection Type) |
| **Data Classes** | Applications (Compliance tab), Interfaces (Overview), Applications list |
| **Domains** | Assets (Technical tab → Domain, FQDN) |
| **Entities** | Connections (Source/Target Entity), Connection Map |
| **Hosting Types** | Locations (Overview) |
| **Integration Patterns** | Interface legs (Pattern) |
| **Interface Auth Modes** | Interface bindings (Auth Mode) |
| **Interface Data Categories** | Interfaces (Data Category) |
| **Interface Data Formats** | Interface legs (Format) |
| **Interface Protocols** | Interface bindings (Protocol) |
| **Interface Trigger Types** | Interface legs (Trigger) |
| **IP Address Types** | Assets (Technical tab → IP Addresses → Type) |
| **Lifecycle Statuses** | Applications, App Instances, Interfaces, Bindings, Assets |
| **Network Zones** | Subnets (Network Zone), Assets (auto-populated from subnet) |
| **Operating Systems** | Assets (Technical tab) |
| **Subnets** | Assets (Technical tab → IP Addresses → Subnet selector) |
| **Asset Roles** | Applications → Servers tab (role when linking asset to app) |
| **Asset Types** | Assets (Overview → Type) |

---

## Tips

- **Align labels with your terminology** - Review the defaults and rename labels to match how your organization talks about these concepts. Codes stay the same; only the display text changes.
- **Deprecate gradually** - When transitioning away from a value, mark it deprecated rather than deleting it. This keeps historical data intact while steering users toward new options.
- **Coordinate Data Classes with security** - Changes to Data Classes should align with your information security policies. Discuss with compliance before adding or renaming classification levels.
- **Use typical ports as documentation** - The Connection Types "Typical ports" field is informational. Fill it in to help users understand what ports each connection type commonly uses.
