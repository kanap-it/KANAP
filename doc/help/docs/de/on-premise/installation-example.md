# Installationsbeispiel: Ubuntu 24.04

Dieser Leitfaden führt durch eine vollständige On-Premise-Installation auf einem einzelnen Ubuntu 24.04-Server mit PostgreSQL auf dem Host, MinIO als S3-kompatibler Speicher und nginx als TLS-Reverse-Proxy. Er basiert auf einer realen, funktionierenden Bereitstellung.

Passen Sie ihn an Ihre Umgebung an -- die Kernleitfäden [Installation](installation.md) und [Konfiguration](configuration.md) bleiben die Referenz.

## Architektur

```
Browser → nginx (:443, TLS) → Docker-Container (api :8080, web :8081)
                             → PostgreSQL (:5432, auf dem Host)
                             → MinIO (:9000, auf dem Host)
```

Alle Dienste laufen auf einem einzelnen Server. Container erreichen Host-Dienste über `host.docker.internal`.

---

## 1. Docker Engine

Docker aus dem offiziellen Repository installieren:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

Fügen Sie Ihren Benutzer zur `docker`-Gruppe hinzu (ab- und wieder anmelden, damit es wirksam wird):

```bash
sudo usermod -aG docker $USER
```

---

## 2. PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16
```

Datenbank, Benutzer und erforderliche Erweiterungen erstellen:

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE kanap;
CREATE USER kanap WITH PASSWORD 'ihr-sicheres-passwort' NOSUPERUSER NOBYPASSRLS;
GRANT ALL PRIVILEGES ON DATABASE kanap TO kanap;
SQL

sudo -u postgres psql -d kanap <<'SQL'
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO kanap;
SQL
```

### Verbindungen von Docker-Containern erlauben

`/etc/postgresql/16/main/postgresql.conf` bearbeiten:

```
listen_addresses = '*'
```

`/etc/postgresql/16/main/pg_hba.conf` bearbeiten -- vor den Standard-Host-Regeln hinzufügen:

```
host    kanap    kanap    172.16.0.0/12    scram-sha-256
```

Dies erlaubt Verbindungen vom Docker-Bridge-Netzwerk. Für strengere Sicherheit verwenden Sie das exakte Docker-Subnetz (`docker network inspect bridge` zum Finden).

PostgreSQL neustarten und überprüfen:

```bash
sudo systemctl restart postgresql
PGPASSWORD='ihr-sicheres-passwort' psql -h 127.0.0.1 -U kanap -d kanap -c "SELECT 1;"
```

---

## 3. MinIO (S3-kompatibler Speicher)

MinIO-Server und -Client herunterladen:

```bash
wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /tmp/minio
sudo mv /tmp/minio /usr/local/bin/minio
sudo chmod +x /usr/local/bin/minio

wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
sudo mv /tmp/mc /usr/local/bin/mc
sudo chmod +x /usr/local/bin/mc
```

Systembenutzer und Datenverzeichnis erstellen:

```bash
sudo useradd -r -s /sbin/nologin minio-user
sudo mkdir -p /opt/minio/data
sudo chown -R minio-user:minio-user /opt/minio
```

MinIO konfigurieren -- `/etc/default/minio` erstellen:

```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=ihr-minio-admin-passwort
MINIO_VOLUMES="/opt/minio/data"
MINIO_OPTS="--address :9000 --console-address :9001"
```

systemd-Dienst erstellen -- `/etc/systemd/system/minio.service`:

```ini
[Unit]
Description=MinIO Object Storage
After=network-online.target
Wants=network-online.target

[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_VOLUMES $MINIO_OPTS
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

MinIO aktivieren und starten, dann Bucket und Service-Account erstellen:

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio

mc alias set localminio http://127.0.0.1:9000 minioadmin ihr-minio-admin-passwort
mc mb localminio/kanap-files
mc admin user svcacct add localminio minioadmin \
  --access-key ihr-s3-access-key \
  --secret-key ihr-s3-secret-key
```

---

## 4. KANAP klonen und konfigurieren

```bash
cd /opt  # oder Ihr bevorzugtes Verzeichnis
git clone https://github.com/kanap-it/kanap.git
cd kanap
cp infra/.env.onprem.example .env
```

`.env` mit Ihren Werten bearbeiten. Hier ein funktionierendes Beispiel für dieses Setup:

```env
# DEPLOYMENT-MODUS
DEPLOYMENT_MODE=single-tenant

# MANDANT
DEFAULT_TENANT_SLUG=default
DEFAULT_TENANT_NAME=Meine Organisation

# ADMIN-ZUGANGSDATEN
ADMIN_EMAIL=admin@firma.de
ADMIN_PASSWORD=AendernSieNachErsterAnmeldung!

# SICHERHEIT
JWT_SECRET=<Ausgabe von: openssl rand -hex 32>

# ANWENDUNGS-URL
APP_BASE_URL=https://kanap.firma.de

# CORS
CORS_ORIGINS=https://kanap.firma.de

# DATENBANK — host.docker.internal erreicht den Host von Docker aus
DATABASE_URL=postgres://kanap:ihr-sicheres-passwort@host.docker.internal:5432/kanap?sslmode=disable

# SPEICHER — MinIO auf dem Host
S3_ENDPOINT=http://host.docker.internal:9000
S3_BUCKET=kanap-files
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=ihr-s3-access-key
AWS_SECRET_ACCESS_KEY=ihr-s3-secret-key
S3_FORCE_PATH_STYLE=true

# E-MAIL (optional — wählen Sie einen Transport, um Einladungen, Passwortzurücksetzung, Benachrichtigungen zu aktivieren)
# RESEND_API_KEY=re_xxxxx
# RESEND_FROM_EMAIL=KANAP <noreply@ihredomain.de>

# SMTP (nur Single-Tenant / On-Premise)
# SMTP_HOST=smtp.firma.de
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@firma.de
# SMTP_PASSWORD=ihr-smtp-passwort
# SMTP_FROM=KANAP <noreply@firma.de>
```

**Wichtig:** Generieren Sie ein echtes JWT-Secret (`openssl rand -hex 32`) -- verwenden Sie keine Beispielwerte.

Wenn Sie per IP-Adresse statt Domain auf KANAP zugreifen, setzen Sie `APP_BASE_URL` und `CORS_ORIGINS` auf `https://IHRE_IP`.

Wenn Sie SMTP statt Resend verwenden, stellen Sie sicher, dass der SMTP-Server E-Mail von der `SMTP_FROM`-Adresse akzeptiert und dass SPF-, DKIM- und DMARC-Einstellungen Ihrer Domain bereits vorhanden sind, falls Nachrichten Ihr internes Netzwerk verlassen.

---

## 5. Bauen und Starten

```bash
cd /opt/kanap
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d
```

Logs prüfen -- auf die „Application started"-Meldung warten:

```bash
docker compose -f infra/compose.onprem.yml logs -f api
```

Beim ersten Start führt KANAP Migrationen durch und erstellt automatisch Mandant, Admin-Benutzer und Abonnement.

---

## 6. Nginx Reverse Proxy mit TLS

```bash
sudo apt-get install -y nginx
```

### TLS-Zertifikat

Wenn Sie eine Domain mit einem ordnungsgemäßen Zertifikat haben, verwenden Sie dieses. Andernfalls generieren Sie ein selbstsigniertes Zertifikat:

```bash
sudo mkdir -p /etc/ssl/kanap
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/kanap/server.key \
  -out /etc/ssl/kanap/server.crt \
  -subj "/CN=kanap.firma.de" \
  -addext "subjectAltName=DNS:kanap.firma.de"
```

Für IP-basierten Zugang (keine Domain) ersetzen Sie die `-subj` und `-addext` Werte:

```bash
  -subj "/CN=192.168.1.83" \
  -addext "subjectAltName=IP:192.168.1.83"
```

### Site-Konfiguration

`/etc/nginx/sites-available/kanap` erstellen:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name kanap.firma.de;

    ssl_certificate     /etc/ssl/kanap/server.crt;
    ssl_certificate_key /etc/ssl/kanap/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20m;

    # /api → /api/ kanonisieren
    location = /api { return 301 /api/; }

    # API: /api-Präfix vor dem Proxying entfernen
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;

        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout  300s;
        proxy_send_timeout  300s;
        proxy_redirect off;
    }

    # Alles andere → SPA
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_redirect off;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name kanap.firma.de;
    return 301 https://$host$request_uri;
}
```

Site aktivieren und nginx neustarten:

```bash
sudo ln -sf /etc/nginx/sites-available/kanap /etc/nginx/sites-enabled/kanap
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Überprüfen

```bash
# API-Healthcheck
curl -sk https://kanap.firma.de/api/health
# Erwartet: {"status":"ok"}

# Frontend
curl -sk -o /dev/null -w "%{http_code}" https://kanap.firma.de/
# Erwartet: 200
```

---

## 8. Erste Anmeldung

1. Öffnen Sie Ihre KANAP-URL im Browser (akzeptieren Sie die Zertifikatswarnung bei selbstsigniertem TLS)
2. Melden Sie sich mit `ADMIN_EMAIL` / `ADMIN_PASSWORD` aus `.env` an
3. **Ändern Sie sofort das Admin-Passwort** über das Benutzerprofil
4. Konfigurieren Sie den Organisationsnamen in den Admin-Einstellungen
5. Laden Sie weitere Benutzer ein (wenn E-Mail konfiguriert ist)

---

## Dienste-Übersicht

| Dienst     | Verwaltet durch | Konfigurationsort                        |
|------------|-----------------|------------------------------------------|
| Docker     | systemd         | --                                       |
| PostgreSQL | systemd         | `/etc/postgresql/16/main/postgresql.conf` |
| MinIO      | systemd         | `/etc/default/minio`                     |
| KANAP API  | Docker Compose  | `.env` + `infra/compose.onprem.yml`      |
| KANAP Web  | Docker Compose  | `.env` + `infra/compose.onprem.yml`      |
| nginx      | systemd         | `/etc/nginx/sites-available/kanap`       |

## Nützliche Befehle

```bash
# Logs anzeigen
docker compose -f infra/compose.onprem.yml logs -f

# KANAP neustarten
docker compose -f infra/compose.onprem.yml restart

# KANAP stoppen
docker compose -f infra/compose.onprem.yml down

# Nach Update neu bauen
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d

# Alle Dienste prüfen
sudo systemctl status postgresql nginx minio
docker compose -f infra/compose.onprem.yml ps
```
