# Dark Mode Implementation

**Status:** Implemented
**Last Updated:** 2026-02-26

## Overview

Kanap now supports three appearance modes in the frontend:

- `light`
- `dark`
- `system` (follows OS preference)

The implementation is centralized in a single theme context and propagated through MUI and AG Grid.

## Goals

- Provide consistent light/dark behavior across standard MUI UI.
- Keep specific visualization surfaces in forced light mode where readability or rendering quality is better.
- Keep print and export outputs in light mode for predictable documents.
- Persist user preference in browser storage.

## Core Architecture

### Theme Context

File: `frontend/src/config/ThemeContext.tsx`

Key responsibilities:

- Stores preference (`light` | `dark` | `system`) in localStorage key `themeMode`.
- Resolves `system` mode using `window.matchMedia('(prefers-color-scheme: dark)')`.
- Exposes:
  - `mode`: raw preference
  - `resolvedMode`: active palette mode (`light` or `dark`)
  - `setMode`: updater
- Exports `useThemeMode()` hook for all consumers.

### Shared Theme Construction

Also in `ThemeContext.tsx`:

- `baseThemeComponents` holds shared MUI component overrides (TextField label shrink, InputLabel background behavior, OutlinedInput notch behavior).
- `createAppTheme(mode)` builds the runtime theme.
- Dark mode palette is intentionally softened to a navy/slate background (instead of near-black):
  - `background.default: #182230`
  - `background.paper: #1f2b3b`
  - softer dark divider/text/hover values for less visual strain.
- `warning.50` and `error.50` palette tokens are added for mode-aware tinted cells.
- `lightIslandTheme` is exported for forced-light subtrees.

Type augmentation for custom palette tokens lives in:

- `frontend/src/theme.d.ts`

## App Wiring

File: `frontend/src/main.tsx`

- `ThemeModeProvider` wraps the app.
- Theme is rebuilt via `useMemo(() => createAppTheme(resolvedMode), [resolvedMode])`.
- `ThemeProvider` receives the resolved dynamic theme.
- AG Grid styling uses `ag-theme-quartz.css` (contains both `.ag-theme-quartz` and `.ag-theme-quartz-dark` classes in current AG Grid version).

## User Controls

### AppBar Toggle

File: `frontend/src/components/Layout.tsx`

- Added appearance toggle icon button in the top bar.
- Cycle behavior: `light -> dark -> system -> light`.
- Tooltip shows current mode.
- Uses only `useThemeMode()` (no duplicated localStorage logic).

### Settings Tab

Files:

- `frontend/src/pages/settings/SettingsPage.tsx`
- `frontend/src/pages/settings/AppearanceTab.tsx`

- Added `Appearance` tab in Settings.
- Radio group for `Light`, `Dark`, `System`.
- Bound to `useThemeMode()` as single source of truth.

## AG Grid Theme Strategy

### Shared Wrapper for One-Off Grids

File: `frontend/src/components/AgGridBox.tsx`

- Wrapper reads `resolvedMode` and applies:
  - `ag-theme-quartz` (light)
  - `ag-theme-quartz-dark` (dark)

Used across report and operations pages that previously hardcoded `className="ag-theme-quartz"`.

### ServerDataGrid

File: `frontend/src/components/ServerDataGrid.tsx`

- Root grid container class now switches by `resolvedMode`.

## Forced-Light Islands

File: `frontend/src/components/LightModeIsland.tsx`

- Uses nested `ThemeProvider` with `lightIslandTheme`.
- Keeps shared component overrides (same base options as app theme).
- Provides a visual boundary (`Paper` with outlined styling).

Applied to targeted visualization surfaces where light rendering is preferred.

### Important Scope Decision: Roadmap Generator

In roadmap view, only the Gantt visualization region is forced light.

- Dark mode remains active for roadmap controls/settings.
- Gantt rendering block is wrapped in `LightModeIsland` inside `RoadmapGenerator`.

Files:

- `frontend/src/pages/portfolio/PlanningPage.tsx`
- `frontend/src/pages/portfolio/components/RoadmapGenerator.tsx`

## Print and Export Normalization

### Runtime Print Class Swapping (Global)

Implemented in `usePrintLightMode()` inside `ThemeContext.tsx`.

Behavior:

- On `beforeprint`: swap `.ag-theme-quartz-dark` -> `.ag-theme-quartz`
- On `afterprint`: restore original dark classes
- Includes `matchMedia('print')` fallback listener for broader browser compatibility

This ensures report prints are always light-themed for AG Grid content.

### Print CSS

File: `frontend/src/styles/print.css`

- Print selectors include both `.ag-theme-quartz` and `.ag-theme-quartz-dark` for layout rules.

### Capacity Heatmap PNG Export

File: `frontend/src/pages/portfolio/CapacityHeatmapReport.tsx`

- Export clone is normalized to light by replacing `.ag-theme-quartz-dark` with `.ag-theme-quartz` before serialization.
- Ensures PNG export is light even when app mode is dark.

## Hardcoded Color Cleanup

Replaced key hardcoded values with theme tokens in:

- `frontend/src/components/fields/AnalyticsCategorySelect.tsx`
- `frontend/src/pages/admin/master-data/MasterDataCopyPage.tsx`
- `frontend/src/pages/operations/BudgetColumnResetPage.tsx`
- `frontend/src/pages/operations/CopyAllocationsPage.tsx`
- `frontend/src/pages/operations/CopyBudgetColumnsPage.tsx`
- `frontend/src/components/RichTextContent.tsx`
- `frontend/src/components/RichTextEditor.tsx`
- `frontend/src/pages/TasksPage.tsx`

Examples:

- `warning.dark`, `warning[50]`
- `error.dark`, `error[50]`
- `success.dark`
- `text.secondary`, `text.disabled`
- mode-aware mark highlight (`#ffff00` light / `#665600` dark)

## Verification Checklist

- AppBar toggle cycles correctly and persists after reload.
- Settings `Appearance` tab reflects and updates same mode state.
- Standard MUI pages render correctly in both modes.
- AG Grid switches class correctly in both shared and one-off implementations.
- Map/Gantt forced-light islands render legibly in dark mode.
- Roadmap controls remain dark while roadmap Gantt remains light.
- Print output uses light AG Grid styling.
- Capacity heatmap PNG export is light-mode in all app modes.
- Frontend build passes (`npm run build`).

## Notes for Future Changes

- If adding new AG Grid screens, prefer `AgGridBox` for consistency.
- If adding new forced-light areas, wrap only the minimum necessary subtree in `LightModeIsland`.
- Keep theme state access centralized through `useThemeMode()`.
- If new mode-dependent palette tokens are added, update `theme.d.ts` accordingly.
