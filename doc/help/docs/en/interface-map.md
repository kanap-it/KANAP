# Interface Map

The Interface Map provides an interactive visualization of your application integration landscape. Applications appear as nodes, and interfaces as connecting edges, giving you a bird's-eye view of how data flows across your systems.

## Where to find it

Navigate to **IT Operations → Interface Map** to open the visualization.

**Permissions**: You need at least `applications:reader` to view the map.

---

## Understanding the visualization

The map uses a force-directed graph layout where:
- **Nodes** represent applications
- **Edges** represent interfaces between applications
- **Node size** reflects the number of connected interfaces
- **Colors** indicate lifecycle status or criticality

### Business vs Technical view

**Business View** (default):
- Hides middleware applications
- Shows direct source-to-target relationships
- Best for understanding business data flows

**Technical View**:
- Shows middleware platforms as intermediate nodes
- Displays the actual data path (Source → Middleware → Target)
- Best for understanding technical architecture

Toggle between views using the **Show middleware** switch.

---

## Filters

### Environment

Filter interfaces by deployment environment:
- Production, Pre-Prod, QA, Test, Development, Sandbox

### Lifecycle

Multi-select filter for interface lifecycle status. Choose which statuses to include in the visualization (e.g., Active, Planned, Deprecated).

### Apps & Services

Focus the map on specific applications or services:
1. Click the **Apps & Services** dropdown
2. Select one or more applications (grouped by type: Applications vs Infrastructure services)
3. The map filters to show only interfaces connected to your selection

When you select applications here, use the **Depth** filter to control how many hops from those applications to display.

### Depth

Limit how many "hops" from selected applications to display:
- **All**: Show all connected nodes (no limit)
- **1-5**: Show only nodes within N hops of selected applications

This filter is automatically enabled when you select applications in the Apps & Services filter.

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

Click an application node to:
- Highlight its connections
- Open a detail panel showing:
  - **Description** and **Publisher**
  - **Criticality** level
  - **Servers** assigned (grouped by environment)
  - **Business owners** and **IT owners**
  - **Support information** with contacts
- **Edit application** button to open the workspace

### Selecting edges

Click an interface edge to:
- See interface details (criticality, route type, binding count)
- View environment-specific **Endpoints** (source/target endpoints, job names)
- See linked **Infra connections** for the current environment
- Navigate to the Connection Map to see infrastructure details
- **Edit interface** button to open the workspace

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

When you select a node or edge, a side panel opens with details:

### Application panel

- **Name and description**
- **Publisher**: Software publisher
- **Criticality**: Business importance (Business critical, High, Medium, Low)
- **Assets**: Assets hosting this app, grouped by environment. Click an asset name to open its workspace.
- **Business Owners** / **IT Owners**: Responsible parties
- **Support information**: Contacts with their roles. Click to navigate to the application's Technical tab.

### Interface panel

- **Interface ID**: The unique interface identifier
- **Criticality**: Business importance level
- **Route**: Integration route type
- **Bindings**: Number of environment bindings
- **Via middleware**: Whether the interface routes through middleware
- **Endpoints**: For the selected environment, shows source/target applications, job names, and endpoint URLs
- **Infra connections**: Infrastructure connections linked to this interface, with options to edit or view in Connection Map

---

## Tips

  - **Start with Production**: Select the Prod environment to see your most critical integrations first.
  - **Focus on specific apps**: Use the Apps & Services filter with depth=2 to see just one application's neighborhood without the full landscape.
  - **Export for documentation**: Use the SVG export to create architecture diagrams for documentation or presentations.
  - **Snap for clarity**: After dragging nodes, use Snap to Grid to create cleaner, more aligned layouts.
  - **Deep link for sharing**: Copy the URL after setting filters to share specific views with colleagues.
  - **Switch to Technical view**: When troubleshooting, enable middleware visibility to see the actual data path through integration platforms.
