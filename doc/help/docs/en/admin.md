# Administration

The Admin section provides access to user management, role configuration, billing, and authentication settings. These pages are typically restricted to administrators.

## Where to find it

Navigate to **Admin** from the main menu to access the administration hub.

**Permissions**: Different admin pages require different permissions:
- Companies, Departments, Suppliers, Accounts: `{resource}:reader` to view
- Users & Access: `users:reader` to view, `users:admin` to manage
- Roles: `users:reader` to view, `users:admin` to edit
- Billing: Requires billing admin role
- Authentication: Requires `users:admin`

---

## Admin Hub

The Admin landing page provides quick access to all administrative functions:

| Card | Description | Required Permission |
|------|-------------|---------------------|
| **Companies** | Manage companies and year metrics | `companies:reader` |
| **Departments** | Manage departments and headcount | `departments:reader` |
| **Suppliers** | Manage suppliers and contacts | `suppliers:reader` |
| **Accounts** | Manage accounting codes | `accounts:reader` |
| **Users & Access** | Assign seats and roles | `users:reader` |
| **Roles** | Define role permissions | `users:reader` |
| **Billing** | Plan, seats and invoices | Billing admin |

---

## Users & Access

Manage who can access KANAP and what they can do.

### The Users Grid

**Default columns**:
- **Last Name** / **First Name**: User's name
- **Email Address**: Login email address
- **Job Title**: Their role in the organization
- **Role**: Primary assigned role
- **Company** / **Department**: User's organizational assignment

**Additional columns** (via column chooser):
- **Business Phone** / **Mobile Phone**: Contact numbers
- **MFA Enabled**: Whether multi-factor authentication is active
- **Created**: When the user was created

### User Management Actions

| Action | Description | Permission |
|--------|-------------|------------|
| **New** | Create a new user | `users:member` |
| **Edit** | Modify user details (click any row) | `users:member` |
| **Import CSV** | Bulk import users | `users:admin` |
| **Export CSV** | Export user list | `users:admin` |
| **Invite** | Send login invitations to selected users | `users:admin` |
| **Delete** | Remove selected users permanently | `users:admin` |

### Creating a User

1. Click **New**
2. Fill in required fields:
   - **Email**: Login email address (must be unique)
3. Optional fields:
   - **First Name** / **Last Name**: User's name
   - **Job Title**: Their role in the organization
   - **Business Phone** / **Mobile Phone**: Contact numbers
   - **Roles**: Assign one or more roles (determines permissions)
   - **Company** / **Department**: Organizational assignment
   - **Enabled**: Whether the user can log in (uses a seat)
4. Click **Save** or **Save and Invite** to send login email

### Multi-Role Assignment

Users can be assigned multiple roles. Their effective permissions are the combination of all assigned roles—if any role grants access to a resource, the user has that access.

### Seat Management

Users consume **seats** based on your subscription plan:
- **Enabled users**: Count against your seat limit
- **Disabled users**: Don't consume seats
- The seat counter in the toolbar shows current usage (e.g., "Seats 5/10")
- Toggle the **Enabled** switch when editing a user to manage seat allocation

### SSO-Managed Users

When Microsoft Entra ID (SSO) is connected, user profile fields (name, job title, phone) are synced from Entra on login and cannot be edited in KANAP. You can still manage roles and organizational assignments.

---

## Roles

Define what each role can do across KANAP.

### How Roles Work

Each role has permission levels for different resources:
- **None**: No access to this resource
- **Reader**: View only
- **Contributor**: View and edit existing items, add comments and attachments, but cannot create new top-level items (currently used for portfolio projects)
- **Member**: View, create, and edit
- **Admin**: Full access including delete

### Permission Groups

Resources are organized into groups for easier management:

**Budget & Finance**
| Resource | What it controls |
|----------|------------------|
| `opex` | Operating Expenses |
| `capex` | Capital Expenses |
| `budget_ops` | Budget Operations tools |
| `contracts` | Vendor contracts |
| `analytics` | Analytics categories |
| `reporting` | Reports access |

**Portfolio Management**
| Resource | What it controls |
|----------|------------------|
| `portfolio_requests` | Portfolio requests |
| `portfolio_projects` | Portfolio projects |
| `portfolio_planning` | Portfolio planning |
| `portfolio_reports` | Portfolio reports |
| `portfolio_settings` | Portfolio settings |

**IT Operations**
| Resource | What it controls |
|----------|------------------|
| `applications` | Apps & Services |
| `infrastructure` | Servers and infrastructure |
| `locations` | Location master data |
| `settings` | Application settings |

**Master Data**
| Resource | What it controls |
|----------|------------------|
| `companies` | Company master data |
| `departments` | Department master data |
| `suppliers` | Supplier master data |
| `contacts` | Contact directory |
| `accounts` | Chart of accounts |

**Tasks**
| Resource | What it controls |
|----------|------------------|
| `tasks` | Task management |

**Administration**
| Resource | What it controls |
|----------|------------------|
| `users` | User and role management |
| `billing` | Billing and subscription |

### Role Types

Roles are categorized by how they can be modified:

| Badge | Description |
|-------|-------------|
| **System** | Cannot be modified. Administrator has full access; Contact is for directory entries only. |
| **Built-in** | Pre-configured roles providing standard access patterns. Cannot be modified directly—use **Duplicate** to create a customizable copy. |
| _(no badge)_ | Custom roles you create. Fully editable. |

### Built-in Roles

KANAP ships with pre-configured roles organized by functional area:

**Budget**: Budget Administrator, Budget Member, Budget Reader
**Portfolio**: Portfolio Administrator, Portfolio Member, Portfolio Reader, **Business Contributor**
**IT Operations**: IT Operations Administrator, IT Operations Member, IT Operations Reader
**Master Data**: Master Data Administrator, Master Data Member, Master Data Reader
**Tasks**: Tasks Administrator, Tasks Member, Tasks Reader

#### The Business Contributor Role

The **Business Contributor** role is designed for business stakeholders who participate in the portfolio process without full project management privileges. A Business Contributor can:

- **Submit and manage portfolio requests** (full member access to requests)
- **Edit existing projects** — update fields, add comments, upload attachments, manage phases, milestones, dependencies, and time entries
- **Create and work on project tasks** — add tasks to projects, log time, and post comments
- **View users, companies, departments, and contacts** for dropdown selections

A Business Contributor **cannot**:
- Create new projects (requires Member level on portfolio projects)
- Convert requests into projects (requires Member level)
- Import/export CSV (requires Admin level)

This role bridges the gap between read-only access (Reader) and full project management (Member), letting business users actively contribute without the ability to create new projects.

### The Contact Role

The **Contact** role is a special system role for users who appear in dropdown lists but don't need to log in. Common uses:

- Requestors or sponsors who only need to be referenced, not active users
- External stakeholders listed for tracking purposes
- Placeholder entries for organizational structure

**Contact users:**
- Cannot log in to KANAP
- Do not consume subscription seats
- Do not receive email notifications (even if assigned to projects/tasks)
- Can be selected in user dropdowns (e.g., as project sponsor)

If someone with the Contact role needs to actively use KANAP, change their role to a regular role (e.g., Viewer, Member) and invite them.

### Managing Roles

The Roles page has a two-panel layout:
- **Left panel**: List of all roles with badges indicating type
- **Right panel**: Details and permissions for the selected role

**Actions**:
- **New Role**: Create a custom role from scratch
- **Duplicate**: Copy an existing role (including built-in roles) as a starting point
- **Delete**: Remove a custom role (only if no users are assigned)
- **Save Details**: Update the role name and description
- **Save Permissions**: Apply permission changes

### Creating a Custom Role

1. Click **New Role**
2. Enter a name and description
3. Click **Create**
4. Set permission levels for each resource group
5. Click **Save Permissions**

**Tip**: Start by duplicating a built-in role that's close to what you need, then adjust permissions.

---

## Billing

Manage your subscription, seats, and invoices.

### Subscription Overview

View your current plan:
- **Plan name**: Your subscription tier
- **Status**: Active, Trialing, Past Due, etc.
- **Seats**: Used vs. available seats
- **Billing period**: Current billing cycle dates

### Billing Contact

Update the contact information used for invoices:
- Name and company
- Email and phone
- Billing address
- VAT number (if applicable)

### Invoices

View invoice history:
- Invoice date and number
- Amount and currency
- Status (Paid, Pending, etc.)
- Download PDF invoices

---

## Authentication

Configure single sign-on (SSO) for your organization.

### Microsoft Entra ID (Azure AD)

Connect KANAP to your Microsoft Entra ID tenant for SSO:

1. Click **Connect to Microsoft Entra**
2. Sign in with a Microsoft admin account
3. Grant the requested permissions
4. Users can now sign in with their Microsoft accounts

### SSO Status

- **Connected**: Shows your Entra tenant ID
- **Not connected**: Local authentication only

### Actions

| Action | Description |
|--------|-------------|
| **Connect** | Start the Microsoft Entra setup flow |
| **Test Sign-In** | Test SSO with your Microsoft account |
| **Disconnect** | Remove SSO configuration (reverts to local auth) |

---

## Settings

The Settings page lets you manage your personal profile and notification preferences. Access it from the user menu (top-right avatar) or navigate to `/settings`.

The page has two tabs, accessible via URL:
- `/settings/profile` (default) — Profile tab
- `/settings/notifications` — Notifications tab

### Profile

Edit your personal information:
- **First Name** / **Last Name**
- **Job Title**
- **Business Phone** / **Mobile Phone**

If your organization uses Microsoft Entra ID (SSO), some fields may be synced from Entra and cannot be edited in KANAP.

### Notifications

Control which email notifications you receive.

**Master toggle**: Turn all email notifications on or off with the **Email Notifications** switch at the top.

**Workspace categories** (each with its own enable/disable toggle):

| Workspace | Notification categories |
|-----------|------------------------|
| **Portfolio** | Status changes, when added to a team, team changes on items you lead, comments |
| **Tasks** | Assignment (as assignee, requestor, or viewer), status changes, comments |
| **Budget** | Expiration warnings, status changes, comments |

**Weekly Review Email**: Receive a periodic summary of your activity and upcoming items. Configure:
- **Day of the week** (e.g., Monday)
- **Time** (hour in your timezone)
- **Timezone**

Use the **Preview email** button to send yourself a test email and verify the format.

All changes are saved automatically as you toggle switches or change selections.

---

## Tips

  - **Duplicate built-in roles**: Instead of creating roles from scratch, duplicate a built-in role and adjust permissions. This saves time and ensures you don't miss important resources.
  - **Use multi-role for flexibility**: Assign users multiple roles to combine permissions—for example, a "Finance Reader" role plus a "Project Manager" role.
  - **Use SSO**: If you have Microsoft 365, connect Entra ID for easier user management and automatic profile sync.
  - **Monitor seats**: Keep track of seat usage in the toolbar to avoid hitting limits.
  - **Disable don't delete**: When someone leaves, disable their account to preserve audit history.
  - **Review permissions regularly**: Audit role permissions periodically to maintain least-privilege access.
