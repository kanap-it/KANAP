#!/usr/bin/env python3
"""Build KANAP fast-track cheat sheets as compact A4 PDFs."""

from weasyprint import HTML
from pathlib import Path

OUT = Path(__file__).parent / "output"
OUT.mkdir(exist_ok=True)

CSS = """
@page {
    size: A4;
    margin: 8mm 10mm;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 8pt;
    line-height: 1.3;
    color: #1a1a1a;
}
h1 {
    font-size: 13pt;
    color: #1e3a5f;
    border-bottom: 2.5pt solid #1e3a5f;
    padding-bottom: 3pt;
    margin-bottom: 5pt;
}
h2 {
    font-size: 9.5pt;
    color: #1e3a5f;
    margin-top: 6pt;
    margin-bottom: 2pt;
}
h3 {
    font-size: 8.5pt;
    color: #2a5a8a;
    margin-top: 4pt;
    margin-bottom: 1.5pt;
}
p { margin-bottom: 2pt; }
ul { padding-left: 12pt; margin-bottom: 2pt; }
li { margin-bottom: 1pt; }
table {
    width: 100%;
    border-collapse: collapse;
    margin: 3pt 0;
    font-size: 7.5pt;
}
th, td {
    border: 0.4pt solid #bbb;
    padding: 2pt 4pt;
}
th {
    background: #1e3a5f;
    color: white;
    font-weight: 600;
}
tr:nth-child(even) td { background: #f5f7fa; }
.box {
    background: #e8f0fe;
    border-left: 2.5pt solid #1e3a5f;
    padding: 3pt 5pt;
    margin: 3pt 0;
    font-size: 7.5pt;
}
.box-warn {
    background: #fff3e0;
    border-left-color: #e65100;
}
.box-tip {
    background: #e6f4ea;
    border-left-color: #34a853;
}
.chain {
    text-align: center;
    font-size: 10pt;
    font-weight: bold;
    color: #1e3a5f;
    margin: 5pt 0;
}
.cols { column-count: 2; column-gap: 12pt; }
.nb { break-inside: avoid; }
.pb { break-before: page; }
.sub { font-size: 8pt; color: #555; margin-bottom: 4pt; }
.foot {
    margin-top: 6pt;
    padding-top: 3pt;
    border-top: 0.4pt solid #ccc;
    font-size: 6.5pt;
    color: #999;
    text-align: center;
}
.foot a {
    color: #1e3a5f;
    text-decoration: none;
}
"""

# ── IT OPS ──
itops = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>

<h1>🖥️ IT Ops — From Application to Server</h1>
<p class="sub">KANAP Cheat Sheet</p>
<div class="chain">Application → Environment (Instance) → Server (Asset)</div>

<div class="cols">

<div class="nb">
<h2>① Create Your Application</h2>
<p><b>IT Operations → Applications → + New</b></p>
<table>
<tr><th>Field</th><th>What to enter</th><th>Example</th></tr>
<tr><td>Name</td><td>Clear, recognizable name</td><td>Salesforce CRM</td></tr>
<tr><td>Category</td><td>Primary purpose</td><td>Line-of-business</td></tr>
<tr><td>Vendor</td><td>Supplier (from master data)</td><td>Salesforce Inc</td></tr>
<tr><td>Criticality</td><td>Business importance</td><td>Business critical</td></tr>
<tr><td>Lifecycle</td><td>Current status</td><td>Active</td></tr>
</table>
<div class="box box-tip">💡 Description, version, publisher, licensing — all useful but optional at this stage. You can always enrich later. Get the app in the system first.</div>
</div>

<div class="nb">
<h2>② Add Environments (Instances)</h2>
<p>Open your app → <b>Instances</b> tab → Add</p>
<ul>
<li>Choose environment type: <b>Prod</b>, Pre-prod, QA, Test, Dev, Sandbox</li>
<li>Set Base URL, SSO enabled, MFA supported, Lifecycle</li>
<li>Add notes for context (e.g. "Primary EU instance")</li>
</ul>
<div class="box box-tip">💡 Use <b>Copy from Prod</b> to quickly scaffold QA, Dev, and other environments with similar settings. Changes save immediately.</div>
</div>

<div class="nb">
<h2>③ Assign Owners</h2>
<p>Open app → <b>Ownership & Audience</b> tab</p>
<ul>
<li><b>Business Owners</b> — stakeholders accountable for the application</li>
<li><b>IT Owners</b> — technical team responsible for operations & support</li>
<li><b>Audience</b> — select companies & departments that use the app. KANAP auto-calculates user count from master data.</li>
</ul>
<div class="box box-warn">⚠️ <b>Owners = communication.</b> Planned maintenance, service disruptions, upgrade decisions, license renewals — you need to reach the right people fast. Ownership also drives "My Apps" and "My Team's Apps" scope filters. No owner = nobody feels responsible.</div>
</div>

<div class="nb">
<h2>④ Access Methods & Compliance</h2>
<p><b>Technical & Support tab</b></p>
<ul>
<li>Access methods: 🌐 Web · 💻 Desktop · 📱 Mobile · 🖥️ VDI · ⌨️ CLI · 🏭 HMI · 🖧 Kiosk</li>
<li>External facing? Data Integration / ETL?</li>
</ul>
<p><b>Compliance tab</b></p>
<table>
<tr><th>Field</th><th>Example</th></tr>
<tr><td>Data Class</td><td>Confidential</td></tr>
<tr><td>Contains PII</td><td>Yes</td></tr>
<tr><td>Data Residency</td><td>France, Germany</td></tr>
<tr><td>Last DR Test</td><td>2025-11-15</td></tr>
</table>
<div class="box">ℹ️ Data Classes (Public, Internal, Confidential, Restricted) are configurable in <b>IT Operations → Settings</b>.</div>
</div>

<div class="nb">
<h2>⑤ Link Relations</h2>
<p>Open app → <b>Relations</b> tab — connect to the rest of your IT management data:</p>
<table>
<tr><th>Link type</th><th>Why</th></tr>
<tr><td>OPEX Items</td><td>Recurring costs (licenses, SaaS fees)</td></tr>
<tr><td>CAPEX Items</td><td>Capital expenditure / investment tracking</td></tr>
<tr><td>Contracts</td><td>Vendor agreements, renewal dates</td></tr>
<tr><td>URLs</td><td>Documentation, wikis, runbooks</td></tr>
</table>
<div class="box box-tip">💡 Relations are powerful but not blocking. Create them when you have the data — the app works fine without them.</div>
</div>

<div class="nb">
<h2>⑥ Create Your Server (Asset)</h2>
<p><b>IT Operations → Assets → Add Asset</b></p>
<table>
<tr><th>Field</th><th>What to enter</th><th>Example</th></tr>
<tr><td>Name</td><td>Hostname or identifier</td><td>PROD-WEB-01</td></tr>
<tr><td>Asset Type</td><td>Server type</td><td>Virtual Machine</td></tr>
<tr><td>Location</td><td>Where it's hosted</td><td>Paris Datacenter</td></tr>
<tr><td>Lifecycle</td><td>Current status</td><td>Active</td></tr>
</table>
<div class="box">ℹ️ <b>Location is the key.</b> Hosting type, provider, country, and city are all derived automatically. Set up Locations once in IT Operations → Locations.</div>
<p><b>Technical tab — Identity:</b> Hostname, Domain, FQDN (auto-computed), Aliases, OS.</p>
<p><b>Technical tab — IP Addresses:</b> Add as many entries as needed (management, production VLAN, backup network…). Each can have its own type and subnet. Network Zone & VLAN are derived from Subnet automatically.</p>
</div>

<div class="nb">
<h2>⑦ Link Server ↔ Application</h2>
<p><b>From App:</b> Open app → Servers tab → select environment → Add Server → choose asset → set Role (Web, Database, Application…).</p>
<p><b>From Asset:</b> Open asset → Assignments tab → Add Assignment → select App, Environment, Role, Since date.</p>
<div class="chain" style="font-size:9pt; margin: 4pt 0;">Salesforce CRM → Production → PROD-WEB-01 ✅</div>
</div>

<div class="nb">
<h2>The Bigger Picture</h2>
<p><b>Application Landscape</b> — Live registry of every app with environments, criticality, hosting, and ownership. Filterable by any attribute.</p>
<p><b>Infrastructure Mapping</b> — Which servers support this critical app? What gets affected if a server goes down? How many apps per datacenter?</p>
<p><b>Connection Map</b> — Visualize network flows and dependencies between infrastructure assets.</p>
<p><b>Interfaces & Interface Maps</b> — Document data flows between applications (protocols, direction, integration points) and visualize the full application architecture.</p>
<p><b>Compliance Reporting</b> — Data classification, PII, and residency flow into traceable compliance views. Ready for the auditor.</p>
</div>

<div class="nb">
<h2>Quick Reference</h2>
<table>
<tr><th>I want to…</th><th>Go to…</th></tr>
<tr><td>Create an application</td><td>IT Ops → Applications → + New</td></tr>
<tr><td>Add environments</td><td>App → Instances tab</td></tr>
<tr><td>Assign owners</td><td>App → Ownership & Audience tab</td></tr>
<tr><td>Set access methods</td><td>App → Technical & Support tab</td></tr>
<tr><td>Link budgets / contracts</td><td>App → Relations tab</td></tr>
<tr><td>Add compliance info</td><td>App → Compliance tab</td></tr>
<tr><td>Create a server</td><td>IT Ops → Assets → Add Asset</td></tr>
<tr><td>Link server ↔ app</td><td>App → Servers tab <i>or</i> Asset → Assignments</td></tr>
<tr><td>View connection map</td><td>IT Ops → Connection Map</td></tr>
<tr><td>View interface map</td><td>IT Ops → Interface Map</td></tr>
<tr><td>Configure dropdowns</td><td>IT Ops → Settings</td></tr>
</table>
</div>

</div>

<div class="foot">KANAP — IT Department Management &nbsp;|&nbsp; <a href="https://kanap.net">kanap.net</a> &nbsp;|&nbsp; <a href="https://doc.kanap.net">doc.kanap.net</a></div>
</body></html>"""

# ── PORTFOLIO ──
portfolio = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>

<h1>📋 Portfolio — From Request to Delivery</h1>
<p class="sub">KANAP Cheat Sheet</p>
<div class="chain">Request → Evaluate → Approve → Project → Deliver</div>

<div class="cols">

<div class="nb">
<h2>① Submit a Request</h2>
<p><b>Portfolio → Requests → + New Request</b></p>
<table>
<tr><th>Field</th><th>What to enter</th><th>Example</th></tr>
<tr><td>Name</td><td>Clear, concise title</td><td>CRM Migration</td></tr>
<tr><td>Purpose</td><td>What problem does this solve?</td><td>Replace legacy system</td></tr>
<tr><td>Source</td><td>Where it came from</td><td>Sales department</td></tr>
<tr><td>Category</td><td>Type of initiative</td><td>New Application</td></tr>
<tr><td>Requestor</td><td>Who is asking</td><td>Jane Doe</td></tr>
<tr><td>Target Date</td><td>When is this needed?</td><td>2026-06-01</td></tr>
</table>
<div class="box box-tip">💡 Keep it lean — attachments, detailed descriptions, and links can come later. The goal is to get the request into the pipeline so it can be evaluated.</div>
</div>

<div class="nb">
<h2>② Evaluate & Score</h2>
<p>Open request → <b>Evaluation</b> section</p>

<h3>Value Scoring (weighted)</h3>
<p>Strategic Alignment · Business Value · Urgency · Risk of Inaction · Dependencies — each scored on a weighted scale. KANAP calculates a total for objective comparison.</p>

<h3>Feasibility (7 dimensions)</h3>
<p>Technical · Resources · Budget · Timeline · Org Readiness · Risk · Vendor/External — each rated to paint a realistic picture of delivery confidence.</p>

<p><b>Analysis Recommendation:</b> 2–4 sentence narrative capturing the committee's verdict.</p>

<div class="box box-warn">⚠️ <b>Don't score alone.</b> Committee: IT Functional + IT Technical + Cybersecurity + Business. One person's score = opinion. A committee's score = decision framework.</div>
</div>

<div class="nb">
<h2>③ Approve & Convert</h2>
<ul>
<li>Review scores, feasibility analysis, and recommendation</li>
<li>Set status: <b>Approved</b>, Rejected (with reason), or Deferred</li>
<li>Click <b>Convert to Project</b> — all data carries over automatically</li>
</ul>
<div class="box box-tip">💡 Transparent scoring means you can answer "why was my request rejected?" with data, not opinions.</div>
</div>

<div class="nb">
<h2>④ Set Up the Project</h2>
<p>Open project from <b>Portfolio → Projects</b></p>

<h3>Team (Team tab)</h3>
<table>
<tr><th>Role</th><th>Purpose</th></tr>
<tr><td>Sponsor</td><td>Accountable for outcomes, removes blockers</td></tr>
<tr><td>IT Lead</td><td>Drives IT delivery</td></tr>
<tr><td>Business Lead</td><td>Drives business readiness & adoption</td></tr>
<tr><td>Contributors</td><td>IT and Business team members doing the work</td></tr>
</table>

<div class="box box-warn">⚠️ Contributors must be set up in <b>Portfolio → Contributors</b> with team, availability (days/month), and skills. Without this, capacity planning and roadmap generation won't work.</div>

<p><b>Progress tab:</b> IT Effort (MD) + Business Effort (MD) → feeds the roadmap generator.</p>
<p><b>Timeline tab:</b> Apply a Phase Template for instant scaffolding, or set dates manually.</p>
</div>

<div class="nb">
<h2>⑤ Track Execution</h2>

<h3>Progress & Status</h3>
<ul>
<li><b>Execution Progress</b> slider (0–100%) on Progress tab</li>
<li>Statuses: In Progress → In Testing → Done (also: On Hold, Cancelled)</li>
</ul>

<h3>Time Logging</h3>
<p><b>Progress tab</b> (overhead) + <b>Tasks</b> (task-specific time).</p>
<div class="box box-warn">⚠️ <b>Time logging powers the roadmap.</b> Logged time → historical capacity → accurate scheduling. Without it, you're guessing. Log weekly, even rough entries.</div>
</div>

<div class="nb">
<h2>⑥ Structure (Advanced)</h2>
<p><b>Phases</b> — logical stages (Analysis, Dev, Test, Deploy). Use templates or create manually.</p>
<p><b>Tasks</b> — assignable work items with priority, due date, time logging.</p>
<p><b>Milestones</b> — key checkpoints visible on timeline and reports.</p>
<div class="box box-tip">💡 Start simple. Add structure only when the project needs it.</div>
</div>

<div class="nb">
<h2>The Bigger Picture</h2>
<p><b>Automatic Roadmap</b> — Effort estimates + contributor availability + historical time data = auto-scheduled project timeline. No more manual Gantt charts.</p>
<p><b>Capacity Heatmaps</b> — See who's overloaded and who has bandwidth, across teams and time periods. Prevents the "5 projects at 100%" trap.</p>
<p><b>Bottleneck Analysis</b> — When projects compete for the same people or skills, KANAP highlights it before it becomes a crisis.</p>
<p><b>Executive Reporting</b> — Scores, status, progress, budget, and timeline roll up into portfolio-level dashboards. No PowerPoint needed.</p>
</div>

<div class="nb">
<h2>Quick Reference</h2>
<table>
<tr><th>I want to…</th><th>Go to…</th></tr>
<tr><td>Submit a new idea</td><td>Portfolio → Requests → + New</td></tr>
<tr><td>Score a request</td><td>Open request → Evaluation section</td></tr>
<tr><td>See the project pipeline</td><td>Portfolio → Planning</td></tr>
<tr><td>Check team capacity</td><td>Portfolio → Planning → Capacity view</td></tr>
<tr><td>Log time on a project</td><td>Open project → Progress tab or Tasks</td></tr>
<tr><td>Generate a roadmap</td><td>Portfolio → Planning → Generate</td></tr>
<tr><td>View reports</td><td>Portfolio → Reporting</td></tr>
<tr><td>Configure scoring weights</td><td>Portfolio → Settings</td></tr>
<tr><td>Set up contributors</td><td>Portfolio → Contributors</td></tr>
</table>
</div>

</div>

<div class="foot">KANAP — IT Department Management &nbsp;|&nbsp; <a href="https://kanap.net">kanap.net</a> &nbsp;|&nbsp; <a href="https://doc.kanap.net">doc.kanap.net</a></div>
</body></html>"""

# ── GETTING STARTED ──
getting_started = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>

<h1>🏠 Getting Started — Your First 10 Minutes</h1>
<p class="sub">KANAP Cheat Sheet</p>
<div class="chain">Dashboard → Profile → Scope Filters → Tasks → Contributor Profile</div>

<div class="cols">

<div class="nb">
<h2>① Your Dashboard</h2>
<p><b>My Workspace → Dashboard</b> — your personal landing page.</p>
<table>
<tr><th>Tile</th><th>What it shows</th></tr>
<tr><td>My Tasks</td><td>Assigned tasks by urgency (overdue, this week, later)</td></tr>
<tr><td>Projects I Lead</td><td>Projects where you're Lead or Sponsor</td></tr>
<tr><td>Projects I Contribute To</td><td>Projects where you're a team member</td></tr>
<tr><td>My Time Last Week</td><td>Hours logged, breakdown, top projects</td></tr>
<tr><td>Recently Viewed</td><td>Items you recently opened</td></tr>
<tr><td>New Requests</td><td>Recent portfolio requests</td></tr>
</table>
<p><b>Quick Actions:</b> Create Task · Log Time (top of dashboard).</p>
<p><b>Customize:</b> click ⚙️ to show/hide tiles.</p>
</div>

<div class="nb">
<h2>② Profile & Notifications</h2>
<p><b>Avatar (top-right) → Settings</b></p>
<p><b>Profile tab:</b> Name, Job Title, Phone.</p>
<p><b>Notifications tab:</b> Master toggle + per-workspace controls (Portfolio, Tasks, Budget).</p>
<h3>Weekly Review Email</h3>
<p>A periodic digest of your activity and upcoming items.</p>
<table>
<tr><th>Setting</th><th>What to configure</th></tr>
<tr><td>Day</td><td>Which day (e.g. Monday)</td></tr>
<tr><td>Time</td><td>What hour</td></tr>
<tr><td>Timezone</td><td>Your local timezone</td></tr>
</table>
<p>Click <b>Preview email</b> to test it.</p>
<div class="box box-tip">💡 The weekly email surfaces forgotten tasks and upcoming deadlines. Set it up once, let it work for you.</div>
</div>

<div class="nb">
<h2>③ Scope Filters — The Key Concept</h2>
<p>Every major list has a scope filter at the top:</p>
<table>
<tr><th>Scope</th><th>Shows</th></tr>
<tr><td><b>My [items]</b></td><td>Items you own or are assigned to</td></tr>
<tr><td><b>My Team's</b></td><td>Items from anyone on your Portfolio team</td></tr>
<tr><td><b>All [items]</b></td><td>Everything in the organization</td></tr>
</table>
<p>Works on: <b>Tasks</b> · <b>Apps</b> · <b>Projects</b> · <b>Requests</b>.</p>
<div class="box box-warn">⚠️ See nothing? You're probably on "My [items]" with nothing assigned yet. Switch to "All". The filter <b>remembers your last choice</b>.</div>
<div class="box">ℹ️ "My Team's" requires a team assignment via <b>Portfolio → Contributors</b>. If grayed out, ask your admin.</div>
</div>

<div class="nb">
<h2>④ Tasks</h2>
<p><b>My Workspace → Tasks</b></p>
<p><b>Create:</b> Dashboard quick action <i>or</i> Tasks page → New.</p>
<p><b>Minimum fields:</b> Title + Assignee + Due Date.</p>
<p><b>Link to context:</b> Project, OPEX, Contract, or CAPEX item. Or leave standalone.</p>
<h3>Statuses</h3>
<table>
<tr><th>Status</th><th>When</th></tr>
<tr><td>Open</td><td>Not started (default)</td></tr>
<tr><td>In Progress</td><td>Work has begun</td></tr>
<tr><td>Done</td><td>Completed (time must be logged for project tasks)</td></tr>
<tr><td>Cancelled</td><td>No longer needed</td></tr>
</table>
<p><b>Log Time:</b> Open task → Log Time → Category (IT/Business) + Date + Hours.</p>
<div class="box box-tip">💡 <b>Send Link</b> — click it in any workspace header to email a direct link to colleagues. Works on tasks, projects, apps, contracts — everything.</div>
</div>

<div class="nb">
<h2>⑤ Contributor Profile</h2>
<p><b>Portfolio → Contributors</b> → find your name.</p>
<table>
<tr><th>Setting</th><th>What it does</th></tr>
<tr><td>Team</td><td>Enables "My Team's" filters everywhere</td></tr>
<tr><td>Availability</td><td>Days/month for projects → feeds roadmap & capacity</td></tr>
<tr><td>Skills</td><td>What you know + proficiency (0–4)</td></tr>
</table>
<p>Proficiency: 0 No knowledge · 1 Basic · 2 With support · 3 Autonomous · 4 Expert.</p>
<div class="box box-warn">⚠️ Be realistic with availability. Account for meetings, BAU, holidays. 20 days/month = zero non-project time.</div>
</div>

<div class="nb">
<h2>How It All Connects</h2>
<p><b>Dashboard</b> — pulls from your tasks, project roles, and time logs.</p>
<p><b>Scope Filters</b> — ownership + team = personalized views everywhere.</p>
<p><b>Capacity Planning</b> — your availability + time logs feed the roadmap generator.</p>
<p><b>Notifications</b> — weekly email + real-time alerts keep you in the loop.</p>

<h3>Want to go further?</h3>
<table>
<tr><th>If you work with…</th><th>Read the…</th></tr>
<tr><td>Apps, servers, infra</td><td>IT Ops Fast Track</td></tr>
<tr><td>Requests, projects, planning</td><td>Portfolio Fast Track</td></tr>
</table>
</div>

<div class="nb">
<h2>Quick Reference</h2>
<table>
<tr><th>I want to…</th><th>Go to…</th></tr>
<tr><td>See my overview</td><td>My Workspace → Dashboard</td></tr>
<tr><td>Create a task</td><td>Dashboard → Create Task</td></tr>
<tr><td>Log time</td><td>Dashboard → Log Time</td></tr>
<tr><td>See all my tasks</td><td>My Workspace → Tasks</td></tr>
<tr><td>Update my profile</td><td>Avatar → Settings → Profile</td></tr>
<tr><td>Set up notifications</td><td>Avatar → Settings → Notifications</td></tr>
<tr><td>Weekly review email</td><td>Settings → Notifications → Weekly Review</td></tr>
<tr><td>Set my availability</td><td>Portfolio → Contributors → your name</td></tr>
<tr><td>Add my skills</td><td>Contributors → Skills tab</td></tr>
<tr><td>Share a link</td><td>Any workspace → Send Link</td></tr>
<tr><td>Customize dashboard</td><td>Dashboard → ⚙️</td></tr>
</table>
</div>

</div>

<div class="foot">KANAP — IT Department Management &nbsp;|&nbsp; <a href="https://kanap.net">kanap.net</a> &nbsp;|&nbsp; <a href="https://doc.kanap.net">doc.kanap.net</a></div>
</body></html>"""

# ── TASK TYPES ──
task_types = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>

<h1>📋 Run, Build & Tasks — Work Item Types</h1>
<p class="sub">KANAP Cheat Sheet</p>
<div class="chain">Run (Incident · Problem) &nbsp;|&nbsp; Build (Request · Project · Bug) &nbsp;|&nbsp; Transversal (Task)</div>

<div class="cols">

<div class="nb">
<h2>Run — Keeping the Lights On</h2>
<p>Ensures <b>operational continuity</b> (MCO) and <b>security maintenance</b> (MCS) of existing systems. Everyone participates.</p>

<h3>Incident</h3>
<ul>
<li><b>Unplanned interruption or degradation</b> of a production service</li>
<li>Significant impact on the information system</li>
<li>Objective: <b>service restoration</b></li>
</ul>
<p><i>Examples: MES outage, unexpected VM restart, company-wide VPN failure.</i></p>

<h3>Problem</h3>
<ul>
<li><b>Root cause investigation</b> of recurring incidents</li>
<li>Typically identified by IT after detecting a pattern of similar incidents</li>
<li>Objective: <b>permanent resolution</b></li>
</ul>
<p><i>Examples: recurring internet performance issues, repeated interface errors.</i></p>
</div>

<div class="nb">
<h2>Build — Evolving the Landscape</h2>
<p>Covers all <b>evolutions and construction</b> of the information system. Everyone participates.</p>

<h3>Request (Change Request)</h3>
<ul>
<li><b>Planned solicitation</b> to modify the SI</li>
<li>Can be technical, functional, from business or IT</li>
<li>Rarely urgent</li>
<li>Triggers a <b>validation workflow</b> → becomes Task or Project if approved</li>
<li>Meets <b>at least one</b> criterion:
  <ul>
  <li>Significant workload (&gt;3 days)</li>
  <li>Involves multiple IT or business teams</li>
  <li>Requires significant change management</li>
  </ul>
</li>
</ul>
<p><i>Examples: new SAP ↔ PLM field, new LoB application, remote site integration.</i></p>

<h3>Project</h3>
<ul>
<li><b>Coordinated set of tasks</b> with scope, timeline, budget, and deliverables</li>
<li>Same criteria as Request — normally originates from an approved Request</li>
<li><b>Fast-track:</b> projects imposed without Request stage (executive decision, urgent regulation…)</li>
</ul>
<p><i>Examples: S4/HANA upgrade, firewall migration.</i></p>

<h3>Bug</h3>
<ul>
<li><b>Defect in a system under development</b></li>
<li>Too complex for a simple ticket — requires in-depth analysis</li>
<li>Strictly a Build concept: system not yet in production</li>
</ul>
<p><i>Examples: insufficient access rights on a new SAP tile, incorrect firewall rule on a new server.</i></p>
</div>

<div class="nb">
<div class="box box-warn">⚠️ <b>Incident ≠ Bug</b><br>
Running in production and it breaks? → <b>Incident</b> (Run)<br>
Under construction and it doesn't work? → <b>Bug</b> (Build)<br>
Incidents prioritize <b>service restoration</b>. Bugs prioritize <b>root cause fix in the dev cycle</b>.</div>
</div>

<div class="nb">
<h2>Transversal — The Task</h2>
<p>Tasks are the <b>atomic unit of work</b> in KANAP. They cross the Run/Build boundary.</p>

<h3>Task</h3>
<ul>
<li>Can be <b>standalone or linked</b> to a Project</li>
<li>Has a responsible person, status, and deadline</li>
<li>Clearly scoped in terms of impact on users/services</li>
<li>Does <b>not</b> require coordination across multiple teams</li>
<li>Can last a long time if carried by one person without cross-functional analysis</li>
</ul>
<p><i>Examples: install a domain controller, document the Notilus ↔ S4/HANA interface, renew intranet SSL certificate.</i></p>

<div class="box box-tip">💡 <b>Task vs Request/Project</b> — If the work meets <b>any one</b> of these, it's a Request, not a Task:<br>
• Significant workload (&gt;3d) <b>AND</b> requires cross-functional analysis<br>
• Coordination across multiple teams<br>
• Significant change management needed</div>
</div>

<div class="nb">
<h2>Decision Flowchart</h2>
<img src="flowchart-task-types.png" style="height:260pt; margin: 1pt auto; display:block;" />
</div>

<div class="nb">
<h2>Summary</h2>
<table>
<tr><th>Type</th><th>Category</th><th>Key Criterion</th><th>Example</th></tr>
<tr><td><b>Incident</b></td><td>Run</td><td>Unplanned interruption in production</td><td>MES outage</td></tr>
<tr><td><b>Problem</b></td><td>Run</td><td>Root cause of recurring incidents</td><td>Recurring internet perf issues</td></tr>
<tr><td><b>Request</b></td><td>Build</td><td>Planned SI change (&gt;3d / multi-team / change mgmt)</td><td>New SAP ↔ PLM field</td></tr>
<tr><td><b>Project</b></td><td>Build</td><td>Coordinated tasks with scope, timeline, budget</td><td>S4/HANA upgrade</td></tr>
<tr><td><b>Bug</b></td><td>Build</td><td>Defect in a system under development</td><td>Incorrect firewall rule</td></tr>
<tr><td><b>Task</b></td><td>Transversal</td><td>Scoped action, one owner, no multi-team coordination</td><td>Renew SSL certificate</td></tr>
</table>
<div class="box box-tip">⚙️ All work item types are configurable in <b>Portfolio → Settings</b> — add, disable, or rename types to match your processes.</div>
</div>

</div>

<div class="foot">KANAP — IT Department Management &nbsp;|&nbsp; <a href="https://kanap.net">kanap.net</a> &nbsp;|&nbsp; <a href="https://doc.kanap.net">doc.kanap.net</a></div>
</body></html>"""

# ── Generate ──
for name, html in [("kanap-itops-fast-track", itops), ("kanap-portfolio-fast-track", portfolio), ("kanap-getting-started", getting_started), ("kanap-task-types-fast-track", task_types)]:
    doc = HTML(string=html)
    rendered = doc.render()
    print(f"{name}: {len(rendered.pages)} page(s)")
    doc.write_pdf(OUT / f"{name}.pdf")
    print(f"  ✅ {OUT / f'{name}.pdf'}")
