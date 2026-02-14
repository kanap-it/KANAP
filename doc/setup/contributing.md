# Contributing

Metadata
- Purpose: Define contribution workflow and quality bar
- Audience: Contributors and reviewers
- Status: draft
- Owner: TBD
- Last Updated: 2025-08-31

## Workflow
- Create a feature branch from `main`
- Open a PR early (draft) for feedback
- Ensure docs and tests reflect changes
- Request review from code owners

## Commit Style
- Use conventional commits where reasonable (feat, fix, docs, chore)
- Keep messages imperative and concise

## Code Style
- Match existing patterns and formatting
- Add/Update small, focused modules; avoid broad refactors in feature PRs

## Documentation
- Update relevant docs in `doc/` as part of each change
- Prefer diagrams-as-code (Mermaid)

## Frontend Guidelines
- Follow `doc/frontend-architecture.md` for UI structure and shared components:
  - Use `PageHeader` on every page (title, breadcrumbs, actions)
  - Use `ServerDataGrid` for lists (AG Grid infinite scroll) with server-side sort + floating filters; only `sort` is URL-synced
  - Use TanStack Query for data fetching/mutations; invalidate relevant query keys on writes
  - Place new workflow pages under Budget Management; consolidate catalogs under an Admin hub when added

### PR Checklist — Frontend (copy into your PR)
- [ ] Route registered under `Layout` in the appropriate module group (Budget Management/Admin)
- [ ] PageHeader present with correct title and breadcrumbs; actions in header
- [ ] List screens use `ServerDataGrid` with URL sync (`sort`); floating filters configured per column
- [ ] Viewport containment: page does not introduce body-level scrollbars; only the grid scrolls (vertical and, when needed, horizontal)
- [ ] Sticky bottom horizontal scroller visible for wide grids; header action buttons remain visible at typical widths
- [ ] Columns defined; `getRowId` correct; `queryKey` stable; default sort set
- [ ] Mutations invalidate relevant query keys; optimistic updates where applicable
- [ ] Loading/empty/error states verified; user feedback is clear
- [ ] RBAC considered for actions (create/edit/delete) if roles apply
- [ ] Docs updated (step guide and/or `doc/frontend-architecture.md`, testing strategy if needed)
- [ ] Manual smoke steps noted in PR description; screenshots optional

## Reviews
- Review for correctness, clarity, and maintainability
- Aim for timely, actionable feedback

## Security
- Never commit secrets; use `.env` and secret stores
- Flag any risky changes or deps in PR description
