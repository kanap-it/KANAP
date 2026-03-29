# Tableau de bord

Le Tableau de bord est votre page d'accueil personnelle dans KANAP. Il vous offre un aperçu rapide de vos tâches, projets, temps enregistré et activité récente, le tout en un seul endroit. Vous pouvez personnaliser les tuiles affichées et leur comportement.

## Où le trouver

- Cliquez sur le logo **KANAP** ou naviguez vers `/`
- C'est la page par défaut après connexion pour les utilisateurs non-administrateurs.
- Aucune autorisation spéciale n'est requise pour voir le tableau de bord lui-même, mais les tuiles individuelles dépendent de vos droits d'accès.

## Actions rapides

En haut du tableau de bord, vous trouverez des boutons de raccourci pour les actions courantes :

- **Créer une tâche** — ouvre le formulaire de création de tâche. Nécessite `tasks:member` ou supérieur.
- **Saisir du temps** — ouvre un dialogue rapide pour enregistrer des heures sur un projet. Choisissez un projet, saisissez les heures, sélectionnez une catégorie (**IT** ou **Métier**), et ajoutez éventuellement des notes. Nécessite `portfolio_projects:member` ou supérieur.
- **Nouveau document** — ouvre le formulaire de création de la base de connaissances pour créer un document vierge ou à partir d'un modèle publié. Nécessite `knowledge:member` ou supérieur.
- **Paramètres** (icône engrenage) — ouvre les paramètres du tableau de bord pour choisir les tuiles à afficher.

## Tuiles du tableau de bord

Le tableau de bord affiche une grille de tuiles, chacune montrant un aspect différent de votre travail. Les tuiles sont disposées en grille responsive (trois colonnes sur grands écrans, deux sur moyens, une sur petits).

### Mes tâches

Affiche vos tâches assignées groupées par urgence :

- **En retard** — tâches dépassant leur date d'échéance (surlignées en rouge)
- **Échéance cette semaine** — tâches dues dans les 7 prochains jours
- **Plus tard** — tout le reste

Chaque tâche affiche son titre, le projet lié (le cas échéant), la date d'échéance et un badge de priorité lorsque la priorité est supérieure à normale. Cliquez sur une tâche pour ouvrir son espace de travail.

Affiche jusqu'à 5 éléments au total entre les trois groupes.

**Nécessite** : `tasks:reader`

---

### Projets que je dirige

Liste les projets où vous avez un rôle de direction (responsable IT, responsable métier, sponsor IT ou sponsor métier). Chaque projet affiche :

- Votre rôle
- Le statut actuel du projet (avec code couleur)
- Le prochain jalon et sa date cible, si défini

Affiche jusqu'à 5 éléments.

**Nécessite** : `portfolio_projects:reader`

---

### Projets auxquels je contribue

Liste les projets où vous êtes membre d'équipe. Chaque projet affiche :

- Votre équipe (Équipe IT ou Équipe Métier)
- Le statut actuel du projet
- Le nombre de tâches qui vous sont assignées dans ce projet

Affiche jusqu'à 5 éléments.

**Nécessite** : `portfolio_projects:reader` et `tasks:reader`

---

### Consultés récemment

Affiche les éléments que vous avez récemment ouverts dans l'application — projets, demandes, applications, actifs, interfaces, connexions, contrats, tâches, postes OPEX et postes CAPEX. Chaque entrée montre le nom de l'élément, son type et la date de votre dernière consultation.

Les éléments récemment consultés sont stockés localement dans votre navigateur et sont spécifiques à votre utilisateur et tenant. Cliquez sur **Effacer** pour réinitialiser la liste.

Affiche jusqu'à 5 éléments.

**Nécessite** : Aucune autorisation spéciale (les éléments auxquels vous n'avez pas accès sont automatiquement masqués).

---

### Mon temps la semaine dernière

Affiche un résumé du temps que vous avez enregistré sur une période récente :

- **Total des heures** enregistrées (affiché en évidence)
- **Répartition par catégorie** — IT, Métier et Autres tâches
- **Top projets** — un graphique en barres des projets sur lesquels vous avez passé le plus de temps

**Paramètres** : Période en jours (7–30).

**Nécessite** : `portfolio_projects:reader` et `tasks:reader`

---

### Nouvelles demandes

Affiche les demandes de portefeuille créées dans une période récente. Chaque demande montre le nom, le demandeur, la date de création et un badge de priorité si le score de priorité est supérieur à 80.

Affiche jusqu'à 5 éléments.

**Nécessite** : `portfolio_requests:reader`

---

### Base de connaissances

Affiche deux sections orientées base de connaissances :

- **À réviser** — documents où vous êtes le relecteur ou l'approbateur actif
- **5 derniers consultés** — les cinq derniers documents de la base de connaissances que vous avez ouverts dans ce navigateur pour le tenant et l'utilisateur courants

**Nécessite** : `knowledge:reader`

---

### Activité de l'équipe

Affiche l'activité récente des projets dans lesquels vous êtes impliqué.

**Nécessite** : `portfolio_projects:reader`

---

### Changements de statut des projets

Affiche les derniers changements de statut des projets sur les derniers jours.

**Nécessite** : `portfolio_projects:reader`

---

### Tâches en attente

Affiche les tâches qui n'ont pas été mises à jour depuis longtemps, avec une portée personnelle, équipe ou globale.

**Nécessite** : `tasks:reader`

## Personnaliser votre tableau de bord

Cliquez sur l'icône **Paramètres** (engrenage) dans la zone supérieure droite du tableau de bord pour ouvrir le dialogue de paramètres.

Depuis cet écran, vous pouvez :

- **Activer ou désactiver des tuiles** — cochez ou décochez chaque tuile pour contrôler ce qui apparaît sur votre tableau de bord
- **Rétablir les valeurs par défaut** — restaurer la sélection de tuiles d'origine

Seules les tuiles que vous avez l'autorisation de voir apparaissent dans la liste des paramètres. Les modifications sont enregistrées sur votre compte et persistent entre les sessions et les appareils.

Si toutes les tuiles sont désactivées, le tableau de bord affiche un message vous invitant à activer des tuiles dans les paramètres.

## Conseils

- **Commencez avec les valeurs par défaut** : Le tableau de bord est livré avec un ensemble utile de tuiles déjà activées. Essayez-le pendant quelques jours avant de personnaliser.
- **Utilisez les actions rapides** : Créer une tâche ou saisir du temps depuis le tableau de bord vous évite de quitter votre vue d'ensemble.
- **Vérifiez les tâches en retard quotidiennement** : La tuile Mes tâches surligne les éléments en retard en rouge pour que rien ne passe entre les mailles du filet.
