# Plaid Settings

Use the Plaid settings page to configure how the chat assistant behaves for your tenant: which AI provider it talks to, which features are turned on, how long conversations are kept, and which keys can connect external MCP clients to your data. The page also gives administrators a usage overview so you can keep an eye on traffic and cost.

## Where to find it

- Workspace: **Admin**
- Path: **Admin → Plaid**
- Route: `/admin/ai`
- Permission: `ai_settings:admin`
- Feature flag: requires the `ai_settings` surface to be enabled. When the surface is off, the page shows a notice ("AI settings are disabled for this instance") and no controls are available.

## Provider

The Provider section is where you choose which large language model Plaid should use.

### Provider source

When the built-in provider is offered on your instance, you can pick between:

- **Plaid AI - Built-in**: KANAP's hosted Plaid AI service. Convenient, with a monthly message quota tracked per tenant.
- **Your own provider**: bring your own API key for **Anthropic**, **OpenAI**, **Ollama**, or a **custom** OpenAI-compatible endpoint. No quota beyond what your provider enforces.

When the built-in option is not offered (typical on-prem deployments), only the custom provider configuration is shown.

### Built-in usage

If you select the built-in provider, a usage card appears with:

- A progress bar of messages used this month against the per-tenant limit
- The reset date for the quota
- A short reminder that switching to your own keys removes the cap

### Custom provider configuration

Select **Your own provider** to expose:

- **Provider** — Anthropic, OpenAI, Ollama, or Custom (OpenAI-compatible)
- **Model** — the exact model identifier (e.g. `claude-sonnet-4-20250514`, `gpt-4o`, `llama3`)
- **Endpoint URL** — only for Ollama and Custom providers. For Ollama running on the host while KANAP runs in Docker, use `http://host.docker.internal:<port>/v1`.
- **API Key** — required when the provider needs one. Existing keys are masked; leave the field blank to keep the stored value during a save or test.

Once everything is set, click **Test connection** to run a no-cost ping against the provider. The result is shown in a banner with the provider, model, and round-trip latency.

### Status chips

The header of the Provider card shows three at-a-glance indicators:

- **Chat enabled / disabled** — the master switch for end-user chat
- **MCP enabled / disabled** — whether external MCP clients can connect
- **Provider ready / incomplete** — whether the provider configuration is valid

Validation errors (missing API key, wrong endpoint shape, unknown model) appear in a yellow warning above the form so you know exactly what to fix.

## Features

The Features section toggles the optional surfaces of Plaid:

- **Enable chat** — turns the in-app chat workspace on or off for end users
- **Enable MCP** — turns the MCP API on or off for external clients
- **Web search** — lets Plaid search the web (requires the `BRAVE_SEARCH_API_KEY` to be configured at the instance level; the toggle is disabled and tooltipped otherwise). Activating the toggle automatically runs a connectivity test.
- **Web enrichment** — lets Plaid follow up a search by fetching pages for richer context. Only available when web search is enabled.

## Retention

The Retention section limits how long Plaid keeps user content:

- **Conversation retention (days)** — conversations and their messages older than this value are eligible for deletion by the cleanup job. Leave empty to keep them indefinitely.

## MCP API Keys

The MCP (Model Context Protocol) section lets you mint long-lived API keys so external assistants and IDEs can talk to KANAP using the same data Plaid sees.

The card shows:

- A **Create key** button
- **Key max lifetime (days)** — the maximum lifetime any new key can be issued with. Leave empty for no expiration limit.
- A table of existing keys with **Label**, **Prefix**, **Created**, **Expires**, **Last used**, and **Status** (Active or Revoked)

### Creating a key

1. Click **Create key**.
2. Enter a descriptive **Label** (for example, "Desktop MCP client").
3. Click **Create**. KANAP generates a one-time secret.
4. Copy the secret immediately — it is shown once and cannot be retrieved later.

### Revoking a key

Click the trash icon on any active row to revoke the key. Revoked keys remain in the table for audit purposes but can no longer authenticate.

## Usage Overview

At the bottom of the page, the **Usage Overview** card surfaces tenant-wide chat metrics:

- **All conversations** — total number of conversations ever created
- **Active conversations (7d / 30d)** — conversations updated in the last 7 or 30 days
- **Active users (30d)** — unique users who chatted in the last 30 days

A **Token usage** table breaks down the **current month** and **last 30 days** windows by input tokens, output tokens, total tokens, and message count. Token totals are aggregated from chat messages (MCP traffic is not included).

## Tips

- **Test before saving**: the **Test connection** button validates credentials without writing anything. Use it before turning on chat for end users.
- **Rotate MCP keys**: prefer short-lived keys for shared workstations. The **Key max lifetime** field caps how long any new key can be issued for, regardless of the request.
- **Watch the token bar**: usage above 1M tokens per month on a single tenant typically means a few very long conversations are eating budget — encourage users to start fresh threads per topic.
- **Set retention**: leaving conversations forever is convenient until the database grows large or a compliance review asks how long chat content is kept. A common starting point is 90 or 180 days.
