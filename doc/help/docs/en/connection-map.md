# Connection Map

The Connection Map provides an interactive visualization of your infrastructure network topology. Assets appear as nodes, and connections as edges, showing how data flows at the infrastructure level.

## Where to find it

Navigate to **IT Operations → Connection Map** to open the visualization.

**Permissions**: You need at least `applications:reader` to view the map.

---

## Understanding the visualization

The map uses a force-directed graph layout where:
- **Nodes** represent assets, clusters, or logical entities
- **Edges** represent connections between infrastructure components
- **Node shape** distinguishes regular assets from clusters
- **Colors** indicate hosting type (on-premises vs cloud) or status
- **Role-based placement** (when enabled) guides nodes into top-to-bottom bands based on role/entity tiers

### Node types

| Type | Description |
|------|-------------|
| **Assets** | Individual infrastructure instances (servers, VMs, containers, etc.) |
| **Clusters** | Groups of assets acting as a single logical unit (shown with a distinct shape) |
| **Entities** | Logical endpoints (e.g., external systems, SaaS services) |

---

## Filters

### Lifecycle

Multi-select filter for connection lifecycle status. Choose which statuses to include in the visualization (e.g., Active, Planned, Deprecated).

### Applications

Find assets by the applications that run on them:
1. Select one or more applications from the **Applications** dropdown
2. Select environments in the **App Env** dropdown (shows only environments where selected apps have assets)
3. The matching assets are automatically added to the **Assets** filter

This is useful when you want to see the infrastructure connections for a specific application without knowing which assets it runs on.

### Assets

Directly select assets, clusters, or entities to focus on:
1. Click the **Assets** dropdown
2. Select items (grouped by type: Entities, Clusters, Assets)
3. Use the **Depth** filter to control how many hops to show

When you select items here, a "+N more" chip appears if many are selected. Click it to see and manage the full list.

### Depth

Limit how many "hops" from selected assets to display:
- **All**: Show all connections (no filtering)
- **0**: Show only selected assets and their direct entity connections
- **1-5**: Show assets within N hops of selected assets

This filter is automatically set when you select assets via the Applications or Assets filters.

---

## Display options

### Show multi-server connections

Toggle visibility of multi-server connections (connections involving more than two assets in a mesh topology).

### Show connection layers

When enabled, displays individual connection legs as separate edges. This shows how a multi-leg connection routes through intermediate points. When disabled, connections are shown as simple source-to-destination edges.

### Role-based placement

When enabled (default), the map keeps its force layout but adds vertical tier guidance:

- **Top / Upper / Center / Lower / Bottom** bands
- **Servers** use the role assignments from the selected environment
- **Entities** use their configured Graph Tier (default is Top)
- **Unassigned servers** fall back to Center
- **Clusters** inherit the highest user-facing tier from their members

Use this toggle when you want a topology view that reads like architecture tiers (edge-facing components at top, data stores lower).

This toggle is session-only (it resets when you reload the page).

---

## Graph controls

The control panel on the left side of the map provides these tools:

| Icon | Action | Description |
|------|--------|-------------|
| ⏸/▶ | **Freeze/Unfreeze** | Pause the force simulation to manually position nodes |
| ⊕ | **Auto-center** | Toggle automatic centering when selecting nodes (blue = enabled) |
| 🔍+ | **Zoom in** | Increase zoom level |
| 🔍- | **Zoom out** | Decrease zoom level |
| ⊞ | **Snap to grid** | Align all nodes to a grid for cleaner layouts |
| SVG | **Export SVG** | Download the current view as a vector image |
| PNG | **Export PNG** | Download the current view as a raster image |

---

## Interacting with the map

### Selecting nodes

Click an asset node to:
- Highlight its connections
- Open a detail panel with:
  - **Asset type**: Kind of asset (Web, Database, Application, etc.)
  - **Asset location**: Physical or cloud location code
  - **Operating system**: OS details
  - **Network segment**: Network zone
  - **IP address**: Network address
  - **Assigned applications**: Apps running on this asset (grouped by environment, clickable)
- **Edit asset** or **View cluster** button to open the workspace

### Selecting edges

Click a connection edge to:
- See connection details:
  - **Purpose**: What the connection is used for
  - **Protocols**: Network protocols used
  - **Typical ports**: Expected port numbers
  - **Criticality**: Business importance
  - **Topology**: Asset-to-asset or multi-asset
- **Edit connection** button to open the workspace
- **Linked interfaces** section showing which application interfaces use this connection
  - Click **Open interface** to edit the interface
  - Click **View in Interface Map** to see the interface in context

### Deep linking

The map supports URL parameters for sharing specific views:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `lifecycles` | Pre-select lifecycle filters (comma-separated) | `active,planned` |
| `focusConnectionId` | Highlight a specific connection | UUID |
| `rootIds` | Pre-select assets to focus on (comma-separated) | UUIDs |
| `depth` | Set the depth limit | `0`, `1`, `all` |

**Example**: `/it/connection-map?lifecycles=active&rootIds=abc123&depth=1`

---

## The detail panel

### Asset panel

- **Name**: Asset name
- **Asset type**: Asset kind (Web, Database, Application, etc.)
- **Asset location**: Physical or cloud location
- **Operating system**: OS details
- **Network segment**: Network zone
- **IP address**: Network address
- **Assigned applications**: Apps running on this asset, grouped by environment. Click an app name to open its workspace.

### Connection panel

- **Name / Connection ID**: Identifier
- **Purpose**: What the connection is for
- **Protocols**: Network protocols with typical ports
- **Criticality**: Business importance level
- **Topology**: Asset-to-asset or multi-asset
- **Linked interfaces**: Application interfaces that use this infrastructure connection, with options to edit or view in Interface Map

---

## Cluster visualization

Clusters are shown as distinct nodes:
- Clusters have a different shape than regular assets
- Cluster members are shown as separate nodes connected implicitly to their cluster
- When filtering by depth=0, both the selected member assets and their parent clusters are shown

Member assets inherit the cluster's connections while maintaining their individual asset-to-asset connections.

---

## Configure graph tiers

You can control where nodes tend to appear by editing tiers in **IT Operations → Settings**:

- **Server Roles** list: set Graph Tier for each role (for example, Web = Top, DB = Bottom)
- **Entities** list: set Graph Tier for each entity type (default entities are Top)

Tier changes take effect the next time the map data is loaded.

---

## Tips

  - **Start from applications**: Use the Applications filter to find assets for a specific application, then explore their connections with depth=1.
  - **Use depth=0 for focused views**: When you only want to see connections between specific assets, select them and set depth to 0.
  - **Export for architecture docs**: Use the SVG export to create network diagrams for documentation or security reviews.
  - **Enable layers for troubleshooting**: Turn on "Show connection layers" to see exactly how multi-leg connections route through your infrastructure.
  - **Use role tiers for architecture views**: Keep "Role-based placement" on when presenting layered architecture diagrams.
  - **Cross-reference with Interface Map**: Use the "View in Interface Map" button in the connection panel to see which business interfaces depend on each infrastructure connection.
  - **Snap for clarity**: After positioning nodes, use Snap to Grid for cleaner, more aligned layouts.
