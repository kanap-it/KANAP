# On-Premise: Microsoft Entra SSO Setup

This guide explains how to enable Microsoft Entra (Azure AD) SSO for an on-premise KANAP deployment.
Entra SSO is optional; if you do not configure it, local email/password authentication remains available.

## Overview

KANAP uses the OAuth2/OIDC authorization code flow as a confidential client.
Each on-prem customer **must register their own Entra application** and provide its client ID/secret.

### What the customer provides

- An Entra App Registration **in their tenant**
- `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET`
- `ENTRA_AUTHORITY` pointing to their tenant
- `ENTRA_REDIRECT_URI` matching their KANAP URL

## Prerequisites

- A public HTTPS URL for KANAP (reverse proxy in front of the API)
- Ability to create an App Registration and grant admin consent in Entra
- Outbound connectivity from the KANAP API container to:
  - `login.microsoftonline.com` (OIDC metadata, token exchange, JWKS)
  - `graph.microsoft.com` (optional profile enrichment)

## Step 1: Create an App Registration (Entra)

1. Open **Microsoft Entra ID → App registrations → New registration**
2. Name: `KANAP (on-prem)`
3. Supported account types: **Single tenant** (recommended)
4. Redirect URI (Web):  
   `https://<your-kanap-domain>/api/auth/entra/callback`
5. Save and record:
   - **Application (client) ID**
   - **Directory (tenant) ID**

## Step 2: Create a Client Secret

1. Go to **Certificates & secrets**
2. Create a new **Client secret**
3. Copy the **secret value** (it is shown only once)

## Step 3: API Permissions

KANAP requests the following scopes during Entra sign-in:

- `openid profile email offline_access`
- `User.Read` (Microsoft Graph, for profile enrichment)

Ensure **Microsoft Graph → User.Read (Delegated)** is allowed and grant admin consent if required.

If you prefer not to allow Graph calls, set:

```
ENTRA_ENRICH_PROFILE=false
```

## Step 4: Configure KANAP Environment Variables

Set the following in your on-prem `.env`:

```bash
# Entra SSO (on-prem)
ENTRA_CLIENT_ID=<application-client-id>
ENTRA_CLIENT_SECRET=<client-secret>
ENTRA_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
ENTRA_REDIRECT_URI=https://kanap.company.com/api/auth/entra/callback
```

Notes:
- `ENTRA_AUTHORITY` should be **tenant-specific** for on-prem.
- `ENTRA_REDIRECT_URI` must match **exactly** what you registered in Entra.
- Make sure `APP_BASE_URL` is set to the public URL so the post-login redirect is correct.

## Step 5: Restart KANAP

After updating `.env`, restart your containers so the API picks up the new configuration.

## Step 6: Connect Entra in KANAP

1. Log in as an admin
2. Go to **Admin → Authentication**
3. Click **Connect Microsoft Entra**
4. Approve consent in Entra
5. Use **Test Sign-In** to confirm end-to-end login

## Troubleshooting

- **SSO_NOT_CONFIGURED**: Entra env vars are missing or tenant is not connected.
- **ENTRA_TENANT_MISMATCH**: You connected one tenant but are trying to sign in from another.
- **Invalid Entra state / nonce**: Cookie blocked or HTTPS misconfigured.
- **Bad redirect after login**: Check `APP_BASE_URL` and reverse proxy headers (`Host`, `X-Forwarded-Proto`).

## Security Notes

- Do not commit `ENTRA_CLIENT_SECRET` to git.
- Rotate the secret periodically.
- Use a dedicated app registration.
