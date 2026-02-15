# Budget Management Overview

The Budget Management Dashboard is the home page after signing in. It provides a quick overview of your current budget status and actionable shortcuts across a responsive tile layout.

## Layout

The dashboard displays tiles in a responsive grid: three columns on desktop, two on tablet, and one on mobile. Each tile has an icon header and a **View** button to navigate to the full page.

## Tiles

### OPEX Snapshot
  - Small table with three rows: last year (Y-1), current year (Y), and next year (Y+1)
  - Columns appear only when there is data (Budget, Revision, Follow-up, Landing)
  - Numbers are rounded to the nearest thousand and shown with a "k" suffix (e.g., `7 846k`)
  - Click **View** to open the OPEX list

### CAPEX Snapshot
  - Same layout and formatting as OPEX
  - Click **View** to open the CAPEX list

### My Tasks
  - Shows how many tasks are assigned to you (excluding "done")
  - Lists the 5 tasks with the closest due dates (overdue included). Tasks without a due date are not shown
  - Click **View** to open the Tasks page

### Next Renewals
  - Shows the next 5 contract renewal deadlines (future dates only)
  - Click **View** to open the Contracts page

### Data Hygiene (OPEX)
  - Quick counts to help clean your data:
    - Items without IT owner
    - Items without Business owner
    - Items without a Paying Company
    - CoA mismatches (the selected account doesn't belong to the paying company's chart of accounts)
  - Click any count chip to navigate to a filtered OPEX list

### Quick Actions
  - New OPEX and New CAPEX buttons (visible if you have permission)
  - Recent OPEX updates (last 5 items changed)

### Top OPEX (Y)
  - The largest OPEX items for the current year
  - Amounts rounded to thousands with a "k" suffix
  - Click **View** to open the Top OPEX report

### Top Increases (Y vs Y-1)
  - Largest increases in spend compared to last year
  - Amounts rounded to thousands with a "k" suffix
  - Click **View** to open the OPEX Delta report

## Tips

- All numbers on the Dashboard are rounded to thousands for compact display. Open the OPEX/CAPEX lists or Reports for exact values.
- Some actions (like creating new OPEX/CAPEX) may be hidden if you don't have the right role.
