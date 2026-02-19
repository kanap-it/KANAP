# Fromage & Co — Demo Tenant Setup Guide

This guide walks through setting up the Fromage & Co demo tenant in KANAP. It covers CSV imports (numbered files) and manual configuration steps that can't be imported.

**Estimated time:** 45-60 minutes

---

## 1. Create the Tenant

1. Create a new tenant via platform admin (cloud) or activation flow (on-prem)
2. Set tenant name: **Fromage & Co** (code **Fromage**)
3. Confirm fiscal year: **Y-1 = 2025, Y = 2026, Y+1 = 2027**

---

## 2. Configure Settings (before any import)

These settings must exist before importing assets, portfolio projects, requests, and tasks.

### Automated Setup

Run the settings script before importing CSV files:

```bash
cd fixtures/fromage-co
chmod +x setup-settings.sh
./setup-settings.sh <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>

# Examples:
./setup-settings.sh http://localhost:5173 thomas.berger@fromage-co.com MyPass123   # local
./setup-settings.sh https://fromage.qa.kanap.net thomas.berger@fromage-co.com ...  # QA
```

`BASE_URL` is the tenant root URL **without** `/api` (the script adds it).
Use the tenant administrator credentials from step 1.

This creates IT Ops settings (server kinds, operating systems, domains), portfolio classification (sources, categories, streams), and analytics categories.
The script is idempotent — safe to run multiple times.

> **Note:** Default task types (Task, Bug, Problem, Incident) are automatically provisioned when the tenant is created — they do not need to be configured manually or by this script.

<details>
<summary>Settings reference (what the script creates)</summary>

### 2.1 Portfolio Configuration

**Sources:**
| Name | Description |
|------|-------------|
| Strategic Plan | Multi-year strategic roadmap initiatives |
| IT Modernization | Technical debt reduction and platform upgrades |
| Business Request | Ad-hoc requests from business stakeholders |
| Regulatory Compliance | Regulatory and legal requirements |

**Categories:**
| Name | Description |
|------|-------------|
| Digital Transformation | Innovation and digital business capabilities |
| Business Applications | ERP, CRM, HR and core business systems |
| Infrastructure | Servers, networks, cloud and datacenter |
| Security & Compliance | Cybersecurity, identity and compliance |
| Data & Analytics | BI, data platforms and advanced analytics |

**Streams:**
| Name | Parent Category | Description |
|------|----------------|-------------|
| Cheese Production Excellence | Digital Transformation | Optimize production, aging and quality |
| Customer Experience | Business Applications | Improve B2B and B2C customer interactions |
| IT Foundation | Infrastructure | Core IT infrastructure and shared services |

### 2.2 Asset Configuration

**Server Kinds (added):**
| Code | Label | Physical |
|------|-------|----------|
| storage | Storage | Yes |
| network_switch | Network Switch | Yes |
| iot_gateway | IoT Gateway | Yes |
| edge_node | Edge Node | No |
| cloud_instance | Cloud Instance | No |
| cloud_database | Cloud Database | No |

**Operating Systems (added):** VMware ESXi 8.0, SUSE Linux Enterprise 15, FortiOS 7.4, Cisco Meraki, Schneider EcoStruxure, Amazon Linux 2023, Amazon RDS

**Domains (added):** fromage-co.local, kaasmeester.local, formaggio-supremo.local

### 2.3 Analytics Categories

Productivity, ERP, CRM, ITSM, HR, Security, Infrastructure, Monitoring, IoT, Traceability, Analytics, Managed Services, Professional Services, Training, General

</details>

---

## 3. CSV Import Order

Import files in numbered order. Each file depends on entities created by previous files.

| #   | File                        | Entity             | Notes                                                                                             |
| --- | --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| 01  | `01-companies.csv`          | Companies          | 4 companies (FR, NL, IT, US)                                                                      |
| 02  | `02-accounts-ifrs.csv`      | Accounts           | Import into the **default IFRS CoA** — skip if accounts 6100-6400 already exist                   |
| 03  | `03-accounts-fr.csv`        | Accounts           | Create a new CoA named **"PCG — France"**, import into it                                         |
| 04  | `04-accounts-nl.csv`        | Accounts           | Create a new CoA named **"RGS — Netherlands"**, import into it                                    |
| 05  | `05-accounts-it.csv`        | Accounts           | Create a new CoA named **"PdC — Italia"**, import into it                                         |
| 06  | `06-accounts-us.csv`        | Accounts           | Create a new CoA named **"US GAAP"**, import into it                                              |
| 07  | `07-suppliers.csv`          | Suppliers          | 27 suppliers                                                                                      |
| 08  | `08-departments.csv`        | Departments        | 24 departments across 4 companies                                                                 |
| 09  | `09-contacts.csv`           | Contacts           | 16 external contacts                                                                              |
| 10  | `10-users.csv`              | Users              | 15 users — they will receive invitation emails!                                                   |
| 11  | `11-business-processes.csv` | Business Processes | 12 processes                                                                                      |
| 12  | `12-applications.csv`       | Applications       | 50 applications                                                                                   |
| 13  | `13-contracts.csv`          | Contracts          | 15 contracts (14 EUR + 1 USD)                                                                     |
| 14  | `14-spend-items.csv`        | Spend Items        | 27 items (~€3M + ~$190K)                                                                          |
| 15  | `15-capex-items.csv`        | CAPEX Items        | 3 items                                                                                           |
| 16  | `16-portfolio-projects.csv` | Portfolio Projects | 8 projects (requires sources/categories/streams from step 2.1)                                    |
| 17  | `17-portfolio-requests.csv` | Portfolio Requests | 4 requests (requires sources/categories/streams from step 2.1)                                    |
| 18  | `18-assets.csv`             | Assets             | 35 assets (requires locations from step 4 + server kinds/OS from step 2.2)                        |
| 19  | `19-tasks.csv`              | Tasks              | 27 tasks with type (Task/Bug/Problem/Incident) — requires projects/contracts/spend items to exist |

**Important notes:**
- Users import (#10) will trigger invitation emails — use test email addresses or disable email sending in your environment
- For spend items (#14), the `company_name` column sets the paying company directly; the `account_number` is validated against that company's CoA, so CoA assignment (step 5) should ideally be done first
- Asset import (#18) requires locations to be created manually first (step 4)
- **Human-readable IDs** (T-1, PRJ-1, REQ-1, etc.) are auto-assigned during import for projects, requests and tasks — no CSV column needed

---

## 4. Create Locations (manual — before asset import)

Go to **IT Operations > Locations** and create:

| Code     | Name               | Type            | Address                      | City     | Country       | Notes                                                     |
| -------- | ------------------ | --------------- | ---------------------------- | -------- | ------------- | --------------------------------------------------------- |
| PAR-DC1  | Paris Data Center  | Data Center     | 12 Rue du Camembert          | Paris    | France        | Main DC — 4 racks, hosts all on-prem VMs                  |
| GOU-DC1  | Gouda Server Room  | Server Room     | Goudsesingel 42              | Gouda    | Netherlands   | Single rack — Kaasmeester local infra                     |
| PRM-SITE | Parma Server Room  | Server Room     | Via Parmigiano 7             | Parma    | Italy         | Single rack — Formaggio Supremo local infra               |
| PAR-CAVE | Paris Cheese Caves | Production Site | 15 Rue de l'Affinage         | Paris    | France        | IoT-monitored aging caves — 2 of 8 caves instrumented     |
| NYC-OFF  | New York Office    | Office          | 350 Fifth Avenue, Suite 4200 | New York | United States | US distribution office — managed by Atlantic IT Solutions |
| AWS-EU   | AWS eu-west-1      | Cloud Region    | -                            | Dublin   | Ireland       | AWS Ireland region — La Boutique infrastructure           |

---

## 5. Assign Charts of Accounts to Companies

Go to **Budget > Chart of Accounts** for each CoA and assign:

| Company | Chart of Accounts |
|---------|------------------|
| Fromage & Co SA | PCG — France |
| Kaasmeester BV | RGS — Netherlands |
| Formaggio Supremo SRL | PdC — Italia |
| Fromage & Co Inc. | US GAAP |

This step is **critical** — spend items reference account numbers that must resolve within the company's assigned CoA.

---

## 6. Post-Import Manual Configuration

### 6.1 Application Suite Relationships

Go to each suite application and add its members:

**Microsoft 365** (suite — mark `is_suite: true`):
- Exchange Online
- Microsoft Teams
- SharePoint Online
- OneDrive for Business

**SAP** (not a formal suite, but link via related applications if supported)

### 6.2 Application ↔ Department Links

Link applications to their primary user departments:

| Application | Departments |
|-------------|-------------|
| Microsoft 365 | All departments (all 4 companies) |
| SAP S/4HANA | Finance & Controlling, Production, Procurement, Logistics |
| SAP BW/4HANA | Finance & Controlling, Direction Générale |
| Salesforce Sales Cloud | Sales & Marketing, Sales (NL), Commerciale (IT), Sales (US) |
| Salesforce Service Cloud | Sales & Marketing |
| Workday HCM | Human Resources |
| ServiceNow ITSM | IT & Digital |
| Okta Workforce Identity | IT & Digital |
| QuickBooks Online | Finance (US) |
| Sage X3 | Finance (NL), Amministrazione (IT) |
| CheeseTrack | Production, Quality & R&D, Produzione (IT) |
| CaveGuard IoT | Production |
| Power BI | Finance & Controlling, Direction Générale, Sales & Marketing |
| La Boutique du Fromage | Sales & Marketing, IT & Digital |
| Fromage B2B Portal | Sales & Marketing, Logistics |

### 6.3 Application Instances

For key multi-entity applications, create instances:

**SAP S/4HANA:**
- Instance "SAP FR Production" → Fromage & Co SA, environment: Production
- Instance "SAP FR Test" → Fromage & Co SA, environment: Test

**Sage X3:**
- Instance "Sage X3 — Kaasmeester" → Kaasmeester BV, environment: Production
- Instance "Sage X3 — Formaggio Supremo" → Formaggio Supremo SRL, environment: Production

**Microsoft 365:**
- Instance "M365 — Group" → Fromage & Co SA, environment: Production (group-wide)

### 6.4 Interfaces (~10)

Go to **IT Operations > Interfaces** and create:

| Name | Source | Target | Type | Frequency | Notes |
|------|--------|--------|------|-----------|-------|
| SAP → Salesforce Sync | SAP S/4HANA | Salesforce Sales Cloud | API | Real-time | Customer master and pricing via Talend |
| SAP → Power BI Feed | SAP BW/4HANA | Power BI | ETL | Daily | Financial and operational KPIs |
| Salesforce → HubSpot | Salesforce Sales Cloud | HubSpot Marketing Hub | API | Real-time | Lead handoff and campaign attribution |
| CheeseTrack → SAP | CheeseTrack | SAP S/4HANA | API | Hourly | Production batch and traceability data |
| CaveGuard → Datadog | CaveGuard IoT | Datadog | API | Real-time | IoT metrics forwarding for alerting |
| CaveGuard → Cave Dashboard | CaveGuard IoT | Cave Monitoring Dashboard | API | Real-time | Grafana data source |
| Okta → All SaaS | Okta Workforce Identity | Microsoft 365 | SCIM | Real-time | User provisioning and deprovisioning |
| Workday → Okta | Workday HCM | Okta Workforce Identity | SCIM | Real-time | HR-driven identity lifecycle |
| Datadog → PagerDuty | Datadog | PagerDuty | Webhook | Real-time | Alert escalation to on-call |
| Talend → Snowflake | Talend Data Integration | Snowflake | ETL | Daily | Project Fondue data feeds (pilot) |

### 6.5 Connections (~4)

Go to **IT Operations > Connections** and create:

| Name | Type | Source | Target | Notes |
|------|------|--------|--------|-------|
| Paris–Gouda MPLS | WAN | PAR-DC1 | GOU-DC1 | 100 Mbps MPLS link |
| Paris–Parma MPLS | WAN | PAR-DC1 | PRM-SITE | 100 Mbps MPLS link |
| Paris–NYC VPN | VPN | PAR-DC1 | NYC-OFF | Site-to-site IPSec VPN over internet |
| Paris–AWS VPN | VPN | PAR-DC1 | AWS-EU | AWS Site-to-Site VPN, 2 tunnels |

### 6.6 Department Hierarchy

Set parent departments for subsidiaries if the feature supports it:

- Kaasmeester BV > Management → reports to Direction Générale
- Formaggio Supremo SRL > Direzione → reports to Direction Générale
- Fromage & Co Inc. > Management → reports to Direction Générale

### 6.7 Spend & CAPEX Allocations

For key cross-entity spend items, add cost allocations:

| Spend Item | Fromage & Co SA | Kaasmeester BV | Formaggio Supremo SRL | Fromage & Co Inc. |
|------------|-----------------|----------------|----------------------|-------------------|
| Microsoft Enterprise (M365 + Azure + GitHub) | 55% | 20% | 15% | 10% |
| Okta Workforce Identity | 60% | 15% | 15% | 10% |
| Sophos Enterprise Security | 55% | 20% | 15% | 10% |
| Network & Telecom Services | 40% | 25% | 25% | 10% |

For CAPEX items:
| CAPEX Item | Fromage & Co SA | Kaasmeester BV | Formaggio Supremo SRL |
|------------|-----------------|----------------|----------------------|
| SAP Cheddar Migration | 60% | 20% | 20% |

### 6.8 Contract ↔ Application Links

Link contracts to the applications they cover:

| Contract | Applications |
|----------|-------------|
| Microsoft Enterprise Agreement | Microsoft 365, Exchange Online, Microsoft Teams, SharePoint Online, OneDrive for Business, GitHub Enterprise |
| SAP Maintenance & Support | SAP S/4HANA, SAP BW/4HANA, SAP Concur |
| Salesforce Subscription | Salesforce Sales Cloud, Salesforce Service Cloud |
| ServiceNow Platform | ServiceNow ITSM |
| Workday HCM | Workday HCM |
| OVHcloud Infrastructure | VMware vSphere (hosting) |
| Okta Workforce Identity | Okta Workforce Identity |
| Sophos Enterprise Agreement | Sophos Intercept X |
| Broadcom VMware ELA | VMware vSphere |
| Schneider IoT Services | CaveGuard IoT |
| CheeseTrack SaaS | CheeseTrack |
| Sage X3 Subscription | Sage X3 |
| Fortinet FortiCare | Fortinet FortiGate |
| Axians Infogérance | (managed services — link to all on-prem apps) |
| US Managed IT Services | (link to QuickBooks, M365 US instance) |

### 6.9 Spend ↔ Application Links

Link spend items to relevant applications:

| Spend Item | Applications |
|------------|-------------|
| Microsoft Enterprise (M365 + Azure + GitHub) | Microsoft 365, GitHub Enterprise |
| SAP S/4HANA Maintenance | SAP S/4HANA |
| SAP BW/4HANA License | SAP BW/4HANA |
| Salesforce (Sales + Service Cloud) | Salesforce Sales Cloud, Salesforce Service Cloud |
| ServiceNow ITSM Platform | ServiceNow ITSM |
| Workday HCM | Workday HCM |
| OVHcloud Infrastructure | VMware vSphere |
| AWS Cloud Hosting | La Boutique du Fromage |
| Datadog Monitoring | Datadog |
| Okta Workforce Identity | Okta Workforce Identity |
| Sophos Enterprise Security | Sophos Intercept X |
| VMware vSphere Licensing | VMware vSphere |
| CaveGuard IoT Platform | CaveGuard IoT |
| CheeseTrack SaaS | CheeseTrack |
| Various SaaS Bundle | HubSpot Marketing Hub, Zoom Workplace, Figma, Coupa Procurement, PagerDuty, Adobe Acrobat Pro |
| Fortinet FortiCare & FortiGuard | Fortinet FortiGate |

### 6.10 Portfolio Project Phases & Milestones

For the 3 in-progress projects, add phases to show timeline detail:

**Fromage-as-a-Service:**
1. Discovery & UX Design (2025-06 → 2025-09) ✓ Complete
2. MVP Development (2025-09 → 2026-03) — In progress
3. Beta Testing (2026-03 → 2026-06) — Upcoming
4. Launch & Scale (2026-06 → 2026-09) — Upcoming

**Zero Trust Fromage:**
1. Assessment & Architecture (2025-04 → 2025-08) ✓ Complete
2. Network Segmentation (2025-09 → 2026-02) — In progress
3. Identity Hardening (2026-02 → 2026-05) — Upcoming
4. Validation & Audit (2026-05 → 2026-06) — Upcoming

**Workday Global Rollout:**
1. France Go-Live (2025-04 → 2025-07) ✓ Complete
2. Netherlands Rollout (2025-09 → 2026-03) — In progress
3. Italy Rollout (2026-03 → 2026-08) — Upcoming
4. US Rollout (2026-08 → 2026-12) — Upcoming

### 6.11 Project Team Members

For active projects, add team members:

**Fromage-as-a-Service:** Amélie Rousseau (IT Lead), Isabelle Moreau (Business Lead), Clara Dupont (PM), Hugo Mercier (Data)

**Zero Trust Fromage:** Lucas Bernard (IT Lead), Pierre Martin (Infra), Thomas Berger (Sponsor)

**Workday Global Rollout:** Sophie Laurent (IT Lead), Marie Fontaine (Business Lead), Jan Bakker (NL coordinator), Luca Ferrari (IT coordinator)

---

## 7. Final Checks

After completing all steps, verify:

- [ ] **Dashboard** shows ~€3M OPEX budget with EUR and USD currencies
- [ ] **Applications** list shows 50 apps with lifecycle diversity (proposed, active, deprecated, retired)
- [ ] **Assets** shows 35 assets across 6 locations on the map/grid view
- [ ] **Portfolio** shows 8 projects (2 done, 3 in progress, 2 planned, 1 waiting list) and 4 requests
- [ ] **Contracts** shows 15 contracts with renewal dates
- [ ] **Budget consolidation** works across IFRS accounts (6100-6400)
- [ ] **Multi-currency** — US items display in USD, consolidated in EUR
- [ ] **Tasks** shows 27 tasks across 4 types (Task, Bug, Problem, Incident) linked to projects/contracts/spend items
- [ ] **Business Processes** shows 12 processes

---

## Appendix: Company Overview

| Entity | Country | Currency | Headcount | IT Budget Share |
|--------|---------|----------|-----------|-----------------|
| Fromage & Co SA | France | EUR | 1,200 | ~75% |
| Kaasmeester BV | Netherlands | EUR | 400 | ~10% |
| Formaggio Supremo SRL | Italy | EUR | 300 | ~8% |
| Fromage & Co Inc. | USA | USD | 150 | ~7% |

**Total group:** ~2,050 employees, ~€3.2M IT OPEX, 3 CAPEX programs
