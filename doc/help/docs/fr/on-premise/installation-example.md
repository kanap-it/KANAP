# Exemple d'installation : Ubuntu 24.04

Ce guide décrit une installation on-premise complète sur un serveur Ubuntu 24.04 unique, utilisant PostgreSQL sur l'hôte, MinIO pour le stockage compatible S3 et nginx comme reverse proxy TLS. Il est basé sur un déploiement réel et fonctionnel.

Adaptez-le à votre environnement — les guides [Installation](installation.md) et [Configuration](configuration.md) restent la référence.

## Architecture

```
Navigateur → nginx (:443, TLS) → Conteneurs Docker (api :8080, web :8081)
                                → PostgreSQL (:5432, sur l'hôte)
                                → MinIO (:9000, sur l'hôte)
```

Tous les services tournent sur un seul serveur. Les conteneurs accèdent aux services de l'hôte via `host.docker.internal`.

---

## 1. Docker Engine

Installez Docker depuis le dépôt officiel :

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

Ajoutez votre utilisateur au groupe `docker` (déconnectez-vous et reconnectez-vous pour que cela prenne effet) :

```bash
sudo usermod -aG docker $USER
```

---

## 2. PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16
```

Créez la base de données, l'utilisateur et les extensions requises :

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE kanap;
CREATE USER kanap WITH PASSWORD 'your-secure-password' NOSUPERUSER NOBYPASSRLS;
GRANT ALL PRIVILEGES ON DATABASE kanap TO kanap;
SQL

sudo -u postgres psql -d kanap <<'SQL'
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO kanap;
SQL
```

### Autoriser les connexions depuis les conteneurs Docker

Éditez `/etc/postgresql/16/main/postgresql.conf` :

```
listen_addresses = '*'
```

Éditez `/etc/postgresql/16/main/pg_hba.conf` — ajoutez avant les règles host par défaut :

```
host    kanap    kanap    172.16.0.0/12    scram-sha-256
```

Cela autorise les connexions depuis le réseau bridge Docker. Pour une sécurité plus stricte, utilisez le sous-réseau Docker exact (`docker network inspect bridge` pour le trouver).

Redémarrez PostgreSQL et vérifiez :

```bash
sudo systemctl restart postgresql
PGPASSWORD='your-secure-password' psql -h 127.0.0.1 -U kanap -d kanap -c "SELECT 1;"
```

---

## 3. MinIO (stockage compatible S3)

Téléchargez le serveur et le client MinIO :

```bash
wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /tmp/minio
sudo mv /tmp/minio /usr/local/bin/minio
sudo chmod +x /usr/local/bin/minio

wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
sudo mv /tmp/mc /usr/local/bin/mc
sudo chmod +x /usr/local/bin/mc
```

Créez un utilisateur système et le répertoire de données :

```bash
sudo useradd -r -s /sbin/nologin minio-user
sudo mkdir -p /opt/minio/data
sudo chown -R minio-user:minio-user /opt/minio
```

Configurez MinIO — créez `/etc/default/minio` :

```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-minio-admin-password
MINIO_VOLUMES="/opt/minio/data"
MINIO_OPTS="--address :9000 --console-address :9001"
```

Créez le service systemd — `/etc/systemd/system/minio.service` :

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

Activez et démarrez MinIO, puis créez le bucket et un compte de service :

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio

mc alias set localminio http://127.0.0.1:9000 minioadmin your-minio-admin-password
mc mb localminio/kanap-files
mc admin user svcacct add localminio minioadmin \
  --access-key your-s3-access-key \
  --secret-key your-s3-secret-key
```

---

## 4. Cloner KANAP et configurer

```bash
cd /opt  # ou votre répertoire préféré
git clone https://github.com/kanap-it/kanap.git
cd kanap
cp infra/.env.onprem.example .env
```

Éditez `.env` avec vos valeurs. Voici un exemple fonctionnel pour cette configuration :

```env
# MODE DE DÉPLOIEMENT
DEPLOYMENT_MODE=single-tenant

# TENANT
DEFAULT_TENANT_SLUG=default
DEFAULT_TENANT_NAME=Mon Organisation

# IDENTIFIANTS ADMIN
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=ChangeThisAfterFirstLogin!

# SÉCURITÉ
JWT_SECRET=<résultat de : openssl rand -hex 32>

# URL DE L'APPLICATION
APP_BASE_URL=https://kanap.company.com

# CORS
CORS_ORIGINS=https://kanap.company.com

# BASE DE DONNÉES — host.docker.internal atteint l'hôte depuis l'intérieur de Docker
DATABASE_URL=postgres://kanap:your-secure-password@host.docker.internal:5432/kanap?sslmode=disable

# STOCKAGE — MinIO sur l'hôte
S3_ENDPOINT=http://host.docker.internal:9000
S3_BUCKET=kanap-files
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-s3-access-key
AWS_SECRET_ACCESS_KEY=your-s3-secret-key
S3_FORCE_PATH_STYLE=true

# EMAIL (optionnel — choisissez un transport pour activer les invitations, la réinitialisation de mot de passe, les notifications)
# RESEND_API_KEY=re_xxxxx
# RESEND_FROM_EMAIL=KANAP <noreply@yourdomain.com>

# SMTP (single-tenant / on-prem uniquement)
# SMTP_HOST=smtp.company.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@company.com
# SMTP_PASSWORD=your-smtp-password
# SMTP_FROM=KANAP <noreply@company.com>
```

**Important :** Générez un vrai secret JWT (`openssl rand -hex 32`) — ne réutilisez pas les valeurs d'exemple.

Si vous accédez à KANAP par adresse IP au lieu d'un domaine, définissez `APP_BASE_URL` et `CORS_ORIGINS` sur `https://YOUR_IP`.

Si vous utilisez SMTP au lieu de Resend, assurez-vous que le serveur SMTP accepte les messages depuis l'adresse `SMTP_FROM` et que les paramètres SPF, DKIM et DMARC de votre domaine sont déjà en place si les messages sortent de votre réseau interne.

---

## 5. Compiler et démarrer

```bash
cd /opt/kanap
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d
```

Consultez les logs — attendez le message « Application started » :

```bash
docker compose -f infra/compose.onprem.yml logs -f api
```

Au premier démarrage, KANAP exécute les migrations et crée automatiquement le tenant, l'utilisateur admin et l'abonnement.

---

## 6. Reverse proxy nginx avec TLS

```bash
sudo apt-get install -y nginx
```

### Certificat TLS

Si vous avez un domaine avec un certificat valide, utilisez-le. Sinon, générez un certificat auto-signé :

```bash
sudo mkdir -p /etc/ssl/kanap
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/kanap/server.key \
  -out /etc/ssl/kanap/server.crt \
  -subj "/CN=kanap.company.com" \
  -addext "subjectAltName=DNS:kanap.company.com"
```

Pour un accès par IP (sans domaine), remplacez les valeurs `-subj` et `-addext` :

```bash
  -subj "/CN=192.168.1.83" \
  -addext "subjectAltName=IP:192.168.1.83"
```

### Configuration du site

Créez `/etc/nginx/sites-available/kanap` :

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name kanap.company.com;

    ssl_certificate     /etc/ssl/kanap/server.crt;
    ssl_certificate_key /etc/ssl/kanap/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20m;

    # Canonicaliser /api → /api/
    location = /api { return 301 /api/; }

    # API : retirer le préfixe /api avant le proxy
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

    # Tout le reste → SPA
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
    server_name kanap.company.com;
    return 301 https://$host$request_uri;
}
```

Activez le site et redémarrez nginx :

```bash
sudo ln -sf /etc/nginx/sites-available/kanap /etc/nginx/sites-enabled/kanap
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Vérification

```bash
# Vérification de santé API
curl -sk https://kanap.company.com/api/health
# Attendu : {"status":"ok"}

# Frontend
curl -sk -o /dev/null -w "%{http_code}" https://kanap.company.com/
# Attendu : 200
```

---

## 8. Première connexion

1. Ouvrez votre URL KANAP dans un navigateur (acceptez l'avertissement de certificat si vous utilisez un TLS auto-signé)
2. Connectez-vous avec les `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`
3. **Changez immédiatement le mot de passe admin** via le profil utilisateur
4. Configurez le nom de votre organisation dans les paramètres d'administration
5. Invitez des utilisateurs supplémentaires (si l'email est configuré)

---

## Résumé des services

| Service    | Géré par       | Emplacement de la configuration                |
|------------|----------------|-------------------------------------------------|
| Docker     | systemd        | —                                               |
| PostgreSQL | systemd        | `/etc/postgresql/16/main/postgresql.conf`       |
| MinIO      | systemd        | `/etc/default/minio`                            |
| KANAP API  | Docker Compose | `.env` + `infra/compose.onprem.yml`             |
| KANAP Web  | Docker Compose | `.env` + `infra/compose.onprem.yml`             |
| nginx      | systemd        | `/etc/nginx/sites-available/kanap`              |

## Commandes utiles

```bash
# Voir les logs
docker compose -f infra/compose.onprem.yml logs -f

# Redémarrer KANAP
docker compose -f infra/compose.onprem.yml restart

# Arrêter KANAP
docker compose -f infra/compose.onprem.yml down

# Recompiler après mise à jour
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d

# Vérifier tous les services
sudo systemctl status postgresql nginx minio
docker compose -f infra/compose.onprem.yml ps
```
