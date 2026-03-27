# Interface Map

The Interface Map provides an interactive visualization of your application integration landscape. Applications appear as nodes and interfaces as connecting edges, giving you a bird's-eye view of how data flows across your systems.

## Where to find it

Navigate to **IT Landscape → Interface Map** to open the visualization.

**Permissions**: You need at least `applications:reader` to view the map.

---

## Understanding the visualization

The map uses a force-directed graph layout where:

- **Nodes** represent applications
- **Edges** represent interfaces between applications
- **Node size** reflects the number of connected interfaces
- **Edge labels** display the interface identifier along each connection

### Business vs Technical view

**Business View** (default):

- Hides middleware applications
- Shows direct source-to-target relationships
- Best for understanding business data flows

**Technical View**:

- Shows middleware platforms as intermediate nodes (displayed as diamond shapes)
- Displays the actual data path (Source → Middleware → Target)
- Best for understanding technical architecture

Toggle between views using the **Show middleware** switch in the toolbar.

---

## Filters

All filters are located in the toolbar above the map.

### Environment

Filter interfaces by deployment environment:

- Production, Pre-Prod, QA, Test, Development, Sandbox

The default is **Production**.

### Lifecycle

Multi-select filter for interface lifecycle status. Choose which statuses to include in the visualization (e.g., Active, Planned, Deprecated). The default selection is **Active**.

### Applications

Focus the map on specific applications or services:

1. Click the **Applications** dropdown
2. Select one or more applications (grouped by type: Applications vs Infrastructure services)
3. The map filters to show only interfaces connected to your selection

When you select applications here, the **Depth** filter automatically switches from "All" to "1" so you see only the immediate neighborhood.

### Depth

Limit how many hops from selected applications to display:

- **All**: Show all connected nodes (no limit)
- **1–5**: Show only nodes within N hops of the selected applications

Middleware nodes do not count as a hop -- the depth counter only increments when traversing through a primary application node.

This filter is automatically enabled when you select applications in the Applications filter.

---

## Graph controls

The control panel on the left side of the map provides these tools:

| Icon | Action | Description |
|------|--------|-------------|
| Pause / Play | **Freeze / Unfreeze** | Pause the force simulation so you can manually position nodes |
| Center | **Auto-center** | Toggle automatic centering when selecting nodes (highlighted when enabled) |
| Zoom + | **Zoom in** | Increase zoom level |
| Zoom − | **Zoom out** | Decrease zoom level |
| Grid | **Snap to grid** | Align all nodes to a grid for cleaner layouts |
| SVG | **Export SVG** | Download the current view as a vector image |
| PNG | **Export PNG** | Download the current view as a raster image |

The freeze and auto-center buttons change color when active, so you can tell at a glance whether they are on or off.

---

## Interacting with the map

### Selecting nodes

Click an application node to highlight its connections and open a detail panel on the right.

### Selecting edges

Click an interface edge to see interface details in the side panel. Edges have a wider invisible hit area, so you do not need to click the line precisely.

### Dragging nodes

Drag any node to reposition it manually. While the simulation is running, the layout continues to adjust around the moved node. When the simulation is frozen, the node stays exactly where you place it.

### Clearing the selection

Click the empty background area of the map to dismiss the detail panel and clear any selection.

### Deep linking

The map supports URL parameters for sharing specific views:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `environment` | Pre-select an environment | `prod`, `dev` |
| `lifecycles` | Pre-select lifecycle filters (comma-separated) | `active,planned` |
| `focusInterfaceId` | Highlight a specific interface | UUID |
| `rootIds` | Pre-select applications to focus on (comma-separated) | UUIDs |
| `depth` | Set the depth limit | `1`, `2`, `all` |

**Example**: `/it/interface-map?environment=prod&rootIds=abc123&depth=2`

---

## The detail panel

When you select a node or edge, a side panel opens on the right with details.

### Application panel

- **Description**: What the application does
- **Publisher**: Software publisher
- **Criticality**: Business importance (Business critical, High, Medium, Low)
- **Servers**: Servers hosting this app, grouped by environment. Click a server name to open its workspace.
- **Business owners**: Responsible business contacts
- **IT owners**: Responsible technical contacts
- **Support information**: Support contacts with their roles. Click a contact name to navigate to the application's Technical tab.
- **Edit application**: Opens the application workspace

### Interface panel

- **Criticality**: Business importance level
- **Route**: Integration route type
- **Bindings**: Number of environment bindings
- **Via middleware**: Whether the interface routes through middleware
- **Endpoints**: For the selected environment, shows source and target applications, job names, and endpoint URLs
- **Infra connections**: Infrastructure connections linked to this interface for the current environment. Each connection card shows source, destination, and protocols. From here you can:
  - Click **Edit** to open the connection workspace
  - Click **View in Connection Map** to see the infrastructure topology
- **Edit interface**: Opens the interface workspace

---

## Tips

- **Start with Production**: Select the Prod environment to see your most critical integrations first.
- **Focus on specific apps**: Use the Applications filter with depth 2 to see just one application's neighborhood without the full landscape.
- **Export for documentation**: Use the SVG export to create architecture diagrams for documentation or presentations. Use PNG when you need a raster image.
- **Snap for clarity**: After dragging nodes into position, use Snap to Grid to create cleaner, more aligned layouts.
- **Deep link for sharing**: Copy the URL after setting filters to share specific views with colleagues.
- **Switch to Technical view**: When troubleshooting, enable middleware visibility to see the actual data path through integration platforms.
