# AI Agents — Activity

Activity is the read-only history of everything your agents have done and everything you have decided about their work: proposals they drafted, your approvals and rejections, the changes that were actually sent to a ticket, safety limits that kicked in, pauses, configuration changes, and errors. Nothing on this page changes a ticket or an agent — it exists so you can answer "what happened, when, and why" after the fact, and to give you a paper trail when a requester or a technician asks. The same timeline appears in a recent-activity slice on an agent's [Monitor tab](agents-workspace.md); this page is the full, filterable version across every agent.

## Where to find it

- Workspace: **AI Agents**
- Path: **AI Agents → Activity**
- Route: `/agents/activity`
- Permission: `ai_agents:reader` (viewing only — everyone who can open AI Agents can read the timeline)
- Requires AI to be enabled on the instance. This page is read-only: nothing here approves, rejects, or sends anything. To act on a proposal, use [Approvals](agents-approvals.md).

---

## Filters

The timeline shows the most recent events first. Two controls narrow it down:

- **Ticket number** — type a ticket number and press **Search** (or Enter) to see only the events tied to that one ticket. This is the fastest way to reconstruct the full story of a single ticket: every check, draft, decision, and change, in order. Clear the box and search again to return to the full feed.
- **Type chips** — six toggles across the top: **Proposal**, **Decision**, **Execution**, **Configuration**, **Pause**, and **Error**. Click one to show only that kind of event; click it again to clear it. This is a quick way to answer questions like "what did the agent actually send?" (Execution) or "what have we been rejecting?" (Decision).

The ticket search and the type chip combine, so you can look at, say, only the errors on ticket #482.

---

## Reading a timeline entry

Each entry is one thing that happened, and it carries enough context to understand it at a glance:

- A **type chip** — which of the six categories above the event belongs to.
- An **action-type chip** (when the event is about a specific kind of ticket work): **Internal note**, **Requester reply**, **Classification update**, **Status update**, **Assignment**, or **Participants**.
- A **status dot** with a plain-language label (for example "Waiting for approval", "Done", "Rejected", "Dismissed", "Needs attention") describing where that item stands.
- The **agent name** and the **ticket** it concerns (shown as `#N`).
- An **event title** (for example "Proposal created" or "Ticket check completed").
- A **one-line preview** of the substance — the first line of a drafted message, a field change, or the reason — so you often don't need to expand anything.
- A **timestamp**, plus **Show details** and, where a check is behind the event, **Trace**.

### What the events mean

The catalog covers the whole lifecycle of agent work. Grouped by the type chip they fall under:

- **Proposal** — the agent drafted something for review: a reply, note, or ticket update was created and is waiting for a decision.
- **Decision** — a proposal was **approved**, **rejected**, or **dismissed** (set aside without counting against the agent). Approvals and rejections can also happen automatically once that action type is running on its own; a dismissal is always a person's deliberate choice.
- **Execution** — a change was actually sent to the ticket, or an execution **failed**. Automatic executions and their failures show here too.
- **Configuration** — someone changed how an agent runs: its **watching settings** or general **configuration** were updated, an action type was switched to **automatic** or **turned off** (or **demoted** back to asking first), or an **agent was deleted**.
- **Pause** — an **emergency pause was enabled** or **lifted**, or a **ticket watcher was paused** because a pause was in effect.
- **Error** — something went wrong that you should know about: a **check failed**, a single **ticket could not be processed**, or an automatic execution failed. Errors also surface when a safety limit is reached — a **daily safety cap** or a **per-run safety cap** — which is not a malfunction but a deliberate stop. Routine completions such as **Ticket check completed** appear here too, so you can confirm the agent is watching even on a quiet day.

You don't need to memorise these — the event titles are written in plain language, and the type chips let you filter down to the ones you care about.

---

## Show details

**Show details** expands an entry into the full evidence behind it. Depending on the event, you may see:

- The complete **Proposed message** — the full text the agent drafted, not just the one-line preview.
- **Field changes**, written as "Field: from → to" (for example "Status: Assigned → Pending"), so a classification, status, assignment, or participant change is legible without opening the ticket.
- The **Reason** — the agent's short justification for the proposal.
- The **Reviewer note** — the note captured when the proposal was decided.
- A **"{n} sources cited"** line — how many of your [Knowledge library](knowledge.md) results backed the drafted reply. This is the honest signal of whether the reply is grounded in your own sources; a reply with cited sources is one the agent could stand behind. Its absence on an administrative or procedural reply is normal and does not mean something failed — for how that plays out during review, see [Approvals](agents-approvals.md).

---

## Technical trace

The **Trace** button opens the **Technical trace** dialog. This is an optional diagnostics view aimed at administrators troubleshooting a specific check — you never need it for day-to-day review, and everything a requester or technician would want is already in **Show details**.

It reconstructs how a single check unfolded:

- The numbered **steps** the agent went through, each with its own status.
- The **tool calls** it made, with how long each took — useful when a check was slow or timed out.
- The **evidence** it gathered, shown as a short summary plus the kind of source it came from.

A **Show raw trace** toggle reveals the underlying machine-readable record for the rare case where you need the exact detail; leave it collapsed otherwise.

The same **Trace** button appears in [Approvals](agents-approvals.md) — following it there jumps you straight into this dialog for the check behind a proposal, which is the usual way to get here while reviewing.

---

## Tips

- Searching by **ticket number** is the fastest way to hand someone the full, ordered story of one ticket — proposal, decision, and what was sent — without clicking through the ticket itself.
- Reach for the **Execution** filter to see only what actually left the building. Proposals and decisions are intentions; executions are the changes a requester or technician can see.
- A **safety cap reached** entry under Error is the system working as designed, not a bug. If an agent went quiet for the rest of a day, this is usually why — raise its daily limits in the agent's [Settings](agents-workspace.md) if the cap is too tight for your volume.
- Use **Trace** only when you're chasing a slow or failed check; for "what did it say and why did we approve it", **Show details** already has the answer.
- Shorthand for confirming an agent is alive on a slow day: filter to **Error** and look for **Ticket check completed** entries — the agent is watching even when it proposes nothing.
- This page never changes anything, so it's safe to hand read-only (`ai_agents:reader`) access to anyone who needs to audit agent behaviour without the ability to act on it.
