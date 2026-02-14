# Connections Workspace

**Purpose**: Document infrastructure-level connectivity between servers and/or external entities, using the shared IT Ops settings for Connection Types (protocols), Entities, and Lifecycle.

**Route**: `/it/connections` (list) → `/it/connections/:id/overview` (workspace)  
**Frontend**: `frontend/src/pages/it/ConnectionsPage.tsx`, `frontend/src/pages/it/ConnectionWorkspacePage.tsx`  
**Backend**: `backend/src/connections/*` (`connections`, `connection_servers`, `connection_protocols` tables)  
**Permissions**: `applications` resource — `reader` for list/detail, `manager` for create/update/delete, `admin` for bulk delete.  

## Entity shape (backend)
- `connection_id` (string, unique per tenant, required)
- `name` (string, required)
- `purpose` (text, optional)
- `topology` (backend field; UI label “Connection type”):
  - `server_to_server`
  - `multi_server`
- Server-to-server fields (exactly one of server OR entity per side):
  - `source_server_id` | `source_entity_code`
  - `destination_server_id` | `destination_entity_code`
- Multi-server fields:
  - `connection_servers` (list of server IDs, minimum 2)
- `protocols`:
  - Stored in `connection_protocols.connection_type_code`
  - Codes must come from IT Ops **Connection Types** list (not Interface Protocols)
  - At least one required
  - Typical ports from the Connection Types catalog are shown in the workspace UI under the Protocols selector
- `lifecycle`: validated against IT Ops `lifecycleStates`; default **active**
- `notes`: free text (optional)

RLS: All tables use `tenant_id` with enforced RLS policies.

## Workspace (Overview tab)
- Connection ID (required)
- Name (required)
- Purpose (optional, multiline)
- Connection type (UI) → backend `topology`
  - **Server to Server**:
    - Source: Server **or** Entity (mutually exclusive)
    - Destination: Server **or** Entity (mutually exclusive)
  - **Multi-server**:
    - Connected servers (multi-select, min 2)
- Protocols (multi-select, required) — sourced from IT Ops **Connection Types**
- Typical ports chips render underneath, using the selected protocol codes’ `typicalPorts` values from settings
- Lifecycle (enum from IT Ops settings, defaults to active)
- Notes (multiline, optional)

## Behaviour & UX notes
- Source and Destination each use a single grouped picker (Entities first, then Servers) with names only; choices are mutually exclusive per side, but the other side remains unrestricted except for excluding the already-selected item.
- Protocol dropdown shows **Category, Name**, de-duplicates codes, and sorts by category then label; all configured Connection Types are visible.
- Multi-server topology requires at least two servers; server-to-server requires exactly one participant per side.

## Technical layers (connection legs)
- Layers tab in the workspace loads when calling `GET /connections/:id?include=legs` (or `GET /connections/:id/legs`) and allows documenting up to **three ordered legs** per connection.
- Each leg captures:
  - `layer_type` (free text, e.g., `direct`, `reverse_proxy`, `firewall`)
  - Endpoints: exactly one source **and** one destination, each either a Server or an Entity (mutually exclusive per side)
  - `protocol_codes` **(multi-select)** from IT Ops **Connection Types** (UI mirrors the Overview protocol selector; backend stores arrays)
  - `port_override` (free text; defaults auto-fill typical ports from selected protocols, append on add, and prune removed protocol defaults; fully user-editable)
  - `notes` (optional)
- Saving layers uses **replace** semantics via `PUT /connections/:id/legs`; sending an empty array clears all legs. Legs are removed automatically when the connection is deleted (single or bulk).
- When legs exist, the Connection Map renders **one edge per leg**; if no legs exist, the map falls back to the simple S2S/mesh expansion.

## List page columns
- Connection ID, Name (clickable to workspace)
- Topology (Server to Server / Multi-server)
- Source / Destination (server or entity label)
- Protocols (chips)
- Servers (count for multi-server)
- Lifecycle
- Created

## Backend endpoints
- `GET /connections` — paginated list, AG Grid-friendly
- `GET /connections/:id` — detail with protocols and connected servers
- `POST /connections` — create (requires protocols + topology-specific validation)
- `PATCH /connections/:id` — update (replace semantics for protocols & connected servers)
- `DELETE /connections/:id`
- `DELETE /connections/bulk` — admin only

## Notes & alignment
- Protocols strictly use **Connection Types** from IT Ops settings; Interface Protocols are not used here.
- Backend field is named `topology`; UI label stays “Connection type” to match the requirement.
- Defaults: lifecycle = `active`; purpose optional.

## Risk fields (Manual vs Derived)
- Columns on `connections` (defaults in DB):  
  - Stored fields:
    - `criticality`: `business_critical | high | medium | low` (default `medium`)  
    - `data_class`: codes from IT Ops **Data Classes** (default `internal`)  
    - `contains_pii`: boolean (default `false`)  
    - `risk_mode`: `manual | derived` (default `manual`)
  - Aggregated (effective) fields when `risk_mode = 'derived'`:
    - `effective_criticality`: highest criticality among linked Interfaces.
    - `effective_data_class`: most sensitive Data Class among linked Interfaces (based on tenant Data Classes order).
    - `effective_contains_pii`: `true` if any linked Interface `contains_pii`.
    - `derived_interface_count`: number of Interfaces contributing to derived risk.
- Validation uses tenant IT Ops settings; invalid codes reject with `400`.
- Behaviour:
  - New connections are created with `risk_mode = 'manual'`.
  - `risk_mode = 'derived'` can only be set when at least one `interface_connection_link` exists for the connection; creating the *first* link for a connection in manual mode automatically switches it to `derived`.
  - When the last link is removed from a connection whose `risk_mode = 'derived'`, the backend automatically reverts `risk_mode` to `'manual'`.
- UI exposure:
  - List page:
    - Criticality/Data class/PII columns display effective values when available.
    - A “Risk” column indicates origin: `Manual` vs `Derived from N interfaces`.
  - Connection workspace:
    - Criticality, Data class, and Contains PII are editable in Manual mode; they become read-only in Derived mode.
    - A risk summary shows whether risk is Manual or Derived (with interface count) and displays effective values.

## Connection Map
- Route: `/it/connection-map` (requires `applications:reader`).
- Backend: `GET /connections/map` with `environment` (default `prod`) and `lifecycles` CSV (default `active`).
- Response: servers/entities as nodes, connections as edges with protocol labels and risk metadata; multi-server connections expand into mesh edges when enabled on the UI.
- UI controls mirror Interface Map: freeze/unfreeze, auto-center, zoom, lifecycle/environment filters, and a toggle to show/hide multi-server connections.
- Selection shows a side panel with node or connection details, deep links to server/connection workspaces, and linked Interfaces (via `GET /connections/:id/interface-links`) with “View in Interface Map” navigation powered by `focusInterfaceId` URL parameter.

## Source/Destination picker (S2S topology)
- Single consolidated autocomplete per side with grouping:
  - Entities listed first under an “Entities” header (alphabetical), then Servers under a “Servers” header (alphabetical).
  - Only one item can be selected per side (mutually exclusive server/entity).
- Labels: “Select a source entity or server” and “Select a destination entity or server”.
- Multi-server topology uses a search-backed multi-select for servers (min two).
