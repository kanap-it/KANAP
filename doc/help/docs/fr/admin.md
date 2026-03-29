# Administration

La section Administration donne accès à la gestion des utilisateurs, la configuration des rôles, la facturation, les paramètres d'authentification, les contrôles de personnalisation et le lecteur du journal d'audit. Ces pages sont généralement réservées aux administrateurs.

## Où trouver cette page

Rendez-vous dans **Administration** depuis le menu principal pour accéder au hub d'administration.

**Autorisations** : Les différentes pages d'administration nécessitent différentes autorisations :
- Sociétés, Départements, Fournisseurs, Comptes : `{ressource}:reader` pour consulter
- Utilisateurs et accès : `users:reader` pour consulter, `users:admin` pour gérer
- Rôles : `users:reader` pour consulter, `users:admin` pour modifier
- Journal d'audit : Nécessite `users:admin`
- Facturation : Nécessite le rôle admin facturation
- Authentification : Nécessite `users:admin` (contrôlé par feature flag ; nécessite SSO activé)
- Personnalisation : Nécessite `users:admin` (hôte tenant uniquement ; accessible depuis la barre latérale)

---

## Hub d'administration

La page d'accueil Administration donne un accès rapide aux principales fonctions administratives :

| Carte | Description | Autorisation requise |
|-------|-------------|----------------------|
| **Sociétés** | Gérer les sociétés et les métriques annuelles | `companies:reader` |
| **Départements** | Gérer les départements et l'effectif | `departments:reader` |
| **Fournisseurs** | Gérer les fournisseurs et contacts | `suppliers:reader` |
| **Comptes** | Gérer les codes comptables | `accounts:reader` |
| **Utilisateurs et accès** | Assigner les sièges et rôles | `users:reader` |
| **Rôles** | Définir les autorisations des rôles | `users:reader` |
| **Journal d'audit** | Parcourir tout l'historique des modifications | `users:admin` |
| **Facturation** | Plan, sièges et factures | Admin facturation |

Authentification et Personnalisation sont accessibles depuis la navigation dans la barre latérale mais n'apparaissent pas sur la page d'accueil du hub d'administration.

---

## Journal d'audit

La page Journal d'audit affiche l'historique des modifications au niveau du tenant pour les mises à jour de données à travers la plateforme.

### Accès

- Route : `/admin/audit-logs`
- Autorisation requise : `users:admin`
- Cette page est en lecture seule (aucune action de création/modification/suppression).

### Ce que vous pouvez faire

- Rechercher dans le nom de table, l'action et l'acteur (e-mail/nom)
- Filtrer par :
  - Date
  - Table
  - Action
  - Source (`user`, `system`, `webhook`)
- Ouvrir n'importe quelle ligne pour voir les détails complets :
  - Pastilles de métadonnées (date, table, action, source, référence source, tenant, id d'enregistrement, utilisateur)
  - Résumé des champs modifiés
  - Payloads JSON **Avant** et **Après** côte à côte

### Colonnes

**Colonnes par défaut** :
- **Date** : Quand la modification a eu lieu
- **Table** : Quelle table de base de données a été affectée
- **Action** : Le type de modification (create, update, delete, disable)
- **Source** : Qui ou quoi a déclenché la modification (user, system, webhook)
- **Utilisateur** : E-mail de l'utilisateur qui a fait la modification (ou « System »/« Webhook » pour les sources non-utilisateur)

**Colonnes supplémentaires** (via le sélecteur de colonnes) :
- **ID d'enregistrement** : Identifiant de l'enregistrement affecté
- **ID utilisateur** : UUID de l'utilisateur agissant
- **Nom utilisateur** : Nom d'affichage de l'utilisateur agissant
- **Réf. source** : Référence externe pour les modifications provenant de webhooks
- **ID tenant** : Le tenant auquel cette entrée appartient

### Pagination

- La grille utilise une pagination explicite avec **100 lignes par page**.
- Les filtres et la recherche s'appliquent à l'ensemble des données, pas seulement à la page actuelle.

---

## Utilisateurs et accès

Gérez qui peut accéder à KANAP et ce qu'ils peuvent faire.

### La grille des utilisateurs

**Colonnes par défaut** :
- **Nom** / **Prénom** : Nom de l'utilisateur
- **Adresse e-mail** : Adresse e-mail de connexion
- **Intitulé de poste** : Leur rôle dans l'organisation
- **Rôle** : Rôle principal assigné
- **Société** / **Département** : Affectation organisationnelle de l'utilisateur

**Colonnes supplémentaires** (via le sélecteur de colonnes) :
- **Tél. professionnel** / **Tél. mobile** : Numéros de contact
- **MFA activé** : Si l'authentification multi-facteur est active
- **Créé** : Quand l'utilisateur a été créé

La grille affiche par défaut les utilisateurs **activés**. Utilisez la bascule de périmètre pour basculer entre **Activé**, **Désactivé** et **Tous**.

### Actions de gestion des utilisateurs

| Action | Description | Autorisation |
|--------|-------------|-------------|
| **Nouveau** | Créer un nouvel utilisateur | `users:member` |
| **Modifier** | Modifier les détails de l'utilisateur (cliquez sur n'importe quelle ligne) | `users:member` |
| **Import CSV** | Import en masse d'utilisateurs | `users:admin` |
| **Export CSV** | Exporter la liste des utilisateurs | `users:admin` |
| **Inviter** | Envoyer des invitations de connexion aux utilisateurs sélectionnés | `users:admin` |
| **Supprimer** | Supprimer définitivement les utilisateurs sélectionnés | `users:admin` |

### Créer un utilisateur

1. Cliquez sur **Nouveau**
2. Remplissez les champs obligatoires :
   - **E-mail** : Adresse e-mail de connexion (doit être unique)
3. Champs optionnels :
   - **Prénom** / **Nom** : Nom de l'utilisateur
   - **Intitulé de poste** : Leur rôle dans l'organisation
   - **Tél. professionnel** / **Tél. mobile** : Numéros de contact
   - **Rôles** : Assigner un ou plusieurs rôles (détermine les autorisations)
   - **Société** / **Département** : Affectation organisationnelle
   - **Activé** : Si l'utilisateur peut se connecter (consomme un siège)
4. Cliquez sur **Enregistrer** ou **Enregistrer et inviter** pour envoyer l'e-mail de connexion

### Assignation multi-rôles

Les utilisateurs peuvent se voir assigner plusieurs rôles. Leurs autorisations effectives sont la combinaison de tous les rôles assignés -- si un rôle donne accès à une ressource, l'utilisateur a cet accès.

### Gestion des sièges

Les utilisateurs consomment des **sièges** selon votre plan d'abonnement :
- **Utilisateurs activés** : Comptent dans votre limite de sièges
- **Utilisateurs désactivés** : Ne consomment pas de sièges
- Le compteur de sièges dans la barre d'outils affiche l'utilisation actuelle (ex. : « Sièges 5/10 »)
- Basculez le commutateur **Activé** lors de la modification d'un utilisateur pour gérer l'allocation de sièges

### Utilisateurs gérés par SSO

Lorsque Microsoft Entra ID (SSO) est connecté, les champs de profil utilisateur (nom, intitulé de poste, téléphone) sont synchronisés depuis Entra à la connexion et ne peuvent pas être modifiés dans KANAP. Vous pouvez toujours gérer les rôles et les affectations organisationnelles.

---

## Rôles

Définissez ce que chaque rôle peut faire dans KANAP.

### Comment fonctionnent les rôles

Chaque rôle a des niveaux d'autorisation pour différentes ressources :
- **Aucun** : Pas d'accès à cette ressource
- **Reader** : Consultation uniquement
- **Contributeur** : Consultation et modification des éléments existants, ajout de commentaires et pièces jointes, mais pas de création de nouveaux éléments de premier niveau (actuellement utilisé pour les projets du portefeuille)
- **Member** : Consultation, création et modification
- **Admin** : Accès complet incluant la suppression

### Groupes d'autorisations

Les ressources sont organisées en groupes pour faciliter la gestion :

**Budget et finance**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `opex` | Dépenses opérationnelles |
| `capex` | Dépenses d'investissement |
| `budget_ops` | Outils d'administration budgétaire |
| `contracts` | Contrats fournisseurs |
| `analytics` | Dimensions analytiques |
| `reporting` | Accès aux rapports |

**Gestion du portefeuille**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `portfolio_requests` | Demandes du portefeuille |
| `portfolio_projects` | Projets du portefeuille |
| `portfolio_planning` | Planification du portefeuille |
| `portfolio_reports` | Rapports du portefeuille |
| `portfolio_settings` | Paramètres du portefeuille |

**Cartographie SI**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `applications` | Applications |
| `infrastructure` | Serveurs et infrastructure |
| `locations` | Données de référence des sites |
| `settings` | Paramètres des applications |

**Données de référence**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `companies` | Données de référence des sociétés |
| `departments` | Données de référence des départements |
| `suppliers` | Données de référence des fournisseurs |
| `contacts` | Répertoire des contacts |
| `accounts` | Plan comptable |
| `business_processes` | Catalogue des processus métier |

**Tâches**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `tasks` | Gestion des tâches |

**Base de connaissances**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `knowledge` | Articles de la base de connaissances |

La ressource Knowledge supporte les niveaux Reader, Member et Admin (Contributeur n'est pas disponible pour cette ressource).

**Administration**
| Ressource | Ce qu'elle contrôle |
|-----------|---------------------|
| `users` | Gestion des utilisateurs et rôles |
| `billing` | Facturation et abonnement |

### Types de rôles

Les rôles sont catégorisés par la manière dont ils peuvent être modifiés :

| Badge | Description |
|-------|-------------|
| **Système** | Ne peut pas être modifié. Administrateur a un accès complet ; Contact est pour les entrées du répertoire uniquement. |
| **Intégré** | Rôles pré-configurés fournissant des schémas d'accès standard. Ne peut pas être modifié directement -- utilisez **Dupliquer** pour créer une copie personnalisable. |
| _(pas de badge)_ | Rôles personnalisés que vous créez. Entièrement modifiables. |

### Rôles intégrés

KANAP est livré avec des rôles pré-configurés organisés par domaine fonctionnel :

**Budget** : Administrateur budget, Membre budget, Lecteur budget
**Portefeuille** : Administrateur portefeuille, Membre portefeuille, Lecteur portefeuille, **Contributeur métier**
**Cartographie SI** : Administrateur Cartographie SI, Membre Cartographie SI, Lecteur Cartographie SI
**Données de référence** : Administrateur données de référence, Membre données de référence, Lecteur données de référence
**Tâches** : Administrateur tâches, Membre tâches, Lecteur tâches

#### Le rôle Contributeur métier

Le rôle **Contributeur métier** est conçu pour les parties prenantes métier qui participent au processus de portefeuille sans avoir les privilèges complets de gestion de projet. Un Contributeur métier peut :

- **Soumettre et gérer des demandes de portefeuille** (accès complet member aux demandes)
- **Modifier des projets existants** -- mettre à jour les champs, ajouter des commentaires, téléverser des pièces jointes, gérer les phases, jalons, dépendances et entrées de temps
- **Créer et travailler sur les tâches projet** -- ajouter des tâches aux projets, saisir du temps et poster des commentaires
- **Consulter les utilisateurs, sociétés, départements et contacts** pour les sélections dans les menus déroulants

Un Contributeur métier **ne peut pas** :
- Créer de nouveaux projets (nécessite le niveau Member sur les projets du portefeuille)
- Convertir des demandes en projets (nécessite le niveau Member)
- Importer/exporter en CSV (nécessite le niveau Admin)

Ce rôle comble le fossé entre l'accès en lecture seule (Reader) et la gestion complète de projet (Member), permettant aux utilisateurs métier de contribuer activement sans pouvoir créer de nouveaux projets.

### Le rôle Contact

Le rôle **Contact** est un rôle système spécial pour les utilisateurs qui apparaissent dans les listes déroulantes mais n'ont pas besoin de se connecter. Utilisations courantes :

- Demandeurs ou sponsors qui n'ont besoin d'être que référencés, pas d'être des utilisateurs actifs
- Parties prenantes externes listées à des fins de suivi
- Entrées de remplacement pour la structure organisationnelle

**Les utilisateurs Contact :**
- Ne peuvent pas se connecter à KANAP
- Ne consomment pas de sièges d'abonnement
- Ne reçoivent pas de notifications par e-mail (même s'ils sont assignés à des projets/tâches)
- Peuvent être sélectionnés dans les menus déroulants d'utilisateurs (ex. : comme sponsor de projet)

Si une personne avec le rôle Contact a besoin d'utiliser activement KANAP, changez son rôle vers un rôle classique (ex. : Lecteur, Member) et invitez-la.

### Gérer les rôles

La page Rôles a une disposition à deux panneaux :
- **Panneau gauche** : Liste de tous les rôles avec des badges indiquant le type, et un compteur d'utilisateurs pour chaque rôle
- **Panneau droit** : Détails et autorisations pour le rôle sélectionné

**Actions** :
- **Nouveau rôle** : Créer un rôle personnalisé de zéro
- **Dupliquer** : Copier un rôle existant (y compris les rôles intégrés) comme point de départ. Non disponible pour les rôles Système.
- **Supprimer** : Supprimer un rôle personnalisé (seulement si aucun utilisateur n'est assigné)
- **Enregistrer les détails** : Mettre à jour le nom et la description du rôle
- **Enregistrer les autorisations** : Appliquer les modifications d'autorisations

### Créer un rôle personnalisé

1. Cliquez sur **Nouveau rôle**
2. Saisissez un nom et une description
3. Cliquez sur **Créer**
4. Définissez les niveaux d'autorisation pour chaque groupe de ressources
5. Cliquez sur **Enregistrer les autorisations**

**Conseil** : Commencez par dupliquer un rôle intégré qui se rapproche de ce dont vous avez besoin, puis ajustez les autorisations.

---

## Facturation

Gérez votre abonnement, vos sièges et vos factures.

### Vue d'ensemble de l'abonnement

La carte d'abonnement affiche votre plan actuel en un coup d'oeil :
- **Plan** : Votre niveau d'abonnement (Solo, Team, Pro ou Essai gratuit)
- **Sièges** : Sièges utilisés vs. disponibles
- **Statut** : Actif, En essai, En retard, Annulé, etc.
- **Date de renouvellement** : Quand le prochain cycle de facturation commence

Pour les abonnements actifs (pas les essais locaux), des détails supplémentaires sont affichés :
- **Montant par période** : Coût pour le cycle de facturation en cours
- **Fréquence de facturation** : Mensuelle ou Annuelle
- **Méthode de collecte** : Prélèvement automatique ou Facture (paiement manuel)
- **Moyen de paiement** : Détails de la carte ou Virement bancaire
- **Dernière synchro Stripe** : Quand les données d'abonnement ont été mises à jour depuis Stripe

### Actions

- **Choisir un plan** / **Changer de plan** : Ouvrir la boîte de dialogue de sélection de plan pour souscrire ou changer de plans. Nécessite l'admin facturation.
- **Gérer l'abonnement** : Ouvrir le portail client Stripe pour mettre à jour les moyens de paiement, annuler ou effectuer d'autres modifications. Disponible uniquement lorsqu'un abonnement Stripe existe.

### Historique des factures

Les factures passées sont affichées sous la carte d'abonnement :
- Numéro de facture et date
- Statut (Brouillon, Ouverte, Payée, Annulée, Non recouvrable)
- Montant et devise
- **Voir** : Ouvrir la facture dans le lecteur hébergé de Stripe
- **Télécharger** : Télécharger le PDF de la facture

### Informations client

Mettez à jour les coordonnées associées à votre enregistrement client Stripe :
- **Nom du client** et **Société**
- **E-mail** et **Téléphone**
- **Numéro de TVA**
- **Adresse** (ligne 1, ligne 2, ville, état/province, code postal, pays)

### Informations de facturation

Coordonnées séparées utilisées spécifiquement sur les factures. Cliquez sur **Copier depuis le client** pour pré-remplir depuis les informations client ci-dessus.

---

## Authentification

Configurez le single sign-on (SSO) pour votre organisation. Cette page n'est disponible que lorsque la fonctionnalité SSO est activée et n'est pas accessible depuis l'hôte platform-admin.

### Microsoft Entra ID (Azure AD)

Connectez KANAP à votre tenant Microsoft Entra ID pour le SSO :

1. Cliquez sur **Connecter Microsoft Entra**
2. Connectez-vous avec un compte administrateur Microsoft
3. Accordez les autorisations demandées
4. Les utilisateurs peuvent maintenant se connecter avec leurs comptes Microsoft

### Statut SSO

- **Connecté** : Affiche votre ID de tenant Entra
- **Non connecté** : Authentification locale uniquement

### Actions

| Action | Description |
|--------|-------------|
| **Connecter Microsoft Entra** | Lancer le flux de configuration Microsoft Entra |
| **Reconnecter Microsoft Entra** | Relancer le flux de configuration (affiché lorsque déjà connecté) |
| **Tester la connexion Microsoft** | Tester la connexion SSO avec votre compte Microsoft |
| **Déconnecter** | Supprimer la configuration SSO (revient à l'auth locale) |

---

## Personnalisation

Utilisez **Administration > Personnalisation** pour appliquer l'identité de votre entreprise dans KANAP.

- Route : `/admin/branding`
- Autorisation : `users:admin`
- Portée : hôtes tenant uniquement (non disponible sur l'hôte platform-admin)

La personnalisation vous permet de :
- Téléverser ou supprimer le logo de votre tenant
- Contrôler si le logo est affiché en mode sombre
- Définir des couleurs primaires séparées pour les modes clair et sombre
- Réinitialiser toute la personnalisation aux valeurs par défaut

Pour les instructions détaillées étape par étape, consultez : [Personnalisation](branding.md)

---

## Paramètres

La page Paramètres vous permet de gérer votre profil personnel et vos préférences de notification. Accédez-y depuis le menu utilisateur (avatar en haut à droite) ou naviguez vers `/settings`.

La page a deux onglets, accessibles via URL :
- `/settings/profile` (par défaut) -- Onglet Profil
- `/settings/notifications` -- Onglet Notifications

### Profil

Modifiez vos informations personnelles :
- **Prénom** / **Nom**
- **Intitulé de poste**
- **Tél. professionnel** / **Tél. mobile**

Si votre organisation utilise Microsoft Entra ID (SSO), certains champs peuvent être synchronisés depuis Entra et ne peuvent pas être modifiés dans KANAP.

### Notifications

Contrôlez quelles notifications par e-mail vous recevez.

**Bascule principale** : Activez ou désactivez toutes les notifications par e-mail avec le commutateur **Notifications par e-mail** en haut.

**Catégories par espace de travail** (chacune avec sa propre bascule activer/désactiver) :

| Espace de travail | Catégories de notifications |
|-------------------|-----------------------------|
| **Portefeuille** | Changements de statut, ajout à une équipe, changements d'équipe sur les éléments que vous pilotez, commentaires |
| **Tâches** | Assignation (comme responsable, demandeur ou observateur), changements de statut, commentaires |
| **Budget** | Avertissements d'expiration, changements de statut, commentaires |

**E-mail de revue hebdomadaire** : Recevez un résumé périodique de votre activité et des éléments à venir. Configurez :
- **Jour de la semaine** (ex. : lundi)
- **Heure** (dans votre fuseau horaire)
- **Fuseau horaire**

Utilisez le bouton **Aperçu de l'e-mail** pour vous envoyer un e-mail de test et vérifier le format.

Toutes les modifications sont enregistrées automatiquement lorsque vous basculez les commutateurs ou changez les sélections.

---

## Conseils

  - **Dupliquez les rôles intégrés** : Au lieu de créer des rôles de zéro, dupliquez un rôle intégré et ajustez les autorisations. Cela fait gagner du temps et vous assure de ne pas oublier de ressources importantes.
  - **Utilisez le multi-rôle pour la flexibilité** : Assignez aux utilisateurs plusieurs rôles pour combiner les autorisations -- par exemple, un rôle « Lecteur finance » plus un rôle « Chef de projet ».
  - **Utilisez le SSO** : Si vous avez Microsoft 365, connectez Entra ID pour une gestion plus facile des utilisateurs et une synchronisation automatique des profils.
  - **Surveillez les sièges** : Gardez un oeil sur l'utilisation des sièges dans la barre d'outils pour éviter d'atteindre les limites.
  - **Désactivez, ne supprimez pas** : Lorsque quelqu'un part, désactivez son compte pour préserver l'historique d'audit.
  - **Revoyez les autorisations régulièrement** : Auditez les autorisations des rôles périodiquement pour maintenir le principe du moindre privilège.
