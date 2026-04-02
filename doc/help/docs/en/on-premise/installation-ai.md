# AI-Assisted Installation

Instead of following the [step-by-step walkthrough](installation-example.md) manually, you can delegate the entire installation to a coding AI agent. One prompt, one server, one result.

Tools like [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) or [OpenAI Codex](https://openai.com/index/codex/) can read the KANAP documentation, install every dependency, configure all services, and verify the result — typically in under 15 minutes.

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Server** | Ubuntu 24.04 LTS (freshly provisioned, with root or sudo access) |
| **Internet** | The server needs outbound internet access during installation (packages, Docker images, GitHub clone, Let's Encrypt) |
| **DNS** | An A record pointing your desired hostname to the server's public IP |
| **AI agent** | A coding AI agent installed on the server (Claude Code, Codex, or similar) |

### Passwordless sudo

The AI agent runs many commands with `sudo`. To avoid being prompted for a password on every step, temporarily grant your user passwordless sudo:

```bash
sudo usermod -aG sudo $USER
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd
```

You will remove this at the end of the installation — see [After Installation](#after-installation).

## The Prompt

Open your AI agent on the server and paste the following prompt, replacing `kanap.example.com` with your actual hostname and `admin@example.com` with the desired admin email address:

```
Install KANAP on this Ubuntu 24.04 LTS server following the official
documentation:

- Overview:       https://doc.kanap.net/on-premise/
- Installation:   https://doc.kanap.net/on-premise/installation/
- Configuration:  https://doc.kanap.net/on-premise/configuration/

Make the application available at: https://kanap.example.com
Use admin@example.com as the admin email address.

Specifically:

1. Install Docker Engine, PostgreSQL 16, MinIO, and nginx.
2. Configure PostgreSQL with extensions citext, pgcrypto, and uuid-ossp,
   and a dedicated application role (NOSUPERUSER NOBYPASSRLS).
3. Set up MinIO as a systemd service and create the storage bucket.
4. Clone KANAP into /opt/kanap, create the .env file, build the Docker
   images, and start the containers.
5. Configure nginx as a reverse proxy with TLS certificates from
   Let's Encrypt (certbot). Set up automatic certificate renewal.
6. Generate strong random passwords for all credentials
   (database, MinIO, JWT secret).
7. Configure outbound email (see details below).
8. Verify the installation: API health check and frontend accessibility.

Document every phase in ~/kanap-install.md, including all shell commands,
configuration file contents, and the working .env (with secrets).
```

### Email configuration

Append **one** of the following blocks to the prompt to enable outbound email (password reset, invitations, notifications).

**Option A — Resend** (cloud email API):

```
Email transport — Resend:
- RESEND_API_KEY=re_xxxxx
- RESEND_FROM_EMAIL=KANAP <noreply@example.com>
```

**Option B — SMTP** (internal relay or provider):

```
Email transport — SMTP:
- SMTP_HOST=smtp.company.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=noreply@company.com
- SMTP_PASSWORD=secret
- SMTP_FROM=KANAP <noreply@company.com>
```

Replace the values with your actual credentials. If you skip email configuration, KANAP will still work — but password reset and invitations will be unavailable until you configure email manually later (see [Configuration](configuration.md)).

## What to Expect

The agent will read the linked documentation pages, then work through the installation autonomously:

1. **System packages** — installs Docker, PostgreSQL 16, nginx, certbot
2. **PostgreSQL** — creates the database, user, and required extensions
3. **MinIO** — installs the binary, creates a systemd service, provisions a bucket and service account
4. **KANAP** — clones the repository, generates credentials, writes `.env`, builds Docker images, starts containers
5. **TLS & nginx** — obtains a Let's Encrypt certificate, configures the reverse proxy with HTTPS, sets up auto-renewal
6. **Email** — configures the outbound email transport in `.env` (if provided)
7. **Verification** — checks the API health endpoint and frontend accessibility

The agent will ask for confirmation before running commands on your server. Once complete, the full installation log is saved to `~/kanap-install.md` for your records.

## After Installation

1. **Review your `.env` file** at `/opt/kanap/.env` — verify the generated credentials and adjust settings like organization name
2. **Configure email** if you haven't already — see [Configuration](configuration.md) for SMTP or Resend setup. Email enables password reset, invitations, and notifications.
3. **Log in** at `https://your-hostname` with the admin credentials from `.env`
4. **Change the admin password** — use the "Forgot password" link on the login page to receive a reset email (easiest method), or change it via user profile after logging in
5. **Read the [Operations](operations.md) guide** for upgrades, backups, and monitoring
6. **Remove passwordless sudo** — the installation is complete, restore normal security:

    ```bash
    sudo rm /etc/sudoers.d/90-install-nopasswd
    ```

!!! tip "Same result, different path"
    This prompt produces the same installation as the [manual walkthrough](installation-example.md). If you need to troubleshoot or customize individual components later, that guide remains the reference.
