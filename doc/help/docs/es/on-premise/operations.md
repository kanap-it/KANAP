# Operaciones locales

## Procedimiento de actualización

```bash
# 1. Respaldar base de datos y almacenamiento (es su responsabilidad)

# 2. Obtener últimos cambios y reconstruir
cd kanap
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 3. Reiniciar contenedores (las migraciones se ejecutan automáticamente)
docker compose -f infra/compose.onprem.yml up -d

# 4. Verificar el inicio
docker compose -f infra/compose.onprem.yml logs -f api
# Esperar el mensaje "Application started"
```

**Cambios importantes:** Revise `CHANGELOG.md` antes de actualizar.

**Reversión:** Restaure la base de datos desde la copia de seguridad. Las migraciones son solo hacia adelante.

## Soporte de versiones

KANAP es una solución en rápida evolución y recomendamos actualizar mensualmente.
Para clientes bajo soporte, se puede solicitar una actualización a la última versión antes de gestionar una solicitud de soporte.

## Copia de seguridad y restauración

- **PostgreSQL:** Use `pg_dump`/`pg_restore` o copias de seguridad de BD gestionadas
- **Almacenamiento S3:** Use versionado de buckets, replicación o copias de seguridad del proveedor

**Recomendación:** Copias de seguridad diarias de la base de datos, retener al menos 30 días.

## Monitorización

**Endpoint de salud:**

`GET /api/health` → `{ "status": "ok" }`

```bash
curl https://kanap.empresa.com/api/health
```

**Salud de contenedores:**
```bash
docker compose -f infra/compose.onprem.yml ps
docker compose -f infra/compose.onprem.yml logs -f api
```

**Métricas clave:**
- Contenedores ejecutándose (`api`, `web`)
- Memoria de la API por debajo de ~1 GB
- Conexiones a base de datos
- Uso de almacenamiento

## Solución de problemas

| Síntoma | Verificar | Solución |
|---------|-----------|----------|
| Los contenedores no inician | `docker compose logs api` | Verificar errores de inicio |
| "Database connection failed" | Verificar `DATABASE_URL` | Verificar accesibilidad/credenciales de PostgreSQL |
| "S3 error" | Verificar variables S3_* | Asegurar que el bucket existe y los permisos son correctos |
| Migración fallida | Verificar versión de PostgreSQL | Debe ser 16+, extensiones disponibles |
| 502 del proxy inverso | `docker compose ps` | Asegurar que el contenedor api está ejecutándose en el puerto 8080 |
| No puede iniciar sesión | Verificar credenciales de `.env` | Usar restablecimiento de contraseña a continuación |

## Restablecimiento de contraseña

**Recomendado:** Configure correo (API de Resend o SMTP de inquilino único) y use el flujo de "Olvidé mi contraseña".

**Respaldo (SQL):** Si el correo no está configurado, restablezca contraseñas directamente en la base de datos.

**1) Generar un hash de contraseña:**

```bash
# Usando Node.js con argon2
# (argon2 es una dependencia de producción en la imagen de la API)
docker compose -f infra/compose.onprem.yml exec api \
  node -e "require('argon2').hash('NuevaContraseña123!').then(h => console.log(h))"
```

**2) Actualizar el usuario en PostgreSQL:**

```sql
UPDATE users
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$...'
WHERE email = 'usuario@empresa.com';
```

Este método SQL es un respaldo de último recurso para administradores bloqueados.
