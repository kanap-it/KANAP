# Locations

Locations document where your IT infrastructure is hosted—data centers, cloud regions, office server rooms, and colocation facilities. Each asset can be assigned to a location, enabling geographic tracking and capacity planning.

## Getting started

Navigate to **IT Operations → Locations** to see your location registry. Click **Add Location** to create your first entry.

**Required fields**:
  - **Code**: A unique short code (e.g., `DC-EU-WEST`, `AWS-US-EAST-1`)
  - **Name**: A descriptive name
  - **Hosting Type**: On-premises data center, colocation, cloud region, etc.

**Strongly recommended**:
  - **Country**: Where the location is geographically
  - **Provider** or **Operating Company**: Who operates the facility

**Tip**: Use consistent naming conventions—e.g., prefix cloud locations with the provider name (`AWS-`, `AZURE-`, `GCP-`).

---

## Working with the list

**Default columns**:
  - **Code**: Location code (click to open workspace)
  - **Name**: Location name
  - **Hosting Type**: On-prem, colocation, public cloud, etc.
  - **Provider / Company**: Cloud provider or operating company
  - **Country**: Geographic location
  - **City**: City name
  - **Assets**: Count of assets at this location
  - **Created**: When the record was created

**Actions**:
  - **Add Location**: Create a new location (requires `locations:manager` permission)
  - **Delete (from workspace)**: Remove a location (requires `locations:admin` permission)

---

## The Locations workspace

Click any row to open the workspace. It has three tabs:

### Overview

The Overview tab captures the location's identity and geographic information.

**What you can edit**:
  - **Code**: Unique identifier
  - **Name**: Display name
  - **Hosting Type**: Category (configurable in IT Operations Settings)
  - **Operating Company**: For on-premises, which company operates the facility
  - **Provider**: For cloud locations, the cloud provider
  - **Region**: Cloud region or geographic region
  - **Country**: ISO country code
  - **City**: City name
  - **Datacenter**: Specific datacenter name or identifier
  - **Additional Info**: Free-form notes

**Context-sensitive fields**: Depending on the hosting type:
- **On-premises**: Shows Operating Company field
- **Cloud**: Shows Provider and Region fields

---

### Contacts & Support

The Contacts & Support tab documents who to contact for this location.

**What you can add**:
- Support contacts with their role (e.g., Facility Manager, NOC Contact)
- Contact details are linked from your Contacts master data

---

### Relations

The Relations tab shows related entities:
- **Assets**: Assets hosted at this location
- **Links**: External URLs (facility documentation, provider portal)

### Delete location

From the workspace header, administrators can delete a location.

- Requires `locations:admin` permission.
- Linked assets are not deleted; they are automatically unassigned from the location (`location_id` is cleared).

---

## Hosting types

Hosting types are configurable in **IT Operations → Settings**. Common types include:

| Type | Category | Example |
|------|----------|---------|
| Private Data Center | On-prem | Company-owned facility |
| Colocation | On-prem | Rented space in a shared facility |
| Public Cloud | Cloud | AWS, Azure, GCP |
| Private Cloud | Cloud | Company-operated cloud platform |
| Edge | Cloud | Edge computing locations |

The category (on-prem vs cloud) determines which fields appear in the workspace.

---

## Tips

  - **Be consistent with codes**: Use a naming convention that makes locations easy to identify at a glance.
  - **Track cloud regions**: Create a location for each cloud region you use, not just per provider.
  - **Link to assets**: Assign assets to locations to enable geographic reporting and DR planning.
  - **Document contacts early**: Having facility contacts documented before an incident saves critical time.
