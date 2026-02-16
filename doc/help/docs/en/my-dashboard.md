# Dashboard

The Dashboard is your personal landing page in KANAP. It gives you a quick overview of your tasks, projects, time logged, and recent activity — all in one place. You can customise which tiles appear and how they behave.

## Where to find it

- Click the **KANAP** logo or navigate to `/`
- This is the default page after login for non-admin users.
- No special permissions are required to view the dashboard itself, but individual tiles depend on your access rights.

## Quick actions

At the top of the dashboard you'll find shortcut buttons for common actions:

- **Create Task** — opens a quick dialog to create a task without leaving the dashboard. You provide a title and optionally link it to a project. Requires `tasks:member` or higher.
- **Log Time** — opens a quick dialog to log hours against a project. Choose a project, enter the hours, pick a category (**IT** or **Business**), and optionally add notes. Requires `portfolio_projects:member` or higher.
- **Settings** (gear icon) — opens the dashboard settings to choose which tiles to show.

## Dashboard tiles

The dashboard displays a grid of tiles, each showing a different aspect of your work. Tiles are laid out in a responsive grid (three columns on large screens, two on medium, one on small).

### My Tasks

Shows your assigned tasks grouped by urgency:

- **Overdue** — tasks past their due date (highlighted in red)
- **Due This Week** — tasks due within the next 7 days
- **Later** — everything else

Each task shows its title, linked project (if any), due date, and priority badge when the priority is above normal. Click a task to open its workspace.

**Settings**: Maximum number of items (3–20), toggle overdue section on or off.

**Requires**: `tasks:reader`

---

### Projects I Lead

Lists projects where you hold a leadership role (IT Lead, Business Lead, IT Sponsor, or Business Sponsor). Each project shows:

- Your role
- Current project status (colour-coded)
- Next milestone and its target date, if set

**Settings**: Maximum number of items (3–20).

**Requires**: `portfolio_projects:reader`

---

### Projects I Contribute To

Lists projects where you are a team member. Each project shows:

- Your team (IT Team or Business Team)
- Current project status
- Number of tasks assigned to you in that project

**Settings**: Maximum number of items (3–20).

**Requires**: `portfolio_projects:reader` and `tasks:reader`

---

### Recently Viewed

Shows items you have recently opened across the application — projects, requests, applications, assets, interfaces, connections, contracts, tasks, OPEX and CAPEX items. Each entry shows the item name, its type, and when you last viewed it.

Recently viewed items are stored locally in your browser and are specific to your user and tenant. Click **Clear** to reset the list.

**Settings**: Maximum number of items (5–20).

**Requires**: No special permissions (items you cannot access are automatically hidden).

---

### My Time Last Week

Displays a summary of time you have logged over a recent period:

- **Total hours** logged (prominently displayed)
- **Breakdown by category** — IT, Business, and Other Tasks
- **Top projects** — a bar chart of the projects you spent the most time on

**Settings**: Time period in days (7–30).

**Requires**: `portfolio_projects:reader` and `tasks:reader`

---

### New Requests

Shows portfolio requests created within a recent period. Each request shows the name, requester, creation date, and a priority badge if the priority score is above 80.

**Settings**: Maximum number of items (3–20), time period in days (1–30).

**Requires**: `portfolio_requests:reader`

---

### Coming soon

Three additional tiles are planned for a future release:

- **Team Activity** — recent activity across your teams
- **Project Status Changes** — projects that recently changed status
- **Stale Tasks** — tasks that have not been updated in a long time

These tiles appear in settings but show a placeholder message.

## Customising your dashboard

Click the **Settings** icon (gear) in the top-right area of the dashboard to open the settings dialog.

From here you can:

- **Enable or disable tiles** — check or uncheck each tile to control what appears on your dashboard
- **Reset to Defaults** — restore the original tile selection

Only tiles you have permission to view appear in the settings list. Changes are saved to your account and persist across sessions and devices.

If all tiles are disabled, the dashboard shows a message prompting you to enable tiles in settings.

## Tips

- **Start with defaults**: The dashboard ships with a useful set of tiles already enabled. Try it for a few days before customising.
- **Use quick actions**: Creating a task or logging time from the dashboard saves you navigating away from your overview.
- **Check overdue tasks daily**: The My Tasks tile highlights overdue items in red so nothing slips through the cracks.
