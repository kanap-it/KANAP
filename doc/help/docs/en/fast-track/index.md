---
title: "Portfolio Fast Track: From Request to Delivery"
description: Get productive with KANAP's Portfolio module in minutes. A practical, step-by-step guide.
---

# Portfolio Fast Track: From Request to Delivery

This guide walks you through the entire portfolio lifecycle — from submitting your first request to delivering a finished project. It's designed to get you productive fast, not to cover every option. For full details, see the [Portfolio reference docs](../portfolio-requests.md).

---

## The Big Picture

![Portfolio Workflow Overview](images/workflow-overview.png)

Every initiative in KANAP follows the same flow:

| Stage | What Happens |
|-------|-------------|
| **Request** | Someone submits an idea or need |
| **Evaluate** | A committee scores it for value and feasibility |
| **Approve** | Decision-makers greenlight (or reject) it |
| **Project** | The approved request becomes a project with a team, timeline, and effort estimates |
| **Deliver** | The team executes, logs time, and tracks progress to completion |

This pipeline ensures every initiative is evaluated fairly, prioritized transparently, and tracked consistently. No more pet projects jumping the queue.

!!! info "Why this matters"
    The scoring and evaluation step is what makes the difference between a wish list and a real portfolio. It gives leadership a defensible, data-driven basis for saying yes — or no.

---

## Step 1: Submit a Request

Go to **Portfolio > Requests** and click **+ New Request**.

<!-- screenshot: New Request form with minimum fields highlighted -->

Fill in the minimum fields to get started:

| Field | What to enter |
|-------|--------------|
| **Name** | A clear, concise title for the initiative |
| **Purpose** | What problem does this solve? One or two sentences. |
| **Source** | Where did this come from? (Business unit, regulation, IT strategy…) |
| **Category** | The type of initiative (e.g., New Application, Infrastructure, Process Improvement) |
| **Requestor** | Who is asking for this? |
| **Target Date** | When is this ideally needed by? |

Click **Save**. Your request is now in the pipeline with status **New**.

!!! tip "Keep it lean"
    You can add attachments, detailed descriptions, and links later. The goal right now is to get the request into the system so it can be evaluated.

For all available fields and options, see [Requests reference](../portfolio-requests.md).

---

## Step 2: Evaluate and Score

This is the most important step in the process. It's what turns a backlog of requests into a prioritized, defensible portfolio.

### Who Should Score?

!!! warning "Don't score alone"
    Scoring works best when done by a **committee** with diverse perspectives. Aim to include representatives from:

    - **IT Functional** — understands business processes and application landscape
    - **IT Technical** — understands infrastructure, architecture, and technical debt
    - **Cybersecurity** — assesses risk, compliance, and security implications
    - **Business** — validates strategic alignment and business value

    A single person's score is an opinion. A committee's score is a decision framework.

### Scoring Criteria

Open the request and navigate to the **Evaluation** section. You'll score the request across multiple criteria on a weighted scale.

<!-- screenshot: Scoring criteria panel with sample scores -->

The scoring criteria assess the initiative's **value and priority**:

| Criterion | What you're assessing |
|-----------|----------------------|
| **Strategic Alignment** | How well does this support the organization's strategy? |
| **Business Value** | What's the expected return — revenue, savings, efficiency? |
| **Urgency** | Is there a deadline, regulation, or burning platform? |
| **Risk of Inaction** | What happens if we don't do this? |
| **Dependencies** | Does this block or enable other initiatives? |

Each criterion is scored on a scale, and KANAP calculates a **weighted total** that lets you compare requests objectively.

### Feasibility Analysis (7 Dimensions)

Beyond value, you need to assess whether this is actually doable. The feasibility analysis covers **seven dimensions**:

<!-- screenshot: Feasibility analysis radar chart or form -->

| Dimension | Key question |
|-----------|-------------|
| **Technical Feasibility** | Can we build this with our current tech stack and skills? |
| **Resource Availability** | Do we have the people? |
| **Budget** | Can we fund this? |
| **Timeline** | Is the target date realistic? |
| **Organizational Readiness** | Is the business ready for this change? |
| **Risk** | What could go wrong, and can we manage it? |
| **Vendor / External** | Do we depend on third parties, and are they reliable? |

Each dimension gets a rating. Together, they paint a realistic picture of delivery confidence.

### The Analysis Recommendation

After scoring and feasibility, write the **Analysis Recommendation**. This is a short narrative summary — typically 2–4 sentences — that captures the committee's verdict:

<!-- screenshot: Analysis Recommendation text field -->

!!! example "Good recommendation examples"
    - *"High strategic value, strong business case. Technical feasibility is moderate due to legacy integration. Recommend approval with a proof-of-concept phase."*
    - *"Low urgency, limited business impact. Resource constraints make Q2 delivery unlikely. Recommend deferral to H2."*

The combination of **scores + feasibility + recommendation** gives decision-makers everything they need to approve or reject — without having to sit through a two-hour presentation.

!!! info "Transparency is the point"
    When stakeholders ask "why was my request rejected?" or "why did that project get priority?", the evaluation data provides the answer. This is what makes the pipeline fair.

For detailed scoring configuration and weight management, see [Settings reference](../portfolio-settings.md).

---

## Step 3: Approve and Convert

Once the evaluation is complete, it's decision time.

<!-- screenshot: Request with Approve button highlighted -->

1. **Review** the scores, feasibility, and recommendation
2. **Set the status** to **Approved** (or Rejected / Deferred)
3. Click **Convert to Project**

!!! tip "Seamless handoff"
    When you convert a request to a project, all the data carries over automatically — name, description, category, requestor, evaluation scores, and more. No re-entry needed.

The request status changes to **Converted**, and a new project is created and linked back to the original request.

For requests that aren't approved, you can set them to **Rejected** with a reason, or **Deferred** to revisit later.

See [Requests reference](../portfolio-requests.md) for all status transitions.

---

## Step 4: Set Up Your Project

Your new project inherits the request data, but it needs a few things before execution can begin.

Go to **Portfolio > Projects** and open your newly created project.

### Team Tab — Assign Your People

<!-- screenshot: Project Team tab with roles -->

Set up the project team with clear roles:

| Role | Who | Purpose |
|------|-----|---------|
| **Sponsor** | Senior business or IT leader | Accountable for outcomes, removes blockers |
| **IT Lead** | Technical project manager | Drives IT delivery |
| **Business Lead** | Business-side project manager | Drives business readiness and adoption |
| **Contributors** | Team members (IT and Business) | Do the actual work |

!!! warning "Contributors must be configured first"
    For capacity planning to work, every contributor **must** be set up in **Portfolio > Contributors** (also known as Team Members) with:

    - Their **team** assignment
    - **Availability** (days per month)
    - **Skills**

    Without this data, the roadmap generator can't calculate capacity, and your planning will be flying blind. See [Team Members reference](../portfolio-team-members.md).

### Progress Tab — Set Effort Estimates

<!-- screenshot: Progress tab showing IT Effort and Business Effort fields -->

Enter the estimated effort for the project:

- **IT Effort (MD)** — Total man-days expected from IT contributors
- **Business Effort (MD)** — Total man-days expected from business contributors

!!! info "These numbers feed the roadmap"
    The roadmap generator uses these effort estimates, combined with contributor availability, to automatically schedule projects on the timeline. More accurate estimates = better roadmaps.

### Timeline Tab — Apply a Phase Template (Optional)

<!-- screenshot: Timeline tab with template selector -->

If your organization has defined phase templates (e.g., "Standard Project", "Agile Sprint Cycle"), you can apply one here to instantly scaffold your project timeline with predefined phases and milestones.

You can also set dates manually or skip this entirely for simpler initiatives.

See [Projects reference](../portfolio-projects.md) for all project configuration options.

---

## Step 5: Track Execution

Now the real work begins. As the project progresses, keep KANAP updated.

### Update Progress

<!-- screenshot: Execution Progress slider -->

Use the **Execution Progress** slider on the Progress tab to reflect how far along the project is. This is a simple percentage (0–100%) that feeds dashboards and reports.

Move the project through statuses as work advances:

**In Progress** → **In Testing** → **Done**

### Log Time — This is Critical

!!! warning "No time logging = no automatic scheduling"
    Time logging isn't just for reporting — it directly powers the roadmap generator.

There are two places to log time:

1. **Progress tab** — Log project-level overhead time (meetings, coordination, management)
2. **Tasks** — Log task-specific time against individual work items

<!-- screenshot: Time logging dialog -->

Here's why this matters:

```
Time logged → Contributor time statistics → Historical capacity data
                                          → Roadmap generator (historical mode)
                                          → Accurate future scheduling
```

The roadmap generator has a **historical capacity mode** that uses actual logged time to understand how much each contributor really delivers per month (as opposed to their theoretical availability). Without time data, the generator falls back to theoretical estimates — which are almost always optimistic.

!!! tip "Make it a habit"
    Encourage team members to log time weekly. Even rough entries are far better than nothing. The data compounds over time and makes each roadmap iteration more accurate.

### Status Transitions

| Status | Meaning |
|--------|---------|
| **In Progress** | Active work is happening |
| **In Testing** | Deliverables are being validated |
| **On Hold** | Temporarily paused (capture the reason) |
| **Done** | All deliverables accepted, project complete |
| **Cancelled** | Stopped before completion |

See [Projects reference](../portfolio-projects.md) for details on each status.

---

## Step 6: Structure with Phases and Tasks (Advanced)

For larger projects, you'll want more granular tracking.

### Phases

Phases break the project into logical stages (e.g., Analysis, Development, Testing, Deployment).

<!-- screenshot: Project phases view -->

- **From template**: Apply a phase template from the Timeline tab to get a predefined structure
- **Custom**: Add phases manually with names, start/end dates, and owners

Each phase can have its own status, progress, and assigned team members.

### Tasks

Within each phase (or at the project level), create tasks for specific work items.

<!-- screenshot: Task list within a phase -->

- Assign tasks to contributors
- Set due dates and priorities
- Log time directly against tasks
- Link tasks to phases for structured tracking

### Milestones

Mark key checkpoints — go/no-go decisions, deliverable deadlines, or external dependencies.

<!-- screenshot: Milestone on timeline -->

Milestones appear on the project timeline and in reports, giving stakeholders clear visibility into upcoming decision points.

!!! tip "Start simple, add structure as needed"
    You don't need phases and tasks for every project. Small initiatives can be tracked with just the progress slider and status. Add structure when the project is complex enough to need it.

For full details on phases, tasks, and milestones, see [Projects reference](../portfolio-projects.md) and [Planning reference](../portfolio-planning.md).

---

## How It All Connects

Every piece of data you enter feeds into something bigger. Here's why it's worth the effort:

### Automatic Roadmap Scheduling

The roadmap generator takes your project effort estimates, contributor availability, and historical time data to **automatically schedule projects** across the timeline. No more manual Gantt chart gymnastics.

See [Planning reference](../portfolio-planning.md).

### Capacity Heatmaps

Contributor availability and project assignments combine to show you **who's overloaded and who has bandwidth** — across teams and time periods. This prevents the classic "everyone is assigned to 5 projects at 100%" problem.

### Bottleneck Analysis

When multiple projects compete for the same contributors or skills, KANAP highlights the bottleneck so you can make trade-offs before they become crises.

### Executive Reporting

Evaluation scores, project status, progress, budget, and timeline data roll up into **portfolio-level reports** that give leadership a clear picture without manual PowerPoint creation.

See [Reporting reference](../portfolio-reporting.md).

---

## Quick Reference

| I want to… | Go to… |
|------------|--------|
| Submit a new idea | Portfolio > Requests > + New |
| Score a request | Open request > Evaluation section |
| See the project pipeline | Portfolio > Planning |
| Check team capacity | Portfolio > Planning > Capacity view |
| Log time on a project | Open project > Progress tab or Tasks |
| Generate a roadmap | Portfolio > Planning > Generate |
| View reports | Portfolio > Reporting |
| Configure scoring weights | Portfolio > Settings |
| Set up contributors | Portfolio > Contributors |

---

!!! success "You're ready"
    You now know the full lifecycle from request to delivery. Start with a request, score it properly, and let KANAP handle the rest. For detailed documentation on every feature, explore the [Portfolio Management](../portfolio-requests.md) section.
