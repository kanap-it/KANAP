# Ejemplo de instalación: Ubuntu 24.04

Esta guía describe una instalación local completa en un único servidor Ubuntu 24.04, usando PostgreSQL en el host, MinIO para almacenamiento compatible con S3 y nginx como proxy inverso TLS. Se basa en un despliegue real y funcional.

Adáptela a su entorno — las guías principales de [Instalación](installation.md) y [Configuración](configuration.md) siguen siendo la referencia.

!!! tip "¿Prefiere automatizar?"
    Un agente de programación con IA puede ejecutar toda esta instalación por usted con un solo prompt. Consulte [Instalación asistida por IA](installation-ai.md).

## Arquitectura

```
Navegador → nginx (:443, TLS) → Contenedores Docker (api :8080, web :8081)
                               → PostgreSQL (:5432, en el host)
                               → MinIO (:9000, en el host)
```

Todos los servicios se ejecutan en un único servidor. Los contenedores acceden a los servicios del host a través de `host.docker.internal`.

---

## 1. Docker Engine

Instale Docker desde el repositorio oficial:

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

Añada su usuario al grupo `docker` (cierre sesión y vuelva a iniciarla para que surta efecto):

```bash
sudo usermod -aG docker $USER
```

---

## 2. PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16
```

Cree la base de datos, el usuario y las extensiones requeridas:

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE kanap;
CREATE USER kanap WITH PASSWORD 'su-contraseña-segura' NOSUPERUSER NOBYPASSRLS;
GRANT ALL PRIVILEGES ON DATABASE kanap TO kanap;
SQL

sudo -u postgres psql -d kanap <<'SQL'
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO kanap;
SQL
```

### Permitir conexiones desde contenedores Docker

Edite `/etc/postgresql/16/main/postgresql.conf`:

```
listen_addresses = '*'
```

Edite `/etc/postgresql/16/main/pg_hba.conf` — añada antes de las reglas de host predeterminadas:

```
host    kanap    kanap    172.16.0.0/12    scram-sha-256
```

Esto permite conexiones desde la red bridge de Docker. Para mayor seguridad, use la subred Docker exacta (`docker network inspect bridge` para encontrarla).

Reinicie PostgreSQL y verifique:

```bash
sudo systemctl restart postgresql
PGPASSWORD='su-contraseña-segura' psql -h 127.0.0.1 -U kanap -d kanap -c "SELECT 1;"
```

---

## 3. MinIO (almacenamiento compatible con S3)

Descargue el servidor y cliente MinIO:

```bash
wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /tmp/minio
sudo mv /tmp/minio /usr/local/bin/minio
sudo chmod +x /usr/local/bin/minio

wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
sudo mv /tmp/mc /usr/local/bin/mc
sudo chmod +x /usr/local/bin/mc
```

Cree un usuario del sistema y directorio de datos:

```bash
sudo useradd -r -s /sbin/nologin minio-user
sudo mkdir -p /opt/minio/data
sudo chown -R minio-user:minio-user /opt/minio
```

Configure MinIO — cree `/etc/default/minio`:

```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=su-contraseña-admin-minio
MINIO_VOLUMES="/opt/minio/data"
MINIO_OPTS="--address :9000 --console-address :9001"
```

Cree el servicio systemd — `/etc/systemd/system/minio.service`:

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

Habilite e inicie MinIO, luego cree el bucket y una cuenta de servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio

mc alias set localminio http://127.0.0.1:9000 minioadmin su-contraseña-admin-minio
mc mb localminio/kanap-files
mc admin user svcacct add localminio minioadmin \
  --access-key su-clave-acceso-s3 \
  --secret-key su-clave-secreta-s3
```

---

## 4. Clonar KANAP y configurar

```bash
cd /opt  # o su directorio preferido
git clone https://github.com/kanap-it/kanap.git
cd kanap
cp infra/.env.onprem.example .env
```

Edite `.env` con sus valores. Aquí tiene un ejemplo funcional para esta configuración:

```env
# MODO DE DESPLIEGUE
DEPLOYMENT_MODE=single-tenant

# ESPACIO DE TRABAJO
DEFAULT_TENANT_SLUG=default
DEFAULT_TENANT_NAME=Mi Organización

# CREDENCIALES DE ADMINISTRADOR
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=CambieEstoDespuesDelPrimerInicio!

# SEGURIDAD
JWT_SECRET=<resultado de: openssl rand -hex 32>

# URL DE LA APLICACIÓN
APP_BASE_URL=https://kanap.empresa.com

# CORS
CORS_ORIGINS=https://kanap.empresa.com

# BASE DE DATOS — host.docker.internal accede al host desde dentro de Docker
DATABASE_URL=postgres://kanap:su-contraseña-segura@host.docker.internal:5432/kanap?sslmode=disable

# ALMACENAMIENTO — MinIO en el host
S3_ENDPOINT=http://host.docker.internal:9000
S3_BUCKET=kanap-files
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=su-clave-acceso-s3
AWS_SECRET_ACCESS_KEY=su-clave-secreta-s3
S3_FORCE_PATH_STYLE=true

# CORREO (opcional — elija un transporte para habilitar invitaciones, restablecimiento de contraseña, notificaciones)
# RESEND_API_KEY=re_xxxxx
# RESEND_FROM_EMAIL=KANAP <noreply@sudominio.com>

# SMTP (solo inquilino único / local)
# SMTP_HOST=smtp.empresa.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@empresa.com
# SMTP_PASSWORD=su-contraseña-smtp
# SMTP_FROM=KANAP <noreply@empresa.com>
```

**Importante:** Genere un secreto JWT real (`openssl rand -hex 32`) — no reutilice valores de ejemplo.

Si accede a KANAP por dirección IP en lugar de dominio, establezca `APP_BASE_URL` y `CORS_ORIGINS` a `https://SU_IP`.

Si usa SMTP en lugar de Resend, asegúrese de que el servidor SMTP acepte correo desde la dirección `SMTP_FROM` y que la configuración SPF, DKIM y DMARC de su dominio ya esté en su lugar si los mensajes salen de su red interna.

---

## 5. Construir e iniciar

```bash
cd /opt/kanap
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d
```

Revise los registros — espere el mensaje "Application started":

```bash
docker compose -f infra/compose.onprem.yml logs -f api
```

En el primer arranque, KANAP ejecuta las migraciones y crea el espacio de trabajo, usuario administrador y suscripción automáticamente.

---

## 6. Proxy inverso nginx con TLS

```bash
sudo apt-get install -y nginx
```

### Certificado TLS

Si tiene un dominio con un certificado adecuado, úselo. De lo contrario, genere un certificado autofirmado:

```bash
sudo mkdir -p /etc/ssl/kanap
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/kanap/server.key \
  -out /etc/ssl/kanap/server.crt \
  -subj "/CN=kanap.empresa.com" \
  -addext "subjectAltName=DNS:kanap.empresa.com"
```

Para acceso basado en IP (sin dominio), reemplace los valores de `-subj` y `-addext`:

```bash
  -subj "/CN=192.168.1.83" \
  -addext "subjectAltName=IP:192.168.1.83"
```

### Configuración del sitio

Cree `/etc/nginx/sites-available/kanap`:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name kanap.empresa.com;

    ssl_certificate     /etc/ssl/kanap/server.crt;
    ssl_certificate_key /etc/ssl/kanap/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20m;

    # Canonicalizar /api → /api/
    location = /api { return 301 /api/; }

    # API: quitar prefijo /api antes de hacer proxy
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

    # Todo lo demás → SPA
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
    server_name kanap.empresa.com;
    return 301 https://$host$request_uri;
}
```

Habilite el sitio y reinicie nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/kanap /etc/nginx/sites-enabled/kanap
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Verificar

```bash
# Verificación de salud de la API
curl -sk https://kanap.empresa.com/api/health
# Esperado: {"status":"ok"}

# Frontend
curl -sk -o /dev/null -w "%{http_code}" https://kanap.empresa.com/
# Esperado: 200
```

---

## 8. Primer inicio de sesión

1. Abra su URL de KANAP en un navegador (acepte la advertencia de certificado si usa TLS autofirmado)
2. Inicie sesión con `ADMIN_EMAIL` / `ADMIN_PASSWORD` de `.env`
3. **Cambie la contraseña del administrador inmediatamente** mediante el perfil de usuario
4. Configure el nombre de su organización en los ajustes de Administración
5. Invite a usuarios adicionales (si el correo está configurado)

---

## Resumen de servicios

| Servicio   | Gestionado por | Ubicación de configuración                |
|------------|----------------|-------------------------------------------|
| Docker     | systemd        | —                                         |
| PostgreSQL | systemd        | `/etc/postgresql/16/main/postgresql.conf`  |
| MinIO      | systemd        | `/etc/default/minio`                      |
| KANAP API  | Docker Compose | `.env` + `infra/compose.onprem.yml`       |
| KANAP Web  | Docker Compose | `.env` + `infra/compose.onprem.yml`       |
| nginx      | systemd        | `/etc/nginx/sites-available/kanap`        |

## Comandos útiles

```bash
# Ver registros
docker compose -f infra/compose.onprem.yml logs -f

# Reiniciar KANAP
docker compose -f infra/compose.onprem.yml restart

# Detener KANAP
docker compose -f infra/compose.onprem.yml down

# Reconstruir después de actualizar
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend
docker compose -f infra/compose.onprem.yml up -d

# Verificar todos los servicios
sudo systemctl status postgresql nginx minio
docker compose -f infra/compose.onprem.yml ps
```
