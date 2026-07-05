# AI Agents — Approvals

Approvals is the daily review queue for everything your AI Agents want to do. Before an agent posts a reply, adds a note, reclassifies a ticket, changes its status, reassigns it, or closes it, it puts that work in front of you here as a **proposal**. Nothing on this page has happened yet on the requester's side: a proposal is the agent's suggestion, and it only reaches your connected ticketing system once you approve it. This is where an operator spends most of their time supervising a helpdesk agent — reading drafts, applying the good ones, and rejecting the rest.

## Where to find it

- Workspace: **AI Agents**
- Path: **AI Agents → Approvals**
- Route: `/agents/approvals`
- Permission: requires AI to be enabled on the instance and the AI Agents Reader role (`ai_agents:reader`)
- The same queue appears scoped to a single agent on that agent's [workspace](agents-workspace.md) **Approvals** tab. The page at `/agents/approvals` is the combined view across every agent; the workspace tab shows only the proposals from the agent you are looking at. The layout and controls are identical.

---

## What a proposal is

Each proposal is one concrete action an agent wants to take on one ticket. There are eight action types, each with its own label and icon:

| Action | What it does |
| --- | --- |
| **Requester reply** | A message the agent wants to send to the person who opened the ticket. |
| **Internal note** | A note the agent wants to add for your team, not visible to the requester. |
| **Classification** | A change to the ticket's category, type, urgency, or similar attributes. |
| **Status** | A move to a different ticket status (for example, from **New** to **Pending**). |
| **Close ticket** | A terminal status change that closes the ticket — see [Terminal actions](#terminal-actions). |
| **Solve ticket** | A terminal status change that marks the ticket solved — see [Terminal actions](#terminal-actions). |
| **Assignment** | A change to who the ticket is assigned to. |
| **Participants** | A change to the ticket's watchers or requesters. |

For a **Requester reply** or **Internal note**, the body you see is the full drafted message, exactly as it would be posted. Read it as the requester (or your team) would. For the other five types, the body is a short change summary rather than free text — for example `Status: New -> Pending`, `Assignee: Unassigned -> Jane`, or a per-field classification diff — often followed by a **Reason** line explaining why the agent proposes it.

Proposals are grouped by ticket. Each group is headed by the ticket (**Ticket #N**), its current status, a count such as **3 proposals**, and when it was last updated. A ticket can hold several proposals at once — say a reply, a reclassification, and a status change — and you can decide them individually or all together.

---

## The four sections

The queue is organized into four sections by where each item sits in its lifecycle. Each has its own empty-state message so you can tell "nothing here" from "still loading".

### Needs your decision

The proposals waiting on you, grouped by ticket. This is the only section where you take action; the other three are informational. When it is clear, it reads *Nothing needs your decision.* Once you decide a proposal, it collapses to a single status line within its ticket group while the ticket's remaining proposals stay open for you.

### In progress

Work that is already moving and needs nothing from you: proposals you approved that are now being applied to the connected ticketing system, and tickets an agent is actively checking. Rows here show live status such as **Waiting to start**, **In progress**, **Executing…**, or **Agent working…**. When idle it reads *No agent work is in progress.*

### Needs attention

Anything that failed or is blocked — a proposal that could not be sent to the connected ticketing system, or a check that errored out. Each row carries a red caption explaining what went wrong, and a **Trace** link into the [Activity](agents-activity.md) timeline so you can see the full story. When clear it reads *No agent work needs attention.* This is the section to watch: items land here when a change was approved but the ticketing system rejected or could not complete it.

### Recently finished

A collapsible history of the most recently completed items — applied, rejected, skipped, or done. It stays folded until you open it, remembers that choice, and shows up to about 30 rows with a **+N more** line if there are more. Use it to confirm that an approval actually went through, or to check what an agent did while you were away.

---

## Making a decision: Approve, Execute, and Reject

Every pending proposal has two buttons.

- The primary button reads **Approve** on a proposal you have not decided yet, and **Execute** on one you already approved but that has not run. In both cases it does the same thing: it sends the action to your connected ticketing system, where the agent posts the reply or note, or applies the change. Approving is the moment the requester (or your team) can be affected — up to that point nothing has left KANAP.
- **Reject** does not apply the action. The proposal is dropped but stays in the audit trail so there is always a record of what the agent suggested and that you declined it. Rejecting a single proposal takes effect immediately.

If a proposal is currently **blocked** — for example a freshness or safety check no longer holds, or the ticketing system will not accept the change right now — its button is disabled and the reason appears in the button's tooltip. The proposal remains visible so you can see why it cannot proceed.

**Approve all** and **Reject all** appear on a ticket group when there is more than one item to act on, so you can clear a whole ticket in one step. **Reject all** opens a short dialog that confirms how many proposals will be rejected and offers an optional note for the audit trail. Approvals are made per action type only after enough of your decisions have been captured to promote that action type from **Ask first** to **Automatic** in the agent's [Settings](agents-workspace.md); until then, and always for sensitive work, every proposal comes through this queue.

---

## Terminal actions

**Close ticket** and **Solve ticket** proposals are flagged **Terminal** in red, because they end the ticket and the requester sees the change straight away. These get an extra guard rail.

Approving a terminal proposal — on its own or as part of an **Approve all** where any item is terminal — opens an **Apply terminal action** confirmation. It names the exact action and ticket, warns that the requester will see the change immediately, lists every terminal item in a bulk approval, and gives you a reason field for the record. You confirm with **Apply anyway**. This is deliberate friction: routine replies and notes apply in one click, but closing or solving a ticket always asks you to pause and confirm.

---

## Reading drafted replies: the fallback note

When an agent drafts a **Requester reply** or **Internal note**, it normally grounds that draft in your [Knowledge](knowledge.md) libraries and cites the sources it drew on. Occasionally you will see a small **Synthesis fallback** caption on such a proposal. It means the agent could not back this particular draft with cited sources — so treat it as a plain suggestion and read it closely before approving, rather than trusting it as source-verified.

The caption names the reason in plain terms, for example:

- **Synthesis error** — something went wrong while composing the grounded reply.
- **Synthesis disabled** — grounded drafting is turned off for this instance.
- **Projected over the run cap** — composing the grounded reply would have exceeded the budget for that check.
- **Operating context leak blocked** — the draft was held back because it risked exposing internal guidance to the requester.
- **Invalid or ungrounded synthesis** — the draft could not be verified against your sources.

The important thing to know is that **the absence of this note is the normal, healthy case.** Most drafts are grounded and carry no caption at all. And a reply can legitimately have no cited sources — an administrative acknowledgement or a purely internal escalation is not meant to be drafted from your knowledge base — without triggering this warning. So do not read a missing fallback note as a problem; it means the draft is either properly grounded or was never meant to be. The note only appears when the agent tried to ground a reply and could not.

---

## Tracing a proposal back to its check

Each ticket group and each attention row carries a **Trace** link. It deep-links straight to the matching entry in the [Activity](agents-activity.md) timeline, where you can follow the full check that produced the proposal — what the agent looked at, what it decided, and why. Use it whenever a draft or an update is surprising and you want the reasoning behind it. For administrators who need the low-level detail, Activity also exposes an optional diagnostics view of the raw processing steps.

---

## Tips

- Work top to bottom: clear **Needs your decision**, then glance at **Needs attention** for anything that failed to reach the ticketing system. The middle two sections need no action from you.
- Nothing here has reached the requester until you approve it. Reading a draft, tracing it, or leaving it in the queue changes nothing on the ticket.
- Reject rather than ignore. A rejected proposal stays in the audit trail with your optional note, which is far more useful later than a proposal that simply expired unattended.
- A missing **Synthesis fallback** note is good news, not missing information. Spend your closest reading on the drafts that *do* carry it.
- If an approved change lands in **Needs attention**, the red caption and the **Trace** link tell you whether it was the agent, a safety check, or the connected ticketing system that stopped it — fix the underlying cause rather than re-approving blindly.
- The combined queue at `/agents/approvals` is fastest when you run several agents; switch to an agent's own **Approvals** tab when you want to focus on just that one.
