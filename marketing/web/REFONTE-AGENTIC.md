# KANAP — Agentic Repositioning: Full-Site Refonte Plan

Status: decisions locked 2026-06-26, ready to implement Phase 1. Companion to `ASSUMPTIONS.md` (the redesign decision log). Where this plan changes a locked assumption, it says so explicitly in section 11. Resolved decisions are recorded in section 10.

## 0. Purpose

The public site is the commercial showcase of KANAP's vision. Today it sells "the open source IT governance platform" (budget, architecture, portfolio, knowledge, plus Plaid). It says nothing about the agentic layer, which is becoming the product's headline strength.

This plan repositions the whole site around that vision while keeping the breadth visible, and it does so coherently: every page ladders up to one story, uses one vocabulary, and cross-links the same way. The audience is overwhelmingly community (self-hosting open-source users), so the bias is open, self-hosted, extensible, deploy-free-first.

The agentic capability is real but early (one live service-desk connector in production, the rest of the runtime built to extend). The site sells the destination, anchored to what already works. It does not pretend the breadth of connectors exists yet.

---

## 1. The positioning spine

Every page lead, title and CTA derives from this. If a piece of copy cannot be traced back to the spine, it does not belong.

### 1.1 Master positioning statement

> KANAP is the open-source platform a modern IT department runs on. It holds the full picture of your IT, from applications and infrastructure to budgets, projects and documentation. Your team works with all of it in plain language through Plaid. AI agents now act on it, taking on the repetitive work and earning more autonomy as they prove themselves. Self-host it for free, or let us run it.

Every page's lead is a specialization of this paragraph.

### 1.2 The three pillars (locked)

Replaces the current pillars (Practitioner-built / Simple & powerful / Open source). "Practitioner-built" and "Simple & powerful" move into supporting copy, they are no longer top-level pillars. See section 11, this supersedes A-1.

1. **The whole IT department in one system.** Applications, infrastructure, budgets, projects, documentation. One record instead of ten tools.
2. **Agents that take work off your team.** Autonomous AI that handles the repetitive load and earns more independence as it proves itself.
3. **Open source, self-hosted, yours to extend.** Full source, AGPL v3, run it on your own servers, write your own agents and connectors.

### 1.3 The three-layer model (the through-line)

This is the structural device that keeps the breadth from being drowned by the agent hook. It appears on the home, organizes the features nav, and frames the features hub. Layers, not a slogan, so name them descriptively in copy and never as a punchy "Know. Work. Act." triad.

1. **The record.** KANAP holds the full picture of the IT department (the four existing modules).
2. **The interaction.** Plaid lets people work with all of it in plain language.
3. **The action.** Agents act on the same record, autonomously and under measured trust.

Agents are the newest and most visible layer, not the whole product. The two layers beneath are what make KANAP a platform rather than one more agent tool, and what make its agents worth trusting.

### 1.4 What agents are, and are not

- They are autonomous by design. They start supervised, prove themselves on real tasks, and earn more autonomy. The destination is agents that quietly run the repetitive load.
- They are governed so that autonomy is defensible, not so that a human gatekeeps forever. Approval is a calibration step at the low end of the autonomy scale, not the product's spine.
- They are grounded in KANAP's own record, which is why their answers are about your environment instead of guesses.
- They are tool-agnostic. A service desk is the first connector, shipped to prove the model. The runtime is built to drive any system behind a connector.

---

## 2. Voice and anti-slop rules

Apply to all copy, all locales.

Canonical example of what to avoid: the rejected hero draft "Let AI agents run your IT. Keep every decision yours." It reads as machine-written for three reasons at once (two-beat split, antithesis, the implied em-dash cadence). Nothing should be written in that shape.

Avoid:
- Em-dashes. Use a comma, a period, or parentheses.
- Two-beat headlines split by a period ("Do X. Keep Y.").
- Parallel antithesis ("Autonomous where it's safe, approved where it counts").
- Negation pivots ("Not a chatbot. A real assistant."). The current Plaid title uses this and gets rewritten.
- Prose triads ("read, reason and act").
- Buzzwords: seamless, effortless, powerful, robust, unlock, leverage, supercharge, revolutionize, cutting-edge.
- Colon-subtitle headlines and "Meet KANAP" / "Imagine" openers.

Prefer:
- One plain declarative sentence per headline.
- Concrete nouns and specifics. Confidence through precision, not adjectives.
- Continuity with the existing calm, practitioner voice. The current tagline is a calm noun phrase, the new copy should sound like the same author.
- Numbers once calibration provides them (acceptance rate, time saved). Not before.

---

## 3. Vocabulary (locked terms)

One word per concept, everywhere. Ties to the "no internal jargon" rule.

| Use | Never write |
| --- | --- |
| agent | "the control plane", "capability dispatcher", "agent runtime" (in user-facing copy) |
| autonomy / autonomy level | "A0 to A6", "autonomy ladder" (describe it, do not name the scale) |
| connector | "adapter", "provider contract" |
| the record / your IT data | "system of record" is fine in prose, avoid "the graph", "CMDB" except on IT landscape |
| isolation between customers | "RLS", "tenant", "multi-tenant" (say "your data is isolated") |
| approval / review | "human-in-the-loop", "eval-gated" |
| sources the agent used | "evidence-first", "grounding", "citations" is ok |
| runs on your servers | "self-hostable", "on-prem" both fine, keep "Self-host" as the nav label |

"Operating system for your IT department" is a useful internal concept but stays out of headlines (overused B2B trope). It may appear once, in body, as a framing line if needed.

---

## 4. Coherence mechanisms

### 4.1 Cross-link graph

Each page points to the others so the site reads as one product, not old pages plus a new agent page.

- Home links to every layer and module.
- **Agents** links to: IT landscape and Knowledge (what it reads), Self-host (where it runs), Security (how it is governed), Plaid (the other AI surface).
- **Plaid** links to Agents (ask versus act).
- **IT landscape** links to Agents ("the map your agents read").
- **Budget, Portfolio, Knowledge** each link to Agents and Plaid.
- **Security** links to Agents (autonomy governance).
- **Pricing** links to Agents (included in the free product).
- **Features hub** includes an agent-centric persona.

### 4.2 CTA hierarchy (site-wide)

- Primary, community-first: **Deploy free** (or "Deploy from GitHub" where that fits the page).
- Secondary: **Try hosted cloud** or **Talk to us**.
- Lead capture for the connector funnel: **Ask for a connector** to /contact, on the Agents page, the connector section, and Contact.
- Trial and Offer keep **Start free trial** as their primary, unchanged funnel (A-14 to A-18).

### 4.3 Design charter (unchanged, A-24 to A-28)

No new colors. Teal stays limited to CTAs, links, active nav, focus. Module and agent cards stay monochrome. Inter 400/500. Dark mode tested on every new section.

---

## 5. Information architecture and navigation

### 5.1 Top nav

Keep the six top-level items (Features, Self-host, Pricing, Security, FAQ, Contact). Do not add a separate top-level "Agents" item, that would tip the balance back toward agent-only. The hook lives in the home hero and in the Features dropdown.

### 5.2 Features dropdown, flat list with Agents first (decided)

Flat dropdown, in this order: Agents (new), Plaid (AI assistant), IT landscape, Budget management, Portfolio management, Knowledge. Agents leads so the hook is visible at the point of navigation. The grouped-by-layer variant was considered and dropped as not worth the build.

### 5.3 Footer

- Product group: add **Agents** (after Features or as its own line). Keep Changelog.
- Brand tagline changes from "Open source IT management. Self-host or let us run it." to a line that carries the new spine, for example: "The open-source platform your IT department runs on. Self-host it, or let us run it." (final wording in section 6.15).

---

## 6. Page-by-page plan

### 6.1 Home (`content/home/en.ts`)

Full restructure. New section order:

1. **Hero.** Hook in the title, breadth in the subhead.
   - Eyebrow: `Open-source · self-hosted · built to extend`
   - Title: **Open-source AI agents that take over your repetitive IT work.**
   - Subhead: KANAP holds your IT department's full picture, from applications and servers to budgets and projects. Plaid lets anyone work with it in plain language, and agents now act on it to take the repetitive load off your team. Open-source and self-hosted.
   - CTAs: Deploy free / Try hosted cloud. Keep the AGPL note line.

2. **Pillars** (update content, keep the container). Eyebrow "Why KANAP". Three pillars from section 1.2.

3. **The complete platform** (new, the anti-drowning flagship). Title: **A complete platform for the IT department.** Body introduces the three layers (the record, Plaid, agents) in plain prose, ending on "Each part is useful by itself, and they get stronger together."

4. **Agents with a real system underneath them** (new, the differentiator). Title as written. Body: most agents only see the ticket in front of them, a KANAP agent reads the affected application, its owner and cost, the project it belongs to, and the docs you wrote about it. Depth is what makes its agents worth trusting.

5. **Agents that earn their independence** (new, the autonomy vision). Body: starts supervised, KANAP measures how often it gets things right, you grant more autonomy as the track record holds, every repetitive task it takes over is one your team stops doing by hand.

6. **Autonomy you can trust** (new, governance as enabler). Recorded, scoped, source-backed, pausable. "That is what makes it sound to hand an agent real work."

7. **Built to run on your whole stack** (new, portability). One runtime, a service-desk connector shipped first, designed to drive monitoring, virtualization, directory, anything behind a connector, write your own since the code is open.

8. **Modules strip** (keep the six tiles, reframed as "the record your team and your agents work from"). Order: lead with the four record modules, then Plaid, then the new Agents tile. Keep "Adopt at your pace".

9. **Everything connected** (keep, retilt). The existing "Everything connected. Always under control." governance section aligns well. Retilt the intro toward "the governance that lets agents act safely", keep the six items, consider adding "Agent activity log" to the list.

10. **Open by default** (new community pillar). Full source, AGPL v3, Docker, no paywall, write your own agents and connectors, "if KANAP grows, it grows because the people running IT chose to build on it."

11. **Toward an AI-augmented IT department** (new vision band). The aspiration, in one flowing sentence, ending on "it runs on software you own and can read end to end."

12. **Final CTA** (keep, refresh wording toward the new spine).

### 6.2 Features hub (`content/features-hub/en.ts`)

Keep the persona-driven format, it is strong. Changes:
- Header retilt to name the three layers as the organizing idea, lead unchanged in spirit.
- Weave agents into the existing **IT operations / support** persona outcome (an agent now handles the repetitive first-line load).
- Add a sixth persona, the agent angle: **IT operations lead** "Hand the repetitive tickets to an agent", outcome "Your team works the hard problems, the agent works the rest", module chips Agents, IT landscape, Knowledge.
- Every persona that lists modules and could benefit gains an Agents chip where honest.

### 6.3 NEW Agents page (`content/features/agents/en.ts`, route `/features/agents`)

- Eyebrow: `Autonomous agents for IT`
- Title: **AI agents that take work off your team.**
- Lead: A KANAP agent picks up a task, reads it against your IT data, and either proposes an action or carries it out, depending on how much autonomy you have given it. It works the repetitive load so your people work the hard problems.
- Sections (each a SplitSection with a real screenshot):
  1. **Start supervised, grow autonomous.** The autonomy progression. Describe it, do not name the scale.
  2. **It reasons over your real environment.** Reads the affected application, owner, criticality, related docs. Lists the sources it used.
  3. **One runtime, any tool.** Decision separated from how it talks to a tool. Service-desk connector shipped first. Write your own connector.
  4. **A full record of everything it did.** Recorded, scoped, source-backed, pausable. Framed as the condition that makes autonomy defensible.
  5. **Yours to run and to change.** Open source, self-hosted, your data stays put.
- `more` grid: spend caps, emergency pause, role-based access, performance metrics.
- Transparency block (community-framed, doubles as connector lead capture): "Running today: an autonomous agent working a real service desk in production. The runtime is built to extend. Pick a tool, write a connector, and the same agent works it. Need one built? Tell us."
- Cross-links: IT landscape, Knowledge, Self-host, Security, Plaid.
- CTA: Deploy free / Talk to us.

### 6.4 Plaid / AI page (`content/features/ai/en.ts`)

- Rewrite the title, drop the negation pivot.
  - New title: **Ask KANAP anything about your IT.**
  - Lead: Plaid answers across your budget, applications, projects and documentation, and makes changes when you ask. Every write is shown to you before it runs. Use it inside KANAP, or connect it to your own AI tools over MCP.
- Reframe Plaid as the interaction layer, the human-driven counterpart to agents over the same record.
- Keep the four sections, retitle section 2 away from any antithesis.
- Add a prominent cross-link to Agents: "Want agents that work their own queue? See Agents."
- Keep MCP and the compliance section, the compliance section now points to Security and Agents rather than reading as a caveat.

### 6.5 IT landscape (`content/features/it-landscape/en.ts`)

Light coherence pass. Add one section or a strong crossLink: **The map your agents read.** Body: the landscape is what lets an agent know which application a problem touches, who owns it, and how critical it is. Cross-link to Agents. No change to the four core sections.

### 6.6 Budget (`content/features/budget/en.ts`)

Light pass. Add a crossLink and a single line tying budget data to the AI layer (Plaid answers budget questions today, agents can act on budget data as connectors grow). Keep honest about what is live. Cross-link Plaid and Agents.

### 6.7 Portfolio (`content/features/portfolio/en.ts`)

Light pass. CrossLink to Agents and Plaid. Optional line: scoring and roadmap data is part of what agents reason over. Keep core sections.

### 6.8 Knowledge (`content/features/knowledge/en.ts`)

Light pass, important link. Knowledge is what agents cite. Add a line and a crossLink: **What your agents quote.** The knowledge base is the source an agent draws from, and what it points to when it answers. Cross-link Agents and Plaid.

### 6.9 Self-host / on-premise (`content/onpremise/en.ts`)

Already aligned (own your data, AGPL, full feature set). Additions:
- A short block or bullet: **Agents run on your servers.** Agent reasoning and actions happen inside your deployment, your tickets and documents never leave it. This matters when an auditor asks, and it is the regulatory wedge (EU AI Act, NIS2) without naming the regulations heavily.
- Confirm the "full platform, every feature, free" claim explicitly includes agents (BYO LLM key, like Plaid).

### 6.10 Pricing / offer (`content/offer/en.ts`)

Structure stays (self-host free primary, hosted secondary). Additions:
- State clearly that **agents are in the free self-hosted product**, no AI feature gate, BYO LLM key (same model as Plaid). This is central to the community story.
- One line on running cost: agents use an LLM, bring your own key, you control spend with per-agent caps.
- **Pricing is settled (decided):** the single Hosted KANAP plan at **€249/mo or €2,490/yr** is the correct, current pricing. The old cloud tiers (Starter / Standard / Max, and any other) are obsolete, purge every reference from copy. The GTC legal doc still lists Free/Starter/Standard and must be reconciled to the single plan before launch (counsel review, tracked in section 10).

### 6.11 Security (`content/security/en.ts`)

High-value page, becomes a differentiator rather than boilerplate. Add a new section:
- **Agent governance.** Every agent action is recorded and scoped to what you allowed. Agents have no raw database or shell access, they act only through defined operations. You can pause any agent immediately. Autonomy is granted by you and measured, not assumed.
- Tie into the existing audit and isolation sections (agent actions appear in the same audit trail, exportable for SIEM).
- This page carries the "trustworthy autonomy" proof and the compliance angle. Cross-link Agents.

### 6.12 FAQ (`content/faq/en.ts`)

Add a new group, **Agents (AI automation)**:
- Are the agents autonomous?
- How do I control what an agent can do?
- Can I trust an agent with real work?
- Which tools do agents work with today?
- Can I write my own agent or connector?
- Are agents included in the free open-source version?
- What does it cost to run agents?
- Do agent actions stay on my own servers?

Answers follow the spine and the vocabulary table. Honest about "one live connector, runtime built to extend".

### 6.13 Changelog (`content/changelog/en.ts`)

Add dated entries for the agentic milestones, honest and concrete. These double as proof the vision is real:
- An entry for the autonomous agent runtime and the live service-desk agent.
- An entry for agent personas and shared context.
Keep the existing two entries. Dates from the actual merge history.

### 6.14 Contact (`content/contact/en.ts`)

Add to "What we can help with": **Connector and agent requests** (tell us which system you need an agent to work). This closes the connector lead funnel. Minor edit.

### 6.15 Footer tagline (`components/Footer.astro`, `i18n/en.json`)

Change `footer` tagline to: "The open-source platform your IT department runs on. Self-host it, or let us run it." Add Agents to the Product link group.

### 6.16 Legal and trial (defer / light)

- Legal pages: no rewrite now. They already need counsel review (A-12) and a pricing reconciliation (open item #3). Note only.
- Trial funnel: one optional line in `/trial/start` intro mentioning agents are included. Low priority, the funnel copy is constrained by the backend form (A-14).

---

## 7. i18n plan

- EN is authoritative, write all new and changed copy in `*/en.ts` first, fallback renders EN in other locales until translated (no broken pages).
- New content module `content/features/agents/{en,fr,de,es}.ts`, register the `agents` slug in `content/resolve.ts` and the `FeatureSlug` union, add routes `pages/features/agents.astro` plus the three locale variants.
- New chrome strings in `i18n/{en,fr,de,es}.json`: `nav.featuresAgents`, the dropdown group labels if grouped nav is built, footer Product Agents link, updated `footer` tagline. Fix the minor `nav.featuresAi` label inconsistency while here.
- After EN is locked, run `/extract` then `/translate` for fr/de/es. FR is hand-checked, DE and ES machine-generated then native-reviewed (consistent with current site state).

## 8. Screenshots needed (real, from the live agent UI, no mockups)

- Agent working a queue (the task list view).
- A single agent proposal showing the classification, the drafted action, and the sources it used.
- The autonomy setting for an agent.
- The agent activity / audit record.
- The agent settings (persona, targeting) for the "one runtime, any tool" section.

Drop PNGs in `public/screenshots/`, register `agents:[...]` in `content/screenshots.ts`.

## 9. Sequencing

**Phase 1, the core story (ship together):** spine locked (sections 1 to 4), Home rebuild, new Agents page, Plaid reframe, nav and footer. This alone makes the site tell the new story.

**Phase 2, coherence across the breadth:** Features hub, the four module pages (light passes and cross-links), Security (agent governance section), Pricing (agents included), FAQ (agents group).

**Phase 3, proof and finish:** Changelog entries, Contact edit, real screenshots, i18n extract and translate.

**Phase 4, polish and reconcile:** vision band and trust strip, per-page OG image for Agents, pricing and legal reconciliation, delete the stale `marketing/site/`.

Phase 1 can go live EN-first. Translations follow in Phase 3 without blocking.

## 10. Decisions (resolved 2026-06-26)

1. **Pillars wording.** Locked as written in 1.2. Supersedes A-1.
2. **Nav dropdown.** Flat list with Agents first (5.2). Grouped-by-layer dropped.
3. **Pricing.** Settled: single Hosted KANAP plan at €249/mo or €2,490/yr. All older tiers obsolete, purge from copy. Remaining task: reconcile the GTC legal doc (still lists Free/Starter/Standard) to the single plan before launch, with counsel. This is the only open item left on pricing.
4. **Hosted versus community emphasis.** Both paths are presented. The site leads Deploy free (community-first) because that is the likely entry point, hosted stays a clear, equally visible path since it is the monetization route. Trial funnel untouched.
5. **Footer tagline.** Locked (6.15): "The open-source platform your IT department runs on. Self-host it, or let us run it."

## 11. ASSUMPTIONS.md updates required

When this plan is accepted, update the decision log:
- **A-1 superseded:** new three pillars (1.2). Record the old pillars as retired.
- **A-5 extended:** AI surface is now Plaid (interaction) plus Agents (action), two surfaces over one record.
- **A-8 superseded:** single Hosted KANAP plan at €249/mo or €2,490/yr, all older tiers retired. GTC legal doc to be reconciled to the single plan (pending counsel).
- **Nav decision recorded:** features dropdown is a flat list with Agents first.
- **New A-entry:** the three-layer model as the site's organizing principle.
- **New A-entry:** the voice and anti-slop rules (section 2) and the vocabulary table (section 3) as binding for all copy.
- **New page:** `/features/agents` added to the sitemap (extends A-11).
- **Open item:** connector lead-capture funnel (Ask for a connector) as a conversion path alongside the trial.
