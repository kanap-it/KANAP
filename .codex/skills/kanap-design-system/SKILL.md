---
name: kanap-design-system
description: >-
  Apply the KANAP "Refined Density" design system to React/Vite front-end work.
  Use whenever creating, modifying, refactoring, or auditing KANAP UI: pages,
  workspace/detail views, forms, drawers, dialogs, tables, AG Grid columns,
  cards, navigation, theme tokens, MUI overrides, styling, dark mode, or
  replacing legacy MUI-heavy layouts. Do not use for backend, API, database, or
  non-UI-only tasks.
---

# KANAP Design System

Use this skill as a mandatory front-end guardrail for KANAP. The source charter is preserved in [references/kanap-design-charter.md](references/kanap-design-charter.md); read it before non-trivial UI work and whenever exact spacing, token, typography, drawer, table, form, or workspace details matter.

## Operating Workflow

1. Identify the UI surface: list page, workspace/detail page, form, drawer, dialog, table, card, navigation, or shared component.
2. Inspect nearby existing implementations before editing. Prefer shared primitives and patterns over new local variants.
3. Load the relevant sections of the full charter for exact values, especially for workspace pages, forms, AG Grid, theme tokens, and dark mode.
4. Implement with `kanap.*` theme tokens and existing shared CSS/components where available.
5. Verify light and dark mode implications, keyboard/focus behavior, sentence case, and typography weights.
6. For audits or reviews, report violations by severity and include concrete file references.

## Core Visual Direction

KANAP uses a dense, sober, Linear-grade visual grammar for IT governance users. Content dominates; chrome recedes. Use monochrome neutrals by default. Color must signify state or interaction, not decorate.

Follow these non-negotiables:

- Use teal only for interactive elements: primary buttons, focus rings, active nav indicators, prose/action links.
- Never use teal in table cells, status chips, permanent content text, metadata values, or header/sidebar icons.
- Use orange for attention/urgency and critical scores, never as broad decorative fill.
- Support dark mode for every UI change.
- Use `kanap.*` palette tokens instead of hardcoded colors unless the charter explicitly specifies a fixed value.
- Keep typography to weights `400` and `500`; never introduce `600`, `700`, bold, uppercase, or title case.
- Use sentence case for all labels, headers, menu items, buttons, and section names.

## MUI And Forms

KANAP uses MUI, but only through constrained patterns:

- Do not use `FormControl` with `InputLabel`.
- Do not use `TextField label="..."`.
- Do not use `Select label="..."`.
- Do not use `MuiDrawer` for contained side panels.
- Use label-above-value form rows with `PropertyRow`.
- Use `Select variant="standard" disableUnderline`.
- Use `TextField variant="standard"` with underline disabled.
- Use shared `sx` constants for repeated drawer/select/date/menu styling; do not paste large repeated inline `sx` objects.
- Required asterisks are orange, not red.

## Workspace Pages

Workspace/detail pages should follow the reference implementation in `frontend/src/pages/tasks/TaskWorkspacePage.tsx` unless the existing shared workspace components have superseded it.

Expected structure:

- Full-width neutral topbar with breadcrumb and sequential navigation chip.
- Full-width title block with mono ID, click-to-edit title, metadata bar, and action pills.
- Main work area with content column, permanent drawer-tab gutter, zero-width tab anchor, and right-side contained properties drawer.
- Drawer state persisted in `localStorage` with `kanap.{pageName}.{setting}` keys.
- Rich text description editor hides toolbar until focus.
- Existing entity fields autosave: selects/dates on change, titles on blur, descriptions with debounced autosave.

For dense workspace sections:

- Prefer full-width inline metric bars over stacked cards when metrics are summary context.
- Do not repeat the same metric in multiple sections; show it once where it best supports the workflow.
- Comparable progress/consumption bars must use matching widths and visual weight.
- Keep inline metric sliders/bars long enough to be usable and balanced; prefer about 200px on desktop over tiny 100px controls.
- Use small tertiary source labels for calculated/manual values when provenance matters.
- Keep related tables as separate tables in a grid, with enough gap or a subtle divider so they do not read as one merged table.
- When allocation values are derived from editable base totals, expose the base totals inline near the allocation result; dialogs should edit distribution, not hide the calculation basis.

## Tables And Status

For AG Grid and dense lists:

- Row height is compact; headers are sentence case, 11px, weight `500`.
- Use horizontal borders only; no zebra striping.
- Link columns stay neutral at rest and on hover; row hover and cursor communicate clickability.
- Technical IDs use mono font, tabular nums, and secondary/tertiary text color.
- Status in tables/lists is dot plus text, not pill.
- Status color logic must come from `frontend/src/utils/statusColors.ts`, not page-local maps.

For plain HTML tables in workspace sections, use the same dense typography and horizontal dividers. If a table cell contains a true secondary navigation link, keep it neutral at rest and use only a restrained underline/teal hover treatment; never make table links permanently teal.

## Dialog Interactions

- When editing percentage allocations, manual edits may pin rows for redistribution, but the user must still be able to edit pinned values.
- If automatic redistribution happens immediately, do not add a redundant "redistribute remainder" action.
- Provide simple reset actions such as "Split equally" or "Clear manual pins" only when they remove real manual work.

## Knowledge Lists

- Directly linked documents take precedence over related documents.
- If the same document appears as both direct and related, display it only in direct documents.
- If the same related document is found through multiple paths, display it once and merge or summarize provenance instead of duplicating rows.

## Anti-Patterns To Block

Block or refactor these during UI work:

- Colored header bars or decorative teal surfaces.
- Heavy shadows, MUI elevations above subtle card hover treatment, or excessive borders.
- Pill/chip styling for non-status metadata.
- Permanent rich-text toolbars for description-like editors.
- Explicit save buttons for in-place editing of existing entities.
- ISO dates in user-facing UI.
- `cursor: help` on tooltip targets.
- Auto-focus at page load.
- Border radius above 12px except true pill chips.
- Animations above 200ms.

## Reference Loading

Read [references/kanap-design-charter.md](references/kanap-design-charter.md) for:

- Exact color palette and token mappings.
- Typography scale and monospace conventions.
- Component dimensions and spacing.
- Workspace page rollout checklist.
- Drawer tab and property group rules.
- AG Grid CSS enforcement details.
- Full implementation checklist.
