---
name: kanap-design-system
description: Use this skill whenever you implement, modify, or refactor any UI component or page in the KANAP application. Triggers include any work on React components within KANAP (forms, tables, drawers, headers, dropdowns, dialogs, lists, cards), styling updates, theme tokens, new feature pages, or refactors of legacy MUI-heavy code. Apply these guidelines BEFORE writing JSX, not after — they constrain component choices, MUI usage patterns, typography scale, color usage, spacing, and interaction patterns. Do NOT use for backend work, API design, or non-UI code.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# KANAP Design System — "Refined Density"

Apply this design charter when building or modifying any UI component in KANAP.

## Philosophy

**Every pixel works.** KANAP targets IT governance professionals (CIOs, IT managers, DSI teams). The visual grammar is Linear-grade: sober, dense, monochrome-dominant. The chrome (nav, header) disappears; the content dominates. Color is used to **signify**, not to decorate. The aesthetic favors information density over generous whitespace, and trusts users to navigate dense layouts without hand-holding. Dark mode is mandatory and must be tested for every component.

### Chromatic grammar

- **Teal = interactive elements only.** Primary buttons, focus rings, active nav indicators, prose links, and action links. Teal NEVER appears on permanent content text, table cell text, or status indicators.
- **Orange = attention.** Strong CTAs, urgent badges, notification counters, critical scores (>=90). Never as background fill. Carried via MUI's `warning` palette slot.
- **Neutrals = everything else.** Navigation, headers, surfaces, text. The frame is invisible.

### Teal usage — exhaustive rules

Teal is allowed in exactly these contexts:

1. **Prose links** — breadcrumbs, "View all", "Choose columns", inline hyperlinks in descriptive text
2. **Active nav tab** — the underline indicator in the top bar
3. **Focus ring** — 2px ring on focused inputs and buttons
4. **Contained buttons** — teal background with `tealForeground` text
5. **Action links** — "+ Log time", "+ Link existing", toggle links in drawers

Teal is NEVER used for:

- **Any table cell text** — not IDs, not names, not assignees, not links. Not at rest, not on hover. Zero teal in table cells. Enforced by `ag-grid-overrides.css` with `color: inherit !important`.
- Navigation item text (active items use `text.primary` weight 500 + subtle background)
- Status chips or badges
- Metadata labels or values
- Icons in the sidebar or header (use `text.secondary`)

---

## Color palette

### Brand colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `kanap.teal` | `#1A6B7A` | `#4DB8C9` | Primary interactive elements only |
| `kanap.tealForeground` | `#FFFFFF` | `#0F1117` | Text on teal backgrounds |
| `kanap.orange` | `#E8920F` | `#F0A830` | Warnings, urgent indicators, critical scores |
| `kanap.danger` | `#DC2626` | `#F87171` | Destructive actions, errors |

MUI palette mappings (set in `ThemeContext.tsx`):

| MUI token | Maps to |
|---|---|
| `primary.main` | `kanap.teal` |
| `primary.dark` | `#134E5A` (light) / `#2D9AAD` (dark) |
| `primary.light` | `#E6F4F7` (light) / `rgba(77,184,201,0.12)` (dark) |
| `primary.contrastText` | `kanap.tealForeground` |
| `warning.main` | `kanap.orange` |
| `error.main` | `kanap.danger` |

### Backgrounds and surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `kanap.bg.primary` | `#FFFFFF` | `#181A20` | Main page background, card surfaces |
| `kanap.bg.page` | `#FAFAFA` | `#0F1117` | Page-level wrapper background |
| `kanap.bg.drawer` | `#FBFBFC` | `#14161C` | Right drawer / side panel surfaces |
| `kanap.bg.composer` | `#FFFFFF` | `#1F2128` | Editor/composer surfaces |

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `kanap.text.primary` | `#111827` | `#E5E7EB` | Main content, values in fields |
| `kanap.text.secondary` | `#6B7280` | `#9CA3AF` | Secondary information, action button text |
| `kanap.text.tertiary` | `#9CA3AF` | `#6B7280` | Field labels, metadata, hints, IDs in small contexts |

### Borders

| Token | Light | Dark | Usage |
|---|---|---|---|
| `kanap.border.default` | `#E5E7EB` | `rgba(255,255,255,0.08)` | Standard borders, dividers between sections |
| `kanap.border.soft` | `#F1F2F4` | `rgba(255,255,255,0.05)` | Subtle dividers within groups |

### Status colors

Semantic logic: **grey** = passive/not started, **blue** = active/in progress, **purple** = in testing, **orange** = attention required, **green** = done/validated, **red** = failed/rejected. All status color maps are centralized in `utils/statusColors.ts` — never define per-page color maps.

| Semantic | Status values | MUI key | Dot/text (light) | Dot/text (dark) | Pill bg (light) | Pill bg (dark) |
|---|---|---|---|---|---|---|
| Passive | open, waiting, draft | `default` | `#9CA3AF` | `#9CA3AF` | `#F3F4F6` | `rgba(255,255,255,0.06)` |
| Active | in_progress | `info` | `#3B82F6` | `#60A5FA` | `#EFF6FF` | `rgba(59,130,246,0.12)` |
| Testing | in_testing | `secondary` | `#8B5CF6` | `#A78BFA` | `#F5F3FF` | `rgba(124,58,237,0.12)` |
| Attention | pending, on_hold | `warning` | `#E8920F` | `#F0A830` | `#FFF4E0` | `rgba(240,168,48,0.12)` |
| Done | completed, approved | `success` | `#10B981` | `#34D399` | `#F0FDF4` | `rgba(34,197,94,0.12)` |
| Cancelled | cancelled | `default` | `#9CA3AF` | `#6B7280` | `#F3F4F6` | `rgba(255,255,255,0.06)` |
| Failed | rejected, failed | `error` | `#DC2626` | `#F87171` | `#FEF2F2` | `rgba(239,68,68,0.12)` |

### Score color scale (calculated priority scores 50–100)

| Score range | Light | Dark | Semantic |
|---|---|---|---|
| 50–59 | `#9CA3AF` | `#6B7280` | Low |
| 60–69 | `#6B7280` | `#9CA3AF` | Moderate |
| 70–79 | `#111827` | `#E5E7EB` | Standard |
| 80–89 | `#F0A830` | `#FAC775` | Elevated |
| 90–100 | `#E8920F` | `#F0A830` | Critical |

### UI element tokens

#### Action pills (header actions)

| Token | Light | Dark |
|---|---|---|
| `kanap.pill.bg` | `#F6F7F9` | `rgba(255,255,255,0.04)` |
| `kanap.pill.border` | `#E5E7EB` | `rgba(255,255,255,0.10)` |
| `kanap.pill.hoverBg` | `#EDEEF1` | `rgba(255,255,255,0.07)` |
| `kanap.pillDanger.bg` | `rgba(220,38,38,0.06)` | `rgba(248,113,113,0.08)` |
| `kanap.pillDanger.border` | `rgba(220,38,38,0.20)` | `rgba(248,113,113,0.25)` |

#### Nav chip and properties tab

| Token | Light | Dark | Usage |
|---|---|---|---|
| `kanap.navChip.bg` | `rgba(26,107,122,0.07)` | `rgba(77,184,201,0.10)` | Sequential nav chip |
| `kanap.navChip.border` | `rgba(26,107,122,0.22)` | `rgba(77,184,201,0.28)` | |
| `kanap.navChip.fg` | `#1A6B7A` | `#4DB8C9` | |
| `kanap.tab.bg` | `rgba(26,107,122,0.09)` | `rgba(77,184,201,0.13)` | Drawer tab (closed) |
| `kanap.tab.border` | `rgba(26,107,122,0.35)` | `rgba(77,184,201,0.42)` | |
| `kanap.tab.fg` | `#1A6B7A` | `#4DB8C9` | |
| `kanap.tab.bgActive` | `#1A6B7A` | `#4DB8C9` | Drawer tab (open) |
| `kanap.tab.fgActive` | `#FFFFFF` | `#0F1117` | |

Token definitions live in `frontend/src/pages/tasks/theme/taskDetailTokens.ts`, resolved per light/dark mode via `resolveKanapPalette()` in `ThemeContext.tsx`. When rolling out to other workspaces, import from this file or extract to a shared location.

---

## Typography

### Font families

```ts
fontFamily: {
  sans: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
}
```

### Font weights

Only two weights: **400 (regular)** and **500 (medium)**. Never use 600, 700, or higher — they look heavy against the rest of the UI.

### Type scale

| Element | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Page title | 22px | 500 | primary | line-height 1.3 |
| Section title | 16px | 500 | primary | |
| Section label (e.g. "Description") | 12px | 500 | tertiary | sentence case |
| Body text | 14px | 400 | primary | line-height 1.6, sidebar items |
| Body secondary | 13px | 400 | primary | secondary content, comments |
| Form field label | 12px | 400 | tertiary | line-height 1.3 |
| Form field value | 13px | 400 | primary | line-height 1.4 |
| MenuItem in dropdowns | 13px | 400 | primary | match field value size to avoid zoom effect |
| Metadata bar chips | 12px | 400 | primary | tertiary inline label 11px if present |
| Action pill text | 12px | 500 | secondary | |
| Action pill danger text | 12px | 500 | danger | |
| Nav chip number | 11px | 500 | navChip.fg | mono |
| Technical IDs (T-49, DOC-65) | 11–14px | 400 | tertiary or secondary | always mono |
| Comment author | 13px | 500 | primary | |
| Comment date | 11px | 400 | tertiary | |
| Tab labels | 13px | 400 / 500 | tertiary / primary | inactive / active |
| Sidebar item | 14px | 400 / 500 | secondary / primary | inactive / active |
| Sidebar section label | 11px | 500 | secondary | sentence case |
| Table header | 11px | 500 | secondary | sentence case |
| Table cell | 13px | 400 | primary | |
| Table ID cell | 12px | 400 | secondary | mono, tabular-nums |
| Composer footer controls | 11px | 400 | primary | label tertiary inline |
| Composer submit button | 12px | 500 | tealForeground | bg teal |
| Toggle / link teal | 12px | 400 | teal | |

### Monospace convention

All technical identifiers use JetBrains Mono with these properties:

- **Font**: `'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace`
- **Size**: 11–14px depending on context (12px default — monospace appears larger at equal size)
- **Color**: `kanap.text.secondary` or `kanap.text.tertiary` depending on prominence
- **Numeric alignment**: `font-variant-numeric: tabular-nums`

Applies to: task IDs (`T-48`), project IDs (`PRJ-5`), request IDs (`REQ-12`), interface IDs, asset IDs, connection IDs, location codes, error codes, hash values, version strings — any system-generated reference number.

In AG Grid columns, set via `cellStyle` on the column definition. The `--kanap-text-secondary` CSS variable is defined in `ag-grid-overrides.css` for both light and dark themes.

### Sentence case rule

ALL text uses sentence case. Never Title Case, never ALL CAPS. This applies to section labels, button text, menu items, table headers, sidebar section labels — everywhere. No exceptions.

---

## Component patterns

### MUI usage rules

KANAP uses MUI components but only with specific patterns. Violations cause visual inconsistency.

**Absolute bans:**

- Do NOT use `FormControl` with `InputLabel`. The MUI label positioning conflicts with the label-above-value pattern and produces visual duplicates.
- Do NOT use `Select` with the `label` prop directly — same issue.
- Do NOT use `<TextField label="...">`. The label rendering is incompatible with KANAP forms.
- Do NOT use `MuiDrawer` for contained side panels. MUI Drawer is designed for full-screen overlays, which is incompatible with KANAP's pattern of containing the drawer to the work area below the page header.

**Always:**

- Use `<Select variant="standard" disableUnderline>` for all dropdowns
- Use `<TextField variant="standard" InputProps={{ disableUnderline: true }}>` for text inputs
- Use `<DatePicker>` with `slotProps.textField.variant="standard"` and `InputProps.disableUnderline: true`
- Wrap each field in a `<PropertyRow label="...">` component that renders the label as a styled `<div>` above the input
- Apply `disableUnderline` AND override the `:before` / `:after` pseudo-elements via sx to eliminate any residual underline
- Required asterisk: orange `#E8920F` (not red)

### Standard sx constants

Define and reuse these constants instead of inlining sx props on each field. Shared form/drawer primitives live in `frontend/src/theme/formSx.ts` and `frontend/src/components/design`. Import `PropertyRow`, `PropertyGroup`, `drawerSelectSx`, `drawerMenuItemSx`, and `drawerDatePickerSx` from those shared modules instead of recreating local copies. If you find yourself copy-pasting an `sx={{ ... }}` object across multiple fields, that's a signal to extract it.

```ts
// For Selects and standalone inputs in drawers/sidebars
export const drawerSelectSx = {
  width: '100%',
  fontSize: 13,
  color: 'kanap.text.primary',
  '& .MuiSelect-select': {
    padding: '4px 0',
    fontSize: 13,
    lineHeight: 1.4,
  },
  '& .MuiSelect-icon': {
    color: 'kanap.text.secondary',
    fontSize: 18,
    right: 0,
  },
  '&:before': { display: 'none' },
  '&:after': { display: 'none' },
  '&:hover:not(.Mui-disabled):before': { display: 'none' },
} as const;

// For MenuItems inside drawer Selects
export const drawerMenuItemSx = {
  fontSize: 13,
  paddingTop: '6px',
  paddingBottom: '6px',
  minHeight: 'auto',
} as const;

// For DatePickers in drawers
export const drawerDatePickerSx = {
  '& input': { fontSize: 13, padding: '4px 0' },
  '& .MuiInput-underline:before': { display: 'none' },
  '& .MuiInput-underline:after': { display: 'none' },
} as const;
```

### AppBar (top navigation)

- Height: **48px**
- Background: `kanap.bg.primary` (white in light, dark in dark) — NOT colored
- Bottom border: 1px `kanap.border.default`
- Tab navigation: **centered** in available space, `kanap.text.secondary` for inactive, `kanap.text.primary` weight 500 for active, teal underline indicator (2px)
- Logo: rendered in its natural colors, not inverted
- Icon buttons: `kanap.text.secondary` color

### Sidebar (left navigation)

- Width: **220px** expanded, **56px** collapsed
- Background: same as `kanap.bg.page` — no contrast with main content
- Item height: **38px**
- Item text: 14px, weight 400
- Item icons: `1.3rem` (~21px)
- Item border-radius: **6px**
- Item horizontal padding: **12px** (1.5 MUI units)
- Active item: background `#F3F4F6` (light) / `rgba(255,255,255,0.06)` (dark), text `kanap.text.primary` weight 500 — no left border accent, no teal background
- Hover: `action.hover`
- **Section labels**: 11px, weight 500, sentence case, color `kanap.text.secondary`, padding-top 18px, padding-bottom 10px, horizontal padding 18px (aligned with item content)
- **Section gap**: 8px of space between end of one section and title of next

### Cards

- Border-radius: **8px**
- Border: 1px `kanap.border.default`
- Shadow at rest: **none** (rely on border)
- Shadow on hover: `0 4px 12px rgba(0,0,0,0.05)` (light) / `0 4px 12px rgba(0,0,0,0.25)` (dark)
- Hover transform: `translateY(-1px)` — subtle
- Padding: **16px**
- Transition: `160ms ease`

### Button variants

Three button variants extend MUI's default Button, defined via `MuiButton.variants` in the theme:

**`variant="action"`** — header secondary actions (Send link, Convert to request):
- Padding `4px 11px`, border-radius 5px, font-size 12px, weight 500
- `textTransform: 'none'`, `minWidth: 0`
- Background `kanap.pill.bg`, border `1px solid kanap.pill.border`, color `kanap.text.secondary`
- Hover: `kanap.pill.hoverBg`, no shadow

**`variant="action-danger"`** — destructive header actions (Delete):
- Same dimensions as action
- Background `kanap.pillDanger.bg`, border `kanap.pillDanger.border`, color `kanap.danger`

**`variant="contained"`** — primary CTAs (Submit, Save):
- Background `kanap.teal`, color `kanap.tealForeground`
- Border-radius: 6px, no shadow (flat)
- Height: 36px (medium), 32px (small)
- `textTransform: 'none'`

**General rules**: no uppercase, no shadow on any variant.

### Tabs (compact horizontal navigation)

Override MUI's default Tabs:

```ts
MuiTabs: {
  styleOverrides: {
    root: { minHeight: 'auto' },
    indicator: { display: 'none' },
  },
},
MuiTab: {
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: 'auto',
      padding: 0,
      marginRight: 16,
      textTransform: 'none',
      fontSize: 13,
      fontWeight: 400,
      color: theme.palette.kanap.text.tertiary,
      minWidth: 'auto',
      '&.Mui-selected': {
        color: theme.palette.kanap.text.primary,
        fontWeight: 500,
      },
    }),
  },
},
```

Active tab is distinguished by color (primary vs tertiary) and weight (500 vs 400). No underline indicator. No background highlight.

### Forms — PropertyRow pattern

All form fields use the label-above-value pattern via `PropertyRow`. No MUI `FormControl` or `InputLabel` anywhere.

```tsx
function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 0' }}>
      <div style={{ fontSize: 12, color: 'kanap.text.tertiary', lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'kanap.text.primary', lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}
```

Rules:

- All `<Select>` are naked: `variant="standard"`, `disableUnderline`, using `drawerSelectSx`
- All `<MenuItem>` use `drawerMenuItemSx` (fontSize 13, py 6px, minHeight auto) — prevents zoom effect
- All MUI underlines suppressed via CSS overrides
- Complex components (UserSelect, CompanySelect, DateEUField) keep their internal logic but their MUI labels are hidden via `'& .MuiInputLabel-root': { display: 'none' }`
- Generous vertical gap between fields: **16–20px**

### Status display — two patterns

**Pattern 1: dot + text (tables and lists)**

Used in AG Grid cells and list items where density matters.

- Colored dot: **6px** circle, inline before text, 6px gap
- Text: status color from palette, 12–13px, weight 500
- No background, no border, no pill shape
- Applies to: workflow statuses, environment states

**Pattern 2: subtle pill (dashboard cards only)**

Used in dashboard cards where a status chip is isolated and needs visual weight.

- Border-radius: **9999px** (full pill)
- Height: **22px**
- Font: 12px, weight 500
- Subtle colored background + colored text (see status colors table for pill bg values)
- No border, no outline

**What is NOT a status and gets no visual treatment:**

- Task type ("Task", "OPEX") — plain `kanap.text.secondary` text
- Context ("Project") — plain `kanap.text.secondary` text
- Score ("70") — plain `kanap.text.primary` text
- Roles ("IT Lead") — `kanap.text.tertiary` 11px text
- Categories, classifications — plain text

**Rule: an element gets a border only if it is clickable and needs to signal that at rest (buttons). Everything else is text.**

### Data tables (AG Grid)

- Row height: **38px**
- Header: background `kanap.bg.page`, text `kanap.text.secondary`, sentence case 11px weight 500, no column separator lines
- Cell font: Inter 13px
- No alternating row colors — use hover highlight + horizontal border
- Borders: horizontal only, very subtle (`#F5F5F5` light / `rgba(255,255,255,0.04)` dark)
- Row hover: `#F9FAFB` (light) / `rgba(255,255,255,0.03)` (dark)
- Selection background: `primary.light`
- Sticky header: always
- **Link columns**: text is `kanap.text.primary` at rest. No teal on hover — cliquability is conveyed by cursor:pointer + row hover background only. Never put teal on table cell text.
- **ID columns** (T-48, PRJ-5, INT-12): `color: var(--kanap-text-secondary)`, mono font, 12px, `tabular-nums`
- Wrapper border-radius: **8px**

### Editable inline fields (click-to-edit)

Titles and other prominent editable fields use click-to-edit:

- At rest: rendered as a plain `<span>` or `<h1>`, no border, no input affordance, `cursor: text`
- On click: replaced by an `<input>` with the same font properties, focused automatically
- Save on Enter or blur. Cancel on Escape.
- The input must visually match the resting span (same font-size, weight, color). Border appears only on focus, never on hover or at rest.

### Rich text editors (toolbar reveal on focus)

Rich text editors hide their toolbar at rest and reveal it on focus:

```css
.kanap-rich-editor[data-hide-toolbar='true'] .editor-toolbar {
  display: none;
}
.kanap-rich-editor[data-hide-toolbar='true']:focus-within .editor-toolbar {
  display: flex;
}
```

For description editors, also hide the border at rest:

```css
.kanap-rich-editor[data-hide-border='true'] .editor-content {
  border: 1px solid transparent;
  padding: 0;
}
.kanap-rich-editor[data-hide-border='true']:focus-within .editor-content {
  border-color: var(--kanap-border-default);
  border-radius: 8px;
  padding: 12px;
}
```

Do NOT use this pattern on the comment composer's main editor — the composer has its own permanent border, so only the toolbar should toggle.

### Composer pattern (unified action panel)

When a single panel combines multiple actions (comment + status change + time log):

```
[Editor input area]
[Footer: ctrl-status   ctrl-time-with-slider   submit-button]
```

- Status and time controls have inline labels (label-left-of-value, not label-above-value) for compactness
- Status: inline label (`kanap.text.tertiary` 11px) + naked `<Select>` with colored dot + status text per item. Shows current status as default. No FormControl, no InputLabel.
- Time: inline label + `<Slider>` flex-1 (rail in `sliderTrack` grey, track+thumb in teal, height 4px, thumb 14px) + value in mono
- Slider takes `flex: 1` to fill available space
- Submit: teal contained button, flex-shrink 0. Label changes dynamically based on what's filled in.
- Submit is disabled if and only if all three inputs are empty
- Submit supports `Ctrl+Enter` / `Cmd+Enter` from inside the comment editor. Plain `Enter` remains a line break.
- If the editor hides/reveals its toolbar on focus, the submit button must preserve the first click. Prevent the editor blur/layout shift on submit pointer-down when needed so users do not need to click twice.
- After successful submit, shows transient success label (e.g. "Logged 2h") for ~1500ms, then resets. During success state, `pointer-events: none` to prevent double submits.
- Footer: single line, `border-top 1px solid kanap.border.soft`, padding `10px 16px 12px`

### Avatars

Use MUI `<Avatar>` with custom sizes. Always include initials, always use `bgcolor: 'kanap.teal'` with `color: 'kanap.tealForeground'`.

| Context | Size | Font size |
|---|---|---|
| Comment thread | 26px | 10px / 500 |
| Metadata bar | 18px | 9px / 500 |
| Drawer inline (Requestor, etc.) | 16px | 8px / 500 |

### Date formatting

Never display ISO date strings in user-facing UI. Use a localized short format:

```ts
function formatShortDate(date: string | Date | null): string {
  if (!date) return 'Not set';
  const d = new Date(date);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
```

Output: `15 Mar` (same year) or `30 Nov 2025` (different year).

### Auto-save and feedback

All fields auto-save. No explicit Save buttons for editing existing content.

- **Selects, dates, autocompletes**: save on change (onChange handler). No feedback needed — don't block UI on save round-trips.
- **Titles**: blur-to-save on the inline editor input (silent, no feedback needed)
- **Descriptions (rich text)**: debounced autosave — saves 2 seconds after the last keystroke via a lightweight partial PATCH (description field only). Shows a subtle status indicator in the section header: "Saving..." during the API call, "Saved" for ~1.5s after success, then hidden. Ctrl+S remains as an immediate-save escape hatch (flushes the pending debounce). On navigation away, any pending debounce is cancelled and the full save flow handles the payload.

Create forms and composers (comments) still use explicit submit buttons — autosave applies to in-place editing of existing entities only.

---

## Workspace pages (detail / edit)

Workspace pages are full-height detail views for a single entity (task, project, request, contract, etc.). They follow a strict layout. Reference implementation: `TaskWorkspacePage.tsx`.

### Layout structure

```
WorkspacePage (full height, flex column)
+-- Topbar (full width, border-bottom)
|   +-- Breadcrumb + NavChip
+-- TitleBlock (full width)
|   +-- TitleRow: [ID mono] [click-to-edit title] ... [action pills] [x]
|   +-- MetadataBar: [Status] [Score] [Priority] [Avatar Assignee] [Due date] [Project]
+-- WorkArea (flex row)
    +-- ContentColumn (flex: 1, pr: 29px gutter)
    |   +-- Description (rich text, toolbar hidden until focus)
    |   +-- Attachments
    |   +-- Activity (tabs: Comments / History / Time Log)
    +-- TabAnchor (width: 0, relative) -> classeur tab (absolute, 26x120px)
    +-- PropertiesDrawer (280px, conditional)
```

### Topbar

- Padding: `11px 20px`
- Border-bottom: `1px solid kanap.border.default`
- Content: back link (12px, `kanap.text.secondary`) + breadcrumb segments + NavChip
- NavChip: teal-tinted pill with sequential position, monospace 11px, border-radius 5px
- NavChip arrow buttons should keep the chip visually compact but expose a forgiving hit target, at least 24x24px. Use centered small chevrons and subtle hover fill rather than making the chip visually heavier.
- No shadow, no background color

### Title block

- Padding: `26px 32px 22px`
- **Title row**: flex, items flex-start, gap 24px, margin-bottom 18px
  - **ID prefix** (`T-49`): monospace 14px, `kanap.text.secondary`, vertical-align 1px, mr 14px, click-to-copy
  - **Title**: 22px weight 500, click-to-edit pattern (span -> input on click, save on blur, cancel on Escape)
  - **Actions**: pill buttons on the right, gap 8px, mt 7px. Use `variant="action"` and `variant="action-danger"`. Close button at the end.
- **Metadata bar**: flex, gap 22px, flex-wrap, font-size 12px
  - Status chip: colored dot (8px) + label, click -> Menu with all statuses
  - Score chip: colored dot + monospace value, read-only with Tooltip
  - Priority chip: `kanap.text.tertiary` label + value, click -> Menu
  - Assignee chip: Avatar (18px) + name, click -> Popover with UserSelect
  - Due date chip: `kanap.text.tertiary` label + formatted date, click -> Popover with DatePicker
  - Project chip (conditional): `kanap.text.tertiary` label + project name (max 220px, ellipsis), click -> navigate

### Content column

- Flex: 1, min-width: 0, overflow: auto
- Padding: `8px 0 24px 24px`, **right padding: 29px** (permanent gutter for the classeur tab)
- **Description section**: label 12px weight 500, rich text editor with toolbar hidden until focus
- **Activity section**: no section label — tabs serve as section title
- **Activity composer**: card with `border 1px solid kanap.border.default`, border-radius 8px. See Composer pattern above.

### Properties drawer

Right-side panel toggled by a classeur tab.

**Classeur tab (always visible):**
- Sits in a zero-width anchor (`width: 0, position: relative`) between content and drawer
- Tab: `position: absolute, right: 0, top: 20px`, width 26px, height 120px
- Border-radius: `8px 0 0 8px`, border-right: none (fuses with drawer border when open)
- z-index: 2 (overlaps drawer border-left)
- Colors: teal-tinted bg when closed (`kanap.tab.bg`), solid teal bg when open (`kanap.tab.bgActive`)
- Label: vertical text "Properties" with chevron (closed) / (open)
- If the classeur tab is vertically offset to align with the metadata bar, the open drawer panel must use the same offset and compensate its height so tab and panel remain visually fused.
- The 29px content gutter ensures no visual overlap between tab and content text

**Drawer panel (conditional, 280px):**
- No header (the classeur tab serves as label)
- Border-left: `1px solid kanap.border.default`, bg: `kanap.bg.drawer`
- State persisted in localStorage (`kanap.{pageName}.drawerOpen`)

**Drawer content — property groups:**

Groups separated by soft dividers (`1px solid kanap.border.soft`). No section titles, no accordions, no collapse/expand. Groups are visually distinguished by dividers only.

```css
.kanap-prop-group {
  padding: 6px 18px 8px;
}
.kanap-prop-group + .kanap-prop-group {
  border-top: 1px solid var(--kanap-border-soft);
  margin-top: 6px;
  padding-top: 10px;
}
```

All fields inside groups use the PropertyRow pattern. All Selects use `drawerSelectSx`, all MenuItems use `drawerMenuItemSx`.

**Knowledge section (example of a list-in-drawer pattern):**
- One line per document: ID mono 11px `kanap.text.tertiary` + title 13px `kanap.text.primary` (ellipsis overflow)
- Hover reveals action icons (open, unlink — turns `kanap.danger` on hover)
- Empty state: "No documents linked" in `kanap.text.tertiary`
- Action links below list: teal 12px, `whiteSpace: nowrap`

### Keyboard shortcuts (workspace-level)

| Key | Action | Condition |
|---|---|---|
| `J` or left arrow | Previous item | Not in input/textarea |
| `K` or right arrow | Next item | Not in input/textarea |
| `Escape` | Close workspace (back to list) | Not in input/textarea |
| `P` or `.` | Toggle properties drawer | Not in input/textarea |
| `Ctrl+S` | Save all dirty fields | Always |
| `Ctrl+Enter` / `Cmd+Enter` | Submit focused comment composer | Composer has content/action and focus is inside editor |

### Rollout checklist for new workspaces

When converting an existing page to this pattern:

1. Create a `{Entity}DetailHeader` component (topbar + title + metadata bar)
2. Create a `{Entity}MetadataBar` with entity-specific chips
3. Create a `{Entity}PropertiesDrawer` using PropertyRow pattern (no FormControl/InputLabel)
4. Replace any left sidebar with right-side drawer + classeur tab
5. Add toolbar-reveal-on-focus to all rich text editors
6. Replace ToggleButtonGroup with compact Tabs (13px, no indicator)
7. Add keyboard shortcuts (J/K/arrows/Escape/P)
8. Wire title blur-to-save
9. Add `kanap` palette tokens if not already present (they're shared)
10. Test light + dark mode, mobile responsive, auto-save on all fields

---

## Spacing system

### Page sections

| Context | Value |
|---|---|
| Page topbar | `padding: 11px 20px` |
| Title block | `padding: 26px 32px 22px` |
| Content section | `padding: 24px 32px 0` |
| Content section (last) | `padding: 24px 32px 32px` |
| Drawer body | `padding: 10px 0 14px` |
| Property group | `padding: 6px 18px 8px` |
| Property row | `padding: 5px 0` |
| Composer input | `padding: 14px 16px 18px`, min-height 100px |
| Composer footer | `padding: 10px 16px 12px` |

### Gaps and margins

| Element | Value |
|---|---|
| Title row to metadata bar | `margin-bottom: 18px` |
| Metadata bar items | `gap: 22px` |
| Activity head to composer | `margin-bottom: 14px` |
| Composer to comments | `margin-bottom: 22px` |
| Comments | `gap: 22px` |
| Action pills | `gap: 8px` |
| Breadcrumb crumbs | `gap: 9px` |
| Composer footer controls | `gap: 18px` |

### General scale (MUI units, 1 = 8px)

| Units | Pixels | Usage |
|---|---|---|
| 0.5 | 4px | Micro gaps within tight lists |
| 1 | 8px | Element gaps |
| 1.5 | 12px | Related element groups |
| 2 | 16px | Section padding, card padding |
| 2.5 | 20px | Field gap in dense layouts |
| 3 | 24px | Major section gaps |
| 4 | 32px | Page-level spacing |

---

## Border radius

| Element | Radius |
|---|---|
| Composer container, cards | 8px |
| Action pills, nav chip, MenuItems | 5px |
| Submit button, primary CTAs | 6px |
| Sidebar items | 6px |
| AG Grid wrapper | 8px |
| Avatars | 50% |
| Pill chips (status in dashboard) | 9999px |
| Slider track | 2px |
| Drawer tab | `8px 0 0 8px` (rounded left side only) |

Max border-radius is 12px except pill chips (9999px).

---

## Layout rules

- Page topbar and title block are full width
- Drawer is contained to the work area below the title block, never extends above
- When drawer is closed: 29px right padding on content (26px tab + 3px gap)
- When drawer is open: content + tab anchor + drawer panel sit side by side via flex
- Reverse-chronological sorting for activity feeds (most recent at top, just under composer)
- Sequential navigation arrows live grouped with the breadcrumb (left), not in the actions area (right)

---

## Interaction patterns

### Persistent UI state

Drawer open/closed, description collapse/expand, and similar UI states persist in localStorage. Use `kanap.{pageName}.{setting}` key format.

### Hover-revealed actions

Actions on list items (unlink button, edit button) are hidden by default and revealed on hover via `opacity: 0 -> 1` transition. Always accessible via `aria-label` regardless of hover state.

### Auto-save with optimistic updates

Most form fields save on every change, optimistically update the UI, and show a toast on backend errors. Don't block UI on save round-trips.

---

## CSS architecture — how the rules are enforced

### Global link coloring (`ThemeContext.tsx` -> MuiCssBaseline)

- `.MuiLink-root` gets `color: primary.main` — colors standalone MUI Link components (prose links)
- `.MuiBreadcrumbs-root a` gets `color: primary.main` — breadcrumb links
- No blanket `a { color: teal }` — this was the source of teal leaking everywhere

### AG Grid cell protection (`ag-grid-overrides.css`)

- `.ag-theme-quartz .ag-cell a` and `.ag-theme-quartz-dark .ag-cell a` get `color: inherit !important`
- Overrides any MUI Link styling inside grid cells
- Covers `.MuiLink-root` inside cells, `:visited`, `:hover`
- `cursor: pointer` set on `.ag-row` for all rows

### Custom CSS variables in AG Grid

- `--kanap-text-secondary`: `#6B7280` (light) / `rgba(255,255,255,0.55)` (dark) — used by ID column cellStyles

### Navigation link neutralization (`ThemeContext.tsx`)

- `MuiListItemButton` and `MuiTab` have `color: 'inherit'` in theme overrides
- Prevents global MuiLink styling from coloring nav items

---

## Anti-patterns — NEVER do these

1. **No colored header bars.** The AppBar is always neutral. Never a solid teal/blue banner.
2. **No heavy shadows.** Max = subtle border + light hover shadow. No MUI elevation > 2.
3. **No borders everywhere.** Use spacing to separate. Borders only on cards, explicit dividers, and composer panels.
4. **No fluorescent status colors.** Dot+text in tables, subtle pill in cards only.
5. **No uppercase text.** Sentence case everywhere, no exceptions.
6. **No border-radius > 12px** except pill chips (9999px).
7. **No animations > 200ms.**
8. **No blue-grey backgrounds** in light mode. Use pure neutral greys.
9. **Zero teal in table cells.** No cell text uses teal/primary. Enforced by `ag-grid-overrides.css`.
10. **No left-border accents** on active nav items. Use subtle background fill.
11. **No pill/chip for non-status metadata.** Task type, context, score, roles = plain text.
12. **No custom input components replacing MUI TextField.** Use theme overrides for styling.
13. **No `FormControl` + `InputLabel`** on form fields. Use PropertyRow exclusively.
14. **No `cursor: help`** on tooltipped elements. Let the tooltip work without visual cue.
15. **No save buttons for in-place editing.** All entity fields auto-save: selects on change, titles on blur, descriptions on debounced timer (2s). Ctrl+S flushes pending autosave. Create forms and composers still have explicit submit buttons.
16. **No permanent toolbars** on rich text editors. Hide them, reveal on focus.
17. **No auto-focus on form inputs at page load.** Let users orient themselves first.
18. **No font weights other than 400 and 500.** No 600, 700, or bold.
19. **No more than 2 color ramps** in a single component (gray + one accent max).
20. **No `MuiDrawer`** for contained side panels. Build a custom flex layout.
21. **No inlined sx props** that should be shared constants.
22. **No ISO date strings** in user-facing display. Always format.
23. **No section headers in bold with collapse chevrons** inside drawers. Use plain dividers.
24. **No duplicating action labels** (e.g. label "Status" both above and inside a dropdown).

---

## Tenant branding

- Tenants can set a custom primary color (light + dark variants) via the branding page
- Custom color replaces `kanap.teal` / `primary.main` only — neutrals, surfaces, text, accent orange stay fixed
- Custom logo replaces the KANAP logo in the AppBar — must handle any aspect ratio gracefully
- When no custom branding: use the KANAP teal palette as default

---

## Implementation checklist

Before merging any new UI component, verify:

- [ ] Renders correctly in both light and dark mode
- [ ] Uses theme tokens (`kanap.*`) instead of hardcoded colors
- [ ] No `FormControl` or `InputLabel` on any form field
- [ ] No `cursor: help`, no permanent disabled buttons
- [ ] Font weights are only 400 or 500
- [ ] Sentence case throughout
- [ ] All technical IDs in monospace font
- [ ] Sx constants are shared, not inlined per field
- [ ] `disableUnderline` applied to all standard variant inputs
- [ ] Auto-save on all fields: selects/dates on change, titles on blur, descriptions on debounced timer (2s)
- [ ] Hover/focus states defined explicitly
- [ ] Keyboard accessible (proper aria-labels, focus order, escape handling)
- [ ] Reverse-chronological for activity-style lists
- [ ] UI state persistence in localStorage where applicable
- [ ] No teal on table cell text
