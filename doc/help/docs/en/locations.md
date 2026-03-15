# Locations

Locations document where your IT infrastructure is hosted -- data centers, cloud regions, office server rooms, and colocation facilities. Assigning assets and applications to locations gives you geographic visibility, helps with capacity planning, and keeps facility contacts within reach when you need them.

## Getting started

Navigate to **IT Operations -> Locations** to open the location registry. Click **Add Location** to create a new entry.

**Required fields**:
- **Code**: A unique short identifier (e.g., `DC-EU-WEST`, `AWS-US-EAST-1`)
- **Name**: A descriptive display name
- **Hosting Type**: The kind of facility -- on-premises data center, colocation, cloud region, etc.

**Strongly recommended**:
- **Country**: Where the location sits geographically
- **Provider** or **Operating Company**: Who operates the facility

**Tip**: Use consistent naming conventions. Prefixing cloud locations with the provider name (`AWS-`, `AZURE-`, `GCP-`) makes them easy to spot in lists and reports.

---

## Working with the list

The list gives you a searchable overview of every registered location.

**Default columns**:
- **Code**: Location code (click to open the workspace)
- **Name**: Display name
- **Hosting Type**: On-prem, colocation, public cloud, etc.
- **Provider / Company**: Cloud provider for cloud-type locations, or operating company for on-prem locations
- **Country**: Country name and ISO code
- **City**: City name
- **Assets**: Number of assets assigned to this location
- **Created**: When the record was created

**Filtering**:
- Quick search: Free-text search across all rows
- Column filters: Text filters on Code, Name, and City; set filter on Hosting Type

**Actions**:
- **Add Location**: Create a new location (requires `locations:manager`)

You can also show, hide, and reorder columns using the column chooser.

---

## The Locations workspace

Click any row to open the workspace. It has three tabs: **Overview**, **Contacts & Support**, and **Relations**. The Contacts & Support and Relations tabs become available after the location is saved for the first time.

### Overview

The Overview tab captures identity and geographic information, split into two sections.

**Basic information**:
- **Code**: Unique identifier (required)
- **Name**: Display name (required)
- **Hosting Type**: Category of facility (required). Hosting types are configurable in **IT Operations -> Settings**.

**Location details** -- the fields shown here depend on the hosting type category:

For **on-premises** hosting types:
- **Operating Company**: The company that runs the facility. Selecting a company auto-fills Country and City if they are blank.
- **Datacenter**: Specific datacenter name or identifier

For **cloud** hosting types:
- **Cloud Provider**: The cloud provider (e.g., AWS, Azure, GCP)
- **Region**: Cloud region or availability zone
- **Additional Info**: Free-form notes

Both categories also show:
- **Country**: Selected from the ISO country list
- **City**: City name

**How it works**: Switching between an on-prem and a cloud hosting type clears the fields that belong to the other category. The editor asks for confirmation before making the switch.

---

### Contacts & Support

This tab organises the people and references associated with a location into three sections.

**Internal contacts**: Team members from your organisation linked to this location. Each row has a **User** picker and a free-text **Role** field (e.g., "Ops lead", "Security officer").

**External contacts**: Third-party contacts pulled from your Contacts master data. Each row has a **Contact** picker and a **Role** field (e.g., "Account manager", "NOC contact").

**Relevant websites**: Useful links such as provider portals, facility documentation, or status pages. Each row has a **Description** and a **URL**.

Click **Save** in the workspace header to persist changes across all three sections at once.

---

### Relations

The Relations tab shows entities that are linked to this location. It is read-only -- relationships are managed from the related records themselves.

**Assets**: A table of assets hosted at this location, showing Name, Environment, Type, Provider, Region/Zone, and Status. Click an asset name to jump to its workspace.

**Applications**: A table of applications that have infrastructure at this location, showing Name and Environments. Click an application name to jump to its workspace.

---

## Deleting a location

From the workspace header, click **Delete** to remove a location.

- Requires `locations:admin` permission.
- Linked assets are not deleted -- they are automatically unassigned (their location reference is cleared).
- If you have unsaved changes in the workspace, those changes are lost on deletion.

---

## Hosting types

Hosting types are configurable in **IT Operations -> Settings**. Each type belongs to a category that controls which fields appear in the workspace.

| Type | Category | Example |
|------|----------|---------|
| Private Data Center | On-prem | Company-owned facility |
| Colocation | On-prem | Rented space in a shared facility |
| Public Cloud | Cloud | AWS, Azure, GCP |
| Private Cloud | Cloud | Company-operated cloud platform |
| Edge | Cloud | Edge computing locations |

---

## Tips

- **Be consistent with codes**: A clear naming convention makes locations easy to identify at a glance and keeps filters useful.
- **Track cloud regions individually**: Create one location per cloud region you use, not just one per provider.
- **Link assets to locations**: This enables geographic reporting, DR planning, and quick impact analysis during outages.
- **Document contacts early**: Having facility contacts on file before an incident saves critical time when it matters most.
