# Connection Map

**Purpose**: Infra-level visualization of documented connections between servers and entities, parallel to Interface Map.

**Route**: `/it/connection-map`

**Permissions**: `applications:reader`

**Backend**: `GET /connections/map` (environment + lifecycle filters); serves servers/entities as nodes and connections as edges.

## Controls & UX
- **Lifecycle multi-select**: Filter connections by lifecycle status (from IT Ops lifecycle settings).
- **Apps & Services multi-select**: Select applications to auto-populate their assigned servers.
  - Only shows applications that have at least one app instance with server assignments.
  - Each option displays the application name, lifecycle, and available environments.
  - Uses `GET /applications/with-server-assignments` endpoint.
- **App Env multi-select**: Filter by environment for the selected applications.
  - Enabled only when at least one application is selected.
  - Shows only environments that have server assignments for the selected applications.
  - When environments are selected, servers are fetched via `POST /app-server-assignments/servers-by-apps`.
  - Servers are automatically added to the "Servers" selection with depth set to 1.
  - When an application is deselected, its associated servers are automatically removed from the selection.
- **Servers multi-select**: Directly select servers, clusters, or entities as root nodes for depth filtering.
  - Works alongside app-based selection (selections are merged).
- **Depth dropdown**: Limit the graph to nodes within N hops from selected root nodes (1-5, or "All").
- **Toggle: Show multi-server connections** (on by default). When off, multi-server edges are hidden and orphaned nodes are removed.
- Map toolbar:
  - Freeze/Unfreeze simulation
  - Auto-center on selection
  - Zoom in/out
  - **Snap to grid**: Aligns all nodes to a 50px grid for cleaner layouts
  - **Export as SVG**: Exports the current view as a vector graphic (clean, scalable)
  - **Export as PNG**: Exports the current view as a raster image at 2x resolution (note: may have minor rendering artifacts due to SVG-to-canvas conversion)
- Selection: clicking a node or edge opens side panel with details and deep links to Servers/Connections workspace and linked Interfaces.

## Graph behavior
- **Nodes**:
  - **Servers**: solid rectangles with hosting category color (cloud/on-prem) and environment label.
  - **Clusters**: dashed rectangles (distinguished by dashed border) representing server clusters.
  - **Entities**: pill-shaped nodes (internet, firewall, etc.) with orange tint.
- **Cluster grouping**: When servers are members of a cluster (via `server_cluster_members` table):
  - Cluster and its member servers are spatially grouped together using a custom D3 force.
  - Cluster node is positioned above its members.
  - Subtle dashed cyan lines (40% opacity) connect clusters to their member servers as visual indicators.
  - Member servers are positioned below the cluster in a horizontal layout.
  - Connections can terminate at either cluster level or individual member server level.
- **Edges**:
  - Server-to-server: single arrow from source to destination.
  - Entity-to-server: arrow from entity to server (or reverse per connection endpoints).
  - Multi-server: rendered as a mesh of bidirectional edges between all server pairs in the connection; arrows at both ends.
  - When a connection has **connection_legs**, the map draws **one edge per leg** using that leg's endpoints and protocol labels. The mesh/single-edge fallback is only used when no legs are present. Multi-server connections with legs still respect the "Show multi-server connections" toggle.
- **Parallel edges**: offset layout to keep multiple connections legible (same approach as Interface Map).
- **Responsive layout**: Graph height adapts to viewport size (`calc(100vh - 220px)`) with a minimum of 400px, maximizing visible area.

## Data fields surfaced
- **Per connection (side panel)**: name/ID, purpose, protocols (labeled), typical ports (from IT Ops connection type defaults), criticality, topology, and edit shortcut.
- **Linked interfaces (side panel)**: interface name/code, leg (SOURCE/DEST), environment, pattern, source/target endpoints, plus shortcuts to the Interface workspace and Interface Map deep-link. Lifecycle/data class/PII/criticality badges have been removed to keep the panel concise.
- **Per server/cluster node** (chipless layout): server name, server type (labelled), location code, operating system, network segment, IP address, and assigned applications. Assigned applications are grouped by environment (e.g., `PROD` header) with items sorted alphabetically and shown as `App name` links to the Application workspace (environment indicated by the group header, not per-item text). Cluster nodes reuse the same fields.
- **Per entity node**: name and type (entity).
- **Cluster nodes**: include `member_server_ids` array listing member server UUIDs.
- **API response**: includes `clusterMemberships` array with `{ cluster_id, server_id }` pairs for force simulation grouping.

## Cross-Map Integration
- When a connection is selected, the side panel calls `GET /connections/:id/interface-links` to list linked Interfaces (bindings grouped by interface/environment/leg).
- Each linked Interface entry offers:
-  “Open interface” → `/it/interfaces/:id/overview`.
-  “View in Interface Map” → `/it/interface-map?...&rootIds=<source_app,target_app>&depth=1&focusInterfaceId=<interface_id>` so the interface endpoints are pre-selected and depth is limited to 1.
- The page reads `environment`, `lifecycles`, optional `focusConnectionId`, and optional `rootIds`/`depth` from the URL on load:
  - When `focusConnectionId` is present and the map includes that connection, its edge is auto-selected and the side panel is opened.
  - When `rootIds` is present, those nodes are pre-selected; if `depth` is omitted the default applies.
  - Updates to environment/lifecycle filters are written back to the URL so deep links remain stable and shareable.

## Export & Layout Tools

### Snap to Grid
- Button: Grid icon in left toolbar
- Function: `snapToGrid(gridSize = 50)` in `ConnectionMapGraph.tsx`
- Behavior: Rounds all node `x`, `y` coordinates to nearest grid point (default 50px); updates pinned positions (`fx`, `fy`) if set
- Use case: Clean up organic layouts, align nodes for documentation screenshots

### SVG Export
- Button: "SVG" text button in left toolbar
- Function: `exportSvg()` in `ConnectionMapGraph.tsx`
- Implementation:
  - Clones live SVG, sets explicit dimensions and viewBox
  - Removes invisible hit areas (`path.hit`)
  - Serializes to SVG string and downloads as `connection-map.svg`
- Output: Clean vector graphic, suitable for embedding in documents or further editing

### PNG Export
- Button: "PNG" text button in left toolbar
- Function: `exportPng()` in `ConnectionMapGraph.tsx`
- Implementation:
  - Clones SVG and applies cleanup (removes hit areas, drop-shadow filters, defs/markers, main `<g>` transform)
  - Adds explicit background rect (`#F8FAFC`)
  - Uses `OffscreenCanvas` (if available) or regular canvas
  - Renders SVG to canvas via Image element at 2x scale, exports as PNG
- Output: `connection-map.png` at 2x resolution for clarity
- Known limitation: Browser SVG-to-canvas rendering may produce minor artifacts (gray lines, anti-aliasing issues); use SVG export for production-quality output

## Maintenance Notes

### Adding/Modifying Export Features
- Export logic is in `ConnectionMapGraph.tsx` within the `onRegisterGraphControls` callback
- Both SVG and PNG exports use the same cleanup pipeline:
  1. Clone the live SVG
  2. Remove elements that shouldn't be exported (`.hit` paths, etc.)
  3. Set explicit dimensions and viewBox
  4. For PNG: additional canvas rendering step
- When adding new SVG elements (filters, masks, patterns), test both export modes to ensure they render correctly
- PNG export removes filters and transforms to avoid canvas rendering issues; if new visual effects are added, consider their export behavior

### Graph Controls API
- Type: `GraphControlsApi` in `ConnectionMapGraph.tsx`
- Exposes: `zoomIn()`, `zoomOut()`, `snapToGrid()`, `exportSvg()`, `exportPng()`
- Registration: via `onRegisterGraphControls` prop, stored in parent page's `graphControlsRef`
- To add new controls: extend `GraphControlsApi` type, implement in graph component, add UI button in page component

## Related docs
- Connections workspace: `doc/features/connections-workspace.md`
- IT Ops Settings (entities, lifecycle, connection types): `doc/features/it-ops-settings.md`
- Interface Map: `doc/features/interface-map-visualization.md`
