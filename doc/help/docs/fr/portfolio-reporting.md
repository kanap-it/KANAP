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

## Pilotage

Le premier bandeau au-dessus des cartes de rapports est la vue de pilotage quotidienne. Il répond à deux questions : qu'est-ce qui a bougé récemment, et qu'est-ce qui attend quelqu'un.

### La période

L'en-tête affiche la période utilisée et permet de basculer entre les 7, 30 et 90 derniers jours. La période se termine toujours aujourd'hui et se lit dans votre propre fuseau horaire. Votre choix est mémorisé sur ce navigateur.

### Flux

Une ligne par entité se lit ainsi : **14 créés · 9 clôturés · 52 ouverts (+5)**.

- **Créés** : éléments créés pendant la période et toujours présents aujourd'hui.
- **Clôturés** : éléments passés d'un statut ouvert à un statut clos pendant la période. Clos signifie Terminé ou Annulé pour les tâches et les projets, Rejeté ou Converti pour les demandes.
- **Ouverts** : éléments ouverts en ce moment, quoi qu'il se soit passé pendant la période. Ce chiffre est un lien vers la liste correspondante.
- **(+5)** : la variation nette, affichée seulement quand elle n'est pas nulle. C'est créés, plus rouverts, moins clôturés. Les éléments rouverts sont ceux passés d'un statut clos à un statut ouvert. Survolez le chiffre pour voir la formule.

Créés et clôturés proviennent de l'historique des modifications. Ils couvrent donc toutes les façons d'écrire un élément : l'application, un import CSV et les agents. Aucun filtre de liste ne reproduit cet historique, ces deux chiffres ne sont donc pas des liens.

### Quelles tâches sont comptées

Chaque chiffre de tâche ne compte que les tâches autonomes et les tâches de projet. Les tâches rattachées à un contrat, à une ligne de dépense, à une ligne CAPEX ou à un incident relèvent de ces processus et sont exclues partout dans ce bandeau.

### À traiter

La dernière ligne n'apparaît que si quelque chose demande une décision :
- **Tâches en retard** : tâches ouvertes dont l'échéance est antérieure à aujourd'hui. Le chiffre ouvre la liste des tâches filtrée sur les mêmes éléments.
- **Tâches sans responsable** : tâches ouvertes que personne ne porte. La liste des tâches n'a pas de filtre sur un responsable vide, ce chiffre n'est donc pas un lien.
- **Projets sans activité depuis 30 jours** : projets en cours ou en test où rien ne s'est passé depuis un mois. Un clic ouvre une courte liste de ces projets avec la date de leur dernière activité, et chaque nom ouvre le projet.

L'activité est lue au sens large. Un projet est actif dès que quelque chose a changé sur lui ou sur l'une de ses tâches, dès que quelqu'un a écrit dans son journal, ou dès que du temps a été saisi sur le projet ou sur l'une de ses tâches. Un projet n'apparaît ici que si tout cela date de plus de 30 jours.

---

## À classer

Au-dessus des cartes de rapports, un bandeau compact indique la part de votre travail ouvert à laquelle il manque encore une valeur de classification. Utilisez-le comme aide au pilotage quotidien : voyez l'écart, cliquez, corrigez.

### Ce qui est compté

Une ligne par entité, pour les éléments ouverts uniquement :
- **Tâches** : statut autre que Terminé et Annulé.
- **Demandes** : statut autre que Rejeté et Converti.
- **Projets** : statut autre que Terminé et Annulé.

Chaque ligne indique combien de ces éléments n'ont ni Source, ni Catégorie, ni Filière. Les tâches indiquent en plus combien n'ont pas de Type de tâche.

### Quelles tâches sont exclues

Seules les tâches autonomes et les tâches de projet sont comptées. Les tâches rattachées à un contrat, à une ligne de dépense, à une ligne CAPEX ou à un incident ne portent jamais de classification. Les compter signalerait un écart que personne ne peut combler.

Une tâche de projet sans classification propre hérite de celle de son projet, et la liste des tâches affiche cette valeur héritée. Les compteurs suivent la même règle : un chiffre ne vous envoie donc jamais vers une liste où la colonne est déjà remplie.

### Filières

Une Filière manquante n'est comptée que si l'élément a déjà une Catégorie et que cette Catégorie propose au moins une filière active. Beaucoup de catégories n'offrent aucune filière. Un élément sans catégorie est déjà compté sous Catégorie.

### Ouvrir la liste

Chaque chiffre supérieur à zéro est un lien. Un clic ouvre la liste correspondante, déjà filtrée sur exactement les éléments derrière le chiffre, pour tout le locataire. Le total de la liste correspond au chiffre cliqué. Les zéros sont affichés pour le contexte mais ne sont pas cliquables.

Quand rien ne manque, le bandeau affiche une seule ligne confirmant que tout ce qui est ouvert est classé.

---

## Rapport de changements de statut

Utilisez ce rapport pour suivre les éléments créés pendant une période sélectionnée, ou dont le statut a changé pendant cette période.

### Ce qu'il affiche
- **Une ligne par élément** (tâche autonome, demande ou projet).
- **Dernier événement de la période** uniquement pour chaque élément, qu'il s'agisse de la création ou d'un changement de statut.
- **Statut porté par cet événement**. Pour une création, il s'agit du statut avec lequel l'élément a été créé.
- **Date de création**, renseignée lorsque l'élément a été créé dans la période, vide sinon.
- **Date de dernière modification** pour l'événement retenu.

### Filtres
- **Date de début** et **Date de fin** (période obligatoire)
- **Statut** (multi-sélection)
- **Type d'élément** (multi-sélection : Tâches, Demandes, Projets)
- **Source** (multi-sélection)
- **Catégorie** (multi-sélection)
- **Flux** (multi-sélection ; disponible lorsqu'au moins une catégorie est sélectionnée)

### Règles d'inclusion
- L'élément est inclus s'il a été créé pendant la période sélectionnée, ou si son statut a changé pendant cette période.
- Un élément créé puis passé à un autre statut dans la même période apparaît une seule fois, avec le statut de son dernier événement.
- Pour les tâches, seules les **tâches autonomes** sont incluses (les tâches liées à un projet sont exclues).
- Le filtrage de statut s'applique au statut porté par l'événement retenu.
- La période, la date **Créé le** et la date **Dernière modification** suivent le fuseau horaire de votre navigateur.

### Colonnes du tableau
- **Nom** (cliquable ; ouvre l'élément)
- **Type d'élément**
- **Priorité**
- **Statut**
- **Source**
- **Catégorie**
- **Flux**
- **Société**
- **Créé le**
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
- **Les personnes sans fiche contributeur** affectées à un projet. Elles apparaissent en fin de liste avec leurs jours restants et sans capacité, pour que leur charge reste visible. Créez leur fiche contributeur pour leur donner une capacité.

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

Utilisez ce rapport pour produire un résumé hebdomadaire à destination des parties prenantes couvrant les mises à jour de projets, l'activité des tâches et les changements de demandes sur une période sélectionnée.

### Ce qu'il affiche

Le rapport est divisé en trois tableaux :

- **Mises à jour des projets** — projets créés pendant la période, ou dont le statut a changé pendant cette période.
- **Activité des tâches** — tâches créées pendant la période, ou clôturées (terminées ou annulées) pendant cette période.
- **Mises à jour des demandes** — demandes créées pendant la période, ou dont le statut a changé pendant cette période.

Chaque tableau comporte une colonne **Créé le**. Elle porte le jour de création lorsque l'élément a été créé dans la période, et reste vide pour les éléments qui ont seulement changé de statut.

Une ligne récapitulative au-dessus des tableaux affiche les nombres : mises à jour de projets, tâches créées, tâches clôturées et mises à jour de demandes.

### Filtres

- **Date de début** et **Date de fin** (par défaut les 7 derniers jours)
- **Source** (multi-sélection)
- **Catégorie** (multi-sélection)
- **Flux** (multi-sélection ; limité aux catégories sélectionnées)
- **Types de tâches** (multi-sélection ; s'applique au tableau Activité des tâches)

### Colonnes des tableaux

**Mises à jour des projets** : Nom du projet (cliquable), Priorité, Source, Catégorie, Flux, Avancement, Statut, Créé le

**Activité des tâches** : Nom de la tâche (cliquable), Type de tâche, Priorité, Source, Catégorie, Flux, Statut, Créé le

**Mises à jour des demandes** : Nom de la demande (cliquable), Source, Catégorie, Flux, Statut, Créé le

Les exports CSV et XLSX reprennent les mêmes colonnes, plus une colonne **Dernière modification** après **Créé le**.

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
