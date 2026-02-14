# Connections

Connections document the infrastructure-level network paths between assets. While Interfaces describe logical data flows between applications, Connections describe the physical network routes—which assets communicate, using which protocols and ports.

## Getting started

Navigate to **IT Operations → Connections** to see your connection registry. Click **Add Connection** to create your first entry.

**Required fields**:
  - **Connection ID**: A unique identifier (e.g., `CONN-WEB-DB-001`)
  - **Name**: A descriptive name
  - **Topology**: Asset to Asset or Multi-asset

**Strongly recommended**:
  - **Source Asset** / **Destination Asset**: For asset-to-asset topology
  - **Protocols**: Which network protocols are used
  - **Lifecycle**: Current status

**Tip**: Connections can be linked to Interface bindings to show which infrastructure supports each application integration.

---

## Working with the list

**Default columns**:
  - **Connection ID**: Unique identifier
  - **Name**: Connection name (click to open workspace)
  - **Topology**: Asset to Asset or Multi-asset
  - **Source** / **Destination**: The connected endpoints
  - **Protocols**: Network protocols as chips
  - **Criticality**: Business importance (may be derived from linked interfaces)
  - **Data Class**: Sensitivity level
  - **PII**: Whether personal data traverses this connection
  - **Risk**: Manual or Derived from linked interfaces
  - **Lifecycle**: Current status
  - **Created**: When the record was created

**Additional columns** (via column chooser):
  - **Assets**: Count of assets in multi-asset topology

**Actions**:
  - **Add Connection**: Create a new connection (requires manager permission)
  - **Delete Selected**: Remove selected connections (requires admin permission)

---

## Topologies

### Asset to Asset

A direct connection between two specific assets:
- **Source Asset**: Where traffic originates
- **Destination Asset**: Where traffic terminates
- Optionally specify **Source Entity** and **Destination Entity** for logical endpoints

### Multi-asset

A connection involving multiple assets (e.g., load-balanced clusters):
- Add multiple assets to the connection
- Use **Layers** to define the routing path between them

---

## The Connections workspace

Click any row to open the workspace. It has four tabs:

### Overview

The Overview tab captures the connection's identity.

**What you can edit**:
  - **Connection ID**: Unique identifier
  - **Name**: Display name
  - **Topology**: Asset to Asset or Multi-asset
  - **Source Asset** / **Destination Asset**: For asset-to-asset topology
  - **Source Entity** / **Destination Entity**: Logical endpoints (optional)
  - **Assets**: For multi-asset topology, the involved assets
  - **Purpose**: Why this connection exists
  - **Protocols**: Network protocols used
  - **Lifecycle**: Current status
  - **Notes**: Additional context

---

### Layers

The Layers tab defines the network path for complex connections.

**What layers capture**:
  - **Order**: Sequence in the path
  - **Layer Type**: Network layer (e.g., application, transport)
  - **Source** → **Destination**: Asset or entity at each hop
  - **Protocols**: Protocols at this layer
  - **Port Override**: Custom port if different from protocol default
  - **Notes**: Layer-specific notes

**Use cases**:
- Multi-hop routes through firewalls or proxies
- Different protocols at different layers
- Load balancer → web server → app server → database paths

---

### Compliance

The Compliance tab captures risk and data protection settings.

**Risk Mode**:
- **Manual**: You set criticality, data class, and PII directly
- **Derived**: Values are inherited from linked interfaces

**Fields**:
  - **Criticality**: Business critical, High, Medium, Low
  - **Data Class**: Public, Internal, Confidential, Restricted
  - **Contains PII**: Whether personal data traverses the connection

When in Derived mode, you'll see the effective values calculated from all linked interfaces.

---

### Interfaces

The Interfaces tab shows which interface bindings use this connection.

**What you'll see**:
- Interface name and code
- Environment
- Leg type (Extract, Transform, Load, Direct)
- Endpoints
- Status

This is read-only—link interfaces to connections from the Interface workspace or Connection Map.

---

## Tips

  - **Start with critical paths**: Document connections for your most critical applications first.
  - **Use Derived risk mode**: Let the system calculate criticality based on the interfaces that use each connection.
  - **Link to interfaces**: Connect your infrastructure connections to interface bindings for complete traceability.
  - **Document protocols**: Accurate protocol information helps with firewall rule management and security audits.
