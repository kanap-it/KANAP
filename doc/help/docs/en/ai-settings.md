# Plaid Settings

The provider you configure on this page is the default AI model for your whole tenant — it powers both the interactive [Plaid chat assistant](ai-assistant.md) and the automated [AI Agents](agents-overview.md) that triage tickets. So this is not a chat-only screen: choosing a provider, turning on multimodal support, or hitting a monthly limit affects the agents just as much as the chat box. The page also controls which AI surfaces are switched on, how long conversations are kept, which keys let external MCP clients reach your data, and it gives administrators a tenant-wide usage overview to keep an eye on traffic and cost.

## Where to find it

- Workspace: **Admin**
- Path: **Admin → Plaid**
- Route: `/admin/ai`
- Permission: `ai_settings:admin`
- Feature flag: requires the AI settings surface to be enabled. When it is off, the page shows a notice ("AI settings are disabled for this instance") and no controls are available.

---

## Provider

The **Provider** section chooses which large language model your tenant uses. The model you set here is what the Plaid chat assistant talks to *and* what every AI agent uses to read tickets, plan work, and draft replies — there is no separate model setting for agents.

### Provider source

When the built-in provider is offered on your instance, you can pick between:

- **Plaid AI - Built-in** — KANAP's hosted service, with a monthly message allowance tracked per tenant.
- **Your own provider** — bring your own API key for **Anthropic**, **OpenAI**, **Ollama**, or a **Custom** (OpenAI-compatible) endpoint. No allowance beyond what your own provider enforces.

When the built-in option is not offered (typical on-prem deployments), only the custom provider configuration is shown.

### Built-in usage

If you select the built-in provider, a **Built-in usage** card appears with:

- A progress bar of **messages used this month** against the per-tenant limit
- The **reset** date for the allowance
- A reminder that switching to your own keys removes the cap

The built-in allowance is shared across chat and MCP requests for this tenant, and a "message" is counted the same way it is in the [Usage Overview](#usage-overview) below — one chat question *or* one ticket reviewed by an agent. In other words, agent activity draws from the same monthly allowance as chat, so a busy agent fleet consumes it faster.

### Custom provider configuration

Select **Your own provider** to expose:

- **Provider** — Anthropic, OpenAI, Ollama, or Custom (OpenAI-compatible). Leave it on **None** to clear the setting.
- **Model** — the exact model identifier (for example `claude-sonnet-4-20250514`, `gpt-4o`, or `llama3`).
- **Endpoint URL** — shown only for Ollama and Custom providers. When Ollama runs on the host while KANAP runs in Docker, use `http://host.docker.internal:<port>/v1` rather than `localhost`.
- **API Key** — required when the provider needs one. Existing keys are masked; leave the field blank to keep the stored value during a save or test. If secret storage is not configured on the instance, the field says so.

Once everything is set, click **Test connection** to run a no-cost ping against the provider. The result appears in a banner with the provider, model, and round-trip latency.

### Multimodal LLM

The **Multimodal LLM** toggle controls whether the model is allowed to look at images. When it is on, both the chat assistant and the AI agents can read attached pictures — most usefully, the **ticket screenshots** requesters paste into a ticket, which agents then use as evidence when drafting a reply. Turn it on only if your configured model actually supports vision; turn it off if the model is text-only, otherwise image requests will fail. New tenants start with it enabled.

### Status chips

The header of the Provider card shows three at-a-glance indicators:

- **Chat enabled / Chat disabled** — the master switch for end-user chat
- **MCP enabled / MCP disabled** — whether external MCP clients can connect
- **Provider ready / Provider incomplete** — whether the provider configuration is valid and usable

Validation errors (missing API key, wrong endpoint shape, unknown model) appear in a warning above the form under **Current provider validation errors**, so you know exactly what to fix.

---

## Features

The **Features** section toggles the optional AI surfaces:

- **Enable chat** — turns the in-app chat workspace on or off for end users.
- **Enable MCP** — turns the MCP API on or off for external clients.
- **Web search** — lets the Plaid chat assistant search the web. It requires the instance-level web-search key to be configured; without it, the toggle is disabled and a tooltip explains why. Switching it on automatically runs a connectivity test and reports the result. This toggle applies to the **chat assistant only** — AI agents have their own, independent web-search setting on each agent's [Settings tab](agents-workspace.md), which relies on the same instance-level configuration.

---

## Retention

- **Conversation retention (days)** — chat conversations and their messages older than this value become eligible for automatic cleanup. Leave it empty to keep them indefinitely.

---

## MCP API Keys

The **MCP API Keys** section mints long-lived keys so external assistants and IDEs can talk to KANAP through the Model Context Protocol, using the same data Plaid sees.

The card shows a **Create key** button, the **Key max lifetime (days)** cap, and a table of existing keys with **Label**, **Prefix**, **Created**, **Expires**, **Last used**, and **Status** (**Active** or **Revoked**).

### Creating a key

1. Click **Create key**.
2. Enter a descriptive **Label** (for example, "Desktop MCP client").
3. Click **Create**. KANAP generates a one-time secret.
4. Copy the secret immediately — it is shown once and cannot be retrieved later.

The **Key max lifetime (days)** field caps how long any newly issued key can live, regardless of what the request asks for. Leave it empty for no expiration limit.

### Revoking a key

Click the trash icon on any active row to revoke the key. Revoked keys stay in the table for audit purposes but can no longer authenticate.

---

## Usage Overview

At the bottom of the page, the **Usage Overview** card summarizes AI activity for the whole organization. As the card explains, a **message** is one question sent to Plaid *or* one ticket reviewed by an agent — the same unit the included monthly volume counts.

The top row of metric cards covers chat conversations:

- **All conversations** — total conversations ever created
- **Active conversations (7d)** and **Active conversations (30d)** — conversations updated in the last 7 or 30 days
- **Active users (30d)** — unique users who chatted in the last 30 days

Below that, the **Token usage** table breaks down two windows — **Current month** and **Last 30 days** — into **Input tokens**, **Output tokens**, **Total tokens**, and **User messages** (the chat questions asked in each window).

If any agent has done work, an **Agent messages (this month)** block appears underneath. **All agents** shows the combined count of tickets reviewed this month across the fleet, and one card per agent shows that agent's own count; each card's caption reports the **Last 30 days** figure for the same scope. This is the tenant-wide counterpart to the per-agent numbers on the [agent workspace](agents-workspace.md) — use it to see which agents are doing the most work and to sanity-check that agent volume against your provider budget.

Token totals summarize the model input and output for each window; agent volume is tracked separately as the message counts in the **Agent messages** block rather than being broken out into its own token line here.

---

## Tips

- **Set the model with agents in mind.** Because agents share this provider, a cheaper text-only model saves money on chat but leaves your triage agents unable to read screenshots — decide with both jobs in view, and pair a vision-capable model with the **Multimodal LLM** toggle if agents will handle image-heavy tickets.
- **Test before you switch chat on.** The **Test connection** button validates credentials without writing anything or spending quota. Run it before turning on chat for end users or starting an agent.
- **Rotate MCP keys.** Prefer short-lived keys for shared workstations, and use **Key max lifetime (days)** to enforce a ceiling no request can exceed.
- **Watch the token totals and agent counts together.** A single month with very high totals usually traces back to a few long conversations or a heavy agent workload — the **Agent messages** block tells you which, so you can encourage fresh chat threads per topic or revisit an agent's checking cadence.
- **Set a retention window.** Keeping conversations forever is convenient until the database grows large or a compliance review asks how long chat content is kept — 90 or 180 days is a common starting point.
- **GLPI lives elsewhere.** The ticketing connection your agents work against is configured under **Admin → Integrations**, not here — see [Integrations](integrations.md).
