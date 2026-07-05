# AI Agents — Overview

AI Agents are automated helpers that watch your connected service desk and do the first pass on tickets for you: drafting a reply to the requester, adding an internal note, or proposing an update to a ticket's classification, status, assignment, participants, or a close/solve. This page is the fleet dashboard — the one place to see every agent at a glance, how much work is waiting for your decision, how the fleet is performing, and where to pull the emergency brake if something looks wrong.

The important idea to hold onto: an agent proposes, you dispose. Anything an agent wants to send to a requester or write back to a ticket is proposed for your approval first, and hard safety limits, budgets, freshness checks, and pauses always apply — even after you let an agent act on its own. Day-to-day configuration for a single agent lives on its [Agent workspace](agents-workspace.md); this page is where you supervise the whole fleet.

## Where to find it

- Workspace: **AI Agents**
- Path: **AI Agents → Overview**
- Route: `/agents`
- Permission: `ai_agents:reader` to view the section. The create, emergency-pause, and delete controls described below require the AI Agents Admin level (`ai_agents:admin`); the AI Settings admin (`ai_settings:admin`) unlocks them too.
- Feature flag: the whole AI Agents section requires AI to be enabled on the instance. If AI is off, the section is not available.

---

## Concepts, in one minute

A few ideas recur across every page in this section. Learn them once here.

- **What an agent watches.** Each agent is pointed at your connected ticketing system (today that is GLPI, set up under **Admin → Integrations** — see [the GLPI connection](integrations.md)). In the agent screens it is referred to generically as the connected ticketing system or the connection.
- **What an agent acts on.** Tickets. The work an agent can propose is a requester reply, an internal note, a classification change, a status move (including close/solve), an assignment change, and adding or removing participants.
- **Asks first vs. automatic.** Every action type starts in **Ask first** — the agent drafts the change and it sits in your approvals queue until you approve or reject it. Once an agent has built up enough of a track record on a given action type, an admin can promote just that action type to **Automatic** so it applies without waiting. Promotion is per action type, and the safety limits below never stop applying.
- **Watching vs. test-only.** A **watching** agent checks the connected ticketing system for matching tickets on its own, about every five minutes. An agent that is not watching only ever runs when you test it by hand on a single ticket from its [workspace](agents-workspace.md) — nothing happens automatically. New agents always start test-only.
- **Safety always applies.** Per-check caps, per-run and daily budgets, freshness checks (what to do if the ticket changed after the agent drafted its work), and pauses apply regardless of whether an action type is ask-first or automatic. You can always stop everything — see [Emergency pause](#emergency-pause) below.

Only the **Helpdesk** agent type is usable end to end today. Other types may appear in the agent-type list, but they are not ready to run — stick with Helpdesk.

Two other AI surfaces are easy to confuse with agents but are separate things: [Plaid](ai-assistant.md) is the interactive chat assistant you drive yourself, and [Plaid Settings](ai-settings.md) is where the shared AI provider is configured.

---

## The fleet dashboard

Four pooled numbers sit at the top, aggregated across every helpdesk agent in the tenant — not one agent's figures:

- **Pending approvals** — how many proposals across the whole fleet are waiting for a human decision right now. This is the same number that drives the sidebar badge.
- **Actions today** — how many proposals were actually executed today (approved and applied, or applied automatically).
- **Acceptance** — the share of decided proposals that were approved rather than rejected. Reads **Not enough data** until there is enough decision history to be meaningful.
- **Cost per ticket** — the estimated AI cost per ticket handled, in EUR. Also reads **Not enough data** until there is history.

Treat these as fleet health, not per-agent accounting. For a single agent's numbers, open its workspace and use the **Performance** tab.

---

## The Fleet cards

Below the dashboard, the **Fleet** section shows one card per agent. Each card carries the agent's **name** and **description** (or **No description.** if none was set), a plain-language status, a row of chips, and — for a watching agent — a strip of live figures.

**The status** (top-right of the card) tells you what the agent is doing right now:

- **Not started** — created but never run. This is where every new agent begins.
- **Off** — disabled; it will not watch or act.
- **Archived** — retired from active use.
- **Testing** — enabled but not watching. It only runs when you test it by hand on a single ticket.
- **Watching — asks first** — watching on its own, but every action type still routes to you for approval.
- **Watching — partly automatic** — watching, with at least one action type promoted to run without approval. The rest still ask first.
- **Paused** — held by an emergency pause (tenant-wide or just this agent). Checks and pending writes are frozen until the pause is lifted.

**The chips** summarize the agent at a glance:

- **Type** — the agent type, e.g. **Helpdesk**.
- **Environment** — which connection environment it points at: **Production**, **Staging**, **Sandbox**, **Lab**, or **Mock**. This is your cue for whether the agent is touching real tickets.
- **N pending** — proposals from this agent awaiting your decision (highlighted when above zero).
- **N failed** — tickets from this agent that stalled and need a look (highlighted when above zero). These surface as **Needs attention** in the daily queue.
- **N automatic** or **Ask first** — either the count of action types promoted to automatic, or **Ask first** when nothing has been promoted.

**When an agent is watching**, four figures appear on the card:

- **Last check** — the outcome of the most recent automatic check.
- **Scope** — **All tickets** or **Filtered tickets**, depending on whether the agent is narrowed to a specific entity or category.
- **Runs today** — how many times it has run so far today, against its daily run cap.
- **Updated** — the time of its last check.

Clicking anywhere on a card opens that agent's [workspace](agents-workspace.md), where you monitor it, review its approvals, read its performance, and change its settings.

Admins also see a small trash icon on the cards of custom agents they created — it deletes the agent along with its queue and watch history (the tickets in your ticketing system are never touched, and this can't be undone). The built-in helpdesk agent has no delete control.

---

## Creating an agent

Admins get a **New agent** card at the end of the fleet grid. It opens a five-step wizard that always produces a helpdesk agent from a safe starting template:

1. **Type** — give the agent a **Name** and **Description**. The **Agent type** is fixed to **Helpdesk**.
2. **Connection** — pick the ticketing system it works against (**GLPI**). A **Manage integrations** link jumps to **Admin → Integrations** if the connection isn't set up yet.
3. **Watching** — decide whether it should watch on its own with the **Watch new tickets** toggle, then choose which tickets it targets. Presets (**New tickets**, **All open**, **Handled by this agent**) give you a starting point; the filter builder narrows it further, with all filters combined and their values drawn from the connected ticketing system.
4. **Limits** — the safety frame. This covers **Agent priority** and **Review every (hours)** (how often it revisits the same ticket), **Ticket collision** handling when another agent is already on a ticket, **Max tickets per check** and **Max provider requests** per check, the **Approval window (hours)** (how long each check's proposals stay open before expiring — they all expire together), the **If ticket changed** behavior (re-review, cancel, or apply anyway), and the per-run and daily caps on **Tokens**, **Cost**, and **Runs**. The template ships sensible defaults; the full meaning of each field is documented on the [Agent workspace](agents-workspace.md) Settings tab.
5. **Review** — a summary of everything above.

New agents are always created as **Not started**, and you land on their **Settings** tab. The recommended path is to test the agent on a real ticket first, then turn on watching once you trust its output.

---

## Emergency pause

If something looks wrong across the board — unexpected replies going out, a misconfiguration, an incident — admins can freeze everything at once with **Pause all agents**. You are asked for a reason (which becomes part of the audit trail), and a persistent banner then reads **Emergency pause active: {reason}** across the section. While it is active, every agent's checks and any pending writes are held for the whole tenant. Click **Lift pause** on the banner to resume.

This tenant-wide brake is deliberately blunt. To freeze a single misbehaving agent without touching the rest of the fleet, use the per-agent pause on that agent's **Monitor** tab instead — see the [Agent workspace](agents-workspace.md).

---

## Working the fleet day to day

The overview is where you supervise; two dedicated pages are where the actual daily work happens:

- [Approvals](agents-approvals.md) is the review queue — proposed replies, notes, and ticket updates waiting for your decision, grouped by ticket.
- [Activity](agents-activity.md) is the read-only audit timeline of every proposal, decision, execution, pause, and error.

Reusable background guidance you want several agents to share lives on the [Shared context](agents-shared-context.md) page. Note that shared context shapes how agents interpret tickets but is never cited back in a reply — the sources an agent actually cites come from your [Knowledge libraries](knowledge.md).

---

## Tips

- **Read the environment chip before you trust a number.** A **Production** agent is touching real tickets and real requesters; **Sandbox**, **Lab**, and **Mock** are safe to experiment with. When you spin up a new agent, keep it off production tickets until its output looks right.
- **A rising failed count is your early warning.** The **N failed** chip surfaces tickets that stalled. Open the agent and clear the **Needs attention** items before they pile up — they usually point at a connection issue or a ticket that changed under the agent.
- **Test before you watch.** An agent created by the wizard is intentionally **Not started**. Run it by hand on a handful of representative tickets from its workspace first; only turn on watching once you're happy with what it drafts.
- **Automatic is earned, and reversible.** Promoting an action type to automatic doesn't remove any guardrail — the daily and per-run budgets, freshness checks, and pauses still apply, and acceptance that drops off will pull the action type back to ask-first.
- **Prefer the per-agent pause.** Reach for **Pause all agents** only for a genuine fleet-wide problem. For one noisy agent, the per-agent pause on its Monitor tab keeps the rest of your fleet working.
