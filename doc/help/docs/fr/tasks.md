# Tâches

Les tâches vous permettent de suivre les actions, les livrables et les lots de travail à travers vos entités KANAP. Elles servent pour les rappels de renouvellement, les relances, les contrôles de conformité, les livrables de projet et tout autre travail nécessitant un suivi.

## Premiers pas

Rendez-vous dans **Portefeuille > Tâches** pour voir toutes les tâches de votre organisation. Cliquez sur **Nouveau** pour créer une tâche.

### Créer une nouvelle tâche

Lorsque vous cliquez sur **Nouveau**, l'espace de travail complet de la tâche s'ouvre. Pour créer une tâche :

1. **Saisissez le titre** (obligatoire) :
   - Tapez le titre de la tâche dans le champ texte en haut

2. **Choisissez le contexte** :
   - **Tâche autonome** (par défaut) : Laissez « Lié à » sur **Autonome**
   - **Tâche liée** : Sélectionnez **Projet**, **OPEX**, **Contrat** ou **CAPEX**, puis choisissez l'élément spécifique

3. **Remplissez les détails optionnels** :
   - **Type de tâche** : Sélectionnez une catégorie de travail (ex. : Tâche, Bug, Problème, Incident). Par défaut « Tâche » si disponible
   - **Description** : Ajoutez des informations détaillées via l'éditeur markdown (supporte la mise en forme, les listes, les liens, les images)
   - **Phase** : Pour les tâches projet, sélectionnez une phase ou laissez « Niveau projet »
   - **Classification** (tâches autonomes et projet) : Définissez Source, Catégorie, Flux et Société. Pour les tâches projet, ces valeurs sont héritées par défaut du projet parent. Pour les tâches autonomes, les valeurs de classification par défaut de votre organisation sont pré-remplies lorsqu'elles sont disponibles
   - **Statut** : Par défaut « Ouvert »
   - **Priorité** : Par défaut « Normale »
   - **Dates** : Définissez les dates de début et d'échéance
   - **Responsable** : Par défaut vous-même ; modifiez si nécessaire

4. Cliquez sur **Créer** quand vous êtes prêt (activé une fois le titre défini). Vous pouvez aussi appuyer sur **Ctrl+S** (ou **Cmd+S** sur Mac)

**Conseil** : Vous pouvez coller des images directement dans la description. Elles sont automatiquement téléversées vers le stockage lorsque vous créez la tâche.

**Remarque** : Les tâches peuvent également être créées depuis d'autres espaces de travail (postes OPEX, Contrats, postes CAPEX, Projets du portefeuille) où la relation est pré-sélectionnée.

**Champs obligatoires** :
  - **Titre** : Une brève description de ce qui doit être fait

**Fortement recommandé** :
  - **Description** : Description détaillée de la tâche
  - **Responsable** : Qui est en charge
  - **Date d'échéance** : Quand elle doit être terminée

---

## Où trouver cette page

- Chemin : **Portefeuille > Tâches**
- Autorisations :
  - Vous avez besoin au minimum de `tasks:reader` pour consulter les tâches
  - Vous avez besoin de `tasks:member` pour créer des tâches et modifier des tâches dans les contextes autonome/OPEX/Contrat/CAPEX
  - Vous avez besoin de `portfolio_projects:contributor` pour enregistrer une tâche lorsque le contexte cible est un projet
  - Vous avez besoin de `tasks:admin` pour la suppression en masse, l'import CSV et l'export CSV

Si vous ne voyez pas Tâches dans le menu, demandez à votre administrateur de vous accorder les autorisations appropriées.

---

## Travailler avec la liste

La grille des tâches affiche toutes les tâches de votre organisation.

**Filtre de périmètre en haut** :
  - **Mes tâches** (par défaut) : affiche les tâches qui vous sont assignées
  - **Tâches de mon équipe** : affiche les tâches assignées à tout membre de votre équipe Portefeuille (y compris les vôtres)
  - **Toutes les tâches** : affiche la grille complète des tâches
  - Si vous n'êtes pas assigné à une équipe Portefeuille, **Tâches de mon équipe** est désactivé
  - Votre sélection est mémorisée entre les sessions -- revenir sur la page restaure votre dernier choix

**Colonnes par défaut** (visibles par défaut) :

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **#** | Référence de l'élément (ex. : T-42). Cliquez pour ouvrir l'espace de travail |
| **Titre de la tâche** | Le nom de la tâche. Cliquez pour ouvrir l'espace de travail |
| **Type de tâche** | Le type de travail (ex. : Tâche, Bug, Problème, Incident) |
| **Contexte** | Le type d'entité (Projet, OPEX, Contrat, CAPEX ou « Autonome ») |
| **Statut** | État actuel sous forme de pastille colorée |
| **Score** | Score de priorité calculé |
| **Responsable** | Personne assignée |
| **Classification** | Catégorie de classification du portefeuille |
| **Flux** | Flux du portefeuille |

**Colonnes supplémentaires** (masquées par défaut, activez-les via le menu des colonnes) :

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **Entrée liée** | Le nom de l'entité liée (vide pour les tâches autonomes) |
| **Phase** | Phase du projet (pour les tâches projet) |
| **Priorité** | Niveau de priorité sous forme de pastille colorée |
| **Date d'échéance** | Quand la tâche est due |
| **Créée** | Quand la tâche a été créée |
| **Dernière modification** | Quand la tâche a été modifiée pour la dernière fois |
| **Description** | Texte de description de la tâche |
| **Source** | Classification source du portefeuille |
| **Société** | Classification par société |

**Couleurs des statuts** :
  - **Ouvert** : Gris
  - **En cours** : Orange
  - **En attente** : Bleu
  - **En test** : Violet
  - **Terminé** : Vert
  - **Annulé** : Rouge

**Couleurs des priorités** :
  - **Bloquant** : Rouge
  - **Haute** : Orange
  - **Normale** : Gris
  - **Basse** : Bleu
  - **Optionnelle** : Vert

**Filtre par défaut** : Les tâches actives sont affichées par défaut (`Ouvert`, `En cours`, `En attente`, `En test`). Incluez `Terminé` et `Annulé` dans le filtre de statut pour voir les tâches clôturées.

**Actions** :
  - **Nouveau** : Créer une tâche autonome (nécessite `tasks:member`)
  - **Import CSV** : Téléverser un fichier CSV pour créer ou mettre à jour des tâches (nécessite `tasks:admin`)
  - **Export CSV** : Télécharger les tâches dans un fichier CSV (nécessite `tasks:admin`)
  - **Supprimer la sélection** : Supprimer les tâches sélectionnées (nécessite `tasks:admin`)

---

## L'espace de travail de la tâche

Cliquez sur n'importe quelle ligne pour ouvrir l'espace de travail de la tâche. L'espace de travail utilise une disposition avec barre latérale : la zone de contenu principale à droite et des sections repliables dans la barre latérale à gauche.

### Barre d'outils d'en-tête

L'en-tête de l'espace de travail contient :
  - **Retour aux Tâches** (ou retour à l'espace de travail du projet d'origine)
  - **Indicateur de position** : Affiche votre position dans la liste filtrée (ex. : « 3 sur 12 »)
  - **Envoyer un lien** : Envoyer un lien vers la tâche par e-mail
  - **Convertir en demande** : Promouvoir la tâche en demande de portefeuille
  - Flèches **Précédent / Suivant** : Naviguer entre les tâches dans l'ordre actuel de la liste
  - **Supprimer** : Supprimer la tâche (nécessite `tasks:admin`)
  - **Enregistrer** : Sauvegarder les modifications en attente (également via **Ctrl+S**)
  - **Fermer** : Retourner à la liste des tâches

Sous la barre d'outils, la zone de titre affiche :
  - **Badge du score de priorité** (tâches projet uniquement) : Un badge circulaire affichant le score de priorité calculé
  - **Pastille de référence** : Cliquez pour copier la référence (ex. : T-42) dans votre presse-papiers
  - **Titre** : Cliquez pour modifier en ligne (nécessite `tasks:member`)
  - **Pastille de statut**, **Pastille de projet** (pour les tâches projet, cliquez pour ouvrir le projet), **Pastille de priorité**
  - Bouton **Joindre des fichiers** : Afficher/masquer la zone de téléversement

### Zone de contenu principale

**Description** : L'éditeur markdown prend en charge la mise en forme, les listes, les liens, les blocs de code et les images. Vous pouvez coller des images directement -- elles sont téléversées automatiquement. Appuyez sur **Tab** depuis le champ titre pour passer directement dans l'éditeur de description.

**Boutons Import / Export** (à côté du titre Description) :
  - **Import** : Importer un fichier `.docx` pour remplacer le contenu de la description. Si la description a déjà du contenu, une confirmation vous est demandée avant remplacement. L'import de document est disponible après l'enregistrement de la tâche (pas lors de la création)
  - **Export** : Exporter la description en PDF, DOCX ou ODT

**Pièces jointes** : Lorsque la zone de téléversement est visible, glissez-déposez des fichiers ou cliquez sur **Parcourir les fichiers**. Les fichiers téléversés apparaissent sous forme de pastilles sous la description. Cliquez sur une pastille pour télécharger ; cliquez sur le bouton x pour supprimer (nécessite l'autorisation de modification). Maximum 20 Mo par fichier.

**Section Activité** : Basculez entre trois vues :
  - **Commentaires** : Formulaire d'activité unifié (commentaire + changement de statut optionnel + saisie de temps optionnelle en une seule soumission) plus le fil de commentaires
  - **Historique** : Voir toutes les modifications de la tâche avec horodatage
  - **Journal de temps** : Voir et gérer les entrées de temps (disponible uniquement pour les tâches autonomes et projet)

### Sections de la barre latérale

La barre latérale est redimensionnable en faisant glisser son bord droit. Elle contient les sections repliables suivantes :

**Contexte** :
  - Objet lié (Projet, poste OPEX, Contrat, poste CAPEX ou « Tâche autonome »)
    - Lors de la création : par défaut **Autonome**, ou sélectionnez un type et un élément
    - Après la création (si vous pouvez modifier) : le contexte reste modifiable et est appliqué lorsque vous cliquez sur **Enregistrer**
  - Phase (pour les tâches projet uniquement ; apparaît après sélection d'un projet)

**Détails de la tâche** :
  - Menu déroulant Type de tâche (ex. : Tâche, Bug, Problème, Incident)
  - Niveau de priorité
  - Menu déroulant Statut (ne peut pas passer à « Terminé » pour les tâches projet sans avoir d'abord saisi du temps)

**Classification** (pour les tâches autonomes et projet uniquement) :
  - **Source** : D'où provient le travail
  - **Catégorie** : La catégorie du portefeuille pour ce travail
  - **Flux** : Le flux spécifique au sein de la catégorie (filtré par la catégorie sélectionnée ; désactivé tant qu'aucune catégorie n'est sélectionnée)
  - **Société** : La société à laquelle ce travail se rapporte
  - Pour les tâches OPEX/Contrat/CAPEX, cette section est masquée sauf si des valeurs de classification ont été précédemment définies

**Temps** (masqué lors de la création et pour les tâches OPEX/Contrat/CAPEX) :
  - Temps total passé (affiché en jours et heures)
  - Bouton **Saisir du temps** pour ajouter des entrées de temps

**Personnes** :
  - Demandeur
  - Responsable
  - Observateurs (sélection multiple)

**Dates** :
  - Date de début
  - Date d'échéance

**Base de connaissances** (tâches existantes uniquement) :
  - Lier des articles de la base de connaissances à la tâche ou en créer de nouveaux directement depuis la barre latérale
  - Nécessite `knowledge:member` pour créer de nouveaux articles

### Changer le contexte d'une tâche

Lorsque vous changez le contexte d'une tâche et enregistrez, KANAP applique le changement en une seule opération (contexte + autres champs modifiés ensemble).

- **Projet vers Autonome** : La phase est effacée, la classification est conservée
- **Projet vers OPEX/Contrat/CAPEX** : La phase et la classification sont effacées
- **Tout vers Projet** :
  - L'autorisation Projet est requise (`portfolio_projects:contributor`)
  - La phase est réinitialisée au niveau projet sauf si vous choisissez une phase valide pour ce projet
  - La classification existante est conservée ; les valeurs manquantes sont auto-complétées depuis les valeurs par défaut du projet

---

## Statuts des tâches

| Statut | Signification | Quand l'utiliser |
|--------|--------------|-----------------|
| **Ouvert** | Pas encore commencé | Par défaut pour les nouvelles tâches |
| **En cours** | Le travail a commencé | Quand quelqu'un commence à travailler dessus |
| **En attente** | En attente de quelqu'un d'autre | Quand le responsable est bloqué et a besoin d'un avis/d'une décision |
| **En test** | Prêt pour validation | Quand l'implémentation est terminée et en attente de revue/test |
| **Terminé** | Achevé avec succès | Quand le travail est fini (nécessite du temps saisi pour les tâches projet) |
| **Annulé** | N'est plus nécessaire | Quand la tâche devient sans objet |

**Important** : Pour les tâches projet, vous ne pouvez pas marquer une tâche comme « Terminé » tant que vous n'avez pas saisi au moins un peu de temps. Cela garantit un suivi précis de la charge.

---

## Niveaux de priorité

| Priorité | Cas d'utilisation |
|----------|------------------|
| **Bloquant** | Bloque d'autres travaux ; attention immédiate requise |
| **Haute** | Important et urgent |
| **Normale** | Priorité standard (par défaut) |
| **Basse** | Peut être reporté si nécessaire |
| **Optionnelle** | Souhaitable, à traiter quand la capacité le permet |

---

## Suivi du temps

Les tâches autonomes et les tâches projet prennent en charge le suivi détaillé du temps via la fonctionnalité Journal de temps. Le suivi du temps n'est pas disponible pour les tâches OPEX, Contrat ou CAPEX.

### Saisir du temps

1. Cliquez sur le bouton **Saisir du temps** dans la section Temps de la barre latérale
2. Sélectionnez la **Catégorie** : IT ou Métier (détermine comment le temps contribue à la charge du projet)
3. Saisissez la date à laquelle le travail a été effectué
4. Saisissez le temps en jours et/ou heures
5. Ajoutez des notes optionnelles décrivant le travail
6. Cliquez sur **Saisir du temps**

**Catégorie** : Pour les tâches projet, la catégorie détermine si le temps est comptabilisé dans la charge IT ou la charge Métier du projet. Cela correspond au propre système de saisie de temps du projet.

### Consulter les entrées de temps

L'onglet **Journal de temps** dans la section activité affiche toutes les entrées de temps pour la tâche :
  - Date à laquelle le travail a été effectué
  - Catégorie (IT ou Métier)
  - Personne qui a saisi le temps
  - Heures saisies
  - Notes

### Modifier ou supprimer des entrées

Vous pouvez modifier ou supprimer vos propres entrées de temps depuis le tableau du Journal de temps.

---

## Pièces jointes

Les tâches prennent en charge les pièces jointes pour les documents, captures d'écran et autres fichiers de support.

### Ajouter des pièces jointes

1. Cliquez sur le bouton **Joindre des fichiers** dans l'en-tête de la tâche
2. La zone de téléversement apparaît sous la description
3. Soit :
   - Glissez-déposez des fichiers sur la zone de téléversement, soit
   - Cliquez sur **Parcourir les fichiers** pour sélectionner des fichiers depuis votre ordinateur
4. Les fichiers apparaissent sous forme de pastilles sous la description une fois téléversés

**Limite de taille** : Maximum 20 Mo par fichier.

### Gérer les pièces jointes

- **Télécharger** : Cliquez sur une pastille de pièce jointe pour télécharger le fichier
- **Supprimer** : Cliquez sur le bouton x de la pastille pour retirer la pièce jointe (nécessite l'autorisation de modification)

Les pièces jointes sont visibles par toute personne pouvant consulter la tâche.

---

## Import et export de la description

Le champ description prend en charge l'import et l'export de documents afin de travailler avec le contenu en dehors de KANAP.

### Importer un document

1. Ouvrez l'espace de travail d'une tâche existante (l'import n'est pas disponible lors de la création de la tâche)
2. Cliquez sur le bouton **Import** à côté du titre **Description**
3. Sélectionnez un fichier `.docx` depuis votre ordinateur
4. Si la description a déjà du contenu, confirmez que vous souhaitez le remplacer
5. Le document est converti en markdown et chargé dans l'éditeur
6. Vérifiez le résultat et cliquez sur **Enregistrer** pour conserver les modifications

Les images intégrées dans le document sont téléversées automatiquement vers le stockage. Si du contenu ne peut pas être converti proprement, un avertissement apparaît en bas de l'écran.

### Exporter la description

1. Cliquez sur le bouton **Export** à côté du titre **Description**
2. Choisissez un format : **PDF**, **DOCX** ou **ODT**
3. Le fichier se télécharge automatiquement

Le bouton d'export n'est activé que lorsque la description contient du contenu.

---

## Commentaires et historique

### Ajouter des commentaires

1. Sélectionnez l'onglet **Commentaires** dans la section activité
2. Tapez votre commentaire dans l'éditeur de texte
3. Optionnellement, définissez un nouveau statut dans le menu déroulant
4. Optionnellement, saisissez du temps avec le curseur (`0` signifie aucune entrée de temps)
5. Cliquez sur **Soumettre** (le libellé du bouton s'adapte en fonction des actions sélectionnées)

### Comportement du formulaire d'activité unifié

- Vous pouvez soumettre toute combinaison de :
  - Commentaire seul
  - Changement de statut seul
  - Saisie de temps seule
  - Commentaire + statut + temps ensemble
- Pour les tâches projet, passer le statut à **Terminé** nécessite du temps saisi (existant + nouvellement ajouté)
- Le menu déroulant de statut dans la barre latérale fonctionne toujours de manière indépendante si vous préférez ce mode

### Consulter l'historique

L'onglet **Historique** affiche toutes les modifications de la tâche :
  - Changements de statut
  - Modifications de champs
  - Qui a effectué chaque modification et quand

### Notifications par e-mail et actions rapides

Lorsque les notifications de tâches sont activées, les mises à jour de statut et de commentaires peuvent déclencher des notifications par e-mail.

- Si un changement de statut et un commentaire sont soumis ensemble, les destinataires peuvent recevoir un e-mail fusionné (selon leurs préférences de notification)
- Les e-mails de statut peuvent inclure des boutons d'action rapide :
  - **En attente** : `Répondre et passer En cours`, `Marquer Terminé`
  - **En test** : `Approuver` (passe à `Terminé`), `Passer En cours`
  - **Terminé** : `Rouvrir` (passe à `Ouvert`)
- Cliquer sur un bouton d'action ouvre la page de la tâche avec le statut pré-sélectionné dans le formulaire d'activité unifié

---

## Créer des tâches depuis d'autres espaces de travail

Les tâches sont le plus souvent créées depuis d'autres espaces de travail :

### Depuis les Projets du portefeuille
Dans l'espace de travail du Projet, utilisez l'onglet **Tâches** pour gérer les livrables du projet :
- Créer des tâches pour des lots de travail spécifiques
- Assigner des tâches à des phases du projet
- Suivre le temps passé sur chaque tâche

**Conseil** : Dans l'onglet Chronologie, cliquez sur le bouton **[+]** à côté d'une phase pour créer une tâche pré-liée à cette phase.

### Depuis les postes OPEX
Dans l'espace de travail OPEX, utilisez l'onglet **Tâches** pour créer des tâches comme :
- « Revoir les tarifs fournisseur pour 2026 »
- « Négocier une remise volume »

### Depuis les Contrats
Dans l'espace de travail du Contrat, utilisez l'onglet **Tâches** pour :
- « Revoir le contrat avant la date de renouvellement »
- « Demander des conditions mises à jour au fournisseur »

### Depuis les postes CAPEX
Dans l'espace de travail CAPEX, les tâches permettent de suivre les jalons du projet :
- « Terminer le recueil des besoins »
- « Obtenir l'approbation budgétaire »

Ces tâches sont automatiquement liées à l'entité parente et apparaissent à la fois dans la liste des tâches et dans l'espace de travail parent.

---

## Tâches autonomes

Les tâches autonomes sont des éléments de travail indépendants non liés à un projet, contrat ou poste budgétaire spécifique. Elles sont utiles pour :
- Le travail d'exploitation IT générale
- Les demandes ponctuelles
- Les initiatives transversales
- Le suivi de tâches personnelles

### Créer des tâches autonomes

1. Cliquez sur **Nouveau** dans la page Tâches
2. Laissez les menus déroulants « Lié à » vides
3. La barre latérale affiche « Tâche autonome » au lieu d'une entité liée
4. Remplissez le titre, la description et les autres détails
5. Cliquez sur **Créer**

### Champs de classification

Les tâches autonomes et les tâches projet disposent de champs de classification modifiables qui aident à organiser le travail selon les dimensions du portefeuille :

- **Source** : D'où provient le travail (ex. : Demande métier, Initiative IT)
- **Catégorie** : La catégorie du portefeuille pour ce travail
- **Flux** : Le flux spécifique au sein de la catégorie (filtré par la catégorie sélectionnée)
- **Société** : La société à laquelle ce travail se rapporte

Ces champs apparaissent dans la section **Classification** de la barre latérale et peuvent être modifiés à tout moment. Lors de la création d'une nouvelle tâche autonome, les valeurs de classification par défaut de votre organisation sont pré-remplies automatiquement si elles sont configurées.

Pour les **tâches projet**, la classification est héritée par défaut du projet parent lors de la création de la tâche, mais peut être modifiée indépendamment. Cela permet, par exemple, à une tâche d'infrastructure d'exister au sein d'un projet métier, ou à une tâche de conformité au sein d'un projet IT. Si la classification d'une tâche n'est pas explicitement définie, elle hérite et affiche la classification du projet.

### Score de priorité

Les tâches autonomes (et toutes les tâches hors projet) utilisent un score de priorité fixe basé sur leur niveau de priorité :

| Niveau de priorité | Score |
|--------------------|-------|
| Bloquant | 110 |
| Haute | 90 |
| Normale | 70 |
| Basse | 50 |
| Optionnelle | 30 |

Les tâches bloquantes ont un score de 110 pour s'assurer qu'elles sont toujours classées au-dessus des tâches projet les plus prioritaires (max 100).

---

## Tâches projet

Les tâches projet disposent de fonctionnalités supplémentaires par rapport aux tâches classiques :

**Classification indépendante** : Les tâches projet ont leurs propres champs Source, Catégorie, Flux et Société. Lorsqu'une tâche est créée au sein d'un projet, ces valeurs sont héritées par défaut de la classification du projet par commodité. Cependant, la classification de chaque tâche peut être modifiée indépendamment -- par exemple, une tâche d'infrastructure peut exister au sein d'un projet métier, ou une tâche de conformité au sein d'un projet IT. Si un champ de classification d'une tâche n'est pas explicitement défini, il hérite et affiche la valeur du projet.

**Score de priorité** : Les tâches projet affichent un score de priorité calculé qui combine :
- Le score de priorité du projet parent
- Un ajustement basé sur le niveau de priorité de la tâche (+10 pour Bloquant, +5 pour Haute, 0 pour Normale, -5 pour Basse, -10 pour Optionnelle)

Le score est affiché sous forme de badge circulaire à gauche du titre de la tâche dans l'espace de travail, reprenant le style d'affichage du score du projet. Dans la liste des tâches, la colonne Score affiche cette valeur calculée.

**Affectation de phase** : Les tâches peuvent être affectées à des phases spécifiques du projet ou marquées « Niveau projet » pour le travail transversal.

**Contribution en temps** : Le temps saisi sur les tâches projet contribue aux calculs de charge réelle du projet :
- Le temps de catégorie IT s'ajoute à `Réalisé (IT)`
- Le temps de catégorie Métier s'ajoute à `Réalisé (Métier)`
- L'onglet Avancement du projet affiche une ventilation entre Overhead projet et Temps des tâches
- Le Journal de temps unifié affiche toutes les entrées de temps provenant à la fois de l'overhead projet et du travail des tâches

**Validation du statut** : Les tâches projet ne peuvent pas être marquées « Terminé » sans avoir d'abord saisi du temps. Cela garantit un suivi précis de la charge du projet.

**Filtrage** : L'onglet Tâches du projet inclut des filtres pour :
- Statut (Tous, Actifs, statut spécifique)
- Phase (Toutes les phases, Niveau projet, phase spécifique)

---

## Import/export CSV

Gérez les tâches à grande échelle grâce à l'import et l'export CSV. Cette fonctionnalité prend en charge les opérations en masse pour le chargement initial de données, les migrations de tâches et l'extraction de données pour le reporting.

### Accéder aux fonctionnalités CSV

Depuis la liste des Tâches :
  - **Export CSV** : Télécharger les tâches dans un fichier CSV
  - **Import CSV** : Téléverser un fichier CSV pour créer ou mettre à jour des tâches
  - **Télécharger le modèle** : Obtenir un CSV vierge avec les en-têtes corrects

**Autorisations requises** : `tasks:admin` pour les opérations d'import/export.

### Options d'export

Trois modes d'export sont disponibles :

| Option | Description |
|--------|-------------|
| **Export complet** | Tous les champs exportables -- à utiliser pour le reporting et l'extraction complète de données |
| **Enrichissement de données** | Tous les champs importables -- correspond au format du modèle d'import, idéal pour l'édition aller-retour (export, modification, ré-import) |
| **Sélection personnalisée** | Choisir les champs spécifiques à inclure dans votre export |

**Téléchargement du modèle** (depuis la boîte de dialogue d'import) : Télécharge un CSV vierge avec tous les en-têtes de champs importables -- utilisez-le pour préparer des fichiers d'import avec la bonne structure.

### Processus d'import

1. **Préparez votre fichier** : Utilisez l'encodage UTF-8 avec des séparateurs point-virgule (`;`). Téléchargez un modèle pour vous assurer des bons en-têtes.

2. **Choisissez les paramètres d'import** :
   - **Mode** :
     - `Enrichir` (par défaut) : Les cellules vides conservent les valeurs existantes -- ne mettez à jour que ce que vous spécifiez
     - `Remplacer` : Les cellules vides effacent les valeurs existantes -- remplacement complet de tous les champs
   - **Opération** :
     - `Upsert` (par défaut) : Créer de nouvelles tâches ou mettre à jour les existantes
     - `Mise à jour uniquement` : Ne modifier que les tâches existantes, ignorer les nouvelles
     - `Insertion uniquement` : Ne créer que de nouvelles tâches, ignorer les existantes

3. **Validez d'abord** : Cliquez sur **Vérification préalable** pour valider votre fichier sans apporter de modifications. Examinez les erreurs et avertissements.

4. **Appliquez les modifications** : Si la validation réussit, cliquez sur **Importer** pour valider les changements.

### Référence des champs

**Champs de base** :

| Colonne CSV | Description | Obligatoire | Notes |
|-------------|-------------|-------------|-------|
| `id` | UUID de la tâche | Non | Pour les mises à jour ; laisser vide pour les nouvelles tâches |
| `title` | Titre de la tâche | Oui | Fait partie de l'identifiant unique |
| `description` | Détails de la tâche | Non | Supporte le texte brut |

**Champs de contexte** :

| Colonne CSV | Description | Obligatoire | Notes |
|-------------|-------------|-------------|-------|
| `related_object_type` | Type d'entité | Non | Vide pour les tâches autonomes ; accepte code ou libellé |
| `related_object_id` | UUID de l'entité | Conditionnel | Obligatoire si tâche liée et `related_object_name` non fourni |
| `related_object_name` | Nom de l'entité | Conditionnel | Obligatoire si tâche liée et `related_object_id` non fourni |
| `phase_name` | Phase du projet | Non | Doit correspondre à un nom de phase existant (tâches projet uniquement) |
| `priority_level` | Priorité de la tâche | Non | Accepte code ou libellé |
| `source_name` | Source | Non | Source du portefeuille (tâches autonomes et projet) |
| `category_name` | Catégorie | Non | Catégorie du portefeuille (tâches autonomes et projet) |
| `stream_name` | Flux | Non | Flux du portefeuille (tâches autonomes et projet) |
| `company_name` | Société | Non | Société (tâches autonomes et projet) |

**Tâches autonomes** : Laissez `related_object_type`, `related_object_id` et `related_object_name` vides. Vous pouvez définir les champs de classification (`source_name`, `category_name`, `stream_name`, `company_name`) pour les tâches autonomes et projet. Pour les tâches projet, les champs de classification omis sont hérités par défaut du projet parent.

**Conseil** : Pour les imports de nouvelles tâches liées, utilisez `related_object_name` au lieu de `related_object_id` -- c'est beaucoup plus facile à utiliser. Le système résout le nom vers l'ID correct en fonction du `related_object_type`. Pour les imports aller-retour (export, modification, ré-import), les deux champs sont inclus pour que la correspondance fonctionne correctement.

**Statut et dates** :

| Colonne CSV | Description | Notes |
|-------------|-------------|-------|
| `status` | Statut de la tâche | Accepte code ou libellé |
| `start_date` | Date de début | Format de date : AAAA-MM-JJ |
| `due_date` | Date d'échéance | Format de date : AAAA-MM-JJ |

**Champs de personnes** :

| Colonne CSV | Description | Notes |
|-------------|-------------|-------|
| `assignee_email` | Personne responsable | Doit correspondre à l'e-mail d'un utilisateur existant |
| `creator_email` | E-mail du demandeur | Export uniquement (affiché comme **E-mail du demandeur** dans les métadonnées) |
| `viewer_email_1` à `_4` | Observateurs | Doivent correspondre à des e-mails d'utilisateurs existants |
| `owner_email_1` à `_4` | Propriétaires | Doivent correspondre à des e-mails d'utilisateurs existants |

**Autres champs** :

| Colonne CSV | Description | Notes |
|-------------|-------------|-------|
| `labels` | Libellés de tâche | Liste séparée par des virgules |

### Acceptation des libellés et codes

Pour les champs **status**, **priority_level** et **related_object_type**, vous pouvez utiliser soit le code interne soit un libellé courant :

**Valeurs de statut** :

| Code | Libellés acceptés |
|------|-------------------|
| `open` | `Open` |
| `in_progress` | `In Progress`, `Active`, `Working` |
| `pending` | `Pending` |
| `in_testing` | `In Testing`, `Testing` |
| `done` | `Done`, `Completed`, `Complete`, `Finished`, `Closed` |
| `cancelled` | `Cancelled`, `Canceled` |

**Valeurs de niveau de priorité** :

| Code | Libellés acceptés |
|------|-------------------|
| `blocker` | `Blocker`, `Critical`, `Urgent` |
| `high` | `High` |
| `normal` | `Normal`, `Medium`, `Default` |
| `low` | `Low` |
| `optional` | `Optional`, `Nice to have` |

**Valeurs de type d'objet lié** :

| Code | Libellés acceptés |
|------|-------------------|
| `project` | `Project` |
| `spend_item` | `Spend Item`, `Spend` |
| `contract` | `Contract` |
| `capex_item` | `CAPEX Item`, `CAPEX` |

Le système normalise automatiquement les valeurs lors de l'import.

### Correspondance et mises à jour

Les tâches sont identifiées par **titre + related_object_id** (insensible à la casse). Lorsqu'une correspondance est trouvée :
  - En mode `Enrichir` : Seules les valeurs CSV non vides mettent à jour la tâche
  - En mode `Remplacer` : Tous les champs sont mis à jour, les valeurs vides effacent les données existantes

Si vous incluez la colonne `id` avec un UUID valide, la correspondance utilise d'abord l'ID, puis se rabat sur titre + objet lié.

**Remarque** : Si vous fournissez `related_object_name` au lieu de `related_object_id`, le système résout le nom vers l'ID avant la correspondance. Cela signifie que vous pouvez utiliser des noms lisibles dans tout votre fichier d'import.

### Champs en export uniquement

Certains champs apparaissent dans les exports mais ne peuvent pas être importés. Ce sont des champs gérés par le système qui maintiennent l'intégrité des données :

| Champ | Pourquoi il est en export uniquement |
|-------|--------------------------------------|
| `creator_email` (Demandeur) | Automatiquement défini comme l'utilisateur qui crée la tâche. Permettre l'import compromettrait l'intégrité de la piste d'audit -- vous ne devez pas pouvoir falsifier qui a demandé/créé une tâche. Pour les nouvelles tâches, le système définit cela comme l'utilisateur importateur ; pour les tâches existantes, le demandeur original est préservé. |

Ces champs sont inclus dans l'**Export complet** à des fins de reporting mais exclus des exports **Modèle** et **Enrichissement de données** car ils ne peuvent pas être modifiés lors de l'import.

### Limitations

  - **Maximum 4 observateurs/propriétaires** : Les tâches prennent en charge jusqu'à 4 e-mails d'observateurs et 4 e-mails de propriétaires via CSV
  - **Classification pour les tâches autonomes et projet uniquement** : Source, Catégorie, Flux et Société peuvent être définis sur les tâches autonomes et projet (pas sur les tâches OPEX, Contrat ou CAPEX)
  - **La phase nécessite un projet** : L'affectation de phase ne fonctionne que pour les tâches projet
  - **Commentaires non inclus** : Les commentaires et l'historique des tâches doivent être gérés dans l'espace de travail
  - **Journal de temps non inclus** : Les entrées de temps doivent être saisies dans l'espace de travail
  - **Pièces jointes non incluses** : Les pièces jointes nécessitent une gestion dans l'espace de travail

### Résolution de problèmes

**Erreur « Le fichier n'est pas correctement formaté »** : Cela indique généralement un problème d'encodage. Assurez-vous que votre CSV est enregistré en **UTF-8** :

  - **Dans LibreOffice** : Lors de l'ouverture d'un CSV, sélectionnez `UTF-8` dans le menu déroulant Jeu de caractères (pas « Japanese (Macintosh) » ni d'autres encodages). Lors de l'enregistrement, cochez « Modifier les paramètres de filtre » et choisissez UTF-8.
  - **Dans Excel** : Enregistrer sous > CSV UTF-8 (délimité par des virgules), puis ouvrez dans un éditeur de texte pour remplacer les virgules par des points-virgules.
  - **Conseil général** : Si vous voyez des caractères illisibles au début de votre fichier, l'encodage est incorrect.

### Exemple CSV

En utilisant des noms lisibles (recommandé pour les nouveaux imports) :

```csv
title;related_object_type;related_object_name;status;priority_level;due_date;assignee_email;source_name;category_name
Review contract terms;Contract;Acme Software License;Open;High;2026-02-28;john.doe@example.com;;
Update documentation;project;Website Redesign;In Progress;Normal;2026-03-15;jane.smith@example.com;;
Schedule kickoff;spend_item;Cloud Hosting 2026;open;low;2026-04-01;bob.wilson@example.com;;
Audit IT security;;;open;high;2026-03-01;security@example.com;IT Initiative;Security
```

La dernière ligne est une **tâche autonome** (pas d'objet lié) avec des champs de classification définis.

En utilisant des UUID (typiquement issus d'exports aller-retour) :

```csv
title;related_object_type;related_object_id;status;priority_level;due_date;assignee_email
Review contract terms;Contract;550e8400-e29b-41d4-a716-446655440000;Open;High;2026-02-28;john.doe@example.com
Update documentation;project;660e8400-e29b-41d4-a716-446655440001;In Progress;Normal;2026-03-15;jane.smith@example.com
Schedule kickoff;spend_item;770e8400-e29b-41d4-a716-446655440002;open;low;2026-04-01;bob.wilson@example.com
```

---

## Convertir une tâche en demande

Vous pouvez promouvoir une tâche en demande de portefeuille lorsque le travail mérite une évaluation formelle, une priorisation ou, à terme, son propre projet. La conversion est disponible depuis l'en-tête de l'espace de travail de la tâche.

### Comment convertir

1. Ouvrez l'espace de travail de la tâche
2. Cliquez sur **Convertir en demande** dans la barre d'outils de l'en-tête (à côté de **Envoyer un lien**)
3. Dans la boîte de dialogue :
   - **Nom de la demande** : Par défaut le titre de la tâche -- modifiez si nécessaire
   - **Aperçu de l'objet** : Affiche la description de la tâche, qui devient l'objet de la demande
   - **Clôturer la tâche originale après conversion** : Cochez cette option si vous souhaitez que le statut de la tâche passe automatiquement à « Terminé »
4. Cliquez sur **Convertir en demande**

Après la conversion, KANAP vous redirige vers l'espace de travail de la demande nouvellement créée.

### Ce qui est repris

La nouvelle demande hérite des éléments suivants de la tâche d'origine :

| Champ de la tâche | Champ de la demande |
|-------------------|---------------------|
| Titre | Nom |
| Description | Objet |
| Date d'échéance | Date de livraison cible |
| Source, Catégorie, Flux, Société | Source, Catégorie, Flux, Société |
| Pièces jointes | Pièces jointes (copiées) |

La demande est créée avec le statut **En attente de revue** et est liée à la tâche d'origine. Une entrée d'historique est enregistrée à la fois sur la tâche (« Convertie en demande ») et sur la demande (« Créée depuis une tâche » avec un lien vers la tâche d'origine).

### Conditions

- **Autorisations** : Vous avez besoin à la fois de `tasks:member` et `portfolio_requests:member`
- **Conversion unique** : Chaque tâche ne peut être convertie qu'une seule fois. Après conversion, le bouton **Convertir en demande** est désactivé et affiche la référence de la demande liée (ex. : « Déjà convertie en REQ-42 »)
- **La tâche est conservée** : La tâche d'origine n'est pas supprimée. Sauf si vous cochez l'option de clôture, elle reste dans son statut actuel et peut toujours être mise à jour indépendamment

**Conseil** : Cette fonctionnalité est utile lorsqu'une tâche révèle une initiative plus large nécessitant son propre cycle de vie de demande -- évaluation par critères, workflow d'approbation et éventuelle conversion en projet.

---

## Envoyer un lien

Vous pouvez rapidement envoyer par e-mail un lien vers n'importe quelle tâche à des collègues ou contacts externes.

1. Ouvrez l'espace de travail de la tâche
2. Cliquez sur **Envoyer un lien** dans la barre d'outils de l'en-tête (à gauche des flèches de navigation)
3. Dans la boîte de dialogue :
   - **Sélectionner les destinataires** : Recherchez des utilisateurs existants de la plateforme par nom ou e-mail, et/ou tapez n'importe quelle adresse e-mail et appuyez sur Entrée
   - **Ajouter un message** (optionnel) : Incluez une note personnelle
   - **Copier le lien** : Cliquez sur l'icône de copie pour récupérer l'URL directe
4. Cliquez sur **Envoyer**

Les destinataires reçoivent un e-mail avec votre nom, le titre de la tâche, un lien direct et votre message (le cas échéant). Cela ne modifie aucune autorisation -- cela notifie simplement les destinataires.

**Conseil** : Vous pouvez mélanger des utilisateurs de la plateforme et des adresses e-mail externes dans le même envoi.

---

## Conseils

  - **Utilisez les dates d'échéance** : Définissez des dates d'échéance réalistes pour suivre efficacement les délais.
  - **Assignez des responsables** : Chaque tâche devrait avoir un responsable pour la reddition de comptes.
  - **Saisissez le temps régulièrement** : Le suivi du temps aide à l'estimation des futurs projets.
  - **Filtrez par statut** : Le filtre par défaut affiche uniquement les statuts actifs (`Ouvert`, `En cours`, `En attente`, `En test`) -- incluez `Terminé` et `Annulé` lors de la revue des tâches historiques.
  - **Créez depuis le contexte** : Créer des tâches depuis des espaces de travail les lie automatiquement.
  - **Utilisez la priorité avec discernement** : Réservez « Bloquant » aux problèmes réellement bloquants.
  - **Utilisez les mises à jour en une seule soumission** : Dans l'onglet Commentaires, combinez commentaire + statut + temps en une action pour garder l'historique et les notifications alignés.
  - **Importez des documents** : Utilisez le bouton **Import** pour importer des fichiers `.docx` comme contenu de description au lieu de copier-coller.
  - **Raccourci clavier** : Appuyez sur **Ctrl+S** (ou **Cmd+S** sur Mac) pour enregistrer rapidement sans atteindre le bouton Enregistrer.
  - **Liez des articles de la base de connaissances** : Utilisez la section Base de connaissances dans la barre latérale pour relier la documentation pertinente à vos tâches.
