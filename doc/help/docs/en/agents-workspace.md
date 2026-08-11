# AI Agents — Agent workspace

The agent workspace is where a single agent lives: you watch what it is doing, review its proposals, judge how well it is performing, and — if you are an administrator — configure every detail of how it works. It is the deepest surface in the AI Agents area. Everything about one agent that isn't a fleet-wide control is here, split across four tabs.

Open an agent by clicking its card on [AI Agents — Overview](agents-overview.md). The workspace always opens on **Monitor**; you can deep-link to any tab, and links from elsewhere in the product (for example the **Review** button on **Performance**) land you on the right one.

## Where to find it

- **Workspace:** AI Agents
- **Path:** **AI Agents → Overview →** open an agent's card
- **Route:** `/agents/:agentKey`
- **Permission:** viewing needs the AI Agents Reader role (`ai_agents:reader`). The **Settings** tab only appears for the AI Agents Admin level (`ai_agents:admin`); the AI Settings admin (`ai_settings:admin`) also unlocks it, along with the **Start agent**, **Disable**, and **Pause agent** controls on **Monitor**.
- **Availability:** the whole AI Agents area requires AI to be enabled on the instance. If you open a link to an agent that doesn't exist for your tenant, you'll see **Agent not found** — "This agent is not available in the current tenant." — with a way back to the fleet.

The tabs are **Monitor**, **Approvals**, **Performance**, and **Settings**. Readers see the first three; only administrators see **Settings**.

---

## Monitor

Monitor is the live status board for this one agent. It refreshes as work moves through, so it's the tab to keep open when you're keeping an eye on things.

### Status

The **Status** card summarises the agent's current mode and carries its run controls (administrators only):

- **Start agent** flips a not-started or off agent to enabled, so it begins watching.
- **Disable** stops an enabled agent from watching. It keeps its configuration and history; you can start it again later.
- **Pause agent** is the emergency brake. It asks for a reason, then holds this agent's checks and any pending writes until you lift it. Other agents keep running. When a pause is in effect you'll see **Lift pause** here. A pause that was set for the whole tenant instead shows **Paused for all agents** and sends you to the fleet overview to manage it — you can't lift a tenant-wide pause from a single agent.
- **Check now** runs a check immediately instead of waiting for the next scheduled one. It's disabled while a check is already running or while the agent is paused.

Below the controls, four read-only tiles tell you where things stand:

- **Lifecycle** — the agent's overall state in plain terms: **Not started**, **Off**, **Testing**, **Paused**, **Archived**, or, when it's live, **Watching — asks first** / **Watching — partly automatic** (the latter once at least one action type has been promoted to automatic).
- **Watching** — **All tickets**, **Filtered** (when a category or entity narrows the scope), or **Off**.
- **Last check** — the outcome of the most recent check.
- **Next check** — **Every 5 minutes** while the agent is watching; otherwise **Not set**.

### Queue

The **Queue** card counts the work the agent is currently holding:

- **Waiting** — tickets whose proposals are waiting for your approval.
- **In progress** — tickets the agent is actively working. Each in-progress ticket is also listed underneath with a spinner and its state, so you can see exactly what's moving.
- **Failed** — tickets that errored or landed in **Needs attention** and won't retry on their own.
- **Pending approvals** — the total number of individual proposals across all waiting tickets (a single ticket can carry several).

### Limits

The **Limits** card shows today's consumption against the safety caps set on the **Settings** tab: **Runs today**, **Tokens today**, and **Cost today** (in EUR), each as *used / cap*. These are hard ceilings — when a cap is reached the agent stops for the day regardless of anything else, so this card is where you notice an agent that's about to go quiet.

### Test on a ticket

**Test on a ticket** runs the agent once against a single ticket you name — the fastest way to see how it behaves before you let it watch on its own, or to check its reasoning on a specific case. Type a ticket number (for example `64`) and press **Run test**. The agent does a full pass on just that ticket; whatever it proposes lands in the **Approvals** tab for your review like any other work. Nothing is sent to the requester without approval. This works even while the agent is not started, which makes it the natural companion to the **Not started** stage of a new agent.

### Recent activity

The bottom of Monitor embeds a live, read-only timeline of this agent's proposals, decisions, executions, pauses, and errors. It's the same feed as the full [Activity](agents-activity.md) page, already filtered to this agent. Each entry can open an optional **Technical trace** diagnostics view for administrators who want the step-by-step detail behind a check.

---

## Approvals

The **Approvals** tab is the review queue — proposed replies, notes, and ticket updates waiting for your decision — scoped to just this agent. It behaves exactly like the standalone queue, including approving or rejecting in bulk and the terminal-action confirmation. See [Approvals](agents-approvals.md) for the full explanation of how the queue works; nothing about it changes here except that you only see this agent's items.

---

## Performance

Performance tells you whether the agent is earning more autonomy. The row of headline figures covers, for this agent:

- **Acceptance** — the share of its proposals you approved. This is the number that most influences whether an action type can go automatic.
- **Dismissed** — the share of this agent's reviewed proposals you set aside rather than approved or rejected. A dismissal doesn't count against the agent, so this figure sits apart from acceptance. Read a persistently high value as a targeting problem — the agent is picking up tickets it shouldn't handle — and fix it in **Settings → Targeting**, rather than treating it as an answer-quality issue.
- **Approval latency** — the typical time, in minutes, between a proposal appearing and someone deciding on it. A rising figure usually means the queue needs more reviewer attention, not that the agent is doing worse.
- **Knowledge hit rate** — how often its replies were backed by your knowledge sources.
- **Cost per ticket** — average spend per ticket handled, in EUR.
- **Runs per ticket** — how many checks it took, on average, to resolve a ticket.

Below, a 14-day **Trends** strip shows proposed-versus-executed volume per day, so you can see the agent warming up (or a spike) at a glance.

The **Autonomy ladder** lists each action type the agent has data for, with how many reviewed decisions it has captured against the number required before **Automatic** mode can be reviewed. When an action type has enough evidence, use **Review** to jump to the **Autonomy** section on **Settings**, where the promotion is actually done.

---

## Settings

The **Settings** tab is administrator-only and holds every configuration knob for the agent. It **autosaves**: there are no save buttons, and each section shows a small **Saving…** / **Saved** indicator in its header as your edits are written. Edits are applied in place, so the page doesn't reload or lose your position while you work.

### Objective and capabilities

This is the agent's persona — who it is and how it writes:

- **Name** and **Status**. Status controls availability: **Not started**, **Enabled**, **Off**, or **Archived**. (Archiving is the deliberate way to retire an agent.)
- **Description** — free text for your own team.
- **Mission** — the agent's job in a sentence or two.
- **Instructions** — one instruction per line; each line is treated as a separate rule.
- **Output style** — the tone the agent writes in (for example, *clear and concise*).
- **Reply language** — the language of requester-facing replies: **Ticket language** (match whatever the ticket is written in), **French**, **English**, **German**, or **Spanish**.
- **Escalation guidance** — when and how the agent should hand a ticket to a human instead of trying to resolve it.
- **Shared context** — turn on **Use shared context** and pick a profile to layer reusable background about your environment onto this agent, or use **+ New profile** to create one on the spot. A preview of the selected profile's lines is shown beneath. Shared context shapes how the agent interprets tickets and writes replies, but it is never a permission grant and is **not** a citable source — unlike [Knowledge libraries](knowledge.md), whose results *are* cited back in replies. Manage profiles fully on the [Shared context](agents-shared-context.md) page.

Alongside the persona editor sits the read-only **Effective prompt** preview: exactly what the agent's runtime is given, compiled from everything above plus the platform's own rules. Use the selector to inspect each stage — **Action planner**, **Planner**, and **Interpreter** are the stages where the agent decides *what to do*; **Synthesis** is where it drafts the reply grounded in your knowledge sources. The preview updates after each save. As the hint says, **guidance cannot override safety rules** — nothing you write in the persona can loosen the platform's hard limits.

### Capabilities

Switches for which kinds of change the agent may ever propose: **Internal notes**, **Requester replies**, **Classification**, **Status updates**, **Assignment**, and **Participants**. Turning one off removes that action type entirely — the agent can't propose it and it can't appear in the autonomy ladder. These are the outer boundary; the **Autonomy** section below decides which of the enabled ones still ask first.

### Targeting

Targeting decides which tickets the agent watches. The master switch — **Watch new tickets** (or **Watch tickets automatically** on a custom agent) — turns watching on or off. Quick presets (**New tickets**, **All open**, **Handled by this agent**) drop in a starting filter set; if you already have filters, you're asked before they're replaced.

The filter builder lets you combine conditions — all filters are combined together, and the available values come straight from the connected ticketing system. A live preview shows the practical effect:

- **Matches** — how many tickets currently fit.
- **Sample** — how many were actually inspected to produce the estimate.
- **Overlap** — tickets that other agents also match, so you can spot two agents fighting over the same work.
- **Runs/day** — the expected number of checks per day at this scope.

A note appears when the preview is bounded by your per-check limits — the real match count may be larger than the preview shows.

### Operating settings

The pace-and-budget controls:

- **AI model** — which model this agent runs on. **Organization default** is the starting value and usually the right one: the agent follows whatever model your organization has set as default, and moves with it. Pick a specific model by name to pin this agent to it — a vision-capable model for screenshot-heavy queues, a cheap local one for high-volume triage. Only active models appear, they are defined on the [AI models](ai-models.md) page, and the choice is saved the moment you make it (this one field doesn't wait for the section's autosave), taking effect on the agent's next run. A model an agent is pinned to cannot be archived out from under it — the agent has to be moved off it first. Note that reading the model list needs the AI settings admin permission (`ai_settings:admin`), the same one that opens the AI models page: with the **Agent Admin** role alone the dropdown offers only **Organization default**, which is a permissions gap rather than an empty registry.
- **Agent priority** — used with **Ticket collision** to decide who handles a ticket two agents both want.
- **Review every (hours)** — how long the agent waits before it looks again at a ticket it has already handled.
- **Ticket collision** — what to do when another agent is already on a ticket: **Defer** (leave it alone) or **Supersede equal priority** (take over from an agent of the same priority).
- **Max tickets per check** and **Max provider requests** — how much work a single check may take on.
- **Approval window (hours)** — how long every proposal for a ticket stays open before it expires. All proposals from one check share this window, so they expire together rather than piecemeal.
- **If ticket changed** — what to do if the ticket moved on between the proposal and your approval: **Re-review**, **Cancel**, or **Apply anyway**.
- **Tokens per run** / **Cost per run (EUR)** and **Runs per day** / **Tokens per day** / **Cost per day (EUR)** — the per-run and daily spending caps. The daily figures are the same caps you watch on the Monitor **Limits** card. A *run* is one pass on one ticket, not one check: a single check can spend the per-run budget once for each ticket it picks up, so read these next to **Max tickets per check**.

The two cost caps are priced with the **AI model** assigned above, using the prices recorded for it on the [AI models](ai-models.md) page — the hint under each field says so. That has one consequence worth knowing: **a free model (0 €) never reaches a cost cap**, because everything it does costs nothing. On the KANAP included model, on a local model, or on any model you registered without prices, the cost caps are inert and the **token** caps are your only real protection. Set them accordingly.

Monitoring agents, which watch alerts rather than tickets, have the same **AI model** selector in their own shorter **Operating settings** section — alongside **Alerts handled per check** and **Requests to the monitoring tool per check** — and it works exactly as described above.

### Knowledge and web sources

Where the agent gets its facts:

- **Search KANAP knowledge** — when on, the agent draws on your [Knowledge libraries](knowledge.md) and cites them in replies. With it off, the agent answers from the model's own knowledge (and the web, if that's on).
- **Search all available libraries**, or turn it off to pick specific **Libraries** — the agent then searches only those, within what it's allowed to access. Library names come from the Knowledge section.
- **Search the web** — lets the agent also consult the public web; KANAP knowledge always takes precedence and web results are cited. This switch is only available if web search is enabled for the whole platform. When it isn't, the switch is disabled and a note points you to your administrator — see [Plaid Settings](ai-settings.md).

### Autonomy

By default every action type **asks first** — the agent proposes and waits for you. This section is where you promote an action type from **Ask first** to **Automatic**, per type, once it has earned it. Each row shows the current mode and an eligibility line: decisions captured, acceptance rate, and days of activity, each against what's required. When an action type isn't yet eligible, the row explains why (for example, not enough reviewed proposals, or acceptance below the threshold).

- **Turn on** appears once an action type is eligible. It opens a confirmation summarising the evidence and reminding you that automatic actions still respect the daily limits and emergency pause, and drop back to ask-first if acceptance falls.
- **Override** appears when an action type isn't eligible but overriding is allowed. It requires a written reason and warns clearly that an override bypasses the recommendation thresholds *only* — hard safety limits, freshness checks, provider support, budgets, pauses, and requester-reply restrictions all still apply.
- **Turn off** returns any automatic action type to asking first.

Whatever an action type's mode, the platform's hard safety limits, budgets, freshness checks, and pauses always apply — automatic never means unsupervised.

---

## Tips

- **Use Test on a ticket before you enable.** A test run gives you real proposals to judge without the agent touching anything else. It's the honest way to tune a persona: adjust, re-test, repeat.
- **The Limits card is your early-warning light.** An agent that suddenly goes quiet has usually hit a daily cap — check *Runs / Tokens / Cost today* on Monitor before assuming something broke. On a free model, only the token and run caps can be the cause.
- **Match the model to the queue, not to the fleet.** Assignment is per agent precisely so a screenshot-heavy queue can run on a vision model while a high-volume, text-only queue runs on something cheaper. What each choice actually costs shows up under [Usage & costs](ai-usage.md).
- **Read the Effective prompt after a persona change.** It's the ground truth of what the agent actually receives, and it makes it obvious when an instruction landed the way you meant it to.
- **Grow autonomy one action type at a time.** Promote low-risk types (internal notes) first and leave requester replies asking first until acceptance is consistently high — the ladder won't let you go automatic without the evidence, but you set the appetite.
- **Prefer shared context for background, libraries for facts.** Shared context colours the agent's judgement but is never cited; only knowledge libraries (and, if enabled, the web) show up as sources in a reply.
- **Watch Overlap in the targeting preview.** A high overlap number means two agents are competing for the same tickets — narrow one agent's filters, or use **Agent priority** and **Ticket collision** to decide who wins.
