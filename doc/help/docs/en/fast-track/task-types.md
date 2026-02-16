---
title: "Task Types Fast Track: Run, Build & Tasks"
description: Understand the different work item types in KANAP — incidents, problems, requests, projects, bugs, and tasks.
---

# Task Types Fast Track: Run, Build & Tasks

This guide explains the different types of work items tracked in KANAP — and more importantly, how to tell them apart. It covers the Run (keeping things running), the Build (making things better), and the transversal Task that bridges both.

!!! tip "Prefer a one-page summary? :material-file-pdf-box:"
    All the key definitions on a single A4 page — print it, pin it, share it with your team.

    [:material-download: Download the cheat sheet (PDF)](downloads/kanap-task-types-fast-track.pdf){ .md-button .md-button--primary }

---

## The Big Picture

Everything your IT department does falls into one of two categories — plus a universal work unit that crosses both:

| Category | Purpose | Work Items |
|----------|---------|------------|
| **Run** | Keep existing systems operational and secure | Incident, Problem |
| **Build** | Evolve and construct the IT landscape | Request, Project, Bug |
| **Transversal** | Atomic unit of work across Run and Build | Task |

---

## Run — Keeping the Lights On

Everyone participates in the Run. It ensures **operational continuity** (MCO) and **security maintenance** (MCS) of existing systems.

### Incident

An **unplanned interruption or degradation** of a production service.

- Has a significant impact on the functioning of the information system
- The objective is **service restoration** — get things working again, fast
- Reactive by nature: something broke, and users are affected

!!! example "Examples"
    - MES system outage
    - Unexpected VM restart
    - Company-wide VPN access failure

### Problem

A **root cause investigation** triggered by recurring incidents.

- Typically identified by IT after detecting a **pattern of similar incidents**
- The objective is a **permanent resolution** — fix the underlying cause, not just the symptoms
- Proactive: IT opens a Problem to prevent future incidents

!!! example "Examples"
    - Recurring internet access performance degradation
    - Repeated errors on a data interface

---

## Build — Evolving the Landscape

The Build covers all **evolutions and construction** of the information system. Everyone participates.

### Request (Change Request)

A **planned solicitation to modify** the information system.

- Can be technical, functional, originating from the business or from IT
- Rarely urgent
- Triggers a **validation workflow** and, if approved, becomes a Task or Project
- Meets at least one of these criteria:
    - Significant workload (>3 days)
    - Involves multiple IT or business teams
    - Requires significant change management effort

!!! example "Examples"
    - New field to synchronize between SAP and PLM
    - New line-of-business application
    - Remote site integration

### Project

A **coordinated set of tasks** organized around a defined objective, with a scope, timeline, budget, and identified deliverables.

- Same criteria as a Request — normally originates from an approved Request
- **Fast-track**: some projects are imposed without going through the Request stage (executive decision, urgent regulatory change…). They enter directly as a Project.

!!! example "Examples"
    - S4/HANA upgrade
    - Firewall migration

### Bug

A **defect found in a system under development**.

- Too complex to be handled within a simple ticket — requires in-depth analysis
- Strictly a Build concept: the system is not yet in production (or the defect is in a component still being built)

!!! example "Examples"
    - Insufficient access rights on a new SAP tile
    - Incorrect firewall rule in a new server deployment

!!! warning "Incident ≠ Bug"
    This is the most common confusion. The rule is simple:

    - **It's running in production and it breaks?** → **Incident** (Run)
    - **It's under construction and it doesn't work?** → **Bug** (Build)

    The distinction matters because Incidents prioritize **service restoration** while Bugs prioritize **root cause fix within the development cycle**.

---

## Transversal — The Task

Tasks are the **atomic unit of work** in KANAP. They cross the Run/Build boundary.

### Task

A **clearly scoped action** with a defined responsible person, status, and deadline.

- Can be standalone or linked to a Project
- Carries a concrete effort
- Impact on users or services is contained and well-understood
- Does not require coordination across multiple teams — even if it takes a long time, it remains carried by a single person without requiring cross-functional analysis

!!! example "Examples"
    - Install a new domain controller
    - Document the new Notilus ↔ S4/HANA interface
    - Renew the SSL certificate on the intranet portal

!!! info "Task vs Request/Project"
    If the work meets **any** of these criteria, it's a Request (and potentially a Project), not a Task:

    - Significant workload (>3 days) **AND** involves cross-functional analysis
    - Requires coordination across multiple teams
    - Needs significant change management

    A Task can last 10 days if it's carried by one person with no particular cross-functional complexity.

---

## Summary

| Type | Category | Key Criterion | Example |
|------|----------|---------------|---------|
| **Incident** | Run | Unplanned interruption/degradation in production | MES outage |
| **Problem** | Run | Root cause of recurring incidents | Recurring internet performance issues |
| **Request** | Build | Planned SI modification (>3d / multi-team / change mgmt) | New SAP ↔ PLM field |
| **Project** | Build | Coordinated set of tasks with scope, timeline, budget | S4/HANA upgrade |
| **Bug** | Build | Defect in a system under development | Incorrect firewall rule on new server |
| **Task** | Transversal | Scoped action, one owner, no multi-team coordination | Renew an SSL certificate |

---

## Customizing Task Types

All work item types are **configurable** in **Portfolio → Settings**. You can:

- **Add** new types to match your organization's processes
- **Disable** existing types you don't need
- **Rename** types to fit your terminology

This means the list above is a starting point — adapt it to how your IT department actually works.

---

!!! success "You're ready"
    You now understand how KANAP categorizes work. Use the right type from the start — it drives workflows, reporting, and team clarity. When in doubt, ask yourself: **is it keeping things running (Run), or making things better (Build)?** Then pick the matching type.
