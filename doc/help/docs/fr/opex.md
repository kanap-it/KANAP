# OPEX

Les postes OPEX (dépenses opérationnelles) sont vos coûts IT récurrents : licences logicielles, abonnements cloud, contrats de maintenance et services. C'est ici que vous planifiez les budgets, suivez le réalisé et répartissez les coûts à travers votre organisation.

L'espace de travail OPEX vous aide à gérer chaque poste de dépense de la budgétisation initiale jusqu'à l'exécution et le reporting -- le tout en un seul endroit avec des colonnes budgétaires annuelles, des méthodes de ventilation flexibles et des liens directs vers les fournisseurs, contrats, applications et projets.

## Premiers pas

Rendez-vous dans **Gestion budgétaire > OPEX** pour voir votre liste. Cliquez sur **Nouveau** pour créer votre premier poste.

**Champs obligatoires** :
  - **Nom du produit** : Ce que vous dépensez (ex. : « Licences Salesforce », « Compute AWS »)
  - **Fournisseur** : À qui vous payez. Lié à vos données de référence Fournisseurs
  - **Devise** : Code ISO (ex. : USD, EUR). Par défaut la devise de votre espace de travail ; modifiable par poste
  - **Société payeuse** : Quelle société paie le fournisseur (obligatoire pour la comptabilité)
  - **Compte** : Le compte du grand livre pour cette dépense. Seuls les comptes du plan comptable de la société payeuse apparaissent
  - **Date de début effective** : Quand cette dépense commence (JJ/MM/AAAA)

**Optionnel mais utile** :
  - **Description** : Contexte ou notes supplémentaires sur la dépense
  - **Date de fin effective** : Quand cette dépense s'arrête (laisser vide pour les postes permanents)
  - **Responsable IT** / **Responsable métier** : Qui est en charge
  - **Catégorie analytique** : Regroupement personnalisé pour le reporting (ex. : « Infrastructure », « Apps métier »). De nouvelles catégories peuvent être créées à la volée
  - **Notes** : Notes internes libres

Une fois enregistré, l'espace de travail déverrouille tous les onglets : **Vue d'ensemble**, **Budget**, **Ventilations**, **Tâches** et **Relations**.

**Conseil** : Vous pouvez créer des postes rapidement et remplir les budgets et ventilations plus tard. Commencez par l'essentiel et itérez.

---

## Travailler avec la liste OPEX

La liste OPEX (dans **Gestion budgétaire > OPEX**) est votre vue principale pour parcourir, filtrer et naviguer dans les postes de dépenses.

**Colonnes par défaut** :
  - **Nom du produit** : Le nom du poste (ouvre l'onglet Vue d'ensemble)
  - **Fournisseur** : Le nom du fournisseur
  - **Société payeuse** : Quelle société paie ce poste
  - **Contrat** : Le nom du dernier contrat lié (ouvre l'espace de travail du Contrat)
  - **Compte** : Le numéro et nom du compte comptable
  - **Ventilation** : Le libellé de la méthode de ventilation pour l'année en cours (ouvre l'onglet Ventilations)
  - **Budget A** : Montant du budget de l'année en cours (ouvre l'onglet Budget pour cette année)
  - **Atterrissage A** : Montant de l'atterrissage de l'année en cours (ouvre l'onglet Budget pour cette année)
  - **Tâche** : Le titre de la dernière tâche (ouvre l'onglet Tâches)

**Colonnes supplémentaires** (masquées par défaut, activez via le sélecteur de colonnes) :
  - **Budget A-1 / Atterrissage A-1** : Chiffres de l'année précédente
  - **Révision A / Suivi A** : Montants de révision et suivi de l'année en cours
  - **Budget A+1 / Révision A+1** : Chiffres de l'année suivante
  - **Budget A+2** : Budget à deux ans
  - **Activé** : Statut du poste (activé ou désactivé)
  - **Description** : Description du poste
  - **Devise** : Code devise ISO
  - **Début effectif / Fin effective** : Dates de début et fin
  - **Responsable IT / Responsable métier** : Utilisateurs responsables
  - **Analytique** : Nom de la catégorie analytique
  - **ID Projet** : Identifiant du projet lié
  - **Notes** : Notes internes
  - **Créé / Mis à jour** : Horodatages

**Filtrage** :
  - **Recherche rapide** : Recherche dans nom du produit, fournisseur, description et autres champs texte. Filtre la liste en temps réel
  - **Filtres de colonnes** : Cliquez sur l'icône de filtre dans n'importe quel en-tête de colonne. **Société payeuse**, **Compte**, **Ventilation**, **Devise**, **Responsable IT**, **Responsable métier** et **Analytique** utilisent des filtres par jeu de cases à cocher (multi-sélection). Les autres colonnes utilisent des filtres texte ou numériques
  - **Périmètre par statut** : Utilisez la bascule **Afficher : Activé / Désactivé / Tous** au-dessus de la grille (par défaut **Activé**)

**Tri** :
  - Cliquez sur un en-tête de colonne pour trier croissant/décroissant
  - Le tri par défaut est par **Budget A** décroissant
  - La liste mémorise votre dernier tri, recherche et filtres quand vous revenez

**Ligne de totaux** :
  - La ligne épinglée en bas affiche les totaux pour toutes les colonnes budgétaires
  - Les totaux respectent vos filtres et recherche actuels

**Liens profonds** :
  - Cliquer sur n'importe quelle cellule ouvre l'espace de travail sur l'onglet le plus pertinent :
    - **Nom du produit**, **Fournisseur**, **Société payeuse**, **Compte** et autres colonnes générales : Ouvre l'onglet **Vue d'ensemble**
    - **Colonnes budgétaires** (Budget A, Atterrissage A, Budget A-1, etc.) : Ouvre l'onglet **Budget** pré-positionné sur cette année
    - **Ventilation** : Ouvre l'onglet **Ventilations** pour l'année en cours
    - **Tâche** : Ouvre l'onglet **Tâches**
    - **Contrat** : Ouvre directement l'espace de travail du Contrat lié (pas l'espace de travail OPEX)

**Actions** :
  - **Nouveau** : Créer un nouveau poste OPEX (nécessite `opex:manager`)
  - **Import CSV** : Charger en masse depuis un CSV (nécessite `opex:admin`)
  - **Export CSV** : Exporter en CSV (nécessite `opex:admin`)
  - **Supprimer la sélection** : Suppression en masse des postes sélectionnés (nécessite `opex:admin` ; sélectionnez via les cases à cocher)

**Navigation Préc./Suiv.** :
  - Lorsque vous ouvrez un poste, l'espace de travail affiche les boutons **Préc.** et **Suiv.**
  - Ceux-ci naviguent dans la liste selon le tri actuel, respectant les filtres et la recherche
  - Votre contexte de liste (tri, filtres, recherche) est préservé lorsque vous fermez l'espace de travail

**Conseil** : Utilisez les filtres de colonnes + la recherche rapide pour construire des vues focalisées (ex. : « Toutes les dépenses cloud de plus de 10k »), puis naviguez poste par poste avec Préc./Suiv. pour revoir les budgets.

---

## L'espace de travail OPEX

Cliquez sur n'importe quelle ligne de la liste pour ouvrir l'espace de travail. Il comporte cinq onglets disposés verticalement à gauche, chacun focalisé sur un aspect spécifique du poste de dépense.

### Vue d'ensemble

Cet onglet affiche toutes les informations générales sur le poste de dépense.

**Ce que vous pouvez modifier** :
  - **Nom du produit** (obligatoire)
  - **Description**
  - **Fournisseur** (autocomplétion depuis vos données de référence Fournisseurs ; obligatoire)
  - **Devise** (par défaut la devise de l'espace de travail ; affiche uniquement les devises autorisées)
  - **Société payeuse** (autocomplétion depuis vos Sociétés ; obligatoire)
  - **Compte** (filtré par le plan comptable de la société payeuse ; obligatoire)
  - **Début effectif** et **Fin effective** (champs de date)
  - **Responsable IT** et **Responsable métier** (autocomplétion depuis les utilisateurs actifs)
  - **Catégorie analytique** (autocomplétion ; crée de nouvelles catégories à la volée)
  - **Notes**

**Statut et cycle de vie** :
  - Utilisez la bascule **Activé** ou définissez une **Date de désactivation** pour contrôler quand le poste apparaît dans les rapports et listes de sélection
  - Les postes désactivés sont exclus des rapports pour les années strictement postérieures à la date de désactivation
  - Les données historiques restent intactes ; vous verrez toujours les postes désactivés dans les rapports couvrant les années où ils étaient actifs

**Enregistrer et Réinitialiser** :
  - Les modifications ne sont **pas** enregistrées automatiquement
  - Cliquez sur **Enregistrer** pour persister vos modifications, ou **Réinitialiser** pour les annuler
  - Si vous tentez de naviguer ou changer d'onglet avec des modifications non enregistrées, vous serez invité à enregistrer ou annuler

**Conseil** : Si vous voyez un avertissement « Compte obsolète », cela signifie que le compte sélectionné n'appartient pas au plan comptable de la société payeuse. Choisissez un autre compte pour résoudre l'avertissement.

---

### Budget

L'onglet Budget est l'endroit où vous saisissez les données financières par année. Il supporte plusieurs colonnes budgétaires et deux modes de saisie : **Forfaitaire** (totaux annuels) et **Manuel** (ventilation mensuelle).

**Sélection d'année** :
  - Utilisez les onglets d'année en haut pour basculer entre A-2, A-1, A (année en cours), A+1 et A+2
  - Chaque année a sa propre version, son mode et ses montants
  - Changer d'année avec des modifications non enregistrées ouvre une boîte de dialogue enregistrer/annuler

**Colonnes budgétaires** :
  - **Budget (planifié)** : Budget annuel initial approuvé en début d'année
  - **Révision (engagé)** : Mise à jour budgétaire en cours d'année (ex. : après une re-prévision)
  - **Suivi (réalisé)** : Dépense réelle attendue (votre meilleure estimation au fil de l'année)
  - **Atterrissage (atterrissage prévu)** : Dépense réelle finale après la clôture de fin d'année

**Mode Forfaitaire vs Manuel** :
  - **Forfaitaire** : Saisissez un total par colonne ; les montants sont répartis uniformément sur 12 mois pour les besoins de ventilation
  - **Manuel** : Saisissez les montants par mois (Jan-Déc) pour chaque colonne, plus une colonne **Prévision** pour la planification complémentaire
  - Basculez entre les modes avec les boutons radio en haut de l'onglet

**Comportement du gel** :
  - Si les colonnes budgétaires d'une année sont gelées (via l'Administration budgétaire), les champs correspondants passent en lecture seule
  - Vous pouvez toujours consulter les données gelées ; les administrateurs peuvent dégeler via **Gestion budgétaire > Administration > Geler/Dégeler**
  - Chaque colonne peut être gelée indépendamment (Budget, Révision, Suivi, Atterrissage)

**Champ Notes** :
  - Chaque version budgétaire annuelle a un champ **Notes** pour les commentaires spécifiques à l'année (ex. : « Inclut une hausse de prix de 10 % au T3 »)

**Comment l'utiliser** :
  1. Sélectionnez l'année pour laquelle vous planifiez
  2. Choisissez le mode Forfaitaire ou Manuel
  3. Remplissez les colonnes pertinentes (Budget pour la planification initiale, Suivi pour le tracking, Atterrissage pour le réalisé)
  4. Cliquez sur **Enregistrer** pour persister vos modifications

**Conseil** : Pour la plupart des postes, le mode Forfaitaire est plus rapide. Utilisez le mode Manuel lorsque la dépense varie significativement par mois (ex. : licences saisonnières, frais de mise en place ponctuels).

---

### Ventilations

L'onglet Ventilations répartit la dépense entre vos sociétés et départements. Cela alimente les rapports de refacturation et les KPI de coût par utilisateur.

**Sélection d'année** :
  - Fonctionne comme le Budget : utilisez les onglets d'année pour basculer entre A-2, A-1, A, A+1, A+2
  - Chaque année peut avoir une méthode de ventilation différente

**Méthodes de ventilation** :

| Méthode | Comment ça fonctionne |
|---------|----------------------|
| **Effectif (Par défaut)** | Répartit la dépense proportionnellement par effectif de chaque société pour l'année sélectionnée. C'est la méthode par défaut. Aucune sélection manuelle requise -- les pourcentages sont calculés automatiquement depuis les métriques des sociétés. |
| **Utilisateurs IT** | Répartit la dépense proportionnellement par nombre d'utilisateurs IT de chaque société pour l'année sélectionnée. |
| **Chiffre d'affaires** | Répartit la dépense proportionnellement par chiffre d'affaires de chaque société pour l'année sélectionnée. |
| **Manuel par société** | Vous sélectionnez quelles sociétés reçoivent cette dépense et choisissez un driver (Effectif, Utilisateurs IT ou Chiffre d'affaires) pour calculer les pourcentages parmi les sociétés sélectionnées uniquement. |
| **Manuel par département** | Vous sélectionnez des paires société/département spécifiques. Les pourcentages sont calculés à partir de l'effectif de chaque département. Utile lorsqu'un poste ne bénéficie qu'à certains départements (ex. : un CRM utilisé par les ventes). |

**Comment fonctionnent les pourcentages** :
  - Pour les **méthodes automatiques** (Effectif, Utilisateurs IT, Chiffre d'affaires) : les pourcentages sont calculés depuis les dernières métriques des sociétés à chaque chargement de page. Vous ne les modifiez pas directement
  - Pour les **méthodes manuelles** : vous sélectionnez les sociétés ou départements, et le système calcule les pourcentages basé sur votre driver choisi et les métriques actuelles
  - Les pourcentages reflètent les données en temps réel. Si vous mettez à jour l'effectif d'une société, les ventilations se recalculent immédiatement
  - L'indicateur de pourcentage total affiche un total glissant. Pour les méthodes auto, le reste est auto-distribué ; pour les méthodes manuelles, l'aperçu utilise les métriques en temps réel

**Comment l'utiliser** :
  1. Sélectionnez l'année
  2. Choisissez une méthode de ventilation depuis le menu déroulant
  3. Si vous utilisez Manuel par société, choisissez un driver (Effectif, Utilisateurs IT ou Chiffre d'affaires) et sélectionnez les sociétés
  4. Si vous utilisez Manuel par département, sélectionnez les paires société/département
  5. Cliquez sur **Enregistrer** pour persister la méthode et la sélection

**Problèmes courants** :
  - **Erreur « Métriques manquantes »** : Une ou plusieurs sociétés ont un effectif/utilisateurs IT/chiffre d'affaires nul ou manquant pour l'année sélectionnée. Remplissez les métriques dans **Données de référence > Sociétés** (onglet Détails)
  - **« Le total n'est pas 100 % »** : Généralement causé par des métriques manquantes. Corrigez les données des sociétés et rechargez les ventilations

**Conseil** : Utilisez Effectif (Par défaut) pour la plupart des postes -- c'est le plus simple et se met à jour automatiquement. Réservez les méthodes manuelles pour les dépenses qui ne bénéficient qu'à des sociétés ou départements spécifiques.

---

### Tâches

L'onglet Tâches vous aide à suivre les actions et relances liées à ce poste OPEX (ex. : « Renouveler la licence d'ici le T3 », « Revoir les métriques d'utilisation »).

**Liste des tâches** :
  - Affiche toutes les tâches liées à ce poste OPEX
  - Colonnes : **Titre**, **Statut**, **Priorité**, **Date d'échéance**, **Actions**
  - Cliquez sur un titre de tâche pour ouvrir l'espace de travail complet de la tâche
  - Le filtre par défaut affiche les tâches actives (masque terminées et annulées)

**Création d'une tâche** :
  - Cliquez sur **Ajouter une tâche** pour ouvrir l'espace de travail de création de tâche
  - La tâche est automatiquement liée à ce poste OPEX
  - Remplissez le titre, la description, la priorité, le responsable et la date d'échéance dans l'espace de travail de la tâche

**Remarques** :
  - Les tâches sont des objets indépendants avec leurs propres autorisations (`tasks:member` pour créer/modifier)
  - Avoir l'accès manager OPEX ne donne pas automatiquement les droits de modification de tâches ; vérifiez avec votre admin si vous ne pouvez pas créer de tâches
  - Les tâches peuvent aussi être consultées et gérées depuis **Portefeuille > Tâches**, qui affiche toutes les tâches de votre organisation

**Conseil** : Utilisez les tâches pour capturer les actions identifiées lors des revues budgétaires ou des renouvellements de contrats. Définissez des dates d'échéance pour suivre les délais à venir.

---

### Relations

L'onglet Relations lie ce poste OPEX aux objets associés : Projets, Applications, Contrats, Contacts, Sites web pertinents et Pièces jointes.

**Projets** :
  - Utilisez l'autocomplétion pour lier un ou plusieurs projets depuis votre Portefeuille
  - Cela aide à regrouper les dépenses par projet dans les rapports et permet la comptabilité projet

**Applications** :
  - Utilisez l'autocomplétion pour lier une ou plusieurs applications depuis votre catalogue IT
  - Cela aide à suivre quels postes OPEX financent quelles applications ou services

**Contrats** :
  - Utilisez l'autocomplétion pour lier un ou plusieurs contrats
  - Lorsqu'ils sont liés, le nom du contrat apparaît dans la colonne **Contrat** de la liste OPEX pour référence rapide

**Contacts** :
  - Ajoutez des contacts fournisseurs liés à ce poste de dépense
  - Chaque contact a un **Rôle** (Commercial, Technique, Support ou Autre)

**Sites web pertinents** :
  - Ajoutez des URL liées à ce poste (ex. : portails fournisseurs, documentation, consoles d'administration)
  - Chaque lien a un champ **Description** optionnel

**Pièces jointes** :
  - Téléversez des fichiers liés à ce poste (ex. : contrats, factures, devis, cahiers des charges)
  - Glissez-déposez ou cliquez sur **Sélectionner des fichiers**
  - Les pièces jointes sont enregistrées immédiatement lors du téléversement (pas besoin de cliquer sur **Enregistrer**)

**Conseil** : Liez les contrats pour suivre les renouvellements à travers plusieurs postes OPEX. Ajoutez les URL de portails fournisseurs pour un accès rapide. Téléversez les devis et factures en pièces jointes pour centraliser toute la documentation liée aux dépenses.

---

## Import/export CSV

Vous pouvez charger en masse les postes OPEX via CSV pour accélérer la configuration initiale ou la synchronisation avec des systèmes externes.

**Export** :
  1. Cliquez sur **Export CSV** dans la liste OPEX
  2. Choisissez :
     - **Modèle** : En-têtes uniquement (utilisez-le pour créer un CSV vierge à remplir)
     - **Données** : Tous les postes OPEX actuels avec les budgets pour A-1, A et A+1

**Import** :
  1. Cliquez sur **Import CSV** dans la liste OPEX
  2. Téléversez votre fichier CSV (glisser-déposer ou sélecteur de fichiers)
  3. Cliquez sur **Vérification préalable** pour valider
  4. Examinez le rapport de vérification
  5. Si OK, cliquez sur **Charger** pour importer

**Remarques importantes** :
  - **Clé unique** : Les postes OPEX sont identifiés par `(product_name, supplier_name)`. Si une combinaison existe déjà, elle est **ignorée** (pas de mise à jour)
  - **Insertion uniquement** : L'importateur ne crée que de nouveaux postes ; il ne mettra pas à jour les existants. Utilisez l'interface pour modifier les postes existants
  - **Références** : `supplier_name` doit correspondre à un Fournisseur par nom (insensible à la casse). `account_number` doit correspondre à un Compte. `owner_it_email` et `owner_business_email` doivent correspondre à des utilisateurs actifs par e-mail

**Conseil** : Commencez par l'export du modèle, remplissez quelques lignes, et lancez une vérification préalable pour attraper les erreurs tôt. Corrigez les erreurs dans le CSV et re-téléversez jusqu'à ce que la vérification passe, puis chargez.

---

## Autorisations

L'accès OPEX est contrôlé par trois niveaux :

- `opex:reader` -- Consulter la liste OPEX, ouvrir les postes, voir les budgets et ventilations (lecture seule), télécharger les pièces jointes
- `opex:manager` -- Créer et modifier les postes OPEX, mettre à jour les budgets et ventilations, téléverser et supprimer les pièces jointes, gérer les relations et liens
- `opex:admin` -- Tous les droits manager plus import/export CSV, opérations budgétaires (gel, copie, réinitialisation) et suppression en masse

De plus :
- Les tâches ont des autorisations séparées (`tasks:member` pour créer/modifier des tâches sur les postes OPEX)
- Les utilisateurs avec `tasks:reader` peuvent consulter les tâches mais ne peuvent pas les créer ou les modifier

Si vous ne pouvez pas effectuer une action (ex. : le bouton **Import CSV** est manquant, impossible de téléverser des pièces jointes), vérifiez auprès de l'administrateur de votre espace de travail pour revoir les autorisations de votre rôle.

---

## Conseils et bonnes pratiques

1. **Commencez simple** : Créez les postes avec juste l'essentiel (nom du produit, fournisseur, société payeuse, compte), puis ajoutez les budgets et ventilations au fur et à mesure que vous planifiez.
2. **Utilisez la méthode de ventilation par défaut** : Pour la plupart des postes, Effectif (Par défaut) suffit. Réservez les ventilations manuelles pour les dépenses ne bénéficiant qu'à des sociétés ou départements spécifiques.
3. **Liez les contrats** : Si vous gérez les dépenses via des contrats, liez-les dans l'onglet Relations. Cela facilite le suivi des renouvellements.
4. **Liez les applications** : Associez les postes OPEX aux applications ou services qu'ils financent. Cela fournit un mapping clair coût-vers-application.
5. **Téléversez la documentation** : Utilisez la fonctionnalité Pièces jointes pour stocker les contrats fournisseurs, devis, factures et cahiers des charges.
6. **Maintenez les métriques des sociétés à jour** : Les ventilations dépendent de l'effectif, des utilisateurs IT et du chiffre d'affaires des sociétés. Des métriques obsolètes causent des erreurs de ventilation.
7. **Utilisez le CSV pour la configuration en masse** : Si vous migrez depuis un autre système ou avez des centaines de postes, commencez par l'import CSV.
8. **Désactivez, ne supprimez pas** : Préservez l'historique en désactivant les postes lorsqu'ils ne sont plus actifs. Ne supprimez que s'il s'agit d'une erreur.
9. **Vérifiez la ligne de totaux** : Avant de finaliser les budgets, vérifiez la ligne de totaux épinglée dans la liste pour vous assurer que vos dépenses s'additionnent comme prévu.
10. **Utilisez les liens profonds** : Cliquez directement sur une colonne budgétaire dans la liste pour accéder à l'onglet Budget pour cette année. Cliquez sur la colonne Tâche pour accéder aux Tâches. Cela fait gagner du temps de navigation.
11. **Gelez les budgets après la clôture de fin d'année** : Utilisez l'Administration budgétaire pour geler les budgets de l'année précédente une fois le réalisé finalisé, empêchant les modifications accidentelles.
