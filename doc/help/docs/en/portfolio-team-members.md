# Contributors

Contributors lets you define skills, team assignments, project availability, and classification defaults for people who work on portfolio projects. This information helps with resource planning and ensures you have the right expertise for upcoming work.

## Getting started

Navigate to **Portfolio > Contributors** to see configured contributors grouped by team. Click **Add Contributor** to add someone from your user list.

**To add a contributor**:
1. Click **Add Contributor**
2. Search for and select a user from the dropdown
3. Click **Add** to create their profile
4. Configure their team, availability, skills, and defaults in the workspace

**Tip**: Contributors are separate from user accounts. Adding someone as a contributor doesn't change their login access -- it just lets you track their team membership, skills, availability, and classification defaults for project planning.

---

## Where to find it

- Workspace: **Portfolio**
- Path: **Portfolio > Contributors**
- Self-service path: **Settings > Profile > Contributor Settings** (opens your own contributor profile)
- Permissions:
  - View: `portfolio_settings:reader`
  - Add or edit contributors: `portfolio_settings:member`
  - Remove contributors: `portfolio_settings:admin`
  - Edit your own profile: any portfolio-level reader permission (e.g. `tasks:reader`, `portfolio_projects:reader`, `portfolio_settings:reader`)

If you don't see Contributors in the menu, ask your administrator to grant you the appropriate permissions.

---

## Working with the list

Contributors are displayed as cards grouped by team.

**Each contributor card shows**:
- **Name** (or email if no display name is set)
- **Skills count**: Number of skills configured (e.g. "3 skills")
- **Availability**: Days per month available for projects (e.g. "5d/mo")
- **Avg project effort**: Average monthly project time from logged entries over the last 6 months, when data is available

**Filtering**:
- Use the **Filter by Team** dropdown to show only contributors from a specific team
- Select **Unassigned** to see contributors who haven't been assigned to a team yet
- Select **All Teams** to see everyone

**Team groups**:
- Each team is displayed as a collapsible card with a member count badge
- Click the team header to expand or collapse its members
- Teams are sorted alphabetically; **Unassigned** always appears last

Click any contributor card to open their workspace.

---

## The Contributor workspace

Click a contributor card to open their workspace. It has four tabs: **General**, **Skills**, **Time Logged**, and **Defaults**.

### General

Configure team assignment, availability, view time statistics, and add notes.

**Team**
Use the dropdown to assign this contributor to a team. Teams are organizational groups configured in Portfolio Settings. This assignment determines how contributors are grouped on the Contributors page. This field is only visible when editing another contributor's profile (not your own).

**Project Availability (days per month)**
Use the slider to set how many days per month this person can work on portfolio projects. Range is 0 -- 20 days, with 0.5-day increments. Default is 5 days.

**Time Statistics**
Read-only summary of logged time for this contributor. Requires `portfolio_settings:reader` to see.

- **Average monthly project effort (last 6 months)**: Shown in man-days (hours / 8)
- **Monthly Effort (12 months)**: Line chart showing **Total**, **Project**, and **Other** time
  - **Project** = project overhead time + time logged to project tasks
  - **Other** = time logged to non-project tasks
  - Months with no data display as gaps in the chart

**Notes**
Free-text field for any additional information about this contributor -- certifications, preferences, constraints, or other relevant details.

---

### Skills

Track what this contributor knows and how proficient they are.

**Adding skills**:
1. Use the **Add Skill** dropdown to search for a skill
2. Skills are grouped by category
3. Select a skill to add it to the contributor's profile
4. The skill appears with a default proficiency of 2 ("Can execute with support")

**Proficiency levels**:
Each skill has a proficiency rating from 0 -- 4:

| Level | Label | Description |
|-------|-------|-------------|
| 0 | No knowledge | Not familiar with this skill |
| 1 | Basic / Theoretical | Understands concepts but hasn't applied them |
| 2 | Can execute with support | Can do the work with guidance |
| 3 | Autonomous | Can work independently |
| 4 | Expert | Deep expertise, can mentor others |

Use the slider next to each skill to adjust the proficiency level.

**Removing skills**:
Click the delete icon next to any skill to remove it from the contributor's profile.

**Skill categories**:
Skills are organized into collapsible categories. Click a category header to expand or collapse it. Categories that contain selected skills are auto-expanded when you open the tab.

---

### Time Logged

View and manage all time entries for this contributor in one place. This tab is only visible if you have `portfolio_settings:reader` or higher.

The table consolidates time logged from both project overhead entries and task time entries, giving you a complete picture of how the contributor spends their time.

**Columns**:
- **Date**: When the time was logged
- **Source**: Where the time was logged -- either a task name or project name
- **Category**: Whether the entry is classified as **IT** or **Business**, shown as a color-coded label
- **Time**: Duration in hours or days (e.g. "4h", "1d 2h")
- **Notes**: Any notes attached to the entry

**Editing entries**:
Click the **edit icon** next to a time entry to open the edit dialog. The dialog depends on the entry type:
- **Task entries** open the task time-logging dialog, where you can adjust the hours, date, category, and notes
- **Project entries** open the project time-logging dialog, where you can adjust the hours, category, user, and notes

**Deleting entries**:
Click the **delete icon** next to a time entry to remove it. You will be asked to confirm before the entry is deleted. Deleting an entry also updates the contributor's time statistics on the **General** tab.

**Permissions for time entry actions**:
- To see the **Actions** column, you need at least `tasks:member` or `portfolio_projects:contributor`
- Non-admin users can only edit or delete entries they created or are assigned to
- Users with `tasks:admin` can edit or delete any standalone task entry
- Users with `portfolio_projects:admin` can edit or delete any project task entry or project overhead entry

---

### Defaults

Set classification defaults that pre-fill new tasks, requests, and projects when classification fields are still empty. This saves time for contributors who consistently work in the same area.

**What you can set**:
- **Source**: The default source classification
- **Category**: The default category classification
- **Stream**: The default stream classification (only available once a **Category** is selected; filtered to streams belonging to that category)
- **Company**: The default company

When a contributor creates a new task, request, or project, these defaults are used to pre-populate the classification fields automatically. Changing the **Category** clears the **Stream** if the current stream does not belong to the newly selected category.

**Tip**: You can also reach your own defaults from **Settings > Profile**, which links directly to the **Defaults** tab of your contributor profile.

---

## Actions

From the workspace header:
- **Save**: Save changes to team, availability, notes, skills, or defaults
- **Delete**: Remove this contributor configuration (doesn't affect the user account). Only available when editing another contributor's profile with `portfolio_settings:admin`.
- **Back arrow**: Return to the contributors list, or to **Settings** if you opened your own profile

---

## Your own contributor profile

Every user with at least one portfolio-level reader permission can access their own contributor profile at **Portfolio > Contributors > me** or from **Settings > Profile > Contributor Settings**.

When editing your own profile:
- You can update your **availability**, **skills**, **notes**, and **classification defaults**
- You cannot change your own **team assignment** (only a portfolio settings member can do that)
- You cannot delete your own contributor record

If you don't have a contributor record yet, opening the self-service page creates one automatically.

---

## Teams

Contributors can be assigned to organizational teams for better organization. Teams are configured in **Portfolio > Settings > Teams**.

**Default teams** (can be customized):
- Infrastructure
- Business Applications
- Engineering Applications
- Service Desk
- Master Data
- Cybersecurity

**Managing teams**:
- Go to **Portfolio > Settings** and click the **Teams** tab
- Add, edit, or disable teams
- Use **Seed Defaults** to populate with standard teams
- Teams with members assigned cannot be deleted

---

## Tips

- **Assign contributors to teams**: This helps organize the Contributors page and makes it easier to find specific people.
- **Set realistic availability**: Account for meetings, BAU work, and holidays when setting days per month. Most people have less project time than you'd expect.
- **Use proficiency honestly**: A team full of "experts" isn't useful for planning. Be realistic about skill levels to make better resource decisions.
- **Keep skills current**: Review contributor skills periodically, especially after training or new project experience.
- **Set up your classification defaults early**: If you always work on the same category and stream, configuring defaults saves you from selecting them every time you create a task or request.
