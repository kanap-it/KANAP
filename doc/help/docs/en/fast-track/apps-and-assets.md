---
title: "IT Ops Fast Track: From Application to Server"
description: Get your application landscape documented in minutes. A practical guide from app creation to server assignment.
---

# IT Ops Fast Track: From Application to Server

This guide walks you through documenting an application and its supporting infrastructure — from creating the app entry to linking it to the server that hosts it. It's designed to get you productive fast, covering the essential steps without drowning you in options.

For full details, see the [Apps & Services](../applications.md) and [Assets](../assets.md) reference docs.

---

## The Big Picture

![Application to Server Overview](images/app-to-server-overview.png)

Everything in KANAP's IT Operations module connects to paint a complete picture of your landscape:

| Object | What it represents |
|--------|--------------------|
| **Application** | A business app or IT service you need to document |
| **Environment** | Where it runs — Prod, QA, Dev, etc. (called "Instances" in KANAP) |
| **Server (Asset)** | The infrastructure that hosts it — VMs, physical servers, containers |
| **Location** | Where the server lives — data center, cloud region, colo |

The chain is simple: **Application → Environment → Server → Location**. By the end of this guide, you'll have this chain fully documented.

![Application Relationship Model](images/app-relationship-model.png)

!!! info "Why this matters"
    When someone asks "where does this app run?", "who owns it?", or "is it compliant?" — you'll have the answer in seconds instead of digging through spreadsheets.

---

## Step 1: Create Your Application

Go to **IT Operations → Apps & Services** and click **+ New App / Service**.

Fill in the essentials:

| Field | What to enter | Example |
|-------|--------------|---------|
| **Name** | A clear, recognizable name | `Salesforce CRM` |
| **Category** | The primary purpose | `Line-of-business` |
| **Vendor** | The supplier (from your master data) | `Salesforce Inc` |
| **Criticality** | Business importance | `Business critical` |
| **Lifecycle** | Current status | `Active` |

Click **Save**. Your application is now in the registry.

!!! tip "Start with what you know"
    Description, publisher, version, licensing — all useful, but optional at this stage. You can enrich later. The goal is to get the app into the system.

---

## Step 2: Add an Environment (Instance)

Every application runs somewhere. The **Instances** tab documents your environments.

Open your application and go to the **Instances** tab. Click **Add** and select **Production** (or whichever environment you want to document first).

For each instance, you can capture:

| Field | What it does | Example |
|-------|-------------|---------|
| **Base URL** | The access URL | `https://mycompany.salesforce.com` |
| **Region / Zone** | Geographic deployment | `EU West` |
| **SSO Enabled** | Is Single Sign-On active? | `Yes` |
| **MFA Supported** | Is Multi-Factor Authentication supported? | `Yes` |
| **Lifecycle** | Instance-specific status | `Active` |

!!! tip "Copy from Prod"
    Once your Production instance is set up, use the **Copy from Prod** button to quickly scaffold QA, Dev, and other environments with similar settings.

Instance changes save immediately — no need to hit the main Save button.

---

## Step 3: Assign Owners

Go to the **Ownership & Audience** tab. This is where you document who's responsible.

### Business Owners

The business stakeholders accountable for the application. Add one or more people — their job title will appear automatically.

### IT Owners

The IT team members responsible for technical operations and support. Same mechanism — add the people, roles appear.

### Audience (Optional)

Select which **Companies** and **Departments** use this application. KANAP automatically calculates the number of users based on your master data.

!!! warning "Why owners matter"
    Ownership drives the **My Apps** and **My Team's Apps** scope filters on the main list. Without owners, the app is only visible in the "All Apps" view — which means nobody feels responsible for it.

---

## Step 4: Set Access Methods

Go to the **Technical & Support** tab. Under **Access Methods**, select how users reach this application:

- 🌐 **Web** — browser-based access
- 💻 **Locally installed application** — desktop client
- 📱 **Mobile application** — phone/tablet app
- 🖥️ **VDI / Remote Desktop** — virtual desktop
- ⌨️ **Terminal / CLI** — command-line interface
- 🏭 **Proprietary HMI** — industrial interface
- 🖧 **Kiosk** — dedicated terminal

Also set:

| Field | What it means |
|-------|--------------|
| **External Facing** | Is this app accessible from the internet? |
| **Data Integration / ETL** | Does this app participate in data pipelines? |

---

## Step 5: Link to Other Objects (Relations)

Go to the **Relations** tab to connect your application to the rest of your IT management data.

| Link type | What you're connecting | Why |
|-----------|----------------------|-----|
| **OPEX Items** | Recurring costs (licenses, SaaS fees) | See the full cost picture |
| **CAPEX Items** | Capital expenditure projects | Track investment |
| **Contracts** | Vendor agreements | Know when renewals are due |
| **URLs** | Documentation, wikis, runbooks | Quick access to external resources |

!!! tip "You can do this later"
    Relations are powerful but not blocking. Create them when you have the data — the app is fully functional without them.

---

## Step 6: Add Compliance Information

Go to the **Compliance** tab. This is increasingly important for audits and regulatory requirements.

| Field | What to enter | Example |
|-------|--------------|---------|
| **Data Class** | Sensitivity level | `Confidential` |
| **Contains PII** | Stores personal data? | `Yes` |
| **Data Residency** | Countries where data is stored | `France, Germany` |
| **Last DR Test** | Last disaster recovery test date | `2025-11-15` |

!!! info "Data Classes are configurable"
    The default classes (Public, Internal, Confidential, Restricted) can be customized in **IT Operations → Settings** to match your organization's data classification policy.

---

## Step 7: Create a Location (if needed)

Before creating a server, you need a **Location** where it lives. If you already have locations configured, skip to Step 8.

Go to **IT Operations → Locations** and click **Add Location**.

| Field | What to enter | Example |
|-------|--------------|---------|
| **Code** | A short unique code | `DC-EU-PARIS` |
| **Name** | Descriptive name | `Paris Datacenter` |
| **Hosting Type** | The type of facility | `On-premises datacenter` |
| **Country** | Geographic location | `France` |
| **City** | City | `Paris` |

!!! info "Location = many derived attributes"
    The Location is powerful because it automatically determines:

    - **Hosting type** (on-prem, cloud, colo) → shown on assets and apps
    - **Provider** (AWS, Azure, etc.) → derived for cloud locations
    - **Country** → enables geographic reporting and compliance
    - **Network subnets** → configured per location for IP validation

    One location record enriches every asset assigned to it. Set it up once, benefit everywhere.

---

## Step 8: Create Your Server (Asset)

Go to **IT Operations → Assets** and click **Add Asset**.

Fill in the core fields:

| Field | What to enter | Example |
|-------|--------------|---------|
| **Name** | Hostname or identifier | `PROD-WEB-01` |
| **Asset Type** | The server's role | `Virtual Machine` |
| **Environment** | Which environment | `Production` |
| **Location** | Where it's hosted | `DC-EU-PARIS` |
| **Lifecycle** | Current status | `Active` |

Click **Save** to unlock the full workspace.

### Technical Details

Go to the **Technical** tab to add:

- **Operating System**: e.g., `Ubuntu 24.04 LTS`
- **Hostname** / **Domain** / **FQDN**: Network identity (FQDN is auto-computed)
- **Aliases**: Additional DNS names
- **IP Addresses**: Add one or more entries with type, address, and subnet

!!! tip "Naming conventions"
    Include environment, role, and sequence in your names: `prod-web-01`, `qa-db-master`, `dev-app-02`. Your future self will thank you.

---

## Step 9: Link the Server to Your Application

This is the final connection — tying your server to the application environment it supports.

There are **two ways** to make this link:

### From the Application side

1. Open your application
2. Go to the **Servers** tab
3. Select the **Production** environment
4. Click **Add Server**
5. Select your asset (`PROD-WEB-01`)
6. Set the **Role** (Web, Database, Application, etc.)

### From the Asset side

The asset's **Assignments** column in the list shows how many applications are linked. This is read-only from the asset — assignments are always managed from the Application's Servers tab.

!!! success "The chain is complete"
    You now have the full path documented:

    **Salesforce CRM** → **Production instance** → **PROD-WEB-01** → **DC-EU-PARIS**

    Anyone can trace from "what app?" to "what server?" to "where is it?" in seconds.

---

## How It All Connects

Every piece of data you enter feeds into something bigger:

### Application Landscape View

Your Apps & Services list becomes a live registry showing every application with its environments, criticality, hosting type, and ownership — filterable by any attribute.

### Infrastructure Mapping

Assets linked to application instances let you answer questions like:
- "Which servers support this business-critical app?"
- "What applications will be affected if this server goes down?"
- "How many apps are hosted in this datacenter?"

### Compliance Reporting

Data classification, PII flags, and data residency flow into compliance views. When the auditor asks "where is customer data stored?", you have a documented, traceable answer.

### Connection Map

Once assets are documented, you can create **Connections** between them to visualize network flows and dependencies. See [Connection Map](../connection-map.md).

---

## Quick Reference

| I want to… | Go to… |
|------------|--------|
| Create an application | IT Operations → Apps & Services → + New |
| Add environments | Open app → Instances tab |
| Assign owners | Open app → Ownership & Audience tab |
| Set access methods | Open app → Technical & Support tab |
| Link budgets/contracts | Open app → Relations tab |
| Add compliance info | Open app → Compliance tab |
| Create a location | IT Operations → Locations → Add Location |
| Create a server | IT Operations → Assets → Add Asset |
| Link server to app | Open app → Servers tab → Add Server |
| View connections | IT Operations → Connection Map |
| Configure dropdowns | IT Operations → Settings |

---

!!! success "You're ready"
    You now know how to document the full chain from application to server. Start with your most critical apps, add their production environments, link the servers — and you'll have a living, queryable IT landscape in no time. For detailed documentation on every feature, explore the [Apps & Services](../applications.md) and [Assets](../assets.md) reference sections.
