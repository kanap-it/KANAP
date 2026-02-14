# Suppliers

Suppliers (also known as vendors) represent the companies you purchase software, services, and support from. Link suppliers to applications, contracts, and OPEX items to track vendor relationships across your IT portfolio.

## Getting started

Navigate to **Master Data → Suppliers** to see your vendor directory. Click **New** to create your first entry.

**Required fields**:
  - **Name**: The supplier/vendor name

**Optional but useful**:
  - **ERP Supplier ID**: Reference ID from your ERP or procurement system
  - **Notes**: Additional information about the vendor relationship

**Tip**: Create suppliers before adding applications or contracts—you'll be able to link them during creation.

---

## Working with the list

The Suppliers grid provides a directory of all your vendors.

**Default columns**:
  - **Name**: Supplier name (click to open workspace)
  - **ERP Supplier ID**: Reference ID from external systems
  - **Status**: Enabled or Disabled

**Additional columns** (via column chooser):
  - **Notes**: Additional information
  - **Created**: When the record was created

**Default sort**: By name (alphabetical).

**Status scope**: Use the Enabled/Disabled/All toggle to filter by status.

**Actions**:
  - **New**: Create a new supplier (requires `suppliers:manager`)
  - **Import CSV**: Bulk import suppliers (requires `suppliers:admin`)
  - **Export CSV**: Export to CSV (requires `suppliers:admin`)
  - **Delete Selected**: Remove selected suppliers (requires `suppliers:admin`)

---

## The Suppliers workspace

Click any row to open the workspace. It has two tabs:

### Overview

The Overview tab captures the supplier's identity.

**What you can edit**:
  - **Name**: Supplier/vendor name
  - **ERP Supplier ID**: Reference ID from your procurement or ERP system
  - **Status**: Enabled or Disabled
  - **Notes**: Free-form notes about the vendor

---

### Contacts

The Contacts tab shows all contacts linked to this supplier.

**What you'll see**:
- List of contacts associated with this supplier
- Each contact's name, job title, email, and phone numbers

**How it works**:
- Contacts are linked to suppliers via the Contact's "Supplier" field
- Add new contacts from the Contacts page, selecting this supplier
- Or use the quick-add button to create a contact directly

**Tip**: Keep at least one primary contact per supplier for easy vendor communication.

---

## Where suppliers are used

Suppliers are referenced throughout KANAP:

### Applications
In the Apps & Services workspace, the Overview tab has a **Vendor** field linking to suppliers.

### Contracts
Each contract has a **Supplier** field identifying the vendor party.

### OPEX Items
Recurring costs can be linked to suppliers for vendor spend analysis.

---

## CSV import/export

Manage suppliers in bulk using CSV.

**Export**: Downloads all suppliers with their details.

**Import**:
  - Use **Preflight** to validate before applying
  - Matched by supplier name
  - Can create new suppliers or update existing ones

**Required fields**: Name

**Optional fields**: ERP Supplier ID, Notes, Status

**Notes**:
  - Use **UTF-8 encoding** and **semicolons** as separators
  - Consider importing suppliers before importing applications or contracts that reference them

---

## Tips

  - **Be consistent with naming**: Use official vendor names (e.g., "Microsoft Corporation" not "MS" or "MSFT").
  - **Add ERP IDs**: If you have an ERP system, add the supplier ID for easy cross-reference.
  - **Disable don't delete**: When you stop working with a vendor, disable them to preserve historical data.
  - **Maintain contacts**: Keep the Contacts tab updated with current vendor representatives.
  - **Create before linking**: Add suppliers to master data before creating applications or contracts that reference them.
