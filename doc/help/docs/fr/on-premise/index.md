# Déploiement on-premise

KANAP peut être déployé on-premise en **mode single-tenant**. Vous fournissez votre propre PostgreSQL, stockage compatible S3 et reverse proxy TLS. KANAP gère tout le reste : les migrations s'exécutent automatiquement, le tenant et l'utilisateur administrateur sont créés au premier démarrage, et une limite généreuse de sièges (1 000) est pré-configurée.

## Guides

- **[Installation](installation.md) :** Cloner, compiler, configurer et démarrer
- **[Exemple d'installation](installation-example.md) :** Tutoriel pas à pas sur Ubuntu 24.04 avec PostgreSQL, MinIO et nginx
- **[Configuration](configuration.md) :** Référence des variables d'environnement
- **[Opérations](operations.md) :** Mises à jour, sauvegardes, supervision, dépannage
- **[SSO Microsoft Entra](sso-entra.md) :** Authentification unique optionnelle avec Microsoft Entra ID

## Ce qui est inclus

- Fonctionnalités complètes de l'application (budgets, contrats, portefeuille, cartographie SI, reporting)
- Migrations de base de données automatiques au démarrage
- Provisionnement au premier démarrage (tenant, utilisateur admin, abonnement)
- Authentification locale par nom d'utilisateur/mot de passe (aucune dépendance externe)
- Email optionnel via l'API Resend ou SMTP géré par le client
- SSO Microsoft Entra optionnel

## Ce qui est désactivé

- **Facturation / Stripe :** Désactivé automatiquement (pas de gestion d'abonnement nécessaire)
- **Administration plateforme :** Single-tenant uniquement, pas d'interfaces de gestion multi-tenant
- **Endpoints essai / facture support :** Non applicable au déploiement on-premise

## Notes rapides

- `DEPLOYMENT_MODE=single-tenant` est le seul commutateur qui active le mode on-premise.
- `APP_BASE_URL` doit correspondre à votre URL publique pour les liens email et les exports.
- Pour l'email sortant, choisissez soit **Resend** soit **SMTP**. SMTP est destiné uniquement aux déploiements single-tenant/on-premise.
- Le backend retourne des réponses structurées `FEATURE_DISABLED` pour les fonctionnalités désactivées — l'interface les masque automatiquement.
