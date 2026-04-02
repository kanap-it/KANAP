# Installation assistée par IA

Au lieu de suivre le [tutoriel pas à pas](installation-example.md) manuellement, vous pouvez déléguer l'ensemble de l'installation à un agent IA de programmation. Un prompt, un serveur, un résultat.

Des outils comme [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) ou [OpenAI Codex](https://openai.com/index/codex/) peuvent lire la documentation KANAP, installer toutes les dépendances, configurer tous les services et vérifier le résultat -- généralement en moins de 15 minutes.

## Prérequis

| Prérequis | Détails |
|-----------|---------|
| **Serveur** | Ubuntu 24.04 LTS (fraîchement provisionné, avec accès root ou sudo) |
| **Internet** | Le serveur nécessite un accès internet sortant pendant l'installation (paquets, images Docker, clone GitHub, Let's Encrypt) |
| **DNS** | Un enregistrement A pointant le nom d'hôte souhaité vers l'adresse IP publique du serveur |
| **Agent IA** | Un agent IA de programmation installé sur le serveur (Claude Code, Codex ou similaire) |

### Sudo sans mot de passe

L'agent IA exécute de nombreuses commandes avec `sudo`. Pour éviter d'être sollicité à chaque étape, accordez temporairement le sudo sans mot de passe à votre utilisateur :

```bash
sudo usermod -aG sudo $USER
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd
```

Vous le retirerez à la fin de l'installation -- voir [Après l'installation](#apres-linstallation).

## Le prompt

Ouvrez votre agent IA sur le serveur et collez le prompt suivant, en remplaçant `kanap.example.com` par votre nom d'hôte réel et `admin@example.com` par l'adresse email de l'administrateur souhaitée :

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

### Configuration email

Ajoutez **l'un** des blocs suivants au prompt pour activer l'email sortant (réinitialisation de mot de passe, invitations, notifications).

**Option A -- Resend** (API email cloud) :

```
Email transport — Resend:
- RESEND_API_KEY=re_xxxxx
- RESEND_FROM_EMAIL=KANAP <noreply@example.com>
```

**Option B -- SMTP** (relais interne ou fournisseur) :

```
Email transport — SMTP:
- SMTP_HOST=smtp.company.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=noreply@company.com
- SMTP_PASSWORD=secret
- SMTP_FROM=KANAP <noreply@company.com>
```

Remplacez les valeurs par vos identifiants réels. Si vous ne configurez pas l'email, KANAP fonctionnera quand même -- mais la réinitialisation de mot de passe et les invitations seront indisponibles tant que vous n'aurez pas configuré l'email manuellement (voir [Configuration](configuration.md)).

!!! info "Prompt en anglais"
    Le prompt est fourni en anglais car les agents IA de programmation sont optimisés pour les instructions en anglais. Les pages de documentation référencées sont également en anglais.

## À quoi s'attendre

L'agent lira les pages de documentation référencées, puis effectuera l'installation de manière autonome :

1. **Paquets système** -- installe Docker, PostgreSQL 16, nginx, certbot
2. **PostgreSQL** -- crée la base de données, l'utilisateur et les extensions requises
3. **MinIO** -- installe le binaire, crée un service systemd, provisionne un bucket et un compte de service
4. **KANAP** -- clone le dépôt, génère les identifiants, écrit `.env`, compile les images Docker, démarre les conteneurs
5. **TLS & nginx** -- obtient un certificat Let's Encrypt, configure le reverse proxy avec HTTPS, met en place le renouvellement automatique
6. **Email** -- configure le transport email sortant dans `.env` (si fourni)
7. **Vérification** -- vérifie le endpoint de santé de l'API et l'accessibilité du frontend

L'agent demandera une confirmation avant d'exécuter des commandes sur votre serveur. Une fois terminé, le journal complet de l'installation est sauvegardé dans `~/kanap-install.md`.

## Après l'installation

1. **Vérifiez votre fichier `.env`** dans `/opt/kanap/.env` -- contrôlez les identifiants générés et ajustez les paramètres comme le nom de l'organisation
2. **Configurez l'email** si ce n'est pas déjà fait -- voir [Configuration](configuration.md) pour la configuration SMTP ou Resend. L'email permet la réinitialisation de mot de passe, les invitations et les notifications.
3. **Connectez-vous** à `https://votre-nom-dhote` avec les identifiants admin de `.env`
4. **Changez le mot de passe admin** -- utilisez le lien « Mot de passe oublié » sur la page de connexion pour recevoir un email de réinitialisation (méthode la plus simple), ou changez-le via le profil utilisateur après connexion
5. **Consultez le guide [Opérations](operations.md)** pour les mises à jour, sauvegardes et la supervision
6. **Retirez le sudo sans mot de passe** -- l'installation est terminée, rétablissez la sécurité normale :

    ```bash
    sudo rm /etc/sudoers.d/90-install-nopasswd
    ```

!!! tip "Même résultat, chemin différent"
    Ce prompt produit la même installation que le [tutoriel manuel](installation-example.md). Si vous devez dépanner ou personnaliser des composants individuels par la suite, ce guide reste la référence.
