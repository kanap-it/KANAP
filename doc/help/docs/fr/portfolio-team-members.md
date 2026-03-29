# Contributeurs

Les contributeurs vous permettent de définir les compétences, les affectations d'équipe, la disponibilité projet et les valeurs de classification par défaut pour les personnes qui travaillent sur les projets du portefeuille. Ces informations aident à la planification des ressources et garantissent que vous disposez de l'expertise adéquate pour le travail à venir.

## Premiers pas

Rendez-vous dans **Portefeuille > Contributeurs** pour voir les contributeurs configurés, regroupés par équipe. Cliquez sur **Ajouter un contributeur** pour ajouter quelqu'un depuis votre liste d'utilisateurs.

**Pour ajouter un contributeur** :
1. Cliquez sur **Ajouter un contributeur**
2. Recherchez et sélectionnez un utilisateur depuis le menu déroulant
3. Cliquez sur **Ajouter** pour créer son profil
4. Configurez son équipe, sa disponibilité, ses compétences et ses valeurs par défaut dans l'espace de travail

**Conseil** : Les contributeurs sont distincts des comptes utilisateurs. Ajouter quelqu'un comme contributeur ne modifie pas ses droits d'accès -- cela permet simplement de suivre son appartenance à une équipe, ses compétences, sa disponibilité et ses valeurs de classification par défaut pour la planification de projet.

---

## Où trouver cette page

- Espace de travail : **Portefeuille**
- Chemin : **Portefeuille > Contributeurs**
- Chemin en libre-service : **Paramètres > Profil > Paramètres contributeur** (ouvre votre propre profil contributeur)
- Autorisations :
  - Consultation : `portfolio_settings:reader`
  - Ajouter ou modifier des contributeurs : `portfolio_settings:member`
  - Supprimer des contributeurs : `portfolio_settings:admin`
  - Modifier votre propre profil : toute autorisation de niveau reader du portefeuille (ex. : `tasks:reader`, `portfolio_projects:reader`, `portfolio_settings:reader`)

Si vous ne voyez pas Contributeurs dans le menu, demandez à votre administrateur de vous accorder les autorisations appropriées.

---

## Travailler avec la liste

Les contributeurs sont affichés sous forme de cartes regroupées par équipe.

**Chaque carte de contributeur affiche** :
- **Nom** (ou e-mail si aucun nom d'affichage n'est défini)
- **Nombre de compétences** : Nombre de compétences configurées (ex. : « 3 compétences »)
- **Disponibilité** : Jours par mois disponibles pour les projets (ex. : « 5j/mois »)
- **Charge projet moyenne** : Temps projet mensuel moyen calculé à partir des entrées saisies sur les 6 derniers mois, lorsque des données sont disponibles

**Filtrage** :
- Utilisez le menu déroulant **Filtrer par équipe** pour n'afficher que les contributeurs d'une équipe spécifique
- Sélectionnez **Non assigné** pour voir les contributeurs qui n'ont pas encore été assignés à une équipe
- Sélectionnez **Toutes les équipes** pour voir tout le monde

**Groupes d'équipes** :
- Chaque équipe est affichée comme une carte repliable avec un badge de nombre de membres
- Cliquez sur l'en-tête de l'équipe pour développer ou réduire ses membres
- Les équipes sont triées par ordre alphabétique ; **Non assigné** apparaît toujours en dernier

Cliquez sur n'importe quelle carte de contributeur pour ouvrir son espace de travail.

---

## L'espace de travail du contributeur

Cliquez sur une carte de contributeur pour ouvrir son espace de travail. Il comporte quatre onglets : **Général**, **Compétences**, **Temps saisi** et **Valeurs par défaut**.

### Général

Configurez l'affectation d'équipe, la disponibilité, consultez les statistiques de temps et ajoutez des notes.

**Équipe**
Utilisez le menu déroulant pour assigner ce contributeur à une équipe. Les équipes sont des groupes organisationnels configurés dans les Paramètres du portefeuille. Cette affectation détermine comment les contributeurs sont regroupés sur la page Contributeurs. Ce champ n'est visible que lors de la modification du profil d'un autre contributeur (pas le vôtre).

**Disponibilité projet (jours par mois)**
Utilisez le curseur pour définir combien de jours par mois cette personne peut travailler sur des projets du portefeuille. La plage va de 0 à 20 jours, par incréments de 0,5 jour. La valeur par défaut est de 5 jours.

**Statistiques de temps**
Résumé en lecture seule du temps saisi pour ce contributeur. Nécessite `portfolio_settings:reader` pour être visible.

- **Charge projet mensuelle moyenne (6 derniers mois)** : Affichée en jours-homme (heures / 8)
- **Charge mensuelle (12 mois)** : Graphique en courbe montrant le temps **Total**, **Projet** et **Autre**
  - **Projet** = temps d'overhead projet + temps saisi sur les tâches projet
  - **Autre** = temps saisi sur les tâches hors projet
  - Les mois sans données apparaissent comme des espaces dans le graphique

**Notes**
Champ de texte libre pour toute information complémentaire sur ce contributeur -- certifications, préférences, contraintes ou autres détails pertinents.

---

### Compétences

Suivez ce que ce contributeur connaît et son niveau de maîtrise.

**Ajouter des compétences** :
1. Utilisez le menu déroulant **Ajouter une compétence** pour rechercher une compétence
2. Les compétences sont regroupées par catégorie
3. Sélectionnez une compétence pour l'ajouter au profil du contributeur
4. La compétence apparaît avec un niveau de maîtrise par défaut de 2 (« Peut exécuter avec support »)

**Niveaux de maîtrise** :
Chaque compétence a un niveau de maîtrise de 0 à 4 :

| Niveau | Libellé | Description |
|--------|---------|-------------|
| 0 | Aucune connaissance | Pas familier avec cette compétence |
| 1 | Base / Théorique | Comprend les concepts mais ne les a pas appliqués |
| 2 | Peut exécuter avec support | Peut faire le travail avec un accompagnement |
| 3 | Autonome | Peut travailler de manière indépendante |
| 4 | Expert | Expertise approfondie, peut former les autres |

Utilisez le curseur à côté de chaque compétence pour ajuster le niveau de maîtrise.

**Supprimer des compétences** :
Cliquez sur l'icône de suppression à côté d'une compétence pour la retirer du profil du contributeur.

**Catégories de compétences** :
Les compétences sont organisées en catégories repliables. Cliquez sur un en-tête de catégorie pour le développer ou le réduire. Les catégories contenant des compétences sélectionnées sont automatiquement développées lorsque vous ouvrez l'onglet.

---

### Temps saisi

Consultez et gérez toutes les entrées de temps pour ce contributeur en un seul endroit. Cet onglet n'est visible que si vous avez `portfolio_settings:reader` ou supérieur.

Le tableau consolide le temps saisi provenant à la fois des entrées d'overhead projet et des entrées de temps des tâches, vous donnant une image complète de la manière dont le contributeur utilise son temps.

**Colonnes** :
- **Date** : Quand le temps a été saisi
- **Source** : Où le temps a été saisi -- soit un nom de tâche soit un nom de projet
- **Catégorie** : Si l'entrée est classée **IT** ou **Métier**, affichée sous forme de libellé coloré
- **Temps** : Durée en heures ou jours (ex. : « 4h », « 1j 2h »)
- **Notes** : Notes éventuelles attachées à l'entrée

**Modifier des entrées** :
Cliquez sur l'**icône de modification** à côté d'une entrée de temps pour ouvrir la boîte de dialogue de modification. La boîte de dialogue dépend du type d'entrée :
- Les **entrées de tâche** ouvrent la boîte de dialogue de saisie de temps de la tâche, où vous pouvez ajuster les heures, la date, la catégorie et les notes
- Les **entrées de projet** ouvrent la boîte de dialogue de saisie de temps du projet, où vous pouvez ajuster les heures, la catégorie, l'utilisateur et les notes

**Supprimer des entrées** :
Cliquez sur l'**icône de suppression** à côté d'une entrée de temps pour la retirer. Une confirmation vous est demandée avant la suppression. La suppression d'une entrée met également à jour les statistiques de temps du contributeur dans l'onglet **Général**.

**Autorisations pour les actions sur les entrées de temps** :
- Pour voir la colonne **Actions**, vous avez besoin au minimum de `tasks:member` ou `portfolio_projects:contributor`
- Les utilisateurs non-administrateurs ne peuvent modifier ou supprimer que les entrées qu'ils ont créées ou auxquelles ils sont assignés
- Les utilisateurs avec `tasks:admin` peuvent modifier ou supprimer toute entrée de tâche autonome
- Les utilisateurs avec `portfolio_projects:admin` peuvent modifier ou supprimer toute entrée de tâche projet ou d'overhead projet

---

### Valeurs par défaut

Définissez les valeurs de classification par défaut qui pré-remplissent les nouvelles tâches, demandes et projets lorsque les champs de classification sont encore vides. Cela fait gagner du temps aux contributeurs qui travaillent régulièrement dans le même domaine.

**Ce que vous pouvez définir** :
- **Source** : La classification source par défaut
- **Catégorie** : La classification de catégorie par défaut
- **Flux** : La classification de flux par défaut (disponible uniquement une fois une **Catégorie** sélectionnée ; filtré aux flux appartenant à cette catégorie)
- **Société** : La société par défaut

Lorsqu'un contributeur crée une nouvelle tâche, demande ou projet, ces valeurs par défaut sont utilisées pour pré-remplir automatiquement les champs de classification. Changer la **Catégorie** efface le **Flux** si le flux actuel n'appartient pas à la catégorie nouvellement sélectionnée.

**Conseil** : Vous pouvez également accéder à vos propres valeurs par défaut depuis **Paramètres > Profil**, qui renvoie directement à l'onglet **Valeurs par défaut** de votre profil contributeur.

---

## Actions

Depuis l'en-tête de l'espace de travail :
- **Enregistrer** : Sauvegarder les modifications d'équipe, de disponibilité, de notes, de compétences ou de valeurs par défaut
- **Supprimer** : Retirer cette configuration de contributeur (n'affecte pas le compte utilisateur). Disponible uniquement lors de la modification du profil d'un autre contributeur avec `portfolio_settings:admin`.
- **Flèche retour** : Retourner à la liste des contributeurs, ou aux **Paramètres** si vous avez ouvert votre propre profil

---

## Votre propre profil contributeur

Tout utilisateur disposant d'au moins une autorisation reader au niveau portefeuille peut accéder à son propre profil contributeur dans **Portefeuille > Contributeurs > moi** ou depuis **Paramètres > Profil > Paramètres contributeur**.

Lors de la modification de votre propre profil :
- Vous pouvez mettre à jour votre **disponibilité**, vos **compétences**, vos **notes** et vos **valeurs de classification par défaut**
- Vous ne pouvez pas changer votre propre **affectation d'équipe** (seul un membre des paramètres du portefeuille peut le faire)
- Vous ne pouvez pas supprimer votre propre profil contributeur

Si vous n'avez pas encore de profil contributeur, ouvrir la page en libre-service en crée un automatiquement.

---

## Équipes

Les contributeurs peuvent être assignés à des équipes organisationnelles pour une meilleure organisation. Les équipes sont configurées dans **Portefeuille > Paramètres > Équipes**.

**Équipes par défaut** (personnalisables) :
- Infrastructure
- Applications métier
- Applications d'ingénierie
- Service Desk
- Master Data
- Cybersécurité

**Gérer les équipes** :
- Rendez-vous dans **Portefeuille > Paramètres** et cliquez sur l'onglet **Équipes**
- Ajoutez, modifiez ou désactivez des équipes
- Utilisez **Initialiser les valeurs par défaut** pour remplir avec les équipes standard
- Les équipes avec des membres assignés ne peuvent pas être supprimées

---

## Conseils

- **Assignez les contributeurs à des équipes** : Cela aide à organiser la page Contributeurs et facilite la recherche de personnes spécifiques.
- **Définissez une disponibilité réaliste** : Tenez compte des réunions, du travail courant et des congés lors de la définition des jours par mois. La plupart des gens ont moins de temps projet que prévu.
- **Utilisez la maîtrise honnêtement** : Une équipe pleine d'« experts » n'est pas utile pour la planification. Soyez réaliste sur les niveaux de compétences pour prendre de meilleures décisions de ressources.
- **Maintenez les compétences à jour** : Revoyez les compétences des contributeurs périodiquement, surtout après des formations ou de nouvelles expériences projet.
- **Configurez vos valeurs de classification par défaut tôt** : Si vous travaillez toujours sur la même catégorie et le même flux, configurer les valeurs par défaut vous évite de les sélectionner à chaque création de tâche ou de demande.
