# Reporting

The Reports section provides prebuilt reports for analyzing your budget data, cost allocations, and spending trends. Each report includes interactive tables and charts with export options.

## Where to find it

Navigate to **Reporting** from the main menu to access the reports hub.

**Permissions**: You need at least `reporting:reader` to access reports.

---

## Reports Hub

The Reports landing page provides quick access to all available reports:

| Report | Description |
|--------|-------------|
| **Global Chargeback** | Company-level allocation totals and KPIs |
| **Company Chargeback** | Single company with department breakdown |
| **Top OPEX** | Largest OPEX items for a year |
| **Top OPEX Increase/Decrease** | Biggest year-over-year changes |
| **Budget Trend (OPEX)** | Compare OPEX metrics across years |
| **Budget Trend (CAPEX)** | Compare CAPEX metrics across years |
| **Budget Column Comparison** | Compare up to 10 year+column combinations |
| **Consolidation Accounts** | Budget grouped by consolidation account |
| **Analytics Categories** | Budget grouped by analytics category |

---

## Global Chargeback Report

View cost allocations across all companies with summary KPIs.

### Controls

- **Year**: Select the fiscal year
- **Metric**: Budget, Revision, Follow-up, or Landing
- **Show KPIs**: Toggle additional metrics display

### What you'll see

**Summary table**:
- Company name
- Allocated amount
- Paid amount (if applicable)
- Net amount
- Headcount
- Cost per user

**KPI cards** (when enabled):
- Total allocated
- Total headcount
- Average cost per user
- Top allocating company

**Chart**: Bar or pie chart of allocations by company

### Export

Click **Export CSV** to download the data.

---

## Company Chargeback Report

Drill down into a single company's cost allocations.

### Controls

- **Year**: Select the fiscal year
- **Company**: Select which company to analyze
- **Metric**: Budget, Revision, Follow-up, or Landing

### What you'll see

**Department breakdown**:
- Department name
- Allocated amount
- Headcount
- Cost per user

**OPEX items**: Detailed list of allocated costs

**Chart**: Department-level allocation visualization

---

## Top OPEX Report

Identify your largest recurring costs.

### Controls

- **Year**: Select the fiscal year
- **Metric**: Which column to analyze (Budget, Revision, etc.)
- **Top N**: How many items to show (default: 10)
- **Exclude items**: Optionally exclude specific items
- **Exclude accounts**: Optionally exclude by account category
- **Chart type**: Pie or bar chart

### What you'll see

**Table columns**:
- Item name
- Value (in selected metric)
- Percentage of total

**Chart**: Visual representation of top items

### Use case

Use this report to identify:
- Where most of your IT budget goes
- Candidates for cost optimization
- Items that need closer management attention

---

## Top OPEX Increase/Decrease Report

Identify the biggest year-over-year changes.

### Controls

- **Source**: Year and metric to compare from
- **Destination**: Year and metric to compare to
- **Direction**: Show increases, decreases, or both
- **Top N**: How many items to show
- **Exclude items**: Optionally exclude specific items
- **Chart type**: Pie or bar chart

### What you'll see

**Table columns**:
- Item name
- Previous value
- Current value
- Delta (absolute change)
- Percentage change
- Direction indicator

**Chart**: Visual representation of changes

### Use case

Use this report for:
- Identifying cost overruns
- Spotting savings opportunities
- Validating budget assumptions
- Explaining year-over-year variance

---

## Budget Trend Reports

Compare metrics across multiple years to spot trends.

### OPEX Trend

Shows OPEX totals across years:
- Select which years to include
- Choose metrics to compare
- Line chart shows the trend

### CAPEX Trend

Shows CAPEX totals across years:
- Select which years to include
- Choose metrics to compare
- Line chart shows the trend

### Use case

Use trend reports for:
- Multi-year budget presentations
- Identifying spending patterns
- Forecasting future budgets

---

## Budget Column Comparison Report

Flexibly compare up to 10 year+column combinations.

### Controls

- **Add column**: Select year and metric to add
- **Remove column**: Click X to remove a column
- Maximum of 10 columns

### What you'll see

**Table**: Side-by-side comparison of selected columns
**Chart**: Visual comparison (bar or line)

### Use case

Use this for custom comparisons:
- "Budget 2024 vs Landing 2024 vs Budget 2025"
- Cross-year metric comparisons
- Audit trail analysis

---

## Consolidation Accounts Report

View budget data grouped by consolidation account.

### Controls

- **Year**: Select the fiscal year
- **Metric**: Which column to analyze
- **Chart type**: Pie chart or line chart

### What you'll see

**Table**: Totals by consolidation account
**Chart**: Visual breakdown by account category

### Use case

Use this for:
- High-level budget categorization
- Financial reporting alignment
- Account-based analysis

---

## Analytics Categories Report

View budget data grouped by analytics category.

### Controls

- **Year**: Select the fiscal year
- **Metric**: Which column to analyze
- **Chart type**: Pie chart or line chart

### What you'll see

**Table**: Totals by analytics category
**Chart**: Visual breakdown by category

### Use case

Use this for:
- Custom categorization analysis
- Strategic spending breakdown
- Category-based reporting

---

## Common Features

All reports share these features:

### Export Options

- **Export CSV**: Download table data as CSV
- **Export Chart**: Download chart as image

### Chart Types

Most reports support multiple chart types:
- **Pie chart**: Good for showing proportions
- **Bar chart**: Good for comparisons
- **Line chart**: Good for trends over time

### Filtering

Many reports allow:
- Excluding specific items
- Excluding by account category
- Filtering by year and metric

---

## Tips

  - **Start with Global Chargeback**: Get the big picture before drilling down.
  - **Use Top OPEX for quick wins**: Identify the largest costs for optimization opportunities.
  - **Compare Budget vs Landing**: Use column comparison to see forecast accuracy.
  - **Export for presentations**: Charts and tables export cleanly for slides.
  - **Save common views**: Bookmark specific report configurations for quick access.
