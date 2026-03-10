# User Documentation System

This document describes the user documentation infrastructure for KANAP, including content creation, publishing workflow, and in-app integration.

## Overview

User documentation is:
- **Authored** in Markdown files in `doc/help/docs/en/`
- **Organized** as route manuals in `docs/en/*.md` and supplemental Fast Track guides in `docs/en/fast-track/*.md`
- **Published** automatically via Cloudflare Pages to https://doc.kanap.net
- **Linked** contextually from the application's Help button when a route mapping exists

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  /doc-page      │     │   git push      │     │ Cloudflare Pages│
│  generates .md  │ ──► │   to main       │ ──► │ auto-rebuilds   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐                             ┌─────────────────┐
│  User clicks    │                             │  Live docs at   │
│  Help button    │ ◄────────────────────────── │  doc.kanap.net  │
│  in app         │                             │                 │
└─────────────────┘                             └─────────────────┘
```

## Folder Structure

```
doc/
├── help/                              # Published documentation
│   ├── mkdocs.yml                     # MkDocs configuration
│   ├── requirements.txt               # Python dependencies
│   ├── package.json                   # Empty (for Cloudflare Pages)
│   ├── DEPLOYMENT.md                  # Deployment guide
│   │
│   ├── docs/
│   │   ├── en/                        # English documentation
│   │   │   ├── index.md               # Home page
│   │   │   ├── applications.md        # Apps & Services
│   │   │   ├── interfaces.md          # Interfaces
│   │   │   ├── opex.md                # OPEX
│   │   │   └── ...                    # Other pages
│   │   │
│   │   ├── fr/                        # French (placeholder)
│   │   │   └── index.md
│   │   │
│   │   ├── stylesheets/
│   │   │   └── extra.css              # Custom styles
│   │   │
│   │   ├── _headers                   # Cloudflare caching rules
│   │   └── _redirects                 # URL redirects
│   │
│   ├── overrides/                     # Theme customizations
│   │
│   └── _process/                      # Internal (not published)
│       ├── _documentation-template.md # Template for new pages
│       ├── _documentation-process.md  # Process documentation
│       └── _documentation-inventory.md# Coverage tracking
│
└── features/                          # Technical docs (internal only)
```

## Authoring Automation

The documentation workflow currently has two automation surfaces:

- **Legacy Claude command prompts** in `.claude/commands/`
- **Codex maintenance skill** in `.codex/skills/user-manual-maintainer/`

The prompts and skill share the same source-of-truth hierarchy:

```text
Frontend code (*.tsx)        ← Ground truth
Technical docs in /doc       ← Secondary context
User docs in /doc/help       ← Derived output
```

### Legacy Claude commands

### `/doc-page <route-or-component>`

Generates or updates documentation for a single page.

**Usage:**
```
/doc-page applications
/doc-page /it/interfaces
/doc-page ContractsPage
```

**Process:**
1. Reads the component source code (PRIMARY source of truth)
2. Extracts columns, tabs, fields, actions from code
3. Reads technical docs for context (SECONDARY)
4. Generates user-friendly documentation
5. Saves to `doc/help/docs/en/{slug}.md`

**Output location:**
- `/it/applications` → `doc/help/docs/en/applications.md`
- `/ops/contracts` → `doc/help/docs/en/contracts.md`

### `/doc-check`

Checks documentation for staleness and coverage gaps.

**Usage:**
```
/doc-check                    # Full inventory + staleness check
/doc-check applications       # Check single page only
/doc-check --inventory-only   # Only regenerate inventory
```

**What it does:**
1. Scans `frontend/src/pages/` for all page components
2. Compares git timestamps: component vs documentation
3. Flags docs where code changed after doc was last updated
4. Reports coverage gaps (pages without documentation)
5. Updates `_documentation-inventory.md`

**Output:**
```
📋 Documentation Check Report
================================

✅ Up to date (20):
   - applications.md
   - interfaces.md
   ...

⚠️ Potentially stale (3):
   1. opex.md
      Component changed: 2025-12-20
      Doc last updated: 2025-11-15
      Changes: +2 columns, +1 tab

❌ Missing documentation (2):
   - /portfolio/requests
   ...
```

### `/doc-batch <category>`

Generates documentation for multiple pages at once.

**Usage:**
```
/doc-batch all           # All undocumented pages
/doc-batch it            # IT Operations pages only
/doc-batch ops           # Budget Operations pages only
/doc-batch master-data   # Master Data pages only
/doc-batch admin         # Admin pages only
/doc-batch reports       # Reports pages only
```

**Process:**
1. Reads inventory to find undocumented pages in category
2. Generates each page sequentially
3. Updates inventory after each page
4. Reports summary when complete

### Codex skill

The Codex-side equivalent lives at:

`/home/fried/kanap/.codex/skills/user-manual-maintainer/SKILL.md`

It is intended to own ongoing maintenance of:

- route manuals in `doc/help/docs/en/*.md`
- Fast Track guides in `doc/help/docs/en/fast-track/*.md`
- inventory/process docs in `doc/help/_process/`
- route mappings in `frontend/src/utils/docUrls.ts`

## Documentation Types

### Route manuals

These are 1-page or 1-feature references such as:

- `applications.md`
- `opex.md`
- `portfolio-projects.md`

They are usually route-mapped from the app header help button.

### Fast Track guides

These are supplemental workflow guides and cheat sheets:

- `fast-track/getting-started.md`
- `fast-track/index.md`
- `fast-track/apps-and-assets.md`
- `fast-track/task-types.md`

They are not strictly tied to a single route and should not be forced into the same 1-route-to-1-doc model as the main manuals.

## Cloudflare Pages Integration

### Configuration

| Setting | Value |
|---------|-------|
| **Project name** | `kanap-docs` |
| **Production branch** | `main` |
| **Root directory** | `doc/help` |
| **Build command** | `pip install -r requirements.txt && mkdocs build` |
| **Build output directory** | `site` |
| **Custom domain** | `doc.kanap.net` |

### Build Process

1. Push to `main` branch triggers Cloudflare Pages webhook
2. Cloudflare clones repo, navigates to `doc/help/`
3. Installs Python dependencies from `requirements.txt`
4. Runs `mkdocs build` to generate static HTML
5. Deploys `site/` folder to CDN
6. Live in ~60 seconds

### Build Watch Paths (Optional)

To avoid rebuilding on unrelated changes, configure:
```
doc/help/**/*
```

This ensures only documentation changes trigger rebuilds.

## In-App Help Integration

### Route-to-Documentation Mapping

File: `frontend/src/utils/docUrls.ts`

```typescript
const DOC_BASE_URL = 'https://doc.kanap.net';

// Pattern → doc slug mapping
const routeToDocSlug: [RegExp, string][] = [
  [/^\/it\/applications/, 'applications'],
  [/^\/it\/interfaces/, 'interfaces'],
  [/^\/ops\/opex/, 'opex'],
  // ... more mappings
];

export function getDocUrl(pathname: string): string {
  for (const [pattern, slug] of routeToDocSlug) {
    if (pattern.test(pathname)) {
      return `${DOC_BASE_URL}/${slug}/`;
    }
  }
  return `${DOC_BASE_URL}/`; // Fallback to home
}
```

### Help Button

Location: `frontend/src/components/Layout.tsx`

The help button in the app header uses `getDocUrl()` with the current route:

```tsx
<IconButton
  component="a"
  href={getDocUrl(location.pathname)}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Open documentation for this page"
>
  <HelpOutlineIcon />
</IconButton>
```

**Behavior:**
- User on `/it/applications` → Opens `https://doc.kanap.net/applications/`
- User on `/ops/opex/123` → Opens `https://doc.kanap.net/opex/`
- User on unmapped route → Opens `https://doc.kanap.net/`

### Adding New Page Mappings

When adding a new documented page:

1. Generate docs with `/doc-page <route>`
2. Add mapping to `frontend/src/utils/docUrls.ts`:
   ```typescript
   [/^\/new\/route/, 'new-page-slug'],
   ```

## Local Development

### Preview Documentation Locally

```bash
cd doc/help
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
# Open http://localhost:8000
```

### Build Locally

```bash
cd doc/help
mkdocs build
# Output in ./site/
```

## Multi-Language Support (Future)

The structure supports i18n via the `mkdocs-static-i18n` plugin:

1. Add translations to `doc/help/docs/fr/`, `doc/help/docs/de/`, etc.
2. Enable plugin in `mkdocs.yml`
3. URLs become `/en/applications/`, `/fr/applications/`, etc.

See `doc/help/DEPLOYMENT.md` for detailed i18n setup instructions.

For supplemental guides such as Fast Track pages, add discovery links in the docs home page and MkDocs nav even if no in-app route mapping is needed.

## Maintenance Workflow

### Regular Maintenance

1. **Weekly/Monthly**: Run `/doc-check` to identify stale documentation
2. **After feature releases**: Run `/doc-page` for affected pages
3. **Before major releases**: Run `/doc-batch all` to ensure full coverage
4. **After workflow/navigation changes**: Review Fast Track guides and the docs home page links

### When Adding New Features

1. Implement the feature (frontend components)
2. Update or generate the relevant route manual
3. Add or update the route mapping in `docUrls.ts`
4. If the feature changes onboarding flows, review the Fast Track guides too
5. Commit and push - docs auto-deploy

### Source of Truth Hierarchy

```
Code (*.tsx)                    ← GROUND TRUTH
    ↓
Technical docs (features/*.md)  ← Developer context
    ↓
User docs (help/docs/en/*.md)   ← End-user documentation
```

When sources conflict, **code wins**. Update documentation to match code, not vice versa.

## File Naming Conventions

| Route | Doc File | URL |
|-------|----------|-----|
| `/it/applications` | `applications.md` | `/applications/` |
| `/it/interface-map` | `interface-map.md` | `/interface-map/` |
| `/ops/opex` | `opex.md` | `/opex/` |
| `/it/settings` | `it-ops-settings.md` | `/it-ops-settings/` |
| `/admin/users` | `admin.md` | `/admin/` |

**Rules:**
- Lowercase, hyphen-separated
- No `user-manual-` prefix (legacy)
- Match the route where practical
- Group related admin pages into single doc
- Use `fast-track/` for cross-workspace workflow guides rather than forcing them into route slugs

## Troubleshooting

### Documentation not updating after push

1. Check Cloudflare Pages build logs for errors
2. Verify files are in `doc/help/docs/en/`
3. Ensure `mkdocs.yml` navigation includes the page

### Help button links to wrong page

1. Check route pattern in `docUrls.ts`
2. More specific patterns should come before general ones
3. Test with `getDocUrl('/your/route')` in browser console

### MkDocs build fails locally

1. Ensure Python 3.8+ is installed
2. Use a virtual environment
3. Check `requirements.txt` versions match

### Search not working

1. Verify `search` plugin is enabled in `mkdocs.yml`
2. Rebuild the site (`mkdocs build`)
3. Check browser console for JavaScript errors
