# AI-gestützte Installation

Anstatt der [schrittweisen Anleitung](installation-example.md) manuell zu folgen, können Sie die gesamte Installation an einen Coding-AI-Agenten delegieren. Ein Prompt, ein Server, ein Ergebnis.

Werkzeuge wie [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) oder [OpenAI Codex](https://openai.com/index/codex/) können die KANAP-Dokumentation lesen, jede Abhängigkeit installieren, alle Dienste konfigurieren und das Ergebnis verifizieren – typischerweise in unter 15 Minuten.

## Voraussetzungen

| Anforderung | Details |
|-------------|---------|
| **Server** | Ubuntu 24.04 LTS (frisch bereitgestellt, mit root- oder sudo-Zugriff) |
| **Internet** | Der Server benötigt während der Installation ausgehenden Internetzugang (Pakete, Docker-Images, GitHub-Klon, Let's Encrypt) |
| **DNS** | Ein A-Record, der Ihren gewünschten Hostnamen auf die öffentliche IP des Servers verweist |
| **AI-Agent** | Ein Coding-AI-Agent, der auf dem Server installiert ist (Claude Code, Codex oder ähnlich) |

### Passwortloses sudo

Der AI-Agent führt viele Befehle mit `sudo` aus. Um zu vermeiden, dass bei jedem Schritt nach einem Passwort gefragt wird, gewähren Sie Ihrem Benutzer vorübergehend passwortloses sudo:

```bash
sudo usermod -aG sudo $USER
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd
```

Sie werden dies am Ende der Installation entfernen – siehe [Nach der Installation](#nach-der-installation).

## Der Prompt

Öffnen Sie Ihren AI-Agenten auf dem Server und fügen Sie den folgenden Prompt ein, wobei Sie `kanap.example.com` durch Ihren tatsächlichen Hostnamen und `admin@example.com` durch die gewünschte Admin-E-Mail-Adresse ersetzen:

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

### E-Mail-Konfiguration

Fügen Sie dem Prompt **einen** der folgenden Blöcke an, um ausgehende E-Mails zu aktivieren (Passwort-Reset, Einladungen, Benachrichtigungen).

**Option A — Resend** (Cloud-E-Mail-API):

```
Email transport — Resend:
- RESEND_API_KEY=re_xxxxx
- RESEND_FROM_EMAIL=KANAP <noreply@example.com>
```

**Option B — SMTP** (interner Relay oder Anbieter):

```
Email transport — SMTP:
- SMTP_HOST=smtp.company.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=noreply@company.com
- SMTP_PASSWORD=secret
- SMTP_FROM=KANAP <noreply@company.com>
```

Ersetzen Sie die Werte durch Ihre tatsächlichen Anmeldedaten. Wenn Sie die E-Mail-Konfiguration überspringen, funktioniert KANAP weiterhin – aber Passwort-Reset und Einladungen sind nicht verfügbar, bis Sie die E-Mail später manuell konfigurieren (siehe [Konfiguration](configuration.md)).

## Was Sie erwartet

Der Agent liest die verlinkten Dokumentationsseiten und arbeitet die Installation dann autonom durch:

1. **Systempakete** – installiert Docker, PostgreSQL 16, nginx, certbot
2. **PostgreSQL** – erstellt die Datenbank, den Benutzer und die erforderlichen Erweiterungen
3. **MinIO** – installiert die Binärdatei, erstellt einen systemd-Dienst, stellt einen Bucket und ein Servicekonto bereit
4. **KANAP** – klont das Repository, generiert Anmeldedaten, schreibt `.env`, baut Docker-Images, startet Container
5. **TLS & nginx** – beschafft ein Let's-Encrypt-Zertifikat, konfiguriert den Reverse-Proxy mit HTTPS, richtet die automatische Erneuerung ein
6. **E-Mail** – konfiguriert den ausgehenden E-Mail-Transport in `.env` (falls angegeben)
7. **Verifizierung** – prüft den API-Health-Endpunkt und die Frontend-Erreichbarkeit

Der Agent fragt um Bestätigung, bevor er Befehle auf Ihrem Server ausführt. Nach Abschluss wird das vollständige Installationsprotokoll für Ihre Unterlagen in `~/kanap-install.md` gespeichert.

## Nach der Installation

1. **Überprüfen Sie Ihre `.env`-Datei** unter `/opt/kanap/.env` – verifizieren Sie die generierten Anmeldedaten und passen Sie Einstellungen wie den Organisationsnamen an
2. **Konfigurieren Sie die E-Mail**, falls Sie es noch nicht getan haben – siehe [Konfiguration](configuration.md) für SMTP- oder Resend-Setup. E-Mail aktiviert Passwort-Reset, Einladungen und Benachrichtigungen.
3. **Melden Sie sich an** unter `https://your-hostname` mit den Admin-Anmeldedaten aus `.env`
4. **Ändern Sie das Admin-Passwort** – verwenden Sie den Link „Passwort vergessen" auf der Anmeldeseite, um eine Reset-E-Mail zu erhalten (einfachste Methode), oder ändern Sie es nach der Anmeldung über das Benutzerprofil
5. **Lesen Sie den [Betrieb](operations.md)-Leitfaden** für Upgrades, Backups und Monitoring
6. **Entfernen Sie passwortloses sudo** – die Installation ist abgeschlossen, stellen Sie die normale Sicherheit wieder her:

    ```bash
    sudo rm /etc/sudoers.d/90-install-nopasswd
    ```

!!! tip "Gleiches Ergebnis, anderer Weg"
    Dieser Prompt erzeugt dieselbe Installation wie die [manuelle Anleitung](installation-example.md). Wenn Sie später einzelne Komponenten beheben oder anpassen müssen, bleibt diese Anleitung die Referenz.
