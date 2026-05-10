# Instalación asistida por IA

En lugar de seguir el [tutorial paso a paso](installation-example.md) manualmente, puede delegar toda la instalación a un agente de programación con IA. Un prompt, un servidor, un resultado.

Herramientas como [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) o [OpenAI Codex](https://openai.com/index/codex/) pueden leer la documentación de KANAP, instalar todas las dependencias, configurar todos los servicios y verificar el resultado — normalmente en menos de 15 minutos.

## Requisitos previos

| Requisito | Detalles |
|-----------|----------|
| **Servidor** | Ubuntu 24.04 LTS (recién aprovisionado, con acceso root o sudo) |
| **Internet** | El servidor necesita acceso saliente a internet durante la instalación (paquetes, imágenes Docker, clonación de GitHub, Let's Encrypt) |
| **DNS** | Un registro A que apunte el nombre de host deseado a la IP pública del servidor |
| **Agente IA** | Un agente de programación con IA instalado en el servidor (Claude Code, Codex o similar) |

### sudo sin contraseña

El agente IA ejecuta muchos comandos con `sudo`. Para evitar que se le solicite contraseña en cada paso, conceda temporalmente a su usuario sudo sin contraseña:

```bash
sudo usermod -aG sudo $USER
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd
```

Eliminará esto al final de la instalación — consulte [Después de la instalación](#despues-de-la-instalacion).

## El prompt

Abra su agente IA en el servidor y pegue el siguiente prompt, reemplazando `kanap.example.com` por su nombre de host real y `admin@example.com` por la dirección de correo del administrador deseada:

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

### Configuración del correo electrónico

Añada **uno** de los siguientes bloques al prompt para activar el correo saliente (restablecimiento de contraseña, invitaciones, notificaciones).

**Opción A — Resend** (API de correo en la nube):

```
Email transport — Resend:
- RESEND_API_KEY=re_xxxxx
- RESEND_FROM_EMAIL=KANAP <noreply@example.com>
```

**Opción B — SMTP** (relé interno o proveedor):

```
Email transport — SMTP:
- SMTP_HOST=smtp.company.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=noreply@company.com
- SMTP_PASSWORD=secret
- SMTP_FROM=KANAP <noreply@company.com>
```

Reemplace los valores con sus credenciales reales. Si omite la configuración del correo, KANAP seguirá funcionando — pero el restablecimiento de contraseña y las invitaciones no estarán disponibles hasta que configure el correo manualmente más adelante (consulte [Configuración](configuration.md)).

## Qué esperar

El agente leerá las páginas de documentación enlazadas y luego trabajará en la instalación de forma autónoma:

1. **Paquetes del sistema** — instala Docker, PostgreSQL 16, nginx, certbot
2. **PostgreSQL** — crea la base de datos, el usuario y las extensiones requeridas
3. **MinIO** — instala el binario, crea un servicio systemd, aprovisiona un bucket y una cuenta de servicio
4. **KANAP** — clona el repositorio, genera credenciales, escribe `.env`, compila las imágenes Docker, inicia los contenedores
5. **TLS y nginx** — obtiene un certificado de Let's Encrypt, configura el proxy inverso con HTTPS, configura la renovación automática
6. **Correo electrónico** — configura el transporte de correo saliente en `.env` (si se proporciona)
7. **Verificación** — comprueba el endpoint de salud de la API y la accesibilidad del frontend

El agente pedirá confirmación antes de ejecutar comandos en su servidor. Una vez completada, el registro completo de la instalación se guarda en `~/kanap-install.md` para sus archivos.

## Después de la instalación

1. **Revise su archivo `.env`** en `/opt/kanap/.env` — verifique las credenciales generadas y ajuste opciones como el nombre de la organización
2. **Configure el correo electrónico** si aún no lo ha hecho — consulte [Configuración](configuration.md) para la configuración SMTP o Resend. El correo electrónico activa el restablecimiento de contraseña, las invitaciones y las notificaciones.
3. **Inicie sesión** en `https://your-hostname` con las credenciales de administrador de `.env`
4. **Cambie la contraseña del administrador** — use el enlace "Olvidé mi contraseña" en la página de inicio de sesión para recibir un correo de restablecimiento (método más fácil), o cámbiela mediante el perfil de usuario tras iniciar sesión
5. **Lea la guía de [Operaciones](operations.md)** para actualizaciones, copias de seguridad y monitorización
6. **Elimine sudo sin contraseña** — la instalación está completa, restaure la seguridad normal:

    ```bash
    sudo rm /etc/sudoers.d/90-install-nopasswd
    ```

!!! tip "Mismo resultado, ruta diferente"
    Este prompt produce la misma instalación que el [tutorial manual](installation-example.md). Si necesita resolver problemas o personalizar componentes individuales más adelante, esa guía sigue siendo la referencia.
