# CAPEX

Les postes CAPEX (dépenses d'investissement) sont vos investissements dans des actifs à long terme : achats de matériel, licences logicielles à valeur pluriannuelle, projets d'infrastructure et équipements. C'est ici que vous planifiez les budgets d'investissement, suivez les dépenses de projet et répartissez les coûts à travers votre organisation.

L'espace de travail CAPEX vous aide à gérer chaque poste d'investissement de la budgétisation initiale jusqu'à l'exécution et le reporting -- le tout en un seul endroit avec des colonnes budgétaires annuelles, des méthodes de ventilation flexibles et des liens directs vers les projets, contrats et contacts.

## Premiers pas

Rendez-vous dans **Gestion budgétaire > CAPEX** pour voir votre liste. Cliquez sur **Nouveau** pour créer votre premier poste.

**Champs obligatoires** :

- **Description** : Ce dans quoi vous investissez (ex. : « Nouvelle infrastructure serveur », « Licence logiciel ERP »)
- **Type PP&E** : Classification Immobilisations -- Matériel ou Logiciel
- **Type d'investissement** : Objectif de l'investissement (voir les options ci-dessous)
- **Priorité** : Niveau de priorité métier (voir les options ci-dessous)
- **Devise** : Code ISO (ex. : USD, EUR). Par défaut la devise CAPEX de votre espace de travail ; modifiable par poste
- **Début effectif** : Quand cet investissement commence (JJ/MM/AAAA)
- **Société payeuse** : Quelle société réalise l'investissement (obligatoire pour la comptabilité)

**Fortement recommandé** :

- **Compte** : Le compte du grand livre pour cette dépense d'investissement. Seuls les comptes du plan comptable de la société payeuse apparaissent
- **Fournisseur** : Le vendeur ou fournisseur pour cet investissement. Sélectionnez depuis vos données de référence fournisseurs

**Optionnel mais utile** :

- **Fin effective** : Quand la durée de vie utile de cet actif se termine ou le projet est achevé (laisser vide pour les actifs permanents)
- **Notes** : Notes internes libres sur l'investissement

Une fois enregistré, l'espace de travail déverrouille tous les onglets : **Vue d'ensemble**, **Budget**, **Ventilations**, **Tâches** et **Relations**.

**Conseil** : Vous pouvez créer des postes rapidement et remplir les budgets et ventilations plus tard. Commencez par l'essentiel et itérez.

---

## Types d'investissement

Les postes CAPEX doivent être classifiés par type d'investissement. Cela aide à analyser les schémas de dépenses d'investissement :

- **Remplacement** : Remplacement d'actifs existants obsolètes ou en fin de vie
- **Capacité** : Ajout de capacité pour supporter la croissance métier ou une demande accrue
- **Productivité** : Amélioration de l'efficacité ou réduction des coûts opérationnels
- **Sécurité** : Renforcement de la posture de sécurité, conformité ou atténuation des risques
- **Conformité** : Satisfaction d'exigences réglementaires ou de conformité
- **Croissance métier** : Permettre de nouveaux produits, marchés ou capacités métier
- **Autre** : Investissements ne correspondant pas aux catégories ci-dessus

**Niveaux de priorité** :

- **Obligatoire** : Doit être fait (réglementaire, infrastructure critique, sécurité)
- **Haute** : Business case solide, ROI élevé ou importance stratégique
- **Moyenne** : Précieux mais reportable si nécessaire
- **Basse** : Souhaitable, peut être reporté

---

## Travailler avec la liste CAPEX

La liste CAPEX (dans **Gestion budgétaire > CAPEX**) est votre vue principale pour parcourir, filtrer et naviguer dans les postes d'investissement.

### Colonnes par défaut

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **Description** | Nom de l'investissement |
| **Société** | Société payeuse |
| **Type PP&E** | Matériel ou Logiciel |
| **Type d'investissement** | Objectif de l'investissement |
| **Priorité** | Niveau de priorité métier |
| **Ventilation A** | Libellé de la méthode de ventilation de l'année en cours |
| **Budget A** | Budget d'investissement planifié de l'année en cours (devise de reporting) |
| **Atterrissage A** | Dépense d'investissement réelle finale de l'année en cours (devise de reporting) |
| **Budget A+1** | Budget d'investissement planifié de l'année suivante (devise de reporting) |

### Colonnes supplémentaires

Ces colonnes sont masquées par défaut. Affichez-les depuis le sélecteur de colonnes :

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **Ventilation A+1** | Libellé de la méthode de ventilation de l'année suivante |
| **Atterrissage A-1** | Dépense d'investissement réelle finale de l'année précédente |
| **Devise** | Code de devise du poste |
| **Début** | Date de début effective |
| **Fin** | Date de fin effective |
| **Notes** | Notes libres |
| **Tâche** | Titre de la tâche la plus récente liée à ce poste |
| **Activé** | Statut (activé ou désactivé) |

### Filtrage

Chaque en-tête de colonne filtrable a une icône de filtre. **Société**, **Type PP&E**, **Type d'investissement**, **Priorité** et **Devise** utilisent des filtres par jeu de cases à cocher avec **Tous**, **Aucun** et un bouton effacer. Les filtres multiples se combinent avec une logique ET.

### Ligne de totaux

La ligne épinglée en bas affiche les totaux pour toutes les colonnes budgétaires. Les totaux respectent vos filtres et recherche actuels. Tous les montants sont convertis dans votre devise de reporting, affichée dans le titre de la page (ex. : « CAPEX (EUR) »).

### Liens profonds

Cliquez sur n'importe quelle cellule d'une ligne pour ouvrir l'espace de travail sur l'onglet le plus pertinent :

- **Description**, **Société**, **Type PP&E**, **Type d'investissement**, **Priorité** : Ouvre la **Vue d'ensemble**
- **Budget A**, **Atterrissage A** : Ouvre l'onglet **Budget** pour l'année en cours
- **Atterrissage A-1** : Ouvre l'onglet **Budget** pour l'année précédente
- **Budget A+1** : Ouvre l'onglet **Budget** pour l'année suivante
- **Ventilation A** : Ouvre l'onglet **Ventilations** pour l'année en cours
- **Ventilation A+1** : Ouvre l'onglet **Ventilations** pour l'année suivante
- **Tâche** : Ouvre l'onglet **Tâches**

**Conseil** : Utilisez les filtres de colonnes et la recherche rapide pour construire des vues focalisées (ex. : « Tous les investissements matériel avec priorité haute »), puis naviguez poste par poste avec **Préc.**/**Suiv.** pour revoir les budgets.

---

## L'espace de travail CAPEX

Cliquez sur n'importe quelle ligne de la liste pour ouvrir l'espace de travail. Il comporte cinq onglets, chacun focalisé sur un aspect spécifique du poste d'investissement.

### Vue d'ensemble

Cet onglet affiche toutes les informations générales sur le poste CAPEX.

**Ce que vous pouvez modifier** :

- **Description** : Ce dans quoi vous investissez (texte multi-lignes)
- **Société payeuse** : Autocomplétion depuis vos Sociétés
- **Compte** : Filtré par le plan comptable de la société payeuse
- **Fournisseur** : Autocomplétion depuis vos données de référence fournisseurs
- **Type PP&E** : Matériel ou Logiciel
- **Type d'investissement** : Remplacement, Capacité, Productivité, Sécurité, Conformité, Croissance métier ou Autre
- **Priorité** : Obligatoire, Haute, Moyenne ou Basse
- **Devise** : Par défaut la devise CAPEX de l'espace de travail ; affiche uniquement les devises autorisées
- **Début effectif** et **Fin effective** : Champs de date au format JJ/MM/AAAA
- **Notes** : Notes internes libres

**Statut et cycle de vie** :

- Utilisez la bascule **Activé** ou définissez une **Date de désactivation** pour contrôler quand le poste apparaît dans les rapports et listes de sélection
- Les postes désactivés sont exclus des rapports pour les années strictement postérieures à la date de désactivation
- Les données historiques restent intactes

---

### Budget

L'onglet Budget est l'endroit où vous saisissez les données financières par année. Il supporte plusieurs colonnes budgétaires et deux modes de saisie : **Totaux forfaitaires** (total annuel) et **Manuel par mois** (ventilation sur 12 mois).

**Colonnes budgétaires** (toutes les années) :

- **Budget** : Budget d'investissement planifié initial
- **Révision** : Mise à jour budgétaire en cours d'année (ex. : après des changements de périmètre ou re-prévisions)
- **Suivi** : Dépense réelle attendue (votre meilleure estimation au fil de l'année)
- **Atterrissage** : Dépense d'investissement réelle finale après la clôture de fin d'année

**Mode Forfaitaire vs Manuel par mois** :

- **Totaux forfaitaires** : Saisissez un total par colonne ; les montants sont répartis uniformément sur 12 mois pour les besoins de ventilation
- **Manuel par mois** : Saisissez les montants par mois (Jan à Déc) pour un suivi granulaire des dépenses projet
- Basculez entre les modes avec les boutons radio en haut de l'onglet

**Supprimer et redistribuer** (mode manuel par mois uniquement) :

- Cliquez sur l'icône de suppression à côté d'un mois pour le mettre à zéro et redistribuer sa valeur sur les autres mois déverrouillés
- Utile pour supprimer des mois d'espace réservé ou ajuster les chronologies de projet

**Conseil** : Pour la plupart des postes, le mode forfaitaire est plus rapide. Utilisez le mode manuel par mois lorsque vous devez suivre le calendrier des dépenses de projet ou les déploiements par phases.

---

### Ventilations

L'onglet Ventilations répartit la dépense d'investissement entre vos sociétés et départements. Cela alimente les rapports de refacturation et aide à ventiler les coûts d'actifs.

**Méthodes de ventilation** :

1. **Effectif (Par défaut)** : Répartit la dépense d'investissement proportionnellement par effectif de chaque société. Nécessite que toutes les sociétés actives aient un effectif > 0. Les pourcentages se mettent à jour automatiquement.

2. **Utilisateurs IT** : Répartit proportionnellement par nombre d'utilisateurs IT. Utile pour les investissements d'infrastructure IT qui évoluent avec le personnel IT.

3. **Chiffre d'affaires** : Répartit proportionnellement par chiffre d'affaires. Utile pour les plateformes ou infrastructures à l'échelle de l'entreprise.

4. **Manuel par société** : Vous sélectionnez quelles sociétés bénéficient de cet investissement. Choisissez un driver pour calculer les pourcentages parmi les sociétés sélectionnées.

5. **Manuel par département** : Vous sélectionnez des paires société/département spécifiques. Utile lorsqu'un investissement ne bénéficie qu'à certains départements (ex. : équipement de fabrication).

**Conseil** : Utilisez Effectif pour la plupart des postes (c'est le plus simple et se met à jour automatiquement). Réservez Manuel par société pour les investissements ne bénéficiant qu'à des entités spécifiques. Utilisez Manuel par département pour les investissements très ciblés.

---

### Tâches

L'onglet Tâches vous aide à suivre les actions et relances liées à ce poste CAPEX (ex. : « Sélection fournisseur d'ici le T2 », « Terminer l'installation d'ici juin », « Obtenir l'approbation du conseil »).

**Liste des tâches** :

- Affiche toutes les tâches liées à ce poste CAPEX
- Colonnes : Titre, Statut, Priorité, Date d'échéance, Actions
- Cliquez sur un titre de tâche pour ouvrir l'espace de travail complet de la tâche
- Le filtre par défaut affiche les tâches actives (masque terminées et annulées)

**Remarques** :

- Les tâches sont des objets indépendants avec leurs propres autorisations (`tasks:member` pour créer/modifier)
- Avoir l'accès manager CAPEX ne donne pas automatiquement les droits de modification de tâches
- Les tâches peuvent aussi être consultées et gérées depuis **Portefeuille > Tâches**

**Conseil** : Utilisez les tâches pour capturer les actions identifiées lors de la planification d'investissement ou des cycles d'approbation. Définissez des dates d'échéance pour suivre les jalons d'approvisionnement et les délais d'implémentation.

---

### Relations

L'onglet Relations lie ce poste CAPEX aux objets associés : Projets, Contrats, Contacts, Sites web pertinents et Pièces jointes.

**Projets** :
- Utilisez l'autocomplétion pour lier un ou plusieurs projets
- Cela aide à regrouper les dépenses d'investissement par projet dans les rapports

**Contrats** :
- Utilisez l'autocomplétion pour lier un ou plusieurs contrats

**Contacts** :
- Liez des contacts à ce poste CAPEX avec un rôle : **Commercial**, **Technique**, **Support** ou **Autre**

**Sites web pertinents** :
- Ajoutez des URL liées à cet investissement (ex. : pages produit fournisseur, documentation technique)

**Pièces jointes** :
- Téléversez des fichiers liés à ce poste (ex. : devis, propositions fournisseur, spécifications techniques, notes d'approbation)
- Les pièces jointes sont enregistrées immédiatement lors du téléversement

**Conseil** : Téléversez les devis fournisseur, notes d'approbation et spécifications techniques en pièces jointes. Liez les contrats pour le suivi des approvisionnements.

---

## Import/export CSV

Vous pouvez charger en masse les postes CAPEX via CSV pour accélérer la configuration initiale ou la synchronisation avec des systèmes externes.

**Export** :
1. Cliquez sur **Export CSV** dans la liste CAPEX
2. Choisissez :
   - **Modèle** : En-têtes uniquement
   - **Données** : Tous les postes CAPEX actuels avec les budgets pour A-1, A et A+1

**Import** :
1. Cliquez sur **Import CSV** dans la liste CAPEX
2. Téléversez votre fichier CSV
3. Cliquez sur **Vérification préalable** pour valider
4. Examinez le rapport de vérification
5. Si OK, cliquez sur **Charger** pour importer

**Remarques importantes** :
- **Clé unique** : Les postes CAPEX sont identifiés par `description`. Si une description existe déjà, elle est **ignorée** (pas de mise à jour).
- **Insertion uniquement** : L'importateur ne crée que de nouveaux postes.
- **Type PP&E** : Doit être `hardware` ou `software` (insensible à la casse).
- **Type d'investissement** : Doit être l'un des suivants : `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` (insensible à la casse).

---

## Autorisations

L'accès CAPEX est contrôlé par trois niveaux :

- `capex:reader` -- Consulter la liste CAPEX, ouvrir les postes, voir les budgets et ventilations (lecture seule)
- `capex:manager` -- Créer et modifier les postes CAPEX, mettre à jour les budgets et ventilations, téléverser les pièces jointes, gérer les liens et contacts
- `capex:admin` -- Tous les droits manager plus import CSV, opérations budgétaires (gel, copie, réinitialisation) et suppression en masse

---

## Conseils

- **Commencez simple** : Créez les postes avec juste l'essentiel (description, type PP&E, type d'investissement, société), puis ajoutez les budgets et ventilations au fur et à mesure.
- **Utilisez la ventilation par effectif** : Pour la plupart des investissements, Effectif suffit. Réservez les ventilations manuelles pour les investissements ne bénéficiant qu'à des sociétés ou départements spécifiques.
- **Liez les contrats** : Si vous gérez les achats d'investissement via des contrats, liez-les dans l'onglet Relations pour le suivi des approvisionnements.
- **Téléversez la documentation** : Utilisez la fonctionnalité pièces jointes pour stocker les devis fournisseur, notes d'approbation et spécifications techniques à côté du poste.
- **Classifiez avec précision** : Utilisez le Type d'investissement et la Priorité de manière cohérente pour permettre une analyse et une priorisation significatives des dépenses d'investissement.
- **Maintenez les métriques des sociétés à jour** : Les ventilations dépendent de l'effectif, des utilisateurs IT et du chiffre d'affaires des sociétés. Des métriques obsolètes causent des erreurs de ventilation.
- **Désactivez, ne supprimez pas** : Préservez l'historique en désactivant les postes lorsque les actifs sont cédés ou les projets terminés.
- **Vérifiez la ligne de totaux** : Avant de finaliser les budgets d'investissement, vérifiez la ligne de totaux épinglée pour vous assurer que vos dépenses s'additionnent comme prévu.
- **Suivez le calendrier des dépenses** : Pour les gros projets avec des dépenses par phases, utilisez le mode manuel par mois pour suivre les dépenses par rapport aux jalons du projet.
- **Gelez après la clôture de fin d'année** : Utilisez l'Administration budgétaire pour geler les budgets de l'année précédente une fois le réalisé finalisé, empêchant les modifications accidentelles.
