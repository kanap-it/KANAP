# Opérations on-premise

## Procédure de mise à jour

```bash
# 1. Sauvegardez la base de données et le stockage (votre responsabilité)

# 2. Récupérez les dernières modifications et recompilez
cd kanap
git pull origin main
docker build -t kanap-api:latest ./backend
docker build -t kanap-web:latest ./frontend

# 3. Redémarrez les conteneurs (les migrations s'exécutent automatiquement)
docker compose -f infra/compose.onprem.yml up -d

# 4. Vérifiez le démarrage
docker compose -f infra/compose.onprem.yml logs -f api
# Attendez le message "Application started"
```

**Changements majeurs :** Consultez le `CHANGELOG.md` avant de mettre à jour.

**Retour arrière :** Restaurez la base de données depuis une sauvegarde. Les migrations sont uniquement progressives.

## Support des versions

KANAP est une solution en évolution rapide et nous recommandons une mise à jour mensuelle.
Pour les clients sous contrat de support, une mise à jour vers la dernière version peut être demandée avant le traitement d'une demande de support.

## Sauvegarde & Restauration

- **PostgreSQL :** Utilisez `pg_dump`/`pg_restore` ou les sauvegardes de base de données managée
- **Stockage S3 :** Utilisez le versionnement de bucket, la réplication ou les sauvegardes du fournisseur

**Recommandation :** Sauvegardes quotidiennes de la base de données, conservation d'au moins 30 jours.

## Supervision

**Endpoint de santé :**

`GET /api/health` → `{ "status": "ok" }`

```bash
curl https://kanap.company.com/api/health
```

**Santé des conteneurs :**
```bash
docker compose -f infra/compose.onprem.yml ps
docker compose -f infra/compose.onprem.yml logs -f api
```

**Métriques clés :**
- Conteneurs en cours d'exécution (`api`, `web`)
- Mémoire API sous ~1 Go
- Connexions à la base de données
- Utilisation du stockage

## Dépannage

| Symptôme | Vérification | Solution |
|---------|-------|----------|
| Les conteneurs ne démarrent pas | `docker compose logs api` | Vérifiez les erreurs de démarrage |
| « Database connection failed » | Vérifiez `DATABASE_URL` | Vérifiez l'accessibilité/les identifiants PostgreSQL |
| « S3 error » | Vérifiez les variables S3_* | Assurez-vous que le bucket existe et que les autorisations sont correctes |
| Échec de migration | Vérifiez la version PostgreSQL | Doit être 16+, extensions disponibles |
| 502 du reverse proxy | `docker compose ps` | Assurez-vous que le conteneur api est en cours d'exécution sur le port 8080 |
| Impossible de se connecter | Vérifiez les identifiants `.env` | Utilisez la réinitialisation de mot de passe ci-dessous |

## Réinitialisation de mot de passe

**Recommandé :** Configurez l'email (API Resend ou SMTP single-tenant) et utilisez le flux « Mot de passe oublié ».

**Solution de secours (SQL) :** Si l'email n'est pas configuré, réinitialisez les mots de passe directement dans la base de données.

**1) Générez un hash de mot de passe :**

```bash
# En utilisant Node.js avec argon2
# (argon2 est une dépendance de production dans l'image API)
docker compose -f infra/compose.onprem.yml exec api \
  node -e "require('argon2').hash('NewPassword123!').then(h => console.log(h))"
```

**2) Mettez à jour l'utilisateur dans PostgreSQL :**

```sql
UPDATE users
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$...'
WHERE email = 'user@company.com';
```

Cette méthode SQL est une solution de dernier recours pour les administrateurs bloqués.
