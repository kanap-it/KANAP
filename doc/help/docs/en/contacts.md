# Contacts

Contacts document the people you work with—vendor account managers, support contacts, consultants, and external stakeholders. Link contacts to suppliers to build a vendor contact directory, and reference them from applications and locations for support information.

## Getting started

Navigate to **Master Data → Contacts** to see your contact directory. Click **New** to create your first entry.

**Required fields**:
  - **Email**: Contact's email address (used as unique identifier)

**Strongly recommended**:
  - **First Name** / **Last Name**: Contact's name
  - **Supplier**: Which vendor this contact works for

**Optional but useful**:
  - **Job Title**: Their role
  - **Phone** / **Mobile**: Contact numbers
  - **Country**: Location

**Tip**: Link contacts to suppliers first, then reference them from applications and locations for consistent support information.

---

## Working with the list

The Contacts grid provides a directory of all external contacts.

**Default columns**:
  - **Last Name** / **First Name**: Contact name (click to open workspace)
  - **Supplier**: The vendor they work for
  - **Email**: Email address
  - **Active**: Whether the contact is currently active

**Additional columns** (via column chooser):
  - **Job Title**: Their role
  - **Phone** / **Mobile**: Contact numbers
  - **Country**: Location
  - **Created**: When the record was created

**Default sort**: By last name (alphabetical).

**Actions**:
  - **New**: Create a new contact (requires `contacts:manager`)
  - **Import CSV**: Bulk import contacts (requires `contacts:admin`)
  - **Export CSV**: Export to CSV (requires `contacts:admin`)
  - **Delete Selected**: Remove selected contacts (requires `contacts:admin`)

---

## The Contacts workspace

Click any row to open the workspace. It has one tab:

### Overview

**What you can edit**:
  - **First Name** / **Last Name**: Contact's name
  - **Email**: Email address (required)
  - **Phone** / **Mobile**: Contact numbers
  - **Job Title**: Their role or position
  - **Supplier**: Link to a supplier from master data
  - **Country**: Location (ISO country code)
  - **Active**: Whether this contact is currently active
  - **Notes**: Free-form notes

---

## Where contacts are used

Contacts appear in several places throughout KANAP:

### Supplier Contacts
Each supplier has a Contacts tab showing all contacts linked to that vendor. You can create a new contact directly from the supplier workspace:
  1. Open the supplier workspace and go to the **Contacts** tab
  2. Click **Create** next to a contact role
  3. Fill in the contact details — the supplier and role are pre-filled
  4. After saving, you are returned to the supplier workspace automatically

### Application Support
In the Apps & Services workspace, the Technical & Support tab references contacts for support escalation.

### Location Contacts
Locations can have support contacts (facility managers, NOC contacts, etc.)

---

## CSV import/export

Manage contacts in bulk using CSV.

**Export**: Downloads all contacts with their details.

**Import**:
  - Use **Preflight** to validate before applying
  - Matched by email address
  - Can create new contacts or update existing ones

**Required fields**: Email

**Optional fields**: First Name, Last Name, Supplier Name, Job Title, Phone, Mobile, Country, Active

**Notes**:
  - Use **UTF-8 encoding** and **semicolons** as separators
  - Supplier is matched by name—ensure supplier exists before importing

---

## Tips

  - **Always set a supplier**: Linking contacts to suppliers makes them easier to find and manage.
  - **Use consistent naming**: Enter names in consistent format (e.g., always "FirstName LastName").
  - **Mark inactive contacts**: When someone leaves a vendor, mark them as inactive rather than deleting.
  - **Include job titles**: Job titles help identify the right contact for different needs (sales vs. support).
