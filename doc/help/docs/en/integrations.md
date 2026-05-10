# Integrations

Use the Integrations page to connect KANAP to third-party tools that complement the data you already manage in the platform. Today, the page focuses on **GLPI ticket import** through Plaid; new integrations will be added here over time.

## Where to find it

- Workspace: **Admin**
- Path: **Admin → Integrations**
- Route: `/admin/integrations`
- Permission: `ai_settings:admin`
- Feature flag: shares the same `ai_settings` surface as the Plaid settings page. When the surface is off, the entry does not appear in the sidebar.

## GLPI Integration

[GLPI](https://glpi-project.org/) is a popular open-source IT service-management tool. The integration lets your team ask Plaid to find tickets in GLPI and import the relevant ones into KANAP as tasks, with a confirmation step on every import.

### How it works

1. An end user asks Plaid something like "import the open GLPI tickets assigned to my team".
2. Plaid queries GLPI through the credentials you configure here.
3. The candidate tickets are returned as a preview in the chat.
4. The user reviews the preview and clicks **Approve** for the tickets they want to bring into KANAP.
5. KANAP creates one task per approved ticket.

Nothing is written into KANAP without that explicit approval, so administrators can hand the integration to end users without worrying about silent data churn.

### Prerequisites

- **Plaid chat must be enabled** on your tenant. The page shows an info tooltip next to the section title to remind you of this dependency. The integration is configured tenant-by-tenant; the credentials below never leave your tenant.
- A GLPI instance reachable from KANAP over HTTPS.
- A **User Token** for a GLPI user account that has read access to the tickets you want to expose.
- An optional **App Token** if your GLPI instance requires application-level authentication.

### Fields

The configuration form contains:

- **Enable GLPI ticket import** — master switch for the integration. When off, Plaid will not attempt to query GLPI even if credentials are set.
- **GLPI URL** — the base URL of your GLPI instance, for example `https://glpi.example.com`.
- **User Token** — the personal API token of the GLPI account Plaid will use. Existing tokens are masked; leave the field blank during a save or test to keep the stored value.
- **App Token** — the optional GLPI application token. Same blank-to-keep behaviour as the user token.

### Actions

- **Save settings** — persists the form. Tokens entered in the form replace the stored ones; blank token fields keep what is already stored.
- **Test connection** — runs an authenticated round-trip against the GLPI URL using the values in the form (or, where blank, the stored values). The result banner shows success or the underlying error along with the latency.

### Secret storage

If your KANAP instance does not have a configured secret store, a helper text appears under each token field warning you that the values cannot be persisted. Configure secret storage at the instance level before relying on this integration in production.

## Tips

- **Use a dedicated GLPI account**: create a service account in GLPI with just enough permissions to read the ticket categories you want exposed. That keeps the audit trail clean and lets you revoke access without affecting a real user.
- **Test before announcing**: run **Test connection** after every change to URL or tokens. The error message is far more actionable than a failure that surfaces inside someone's chat conversation.
- **Pair with Plaid permissions**: only users with `ai_chat:reader` can ask Plaid to import tickets. Combine that with role-based access to tasks if you want to limit who actually creates task records from the imports.
- **Plan for token rotation**: GLPI personal tokens can be regenerated. When you do, save the new value here and run the connection test before users hit the integration again.
