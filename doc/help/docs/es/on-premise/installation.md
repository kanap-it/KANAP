# Instalación local

## Requisitos previos

**Requisitos del servidor:**
- Servidor Linux (Ubuntu 22.04+, Debian 12+, RHEL 9+ o cualquier SO compatible con Docker)
- Docker Engine 24.0+
- Docker Compose v2.20+
- Git
- 4 GB RAM mínimo (8 GB recomendado)
- 20 GB disco mínimo (+ caché de construcción)

**Infraestructura proporcionada por el cliente:**

| Componente | Requisito |
|------------|-----------|
| PostgreSQL | Versión 16+ con extensiones `citext`, `pgcrypto`, `uuid-ossp` y un rol de aplicación dedicado para `DATABASE_URL` |
| Almacenamiento S3 | Cualquier compatible con S3: AWS S3, MinIO, Cloudflare R2, Hetzner, etc. |
| Proxy inverso | Terminación TLS y enrutamiento (nginx, Traefik, Caddy, etc.) |
| Dominio | DNS apuntando a su servidor |

Opcional:
- Configuración de correo saliente: clave API de Resend o detalles de relay/servidor SMTP
- SSO con Microsoft Entra (ver `sso-entra.md`)

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/kanap-it/kanap.git
cd kanap

# 2. Configurar el entorno ANTES de construir
cp infra/.env.onprem.example .env
nano .env  # Establecer DATABASE_URL, credenciales S3, ADMIN_EMAIL, JWT_SECRET, APP_BASE_URL
# Ver la guía de Configuración para todas las variables

# 3. Construir imágenes Docker
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 4. Iniciar contenedores
docker compose -f infra/compose.onprem.yml up -d

# 5. Verificar el inicio
docker compose -f infra/compose.onprem.yml logs -f api
# Esperar el mensaje "Application started"
# El primer arranque crea el espacio de trabajo, usuario administrador y suscripción automáticamente

# 6. Configure su proxy inverso para enrutar el tráfico a:
#    - /api/* → api:8080
#    - /*     → web:80
# Asegúrese de que el proxy preserve Host y establezca X-Forwarded-Proto.

# 7. Acceder a la aplicación
# https://kanap.su-dominio.com
# Iniciar sesión con ADMIN_EMAIL / ADMIN_PASSWORD de .env
```

**Importante:** Complete la configuración (paso 2) antes de iniciar los contenedores. La API lee `.env` al inicio y crea el espacio de trabajo y el usuario administrador en el primer arranque usando esos valores.

**Requisito del rol de base de datos:** `DATABASE_URL` debe usar un rol de aplicación PostgreSQL dedicado. No lo apunte a `postgres` u otro rol de administrador del clúster. KANAP fallará en el inicio en lugar de ejecutarse sin aplicación efectiva de RLS.

**Elección de correo:** Los despliegues locales pueden usar **Resend** o **SMTP** para correo saliente. SMTP es útil cuando el cliente ya tiene un relay de correo interno o un proveedor gestionado como Microsoft 365. Configure una de estas opciones si desea que el restablecimiento de contraseña, las invitaciones y los correos de notificación funcionen desde el primer día.

## Ejemplo de proxy inverso (nginx)

**Requisitos del proxy inverso:**

1. Terminar TLS en el puerto 443
2. Enrutar `/api/*` al contenedor API (puerto 8080)
3. Enrutar todas las demás solicitudes al contenedor web (puerto 80)
4. Establecer `X-Forwarded-Proto: https` y preservar `Host` / `X-Forwarded-Host`
5. Soportar actualización WebSocket (usado por funcionalidades en tiempo real)

Como los contenedores se vinculan a `127.0.0.1`, nginx se ejecuta en el mismo host y hace proxy a `localhost`.

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name kanap.company.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Límite de carga de archivos (KANAP soporta hasta 20 MB)
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

        # Soporte WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Solicitudes de larga duración (exportaciones, importaciones)
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
    server_name kanap.company.com;
    return 301 https://$host$request_uri;
}
```

**TLS autofirmado (sin dominio):** Si no tiene un dominio y accede a KANAP por dirección IP, genere un certificado autofirmado:

```bash
sudo mkdir -p /etc/ssl/kanap
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/kanap/server.key \
  -out /etc/ssl/kanap/server.crt \
  -subj "/CN=SU_IP" \
  -addext "subjectAltName=IP:SU_IP"
```

Reemplace `SU_IP` con la IP de su servidor y actualice `server_name`, `APP_BASE_URL` y `CORS_ORIGINS` correspondientemente. Los usuarios deberán aceptar la advertencia de certificado del navegador en el primer acceso.

**`host.docker.internal`:** Cuando PostgreSQL o el almacenamiento S3 se ejecuta en el host Docker (no en un contenedor), use `host.docker.internal` como nombre de host en `DATABASE_URL` y `S3_ENDPOINT`. El archivo `compose.onprem.yml` incluye el mapeo `extra_hosts` que hace que esto funcione.

## Arquitectura de red

```
                    ┌─────────────────────────────────────────────────────┐
                    │              Infraestructura del cliente             │
                    │                                                      │
    Internet        │  ┌──────────────┐    ┌─────────────────────────┐   │
        │           │  │  Su proxy    │    │     Host Docker         │   │
        │           │  │   inverso    │    │                         │   │
   ┌────▼────┐      │  │   (TLS)      │    │  ┌─────┐    ┌─────┐    │   │
   │Navegador│──────┼─▶│   :443       │───▶│  │ api │    │ web │    │   │
   └─────────┘      │  └──────────────┘    │  │:8080│    │ :80 │    │   │
                    │                      │  └─────┘    └─────┘    │   │
                    │  ┌──────────────┐    └─────────────────────────┘   │
                    │  │  PostgreSQL  │                                   │
                    │  │   (suyo)     │◀──────── DATABASE_URL            │
                    │  └──────────────┘                                   │
                    │  ┌──────────────┐                                   │
                    │  │Almacenamiento│◀──────── S3_ENDPOINT             │
                    │  │  S3 (suyo)   │                                   │
                    │  └──────────────┘                                   │
                    └─────────────────────────────────────────────────────┘
```

**Modelo de despliegue:** Solo despliegue de contenedor único. No se soporta la ejecución de múltiples réplicas de API o web. Para alta disponibilidad, confíe en las políticas de reinicio de Docker y la redundancia a nivel de infraestructura (alta disponibilidad de base de datos, durabilidad S3).

## Primer inicio de sesión

1. Navegue a `https://<su-dominio>`
2. Inicie sesión con las credenciales de `.env` (ADMIN_EMAIL / ADMIN_PASSWORD)
3. **Cambie inmediatamente la contraseña del administrador** mediante el perfil de usuario
4. Configure los ajustes de la organización
5. Invite a usuarios adicionales (si el correo está configurado)
