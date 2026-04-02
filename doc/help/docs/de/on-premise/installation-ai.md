# KI-gestützte Installation

Anstatt die [Schritt-für-Schritt-Anleitung](installation-example.md) manuell zu befolgen, können Sie die gesamte Installation an einen KI-gestützten Programmieragenten delegieren. Ein Prompt, ein Server, ein Ergebnis.

Tools wie [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) oder [OpenAI Codex](https://openai.com/index/codex/) können die KANAP-Dokumentation lesen, alle Abhängigkeiten installieren, sämtliche Dienste konfigurieren und das Ergebnis überprüfen -- in der Regel in unter 15 Minuten.

## Voraussetzungen

| Anforderung | Details |
|-------------|---------|
| **Server** | Ubuntu 24.04 LTS (frisch bereitgestellt, mit Root- oder Sudo-Zugang) |
| **Internet** | Der Server benötigt ausgehenden Internetzugang während der Installation (Pakete, Docker-Images, GitHub-Klon, Let's Encrypt) |
| **DNS** | Ein A-Record, der den gewünschten Hostnamen auf die öffentliche IP des Servers zeigt |
| **KI-Agent** | Ein KI-gestützter Programmieragent auf dem Server installiert (Claude Code, Codex oder ähnlich) |

### Passwortloses Sudo

Der KI-Agent führt viele Befehle mit `sudo` aus. Um nicht bei jedem Schritt nach dem Passwort gefragt zu werden, gewähren Sie Ihrem Benutzer vorübergehend passwortloses Sudo:

```bash
sudo usermod -aG sudo $USER
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd
```

Sie entfernen dies am Ende der Installation -- siehe [Nach der Installation](#nach-der-installation).

## Der Prompt

Öffnen Sie Ihren KI-Agenten auf dem Server und fügen Sie den folgenden Prompt ein. Ersetzen Sie `kanap.example.com` durch Ihren tatsächlichen Hostnamen und `admin@example.com` durch die gewünschte Admin-E-Mail-Adresse:

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

Fügen Sie **einen** der folgenden Blöcke zum Prompt hinzu, um ausgehende E-Mails zu aktivieren (Passwortzurücksetzung, Einladungen, Benachrichtigungen).

**Option A -- Resend** (Cloud-E-Mail-API):

```
Email transport — Resend:
- RESEND_API_KEY=re_xxxxx
- RESEND_FROM_EMAIL=KANAP <noreply@example.com>
```

**Option B -- SMTP** (interner Relay oder Anbieter):

```
Email transport — SMTP:
- SMTP_HOST=smtp.company.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=noreply@company.com
- SMTP_PASSWORD=secret
- SMTP_FROM=KANAP <noreply@company.com>
```

Ersetzen Sie die Werte durch Ihre tatsächlichen Zugangsdaten. Wenn Sie die E-Mail-Konfiguration überspringen, funktioniert KANAP trotzdem -- aber Passwortzurücksetzung und Einladungen sind erst verfügbar, wenn Sie E-Mail manuell konfigurieren (siehe [Konfiguration](configuration.md)).

!!! info "Prompt auf Englisch"
    Der Prompt ist auf Englisch verfasst, da KI-Programmieragenten für englische Anweisungen optimiert sind. Die referenzierten Dokumentationsseiten sind ebenfalls auf Englisch.

## Was Sie erwarten können

Der Agent liest die verlinkten Dokumentationsseiten und arbeitet dann die Installation selbstständig ab:

1. **Systempakete** -- installiert Docker, PostgreSQL 16, nginx, certbot
2. **PostgreSQL** -- erstellt die Datenbank, den Benutzer und die erforderlichen Erweiterungen
3. **MinIO** -- installiert die Binärdatei, erstellt einen systemd-Dienst, richtet einen Bucket und ein Servicekonto ein
4. **KANAP** -- klont das Repository, generiert Zugangsdaten, schreibt `.env`, baut Docker-Images, startet die Container
5. **TLS & nginx** -- holt ein Let's-Encrypt-Zertifikat, konfiguriert den Reverse-Proxy mit HTTPS, richtet die automatische Verlängerung ein
6. **E-Mail** -- konfiguriert den ausgehenden E-Mail-Transport in `.env` (falls angegeben)
7. **Überprüfung** -- prüft den Health-Endpoint der API und die Erreichbarkeit des Frontends

Der Agent bittet vor der Ausführung von Befehlen auf Ihrem Server um Bestätigung. Nach Abschluss wird das vollständige Installationsprotokoll in `~/kanap-install.md` gespeichert.

## Nach der Installation

1. **Überprüfen Sie Ihre `.env`-Datei** unter `/opt/kanap/.env` -- kontrollieren Sie die generierten Zugangsdaten und passen Sie Einstellungen wie den Organisationsnamen an
2. **Konfigurieren Sie E-Mail** falls noch nicht geschehen -- siehe [Konfiguration](configuration.md) für SMTP- oder Resend-Einrichtung. E-Mail ermöglicht Passwortzurücksetzung, Einladungen und Benachrichtigungen.
3. **Melden Sie sich an** unter `https://ihr-hostname` mit den Admin-Zugangsdaten aus `.env`
4. **Ändern Sie das Admin-Passwort** -- verwenden Sie den Link „Passwort vergessen" auf der Anmeldeseite, um eine Zurücksetzungs-E-Mail zu erhalten (einfachste Methode), oder ändern Sie es über das Benutzerprofil nach der Anmeldung
5. **Lesen Sie den Leitfaden [Betrieb](operations.md)** für Upgrades, Backups und Monitoring
6. **Entfernen Sie das passwortlose Sudo** -- die Installation ist abgeschlossen, stellen Sie die normale Sicherheit wieder her:

    ```bash
    sudo rm /etc/sudoers.d/90-install-nopasswd
    ```

!!! tip "Gleiches Ergebnis, anderer Weg"
    Dieser Prompt erzeugt dieselbe Installation wie die [manuelle Anleitung](installation-example.md). Wenn Sie später einzelne Komponenten anpassen oder Fehler beheben müssen, bleibt diese Anleitung die Referenz.
