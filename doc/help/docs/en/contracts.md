# Contracts

Contracts document your vendor agreements—software licenses, maintenance contracts, SaaS subscriptions, and service agreements. Track key dates, costs, renewal terms, and link contracts to your OPEX items for complete cost visibility.

## Getting started

Navigate to **Budget Management → Contracts** to see your contract registry. Click **New** to create your first entry.

**Required fields**:
  - **Name**: A recognizable contract name
  - **Supplier**: The vendor providing the service
  - **Start Date**: When the contract begins
  - **Duration**: Contract length in months

**Strongly recommended**:
  - **Company**: Which company signed the contract
  - **Yearly Amount**: The annual contract value
  - **Currency**: Contract currency
  - **Auto-renewal**: Whether the contract renews automatically
  - **Notice Period**: How many months notice required to cancel

**Tip**: The system automatically calculates the end date and cancellation deadline based on your start date, duration, and notice period.

---

## Working with the list

The Contracts grid provides an overview of all your vendor agreements.

**Default columns**:
  - **Contract**: Contract name (click to open workspace)
  - **Supplier**: The vendor
  - **Company**: The contracting entity
  - **Start**: Contract start date
  - **Duration (m)**: Length in months
  - **Auto-renewal**: Whether the contract auto-renews
  - **Notice (m)**: Notice period in months
  - **End**: Calculated end date
  - **Cancel by**: Cancellation deadline (end date minus notice period)
  - **Yearly amount**: Annual contract value
  - **Curr**: Currency
  - **Billing**: Billing frequency (Monthly, Quarterly, Annual, Other)
  - **Linked OPEX**: Number of linked OPEX items

**Additional columns** (via column chooser):
  - **Task**: Latest task for this contract

**Default sort**: By cancellation deadline (ascending), so contracts requiring action soon appear first.

**Actions**:
  - **New**: Create a new contract (requires `contracts:manager`)
  - **Import CSV**: Bulk import contracts (requires `contracts:admin`)
  - **Export CSV**: Export to CSV (requires `contracts:admin`)

---

## The Contracts workspace

Click any row to open the workspace. It has four tabs:

### Overview

The Overview tab captures the contract's identity and key terms.

**What you can edit**:
  - **Name**: Contract name
  - **Supplier**: Link to a supplier from master data
  - **Company**: Which company is party to this contract
  - **Owner**: The person responsible for managing this contract
  - **Start Date**: When the contract begins
  - **Duration (months)**: Contract length
  - **Auto-renewal**: Whether the contract automatically renews
  - **Notice Period (months)**: Cancellation notice required
  - **Notes**: Free-form notes

**Calculated fields** (read-only):
  - **End Date**: Start date + duration
  - **Cancellation Deadline**: End date - notice period

---

### Details

The Details tab captures financial and billing information.

**What you can edit**:
  - **Yearly Amount at Signature**: The annual contract value when signed
  - **Currency**: Contract currency
  - **Billing Frequency**: Monthly, Quarterly, Annual, or Other
  - **Payment Terms**: Net 30, Net 60, etc.
  - **Additional Details**: Any other contractual details

---

### Relations

The Relations tab links contracts to other entities.

**Available links**:
  - **OPEX Items**: Recurring costs associated with this contract
  - **Applications**: Applications covered by this contract
  - **URLs**: Links to external documents (contract PDFs, vendor portals)

**Tip**: Linking OPEX items to contracts gives you complete cost traceability—from budget line items to vendor agreements.

---

### Tasks

The Tasks tab manages action items for this contract (e.g., renewal reviews, price negotiations, compliance checks).

**Task list**:
  - Shows all tasks linked to this contract
  - Columns: Title, Status, Priority, Due Date, Actions
  - Click a task title to open the full task workspace
  - Default filter shows active tasks (hides done and cancelled)

**Filtering**:
  - Click the filter icon to show/hide filter controls
  - **Status filter**: All, Active (hides done/cancelled), or a specific status
  - Click the clear button to reset filters

**Creating a task**:
  - Click **Add Task** to open the task creation workspace
  - The task is automatically linked to this contract
  - Fill in the title, description, priority, assignee, and due date in the task workspace

**Deleting a task**:
  - Click the delete icon in the Actions column
  - Confirm the deletion in the dialog

**Note**: The Tasks tab is only available after the contract has been saved for the first time. If you don't have `contracts:manager` permission, the Add Task and Delete buttons are hidden.

---

## CSV import/export

Keep your contract registry in sync with external systems using CSV.

**Export**: Downloads all contracts with core fields and calculated dates.

**Import**:
- Use **Preflight** to validate before applying
- Match by contract name
- Supports creation and updates

**Notes**:
- Use **UTF-8 encoding** and **semicolons** as separators
- Calculated fields (End Date, Cancellation Deadline) are not imported—they're computed from Duration and Notice Period

---

## Tips

  - **Watch the Cancel by column**: Sort by cancellation deadline to see which contracts need attention soon.
  - **Link to OPEX early**: Connect contracts to OPEX items when creating them for complete cost tracking.
  - **Use tasks for renewals**: Create a task 3-6 months before cancellation deadline for renewal review.
  - **Track yearly amounts**: Even if billing is monthly, record the yearly amount for easier year-over-year comparison.
