# Analytics Dimensions

Analytics Dimensions provide a flexible, optional dimension for classifying and analyzing your IT budget. Unlike the formal structure of Companies, Departments, and Accounts, analytics dimensions let you create custom groupings that match your reporting needs.

## What are Analytics Dimensions for?

Analytics dimensions give you a lightweight way to tag spend items for custom reporting and analysis. They work independently of your formal accounting structure, letting you create ad-hoc classifications without restructuring your master data.

**Common use cases**:
  - **Classify by expense type**: "Infrastructure," "Application Development," "Cloud Hosting," "Consulting," "Licenses"
  - **Map to initiatives**: "Digital Transformation," "Security Enhancement," "Cloud Migration"
  - **Flexible departmental mapping**: Approximate attribution without strict allocation rules ("Operations," "R&D," "Customer Support")
  - **Technology stack views**: "SAP," "Microsoft 365," "AWS," "Salesforce"

**Key characteristics**:
  - **Optional**: Items without a category appear as "Unassigned" in reports
  - **Simple**: Each spend item can have zero or one category (no multi-tagging)
  - **Independent**: Categories don't affect accounting, allocations, or company structure

## Creating and managing categories

Go to **Master Data → Analytics** to view, create, or edit categories.

**Required fields**:
  - **Name**: The category label that appears in dropdowns and reports

**Optional fields**:
  - **Description**: Explain when to use this category

**Tip**: Start with 5-10 broad categories. Use consistent naming (all nouns, all gerunds, etc.) for easier scanning.

## Status and Disabled date

Use the **Disabled date** to retire a category without deleting it.

  - After the Disabled date, the category no longer appears in selection lists for new items
  - Existing items keep their assignment; reports show historical data
  - **Prefer disabling over deleting**: Deletion requires no spend items reference the category

## Tagging spend items

When creating or editing OPEX or CAPEX items:
  1. Find the **Analytics Category** field in the Overview tab
  2. Select a category from the dropdown (or leave blank for "Unassigned")
  3. Save the item

You can change or remove the category at any time. The category applies to the entire item across all years.

## The Analytics Report

The **Analytics Report** (**Reports → Analytics**) visualizes budget distribution across categories.

**Report features**:
  - **Year range**: Single year (pie or bar chart) or multi-year (line chart)
  - **Metric selection**: Budget, OPEX, CAPEX, allocated costs, or various KPIs
  - **Chart type** (single year): Toggle between pie and horizontal bar
  - **Category exclusion**: Filter out specific categories to focus on a subset

**Report outputs**:
  - Visual chart showing budget distribution
  - Summary table with totals by category and year
  - Export to CSV (table), PNG (chart) or PDF (full report)

**Example**: To see 2024 budget distribution by expense type, select year 2024, metric "Budget," and view the pie chart showing percentage shares and exact amounts.

## CSV import and export

**Export**:
  - Click **Export** from **Master Data → Analytics**
  - Format: semicolon-separated (`;`), UTF-8 encoding
  - Columns: Name, Description, Status, Disabled date

**Import**:
  - Required column: `name`
  - Optional: `description`, `status`, `disabled_at`
  - Matching by category name (case-sensitive): exists = update, new = insert

**Importing spend items**: Include an `analytics_category` column with the category name when importing OPEX/CAPEX via CSV.

## Tips

  - **Keep it simple**: 5-10 broad categories work better than dozens of granular tags
  - **Document with descriptions**: Help teammates use categories consistently
  - **Don't force it**: Leave items "Unassigned" rather than creating vague catch-alls
  - **Disable, don't delete**: Preserve historical reporting consistency
  - **Use reports to refine**: Run the Analytics Report to verify your categories reveal useful insights

## Common scenarios

### Scenario 1: Classifying costs by expense type

Create categories like "Infrastructure," "Cloud Hosting," "Consulting," "Licenses." Tag items accordingly, then view the Analytics Report to see budget breakdown (e.g., 35% Cloud, 25% Consulting, 20% Licenses).

### Scenario 2: Tracking strategic initiatives

Create categories for initiatives like "Cloud Migration," "Security Enhancement." Tag relevant items, then use a multi-year Analytics Report to track initiative spending trends over time.

### Scenario 3: Refining categories over time

Split a broad "Infrastructure" category into "On-premise Infrastructure" and "Cloud Infrastructure" by creating new categories, disabling the old one, and re-tagging existing items. Historical reports still show the original category for past periods.

## Frequently asked questions

**Q: Can I assign multiple analytics dimensions to one item?**
A: No. Each item has zero or one category. For multi-dimensional tagging, consider combining categories or using Departments with Allocations.

**Q: Do analytics dimensions affect allocations or accounting?**
A: No. They're purely for reporting and don't influence cost allocations or accounting.

**Q: What happens if I delete a category used by spend items?**
A: You can't. Remove or reassign the category from all items first. Disabling is safer and preserves history.

**Q: How many categories should I create?**
A: Start with 5-10. More than 20 usually indicates over-engineering.

**Q: What's the difference between analytics dimensions and departments?**
A: **Departments** are formal organizational units with precise allocation drivers. **Analytics dimensions** are informal, optional tags for flexible reporting without allocation overhead.

**Q: Why do some items show "Unassigned"?**
A: Items without an analytics dimension appear as "Unassigned." This is normal—categories are optional.
