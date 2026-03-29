# On-Premise-Betrieb

## Upgrade-Verfahren

```bash
# 1. Datenbank und Speicher sichern (Ihre Verantwortung)

# 2. Neueste Änderungen pullen und neu bauen
cd kanap
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 3. Container neustarten (Migrationen laufen automatisch)
docker compose -f infra/compose.onprem.yml up -d

# 4. Start überprüfen
docker compose -f infra/compose.onprem.yml logs -f api
# Auf "Application started"-Meldung warten
```

**Breaking Changes:** Prüfen Sie `CHANGELOG.md` vor dem Upgrade.

**Rollback:** Datenbank aus Backup wiederherstellen. Migrationen sind nur vorwärtsgerichtet.

## Versionsunterstützung

KANAP ist eine sich schnell weiterentwickelnde Lösung und wir empfehlen monatliche Upgrades.
Für Kunden mit Supportvertrag kann vor der Bearbeitung einer Supportanfrage ein Upgrade auf die neueste Version erforderlich sein.

## Backup & Wiederherstellung

- **PostgreSQL:** Verwenden Sie `pg_dump`/`pg_restore` oder verwaltete DB-Backups
- **S3-Speicher:** Verwenden Sie Bucket-Versionierung, Replikation oder Provider-Backups

**Empfehlung:** Tägliche Datenbank-Backups, mindestens 30 Tage aufbewahren.

## Monitoring

**Health-Endpunkt:**

`GET /api/health` → `{ "status": "ok" }`

```bash
curl https://kanap.firma.de/api/health
```

**Container-Status:**
```bash
docker compose -f infra/compose.onprem.yml ps
docker compose -f infra/compose.onprem.yml logs -f api
```

**Wichtige Kennzahlen:**
- Container laufen (`api`, `web`)
- API-Speicher unter ~1 GB
- Datenbankverbindungen
- Speichernutzung

## Fehlerbehebung

| Symptom | Prüfen | Lösung |
|---------|--------|--------|
| Container starten nicht | `docker compose logs api` | Auf Startfehler prüfen |
| "Database connection failed" | `DATABASE_URL` überprüfen | PostgreSQL-Erreichbarkeit/Zugangsdaten prüfen |
| "S3 error" | S3_*-Variablen überprüfen | Sicherstellen, dass Bucket existiert und Berechtigungen korrekt sind |
| Migration fehlgeschlagen | PostgreSQL-Version prüfen | Muss 16+ sein, Erweiterungen verfügbar |
| 502 vom Reverse Proxy | `docker compose ps` | Sicherstellen, dass api-Container auf Port 8080 läuft |
| Anmeldung nicht möglich | `.env`-Zugangsdaten überprüfen | Passwortzurücksetzung unten verwenden |

## Passwortzurücksetzung

**Empfohlen:** E-Mail konfigurieren (Resend API oder Single-Tenant SMTP) und den „Passwort vergessen"-Flow verwenden.

**Fallback (SQL):** Wenn E-Mail nicht konfiguriert ist, Passwörter direkt in der Datenbank zurücksetzen.

**1) Passwort-Hash generieren:**

```bash
# Mit Node.js und argon2
# (argon2 ist eine Produktionsabhängigkeit im API-Image)
docker compose -f infra/compose.onprem.yml exec api \
  node -e "require('argon2').hash('NeuesPasswort123!').then(h => console.log(h))"
```

**2) Benutzer in PostgreSQL aktualisieren:**

```sql
UPDATE users
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$...'
WHERE email = 'benutzer@firma.de';
```

Diese SQL-Methode ist ein letzter Ausweg für ausgesperrte Administratoren.
