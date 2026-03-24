# On-Premise Operations

## Upgrade Procedure

```bash
# 1. Backup database and storage (your responsibility)

# 2. Pull latest changes and rebuild
cd kanap
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 3. Restart containers (migrations run automatically)
docker compose -f infra/compose.onprem.yml up -d

# 4. Verify startup
docker compose -f infra/compose.onprem.yml logs -f api
# Wait for "Application started" message
```

**Breaking changes:** Check `CHANGELOG.md` before upgrading.

**Rollback:** Restore database from backup. Migrations are forward-only.

## Version Support

KANAP is a quickly evolving solution and we recommend upgrading on a monthly basis.
For customers under support, an upgrade to the latest version might be requested before handling a support request.

## Backup & Restore

- **PostgreSQL:** Use `pg_dump`/`pg_restore` or managed DB backups
- **S3 Storage:** Use bucket versioning, replication, or provider backups

**Recommendation:** Daily database backups, retain at least 30 days.

## Monitoring

**Health endpoint:**

`GET /api/health` → `{ "status": "ok" }`

```bash
curl https://kanap.company.com/api/health
```

**Container health:**
```bash
docker compose -f infra/compose.onprem.yml ps
docker compose -f infra/compose.onprem.yml logs -f api
```

**Key metrics:**
- Containers running (`api`, `web`)
- API memory under ~1 GB
- Database connections
- Storage usage

## Troubleshooting

| Symptom | Check | Solution |
|---------|-------|----------|
| Containers not starting | `docker compose logs api` | Check for startup errors |
| "Database connection failed" | Verify `DATABASE_URL` | Check PostgreSQL accessibility/credentials |
| "S3 error" | Verify S3_* variables | Ensure bucket exists and permissions are correct |
| Migration failed | Check PostgreSQL version | Must be 16+, extensions available |
| 502 from reverse proxy | `docker compose ps` | Ensure api container is running on port 8080 |
| Can’t login | Verify `.env` credentials | Use password reset below |

## Password Reset

**Recommended:** Configure email (Resend API or single-tenant SMTP) and use the "Forgot Password" flow.

**Fallback (SQL):** If email is not configured, reset passwords directly in the database.

**1) Generate a password hash:**

```bash
# Using Node.js with argon2
# (argon2 is a production dependency in the API image)
docker compose -f infra/compose.onprem.yml exec api \
  node -e "require('argon2').hash('NewPassword123!').then(h => console.log(h))"
```

**2) Update the user in PostgreSQL:**

```sql
UPDATE users
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$...'
WHERE email = 'user@company.com';
```

This SQL method is a last-resort fallback for locked-out administrators.
