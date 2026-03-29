# Rapports du portefeuille

Les rapports du portefeuille fournissent des analyses centrées sur la charge de travail, la capacité et les signaux de livraison.

## Premiers pas

Naviguez vers **Portefeuille > Rapports** pour ouvrir le hub de reporting.

**Autorisations** :
- Vous avez besoin au minimum de `portfolio_reports:reader` pour accéder aux rapports du portefeuille.

Si vous ne voyez pas Rapports dans le menu, demandez à votre administrateur de vous accorder l'accès.

---

## Page d'accueil des rapports

La page d'accueil des rapports du portefeuille liste les rapports disponibles sous forme de cartes. Cliquez sur une carte pour ouvrir le rapport.

Actuellement disponibles :
- **Rapport de changements de statut**
- **Carte thermique de capacité**
- **Rapport hebdomadaire**

---

## Rapport de changements de statut

Utilisez ce rapport pour suivre les éléments dont le statut a changé pendant une période sélectionnée.

### Ce qu'il affiche
- **Une ligne par élément** (tâche autonome, demande ou projet).
- **Dernier changement de statut dans la période** uniquement pour chaque élément.
- **Statut final atteint dans la période sélectionnée** (si plusieurs changements ont eu lieu dans l'intervalle).
- **Date de dernière modification** pour l'événement de changement de statut retenu.

### Filtres
- **Date de début** et **Date de fin** (période obligatoire)
- **Statut** (multi-sélection)
- **Type d'élément** (multi-sélection : Tâches, Demandes, Projets)
- **Source** (multi-sélection)
- **Catégorie** (multi-sélection)
- **Flux** (multi-sélection ; disponible lorsqu'au moins une catégorie est sélectionnée)

### Règles d'inclusion
- L'élément n'est inclus que si son statut a changé pendant la période sélectionnée.
- Pour les tâches, seules les **tâches autonomes** sont incluses (les tâches liées à un projet sont exclues).
- Le filtrage de statut s'applique au statut atteint après le changement.

### Colonnes du tableau
- **Nom** (cliquable ; ouvre l'élément)
- **Type d'élément**
- **Priorité**
- **Statut**
- **Source**
- **Catégorie**
- **Flux**
- **Société**
- **Dernière modification**

Tri par défaut par **Priorité** (la plus haute en premier). Vous pouvez trier par n'importe quelle colonne.

### Exports
- Export **CSV**
- Export **XLSX** avec noms d'éléments cliquables

---

## Rapport Carte thermique de capacité

Utilisez ce rapport pour comprendre la charge de travail actuelle, la pression sur la capacité et le travail non assigné.

### Ce qu'il affiche
- **Charge restante** (IT + Métier), ajustée par l'avancement d'exécution.
- **Capacité** par contributeur (historique ou théorique).
- **Mois de travail** (jours restants / jours de capacité par mois).
- **Travail non assigné** lorsque la charge n'est pas entièrement allouée.

### Filtres
- **Équipes** (multi-sélection, inclut **Aucune équipe**)
- **Statut** (par défaut : En attente, Planifié, En cours, En test, Suspendu)
- **Mode de capacité** : Historique (par défaut) ou Théorique
- **Grouper par** : Contributeurs (par défaut) ou Équipes

### Échelle de couleurs
Les cellules de la colonne **Mois de travail** sont colorées :

| Plage | Couleur |
|-------|---------|
| <= 1 mois | Vert |
| 1-3 mois | Jaune |
| 3-6 mois | Orange |
| 6-12 mois | Rouge |
| > 12 mois | Violet |
| Pas de données | Gris (N/D) |

### Cartes récapitulatives
La ligne récapitulative inclut :
- **Total des contributeurs**
- **Moyenne de mois de travail** (contributeurs avec capacité uniquement)
- **Travail non assigné** (total des jours non alloués et nombre de projets)

Cliquez sur **Travail non assigné** pour développer les détails.

### Exploration détaillée
Cliquez sur une ligne de contributeur pour ouvrir un détail par projet :
- Chaque ligne affiche la charge restante, le % d'allocation et vos jours.
- Les noms de projets sont cliquables et ouvrent l'onglet **Avancement** du projet.

### Exports
- **CSV** : Exporter le tableau de la carte thermique
- **PNG** : Capture du rapport
- **Imprimer** : Imprimer ou enregistrer en PDF

---

## Rapport hebdomadaire

Utilisez ce rapport pour produire un résumé hebdomadaire à destination des parties prenantes couvrant les mises à jour de projets, les tâches fermées et les changements de demandes sur une période sélectionnée.

### Ce qu'il affiche

Le rapport est divisé en trois tableaux :

- **Mises à jour des projets** — projets dont le statut a changé pendant la période.
- **Tâches fermées** — tâches autonomes qui ont été fermées pendant la période.
- **Mises à jour des demandes** — demandes dont le statut a changé pendant la période.

Une ligne récapitulative au-dessus des tableaux affiche le nombre pour chaque section.

### Filtres

- **Date de début** et **Date de fin** (par défaut les 7 derniers jours)
- **Source** (multi-sélection)
- **Catégorie** (multi-sélection)
- **Flux** (multi-sélection ; limité aux catégories sélectionnées)
- **Types de tâches** (multi-sélection ; s'applique au tableau des tâches fermées)

### Colonnes des tableaux

**Mises à jour des projets** : Nom du projet (cliquable), Priorité, Source, Catégorie, Flux, Avancement, Statut

**Tâches fermées** : Nom de la tâche (cliquable), Type de tâche, Priorité, Source, Catégorie, Flux, Statut

**Mises à jour des demandes** : Nom de la demande (cliquable), Source, Catégorie, Flux, Statut

Tri par défaut par **Priorité** (la plus haute en premier). Cliquer sur un nom ouvre l'élément.

### Exports

- Export **CSV**
- Export **XLSX**

---

## Conseils
- **Gardez les profils de contributeurs à jour** : La capacité est basée sur la disponibilité des contributeurs et les statistiques de temps historiques.
- **Utilisez les filtres par équipe** : Limitez le rapport à un département ou une fonction.
- **Vérifiez le travail non assigné** : Aide à repérer les projets avec des allocations manquantes ou des responsables manquants.
- **Rapport hebdomadaire pour les stand-ups** : Exportez le rapport hebdomadaire en XLSX et partagez-le avec les parties prenantes pour les réunions de statut.
