# User Manual Documentation Template

_This template defines the structure and style for KANAP user documentation._

---

## File Naming Convention

```
user-manual-{feature-slug}.md
```

Examples:
- `user-manual-applications.md`
- `user-manual-contracts.md`
- `user-manual-tasks.md`

---

## Document Structure

### 1. Title and Introduction (Required)

```markdown
# {Feature Name}

{One paragraph (2-3 sentences) explaining what this feature is and its primary purpose.
Focus on the business value, not technical implementation.}
```

**Example:**
```markdown
# OPEX

OPEX (Operating Expenditure) items are your recurring IT costs: software licenses,
cloud subscriptions, maintenance contracts, and services. This is where you plan
budgets, track actuals, and allocate costs across your organization.
```

### 2. Getting Started Section (Required for create/edit pages)

```markdown
## Getting started

Navigate to **{Menu Path}** to see your list. Click **New** to create your first item.

**Required fields**:
  - **{Field Name}**: {Brief explanation}
  - ...

**Strongly recommended**:
  - **{Field Name}**: {Brief explanation}
  - ...

**Optional but useful**:
  - **{Field Name}**: {Brief explanation}
  - ...

**Tip**: {Actionable advice for new users}
```

### 3. Where to Find It (Required for settings/admin pages)

```markdown
## Where to find it

- Workspace: **{Workspace Name}**
- Path: **{Full navigation path}**
- Permissions:
  - You need at least `{resource}:reader` to view the page.
  - You need `{resource}:manager` to create/edit items.
  - You need `{resource}:admin` to delete items or access advanced features.

If you don't see {feature} in the menu, ask your administrator to grant you
the appropriate permissions.
```

### 4. The Grid Section (Required for list pages)

```markdown
## Working with the list

{Brief intro to the grid capabilities}

**Default columns**:
  - **{Column}**: {What it shows}
  - ...

**Additional columns** (via column chooser):
  - **{Column}**: {What it shows}
  - ...

**Filtering**:
  - Quick search: {What fields it searches}
  - Column filters: {Notable filter types}
  - Status scope: {If applicable - All/Enabled/Disabled toggle}

**Actions**:
  - **New**: Creates a new item
  - **Import CSV**: {If available}
  - **Export CSV**: {If available}
  - **Delete Selected**: {If available, note permission required}
```

### 5. The Workspace Section (Required for workspace pages)

```markdown
## The {Feature} workspace

Click any row in the list to open the workspace. It has {N} tabs:

### {Tab Name}

{What this tab is for}

**What you can edit**:
  - {Field}: {Brief explanation}
  - ...

**How it works**:
  - {Key behavior or interaction}
  - ...

**Tip**: {Useful advice}

---

### {Next Tab Name}
...
```

### 6. CSV Import/Export (If applicable)

```markdown
## CSV import/export

Keep large sets in sync with your source systems using CSV (semicolon `;` separated).

**Export**:
  - **Template**: Header-only file you can fill in
  - **Data**: Current items with all exportable fields

**Import**:
  - Start with **Preflight** (validates without saving)
  - If Preflight is OK, **Load** applies changes
  - Matching: {How records are matched - by name, code, etc.}

**Required fields**: {List}

**Optional fields**: {List}

**Notes**:
  - Use **UTF-8 encoding** and **semicolons** as separators
  - {Any special considerations}
```

### 7. Tips Section (Optional but recommended)

```markdown
## Tips

  - **{Short title}**: {Advice}
  - **{Short title}**: {Advice}
```

---

## Writing Style Guidelines

### Tone
- **Direct and practical**: Write as if explaining to a colleague
- **Task-oriented**: Focus on what users can do, not how the system works internally
- **Confident but not pushy**: Use "you can" rather than "you should"

### Formatting Rules

1. **Bold** for:
   - UI elements: **Save**, **Reset**, **New**
   - Field names: **Product Name**, **Currency**
   - Menu paths: **Budget Management → OPEX**
   - Tab names: **Overview**, **Budget**

2. **Code formatting** for:
   - Permission codes: `opex:reader`, `settings:admin`
   - Technical values: `UTF-8`, `NULL`

3. **Lists** for:
   - Field explanations (use nested bullets for required/optional grouping)
   - Step-by-step instructions (use numbered lists)
   - Quick tips (use bullet points)

4. **Horizontal rules** (`---`) to separate major sections within a tab description

### Language Patterns

| Instead of... | Use... |
|---------------|--------|
| "The system will..." | "KANAP..." or just describe what happens |
| "Users can..." | "You can..." |
| "This feature allows..." | "Use this to..." or "{Feature} lets you..." |
| "Please note that..." | Just state the fact |
| "It is important to..." | State why or use **Tip:** format |

### Content Depth

- **Grid pages**: Focus on columns, filtering, actions
- **Workspace pages**: Cover each tab, explain fields that aren't self-explanatory
- **Settings pages**: Explain what each setting controls and where it's used
- **Operations pages**: Provide step-by-step workflows with clear outcomes

---

## Checklist for New Documentation

- [ ] Title matches UI label exactly
- [ ] Introduction explains the business purpose (not technical details)
- [ ] Navigation path is accurate
- [ ] Required permissions are listed
- [ ] All tabs/sections are documented
- [ ] Field explanations are practical (what it's for, not just what it is)
- [ ] CSV section included if import/export exists
- [ ] At least 2-3 practical tips
- [ ] No technical jargon (entity, service, component) unless necessary
- [ ] Proofread for consistent formatting

---

## Template: Grid + Workspace Page

```markdown
# {Feature Name}

{Introduction paragraph explaining business purpose}

## Getting started

Navigate to **{Menu} → {Submenu}** to see your list. Click **New** to create your first item.

**Required fields**:
  - **{Field}**: {Explanation}

**Optional but useful**:
  - **{Field}**: {Explanation}

**Tip**: {Quick advice for new users}

## Working with the list

**Default columns**: {Column}, {Column}, {Column}

**Filtering**: Quick search covers {fields}. Use column filters for {specific filters}.

**Actions**: New, Import CSV, Export CSV, Delete Selected (admin only)

## The {Feature} workspace

Click any row to open the workspace.

### Overview

{What this tab shows and what you can edit}

### {Tab 2}

{Content}

### {Tab 3}

{Content}

## CSV import/export

{Standard CSV section if applicable}

## Tips

  - **{Tip 1}**
  - **{Tip 2}**
```
