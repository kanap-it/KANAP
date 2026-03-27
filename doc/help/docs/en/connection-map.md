# Connection Map

The Connection Map provides an interactive visualization of your infrastructure network topology. Assets appear as nodes and connections as edges, showing how data flows at the infrastructure level. Use it to explore dependencies, trace connection paths, and export diagrams for architecture documentation.

## Where to find it

Navigate to **IT Landscape > Connection Map** to open the visualization.

**Permissions**: You need at least `applications:reader` to view the map.

---

## Understanding the visualization

The map uses a force-directed graph layout where:
- **Nodes** represent servers, clusters, or logical entities
- **Edges** represent connections between infrastructure components
- **Colors** indicate hosting type (on-premises, cloud) or node kind
- **Role-based placement** (enabled by default) guides nodes into top-to-bottom bands based on role tiers

### Node types

| Type | Shape | Border color | Description |
|------|-------|--------------|-------------|
| **Servers** | Rounded rectangle | Green (on-prem) or blue (cloud) | Individual infrastructure instances (VMs, containers, etc.) |
| **Clusters** | Rounded rectangle, dashed border | Cyan | Groups of servers acting as a single logical unit |
| **Entities** | Pill / stadium shape | Orange | Logical endpoints (external systems, SaaS services) |

Cluster members appear as separate nodes with dashed lines connecting them to their parent cluster node.

---

## Filters

### Lifecycle

Multi-select filter for connection lifecycle status. Choose which statuses to include in the visualization (e.g., Active, Planned, Deprecated). Defaults to **Active** only.

### Applications

Find servers by the applications that run on them:
1. Select one or more applications from the **Applications** dropdown
2. Select environments in the **App Env** dropdown (shows only environments where selected apps have assigned servers)
3. The matching servers are automatically added to the **Servers** filter

This is useful when you want to see the infrastructure connections for a specific application without knowing which servers it runs on.

### Servers

Directly select servers, clusters, or entities to focus on:
1. Click the **Servers** dropdown
2. Select items (grouped by type: Entities, Clusters, Servers)
3. Use the **Depth** filter to control how many hops to show

When you select items here, a "+N more" chip appears if many are selected. Click it to see and manage the full list.

### Depth

Limit how many "hops" from selected servers to display:
- **All**: Show all connections (no depth filtering)
- **0**: Show only selected servers, their parent clusters, and directly adjacent entities
- **1--5**: Show servers within N hops of selected servers

Depth is automatically set to **0** when you select servers via the Applications or Servers filters.

---

## Display options

### Show multi-server connections

Toggle visibility of multi-server connections (connections involving more than two servers in a mesh topology). Enabled by default.

### Show connection layers

When enabled (default), displays individual connection legs as separate edges. This shows how a multi-leg connection routes through intermediate points. When disabled, connections are shown as simple source-to-destination edges.

### Role-based placement

When enabled (default), the map keeps its force layout but adds vertical tier guidance:

- **Top / Upper / Center / Lower / Bottom** bands
- **Servers** use the role assignments configured in IT Landscape settings
- **Entities** use their configured Graph Tier (default is Top)
- **Unassigned servers** fall back to Center
- **Clusters** inherit the highest-priority tier from their members

Use this toggle when you want a topology view that reads like architecture tiers (edge-facing components at top, data stores lower).

This toggle is session-only and resets when you reload the page.

---

## Graph controls

The control panel on the left side of the map provides these tools:

| Control | Action | Description |
|---------|--------|-------------|
| Pause / Play | **Freeze / Unfreeze** | Pause the force simulation to manually position nodes |
| Crosshair | **Auto-center** | Toggle automatic centering when selecting nodes (blue = enabled) |
| Zoom + | **Zoom in** | Increase zoom level |
| Zoom - | **Zoom out** | Decrease zoom level |
| Grid | **Snap to grid** | Align all nodes to a grid for cleaner layouts |
| SVG | **Export SVG** | Download the current view as a vector image |
| PNG | **Export PNG** | Download the current view as a raster image |

You can also zoom with the mouse wheel and pan by clicking and dragging the background.

---

## Interacting with the map

### Selecting nodes

Click a server or cluster node to:
- Highlight its connections
- Open a detail panel with:
  - **Server type**: Kind of server (Web, Database, Application, etc.)
  - **Server location**: Physical or cloud location code
  - **Operating system**: OS details
  - **Network segment**: Network zone
  - **IP address**: Network address
  - **Assigned applications**: Apps running on this server, grouped by environment (clickable)
- **Edit server** or **View cluster** button to open the workspace

Click an entity node to see its type and environment.

### Selecting edges

Click a connection edge to:
- See connection details:
  - **Purpose**: What the connection is used for
  - **Protocols**: Network protocols used
  - **Typical ports**: Expected port numbers
  - **Criticality**: Business importance
  - **Topology**: Server-to-server or multi-server
- **Edit connection** button to open the connection workspace
- **Linked interfaces** section showing which application interfaces use this connection
  - Click **Open interface** to view the interface
  - Click **View in Interface Map** to see the interface in context

### Dragging nodes

Drag any node to reposition it. While the simulation is running, the layout will adjust around the moved node. When the simulation is frozen, dragging moves the node freely without affecting others.

---

## Deep linking

The map supports URL parameters for sharing specific views:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `lifecycles` | Pre-select lifecycle filters (comma-separated) | `active,planned` |
| `focusConnectionId` | Highlight a specific connection | UUID |
| `rootIds` | Pre-select servers to focus on (comma-separated) | UUIDs |
| `depth` | Set the depth limit | `0`, `1`, `all` |

**Example**: `/it/connection-map?lifecycles=active&rootIds=abc123&depth=1`

---

## Cluster visualization

Clusters are shown as distinct nodes with a dashed cyan border:
- Cluster members appear as separate nodes, connected to their parent cluster by dashed indicator lines
- When filtering by depth=0, both the selected member servers and their parent clusters are shown
- Member servers inherit the cluster's connections while maintaining their individual server-to-server connections

---

## Configure graph tiers

You can control where nodes tend to appear vertically by editing tiers in **IT Landscape > Settings**:

- **Server Roles** list: set Graph Tier for each role (e.g., Web = Top, DB = Bottom)
- **Entities** list: set Graph Tier for each entity type (entities default to Top)

Tier changes take effect the next time the map data is loaded.

---

## Tips

- **Start from applications**: Use the Applications filter to find servers for a specific application, then explore their connections with depth=1.
- **Use depth=0 for focused views**: When you only want to see connections between specific servers, select them and set depth to 0.
- **Export for architecture docs**: Use the SVG export to create network diagrams for documentation or security reviews. PNG export produces a high-DPI raster image.
- **Enable layers for troubleshooting**: Turn on "Show connection layers" to see exactly how multi-leg connections route through your infrastructure.
- **Use role tiers for architecture views**: Keep "Role-based placement" on when presenting layered architecture diagrams.
- **Cross-reference with Interface Map**: Use the "View in Interface Map" button in the connection panel to see which business interfaces depend on each infrastructure connection.
- **Snap for clarity**: After positioning nodes, use Snap to Grid for cleaner, more aligned layouts.
- **Freeze before exporting**: Freeze the layout and position nodes manually before exporting for the cleanest output.
