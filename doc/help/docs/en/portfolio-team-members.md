# Contributors

Contributors lets you define skills, team assignments, and project availability for people who work on portfolio projects. This information helps with resource planning and ensures you have the right expertise for upcoming work.

## Getting started

Navigate to **Portfolio > Contributors** to see configured contributors grouped by team. Click **Add Contributor** to add someone from your user list.

**To add a contributor**:
1. Click **Add Contributor**
2. Search for and select a user from the dropdown
3. Click **Add** to create their profile
4. Configure their team, availability, and skills in the workspace

**Tip**: Contributors are separate from user accounts. Adding someone as a contributor doesn't change their login access—it just lets you track their team membership, skills, and availability for project planning.

---

## Where to find it

- Workspace: **Portfolio**
- Path: **Portfolio > Contributors**
- Permissions:
  - You need at least `portfolio_settings:reader` to view contributors
  - You need `portfolio_settings:member` to add or edit contributors
  - You need `portfolio_settings:admin` to remove contributors

If you don't see Contributors in the menu, ask your administrator to grant you the appropriate permissions.

---

## Working with the list

Contributors are displayed grouped by team, showing:
- **Team groups**: Contributors organized by their assigned team
- **Name** and email address
- **Skills count**: Number of skills configured
- **Availability**: Days per month available for projects
- **Avg project effort (last 6 months)**: Average monthly project time from logged entries (months with data only)

**Filtering**:
- Use the **Filter by Team** dropdown to show only contributors from a specific team
- Select "Unassigned" to see contributors who haven't been assigned to a team yet

Click any contributor card to open their workspace.

---

## The Contributor workspace

Click a contributor card to open their workspace. It has 3 tabs:

### General

Configure team assignment, availability, and notes.

**Team**
Use the dropdown to assign this contributor to a team. Teams are organizational groups configured in Portfolio Settings. This assignment determines how contributors are grouped on the Contributors page.

**Project Availability (days per month)**
Use the slider to set how many days per month this person can work on portfolio projects. Range is 0-20 days, with 0.5-day increments. Default is 5 days.

**Time Statistics**
Read-only summary of logged time for this contributor:
- **Average monthly project effort (last 6 months)**: Average of months with data, shown in man-days (hours ÷ 8).
- **Monthly Effort (12 months)**: Line chart showing **Total**, **Project**, and **Other** time.
  - **Project** = project overhead time + time logged to project tasks
  - **Other** = time logged to non-project tasks
  - Months are grouped by UTC month boundaries; missing months display as 0 in the chart
  - Entries without an assigned person (no user) are excluded

**Notes**
Free-text field for any additional information about this contributor—certifications, preferences, constraints, or other relevant details.

---

### Skills

Track what this contributor knows and how proficient they are.

**Adding skills**
1. Use the **Add Skill** dropdown to search for a skill
2. Skills are grouped by category
3. Select a skill to add it to the contributor's profile
4. The skill appears with a default proficiency of 2 ("Can execute with support")

**Proficiency levels**
Each skill has a proficiency rating from 0-4:

| Level | Label | Description |
|-------|-------|-------------|
| 0 | No knowledge | Not familiar with this skill |
| 1 | Basic / Theoretical | Understands concepts but hasn't applied them |
| 2 | Can execute with support | Can do the work with guidance |
| 3 | Autonomous | Can work independently |
| 4 | Expert | Deep expertise, can mentor others |

Use the slider next to each skill to adjust the proficiency level.

**Removing skills**
Click the delete icon next to any skill to remove it from the contributor's profile.

**Skill categories**
Skills are organized into collapsible categories. Click a category header to expand or collapse it.

---

### Time Logged

View and manage all time entries for this contributor in one place. This tab consolidates time logged from both project overhead entries and task time entries, giving you a complete picture of how the contributor spends their time.

**Viewing entries**
The table shows all time entries sorted by date, with the following columns:
- **Date**: When the time was logged
- **Source**: Where the time was logged—either a task name or project name
- **Category**: Whether the entry is classified as **IT** or **Business**, shown as a color-coded label
- **Time**: Duration in hours or days (e.g., "4h", "1d 2h")
- **Notes**: Any notes attached to the entry

If no entries exist yet, a message is displayed instead of the table.

**Editing entries**
Click the **edit icon** next to a time entry to open the edit dialog. The dialog that opens depends on the entry type:
- **Task entries** open the task time-logging dialog, where you can adjust the hours, date, category, and notes
- **Project entries** open the project time-logging dialog, where you can adjust the hours, category, user, and notes

**Deleting entries**
Click the **delete icon** next to a time entry to remove it. You will be asked to confirm before the entry is deleted. Deleting an entry also updates the contributor's time statistics on the **General** tab.

**Permissions for time entry actions**
- To see the **Actions** column, you need at least `tasks:member` or `portfolio_projects:contributor`
- Non-admin users can only edit or delete entries they created or are assigned to
- Users with `tasks:admin` can edit or delete any standalone task entry
- Users with `portfolio_projects:admin` can edit or delete any project task entry or project overhead entry

---

## Actions

From the workspace header:
- **Save**: Save changes to team, availability, notes, or skills
- **Delete**: Remove this contributor configuration (doesn't affect the user account)
- **Back arrow**: Return to the contributors list

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
- Use "Seed Defaults" to populate with standard teams
- Teams with members assigned cannot be deleted

---

## Tips

- **Assign contributors to teams**: This helps organize the Contributors page and makes it easier to find specific people.
- **Set realistic availability**: Account for meetings, BAU work, and holidays when setting days per month. Most people have less project time than you'd expect.
- **Use proficiency honestly**: A team full of "experts" isn't useful for planning. Be realistic about skill levels to make better resource decisions.
- **Keep skills current**: Review contributor skills periodically, especially after training or new project experience.
