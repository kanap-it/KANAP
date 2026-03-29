# On-premise : Configuration SSO Microsoft Entra

Ce guide explique comment activer le SSO Microsoft Entra (Azure AD) pour un déploiement KANAP on-premise.
Le SSO Entra est optionnel ; si vous ne le configurez pas, l'authentification locale par email/mot de passe reste disponible.

## Vue d'ensemble

KANAP utilise le flux de code d'autorisation OAuth2/OIDC en tant que client confidentiel.
Chaque client on-premise **doit enregistrer sa propre application Entra** et fournir son client ID/secret.

### Ce que le client fournit

- Un enregistrement d'application Entra **dans son tenant**
- `ENTRA_CLIENT_ID` et `ENTRA_CLIENT_SECRET`
- `ENTRA_AUTHORITY` pointant vers son tenant
- `ENTRA_REDIRECT_URI` correspondant à son URL KANAP

## Prérequis

- Une URL HTTPS publique pour KANAP (reverse proxy devant l'API)
- La capacité de créer un enregistrement d'application et d'accorder le consentement admin dans Entra
- Connectivité sortante depuis le conteneur API KANAP vers :
  - `login.microsoftonline.com` (métadonnées OIDC, échange de token, JWKS)
  - `graph.microsoft.com` (enrichissement de profil optionnel)

## Étape 1 : Créer un enregistrement d'application (Entra)

1. Ouvrez **Microsoft Entra ID → Inscriptions d'applications → Nouvelle inscription**
2. Nom : `KANAP (on-prem)`
3. Types de comptes pris en charge : **Locataire unique** (recommandé)
4. URI de redirection (Web) :
   `https://<votre-domaine-kanap>/api/auth/entra/callback`
5. Enregistrez et notez :
   - **ID d'application (client)**
   - **ID de répertoire (tenant)**

## Étape 2 : Créer un secret client

1. Allez dans **Certificats & secrets**
2. Créez un nouveau **Secret client**
3. Copiez la **valeur du secret** (elle n'est affichée qu'une seule fois)

## Étape 3 : Autorisations API

KANAP demande les scopes suivants lors de la connexion Entra :

- `openid profile email offline_access`
- `User.Read` (Microsoft Graph, pour l'enrichissement de profil)

Assurez-vous que **Microsoft Graph → User.Read (Déléguée)** est autorisée et accordez le consentement admin si nécessaire.

Si vous préférez ne pas autoriser les appels Graph, définissez :

```
ENTRA_ENRICH_PROFILE=false
```

## Étape 4 : Configurer les variables d'environnement KANAP

Définissez les éléments suivants dans votre `.env` on-premise :

```bash
# SSO Entra (on-prem)
ENTRA_CLIENT_ID=<application-client-id>
ENTRA_CLIENT_SECRET=<client-secret>
ENTRA_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
ENTRA_REDIRECT_URI=https://kanap.company.com/api/auth/entra/callback
```

Notes :
- `ENTRA_AUTHORITY` doit être **spécifique au tenant** pour l'on-premise.
- `ENTRA_REDIRECT_URI` doit correspondre **exactement** à ce que vous avez enregistré dans Entra.
- Assurez-vous que `APP_BASE_URL` est défini sur l'URL publique pour que la redirection post-connexion soit correcte.

## Étape 5 : Redémarrer KANAP

Après avoir mis à jour `.env`, redémarrez vos conteneurs pour que l'API prenne en compte la nouvelle configuration.

## Étape 6 : Connecter Entra dans KANAP

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Administration → Authentification**
3. Cliquez sur **Connecter Microsoft Entra**
4. Approuvez le consentement dans Entra
5. Utilisez **Tester la connexion** pour confirmer la connexion de bout en bout

## Dépannage

- **SSO_NOT_CONFIGURED** : Les variables d'environnement Entra sont manquantes ou le tenant n'est pas connecté.
- **ENTRA_TENANT_MISMATCH** : Vous avez connecté un tenant mais vous essayez de vous connecter depuis un autre.
- **Invalid Entra state / nonce** : Cookie bloqué ou HTTPS mal configuré.
- **Mauvaise redirection après connexion** : Vérifiez `APP_BASE_URL` et les en-têtes du reverse proxy (`Host`, `X-Forwarded-Proto`).

## Notes de sécurité

- Ne commitez pas `ENTRA_CLIENT_SECRET` dans git.
- Renouvelez le secret périodiquement.
- Utilisez un enregistrement d'application dédié.
