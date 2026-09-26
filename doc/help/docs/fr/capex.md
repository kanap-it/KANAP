# CAPEX

Les postes CAPEX (dépenses d'investissement) sont vos investissements dans des actifs à long terme : achats de matériel, licences logicielles à valeur pluriannuelle, projets d'infrastructure et équipements. C'est ici que vous planifiez les budgets d'investissement, suivez les dépenses de projet et répartissez les coûts à travers votre organisation.

L'espace de travail CAPEX vous aide à gérer chaque poste d'investissement de la budgétisation initiale jusqu'à l'exécution et le reporting -- le tout en un seul endroit avec des colonnes budgétaires annuelles, des méthodes de ventilation flexibles et des liens directs vers les projets, contrats et contacts.

## Premiers pas

Rendez-vous dans **Gestion budgétaire > CAPEX** pour voir votre liste. Cliquez sur **Nouveau** pour créer votre premier poste.

**Champs obligatoires** :

- **Description** : Ce dans quoi vous investissez (ex. : « Nouvelle infrastructure serveur », « Licence logiciel ERP »)
- **Type d'immobilisation** : Classification des immobilisations corporelles -- Matériel ou Logiciel
- **Type d'investissement** : Objectif de l'investissement (voir les options ci-dessous)
- **Priorité** : Niveau de priorité métier (voir les options ci-dessous)
- **Devise** : Code ISO (ex. : USD, EUR). Par défaut la devise CAPEX de votre espace de travail ; modifiable par poste
- **Début d'effet** : Quand cet investissement commence (JJ/MM/AAAA)
- **Société payeuse** : Quelle société réalise l'investissement (obligatoire pour la comptabilité)

**Fortement recommandé** :

- **Compte** : Le compte du grand livre pour cette dépense d'investissement. Seuls les comptes du plan comptable de la société payeuse apparaissent
- **Fournisseur** : Le vendeur ou fournisseur pour cet investissement. Sélectionnez depuis vos données de référence fournisseurs

**Optionnel mais utile** :

- **Fin de validité** : La date à laquelle cet investissement s'arrête, par exemple à la fin de la durée de vie utile de l'actif ou à l'achèvement du projet. Laissez-la vide s'il n'y a pas de fin. Après cette date, le poste est désactivé et les années suivantes ne comptent plus dans les vues budgétaires
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
| **Type d'immobilisation** | Matériel ou Logiciel |
| **Type d'investissement** | Objectif de l'investissement |
| **Priorité** | Niveau de priorité métier |
| **Ventilation A** | Libellé de la méthode de ventilation de l'année en cours |
| **Budget A** | Budget d'investissement planifié de l'année en cours (devise de reporting) |
| **Atterrissage A** | Dépense d'investissement réelle finale de l'année en cours (devise de reporting) |
| **Budget A+1** | Budget d'investissement planifié de l'année suivante (devise de reporting) |

### Colonnes supplémentaires

Ces colonnes sont masquées par défaut. Affichez-les depuis le sélecteur de colonnes (menu hamburger dans l'en-tête de la grille) :

| Colonne | Ce qu'elle affiche |
|---|---|
| **Ventilation A+1** | Libellé de la méthode de ventilation de l'année suivante |
| **Atterrissage A-1** | Dépense d'investissement réelle finale de l'année précédente |
| **Devise** | Code de devise du poste |
| **Début** | Date de début d'effet |
| **Fin de validité** | Date à laquelle le poste s'arrête (vide signifie sans fin) |
| **Notes** | Notes libres |
| **Tâche** | Titre de la tâche la plus récente liée à ce poste |
| **Activé** | Statut (activé ou désactivé) |

### Recherche rapide

Le champ de recherche en haut porte sur la description, les notes, le type d'immobilisation, le type d'investissement, la priorité, la devise et le statut. Les résultats se mettent à jour en temps réel pendant la saisie.

### Filtres de colonnes

Chaque en-tête de colonne filtrable a une icône de filtre. **Société**, **Type d'immobilisation**, **Type d'investissement**, **Priorité** et **Devise** utilisent des filtres par jeu de cases à cocher avec **Tous**, **Aucun** et un bouton d'effacement. Plusieurs filtres se combinent avec une logique ET.

### Tri

Cliquez sur un en-tête de colonne pour trier par ordre croissant ou décroissant. La liste mémorise votre dernier tri quand vous revenez.

### Ligne de totaux

La ligne épinglée en bas affiche les totaux pour toutes les colonnes budgétaires. Les totaux respectent vos filtres et recherche actuels. Tous les montants sont convertis dans votre devise de reporting, affichée dans le titre de la page (ex. : « CAPEX (EUR) »).

### Liens profonds

Cliquez sur n'importe quelle cellule d'une ligne pour ouvrir l'espace de travail sur l'onglet le plus pertinent pour cette colonne :

- **Description**, **Société**, **Type d'immobilisation**, **Type d'investissement**, **Priorité** : Ouvre la **Vue d'ensemble**
- **Budget A**, **Atterrissage A** : Ouvre l'onglet **Budget** pour l'année en cours
- **Atterrissage A-1** : Ouvre l'onglet **Budget** pour l'année précédente
- **Budget A+1** : Ouvre l'onglet **Budget** pour l'année suivante
- **Ventilation A** : Ouvre l'onglet **Ventilations** pour l'année en cours
- **Ventilation A+1** : Ouvre l'onglet **Ventilations** pour l'année suivante
- **Tâche** : Ouvre l'onglet **Tâches**

### Filtre de statut

Utilisez la bascule **Afficher : Activé / Désactivé / Tous** au-dessus de la grille pour choisir le périmètre de cycle de vie (par défaut **Activé**). Choisissez **Désactivé** pour revoir les investissements archivés, ou **Tous** pour inclure les deux états. Les totaux se mettent à jour immédiatement.

### Conservation du contexte de recherche

Votre contexte de liste (ordre de tri, texte de recherche et filtres actifs) est conservé lorsque vous ouvrez un poste et restauré lorsque vous revenez à la liste. Vous pouvez ainsi consulter plusieurs postes à la suite sans perdre votre position.

### Navigation Préc./Suiv.

Lorsque vous ouvrez un poste, l'espace de travail affiche les boutons **Préc.** et **Suiv.**. Ils parcourent la liste dans l'ordre de tri actuel, en respectant les filtres et la recherche. Le compteur (ex. : « Poste 3 sur 47 ») indique votre position dans la liste filtrée.

**Conseil** : Utilisez les filtres de colonnes et la recherche rapide pour construire des vues ciblées (ex. : « Tous les investissements matériel de priorité haute »), puis naviguez poste par poste avec **Préc.**/**Suiv.** pour revoir les budgets.

---

## L'espace de travail CAPEX

Cliquez sur n'importe quelle ligne de la liste pour ouvrir l'espace de travail. Il comporte cinq onglets, chacun consacré à un aspect du poste d'investissement.

### Vue d'ensemble

Cet onglet affiche toutes les informations générales sur le poste CAPEX.

**Ce que vous pouvez modifier** :

- **Description** : Ce dans quoi vous investissez (texte multiligne)
- **Société payeuse** : Autocomplétion depuis vos Sociétés
- **Compte** : Filtré par le plan comptable de la société payeuse
- **Fournisseur** : Autocomplétion depuis vos données de référence fournisseurs
- **Type d'immobilisation** : Matériel ou Logiciel
- **Type d'investissement** : Remplacement, Capacité, Productivité, Sécurité, Conformité, Croissance métier ou Autre
- **Priorité** : Obligatoire, Haute, Moyenne ou Basse
- **Devise** : Par défaut la devise CAPEX de l'espace de travail ; affiche uniquement les devises autorisées
- **Début d'effet** : Champ de date au format JJ/MM/AAAA
- **Notes** : Notes internes libres

**Statut et cycle de vie** :

- Utilisez la bascule **Activé** ou définissez une **Fin de validité** pour contrôler quand le poste apparaît dans les rapports et listes de sélection
- Les postes désactivés sont exclus des rapports pour les années strictement postérieures à la fin de validité
- Les données historiques restent intactes ; vous verrez toujours les postes désactivés dans les rapports couvrant les années où ils étaient actifs

**Enregistrer et Réinitialiser** :

- Les modifications ne sont **pas** enregistrées automatiquement
- Cliquez sur **Enregistrer** pour conserver vos modifications, ou **Réinitialiser** pour les annuler
- Si vous tentez de quitter la page avec des modifications non enregistrées, vous serez invité à enregistrer ou annuler

**Conseil** : Si vous voyez un avertissement « compte obsolète », cela signifie que le compte sélectionné n'appartient pas au plan comptable de la société payeuse. Choisissez un autre compte pour résoudre l'avertissement.

---

### Budget

L'onglet Budget est l'endroit où vous saisissez les données financières par année. Il prend en charge plusieurs colonnes budgétaires et deux modes de saisie : **Totaux forfaitaires** (total annuel) et **Manuel par mois** (ventilation sur 12 mois).

**Sélection d'année** :

- Utilisez les onglets d'année en haut pour basculer entre A-2, A-1, A (année en cours), A+1 et A+2
- Chaque année a sa propre version, sa méthode de ventilation et ses montants
- Changer d'année avec des modifications non enregistrées ouvre une boîte de dialogue enregistrer/annuler

**Colonnes budgétaires** (toutes les années) :

- **Budget** : Budget d'investissement planifié initial
- **Révision** : Mise à jour budgétaire en cours d'année (ex. : après des changements de périmètre ou des re-prévisions)
- **Suivi** : Dépense réelle attendue (votre meilleure estimation au fil de l'année)
- **Atterrissage** : Dépense d'investissement réelle finale après la clôture de fin d'année

**Mode Forfaitaire vs Manuel par mois** :

- **Totaux forfaitaires** : Saisissez un total par colonne ; les montants sont répartis uniformément sur 12 mois pour les besoins de ventilation. Seul le total que vous modifiez est enregistré. Les autres colonnes gardent leurs montants mensuels.
- **Manuel par mois** : Saisissez les montants par mois (Jan à Déc) pour un suivi fin des dépenses projet. Seuls les mois que vous modifiez sont enregistrés.
- Basculez entre les modes avec les boutons radio en haut de l'onglet
- Changer de mode n'enregistre rien : seul l'affichage change. Les totaux forfaitaires montrent le total annuel des mois enregistrés, le mode manuel par mois montre les mois enregistrés.

**Comportement du gel** :

- Si le budget d'une année est gelé (via l'Administration budgétaire), les champs sont désactivés et affichent la mention « gelé »
- Chaque colonne peut être gelée indépendamment (Budget, Révision, Prévision, Réalisé, Atterrissage prévu)
- Vous pouvez toujours consulter les données gelées ; les administrateurs peuvent dégeler via **Gestion budgétaire > Administration > Geler/Dégeler**

**Supprimer et redistribuer** (mode manuel par mois uniquement) :

- Cliquez sur l'icône de suppression à côté d'un mois pour le mettre à zéro et redistribuer sa valeur sur les autres mois déverrouillés
- Utile pour retirer des mois provisoires ou ajuster le calendrier d'un projet
- Les mois verrouillés (supprimés précédemment dans cette session) sont exclus de la redistribution

**Champ Notes** :

- Chaque version budgétaire annuelle a un champ **Notes** pour les commentaires propres à l'année (ex. : « Reporté au T2 en raison de retards fournisseur »)

**Comment l'utiliser** :

1. Sélectionnez l'année pour laquelle vous planifiez
2. Choisissez le mode Totaux forfaitaires ou Manuel par mois
3. Remplissez les colonnes pertinentes (Budget pour la planification initiale, Suivi pour le pilotage, Atterrissage pour le réalisé)
4. Cliquez sur **Enregistrer** pour conserver vos modifications

**Conseil** : Pour la plupart des postes, le mode forfaitaire est plus rapide. Utilisez le mode manuel par mois lorsque vous devez suivre le calendrier des dépenses d'un projet ou un déploiement par phases.

---

### Ventilations

L'onglet Ventilations répartit la dépense d'investissement entre vos sociétés et départements. Cela alimente les rapports de refacturation et aide à ventiler les coûts d'actifs.

**Sélection d'année** :

- Fonctionne comme le Budget : utilisez les onglets d'année pour basculer entre A-2, A-1, A, A+1, A+2
- Chaque année peut avoir une méthode de ventilation différente

**Méthodes de ventilation** :

1. **Effectif (Par défaut)** : Répartit la dépense d'investissement proportionnellement à l'effectif de chaque société pour l'année sélectionnée. Les pourcentages se mettent à jour automatiquement lorsque vous modifiez les métriques des sociétés. C'est la méthode standard.

2. **Utilisateurs IT** : Répartit la dépense proportionnellement au nombre d'utilisateurs IT de chaque société pour l'année sélectionnée. Utile pour les investissements d'infrastructure IT qui évoluent avec le personnel IT.

3. **Chiffre d'affaires** : Répartit la dépense proportionnellement au chiffre d'affaires de chaque société pour l'année sélectionnée. Utile pour les plateformes ou infrastructures à l'échelle de l'entreprise.

4. **Manuel par société** : Vous sélectionnez les sociétés qui bénéficient de cet investissement. Choisissez un inducteur (Effectif, Utilisateurs IT ou Chiffre d'affaires) pour calculer les pourcentages entre les sociétés sélectionnées. Seules les sociétés sélectionnées entrent dans la répartition. À la première utilisation, le système présélectionne toutes les sociétés actives ; retirez celles qui ne bénéficient pas de cet investissement.

5. **Manuel par département** : Vous sélectionnez des paires société/département spécifiques. Les pourcentages sont calculés à partir de l'effectif de chaque département. Utile lorsqu'un investissement ne bénéficie qu'à certains départements (ex. : équipement de production).

**Méthodes par défaut et méthodes épinglées** :

- L'option **par défaut** -- affichée comme *Effectif (par défaut)* tant que votre organisation n'a pas configuré une autre méthode -- suit le réglage défini dans **Gestion budgétaire > Administration > Méthode de ventilation par défaut**. Chaque investissement laissé sur la valeur par défaut est recalculé lorsqu'un administrateur modifie ce réglage.
- Ce réglage peut également restreindre la valeur par défaut à une **sélection de sociétés** (par exemple l'entité qui porte le budget IT) : l'inducteur ne s'applique alors qu'à ces sociétés, et l'option affiche *Par défaut (n sociétés)*.
- **Effectif**, **Utilisateurs IT** et **Chiffre d'affaires** épinglent cette méthode sur l'investissement : une méthode épinglée continue de fonctionner même si la valeur par défaut de l'organisation change par la suite.
- Les investissements dotés d'une ventilation manuelle ne sont jamais affectés par le réglage par défaut.

**Comment fonctionnent les pourcentages** :

- Pour les **méthodes automatiques** (Effectif, Utilisateurs IT, Chiffre d'affaires) : les pourcentages sont calculés à chaque chargement de page à partir des dernières métriques des sociétés. Vous ne les modifiez pas directement.
- Pour les **méthodes manuelles** : vous choisissez les sociétés ou départements, et le système calcule les pourcentages selon l'inducteur choisi et les métriques actuelles.
- Les pourcentages reflètent les données en temps réel. Si vous mettez à jour l'effectif d'une société, les ventilations se recalculent immédiatement.

**Consulter les ventilations** :

- La grille affiche : Société, Département (le cas échéant), Pourcentage
- Le pourcentage total doit être égal à 100 % ; des avertissements apparaissent si des métriques manquent ou si leur somme est nulle

**Comment l'utiliser** :

1. Sélectionnez l'année
2. Choisissez une méthode de ventilation dans le menu déroulant
3. Si vous utilisez une méthode manuelle, sélectionnez les sociétés ou départements (retirez ceux qui ne bénéficient pas de cet investissement)
4. Cliquez sur **Enregistrer** pour conserver la méthode et la sélection

**Problèmes courants** :

- **Erreur « Métriques manquantes »** : Une ou plusieurs sociétés ont un effectif, un nombre d'utilisateurs IT ou un chiffre d'affaires nul ou manquant pour l'année sélectionnée. Renseignez les métriques dans **Données de référence > Sociétés** (onglet Détails).
- **« Le total n'est pas 100 % »** : Généralement causé par des métriques manquantes. Corrigez les données des sociétés et rechargez les ventilations.

**Conseil** : Utilisez Effectif pour la plupart des postes (c'est le plus simple et il se met à jour automatiquement). Réservez Manuel par société aux investissements qui ne bénéficient qu'à des entités précises (ex. : un datacenter régional). Utilisez Manuel par département pour les investissements très ciblés.

---

### Tâches

L'onglet Tâches vous aide à suivre les actions et relances liées à ce poste CAPEX (ex. : « Sélection fournisseur d'ici le T2 », « Terminer l'installation d'ici juin », « Obtenir l'approbation du conseil »).

**Liste des tâches** :

- Affiche toutes les tâches liées à ce poste CAPEX
- Colonnes : Titre, Statut, Priorité, Date d'échéance, Actions
- Cliquez sur un titre de tâche pour ouvrir l'espace de travail complet de la tâche
- Le filtre par défaut affiche les tâches actives (masque terminées et annulées)

**Filtrage** :

- Cliquez sur l'icône de filtre pour afficher ou masquer les contrôles de filtre
- **Filtre de statut** : Tous, Actifs (masque terminées/annulées) ou un statut précis
- Cliquez sur le bouton de réinitialisation pour effacer les filtres

**Création d'une tâche** :

- Cliquez sur **Ajouter une tâche** pour ouvrir l'espace de travail de création de tâche
- La tâche est automatiquement liée à ce poste CAPEX
- Remplissez le titre, la description, la priorité, le responsable et la date d'échéance dans l'espace de travail de la tâche

**Suppression d'une tâche** :

- Cliquez sur l'icône de suppression dans la colonne Actions
- Confirmez la suppression dans la boîte de dialogue

**Remarques** :

- Les tâches sont des objets indépendants avec leurs propres autorisations (`tasks:member` pour créer/modifier)
- Avoir l'accès manager CAPEX ne donne pas automatiquement les droits de modification de tâches ; vérifiez avec votre admin si vous ne pouvez pas créer de tâches
- Les tâches peuvent aussi être consultées et gérées depuis **Portefeuille > Tâches**, qui affiche toutes les tâches de votre organisation
- Le titre de la dernière tâche apparaît aussi dans la colonne **Tâche** de la liste (masquée par défaut)

**Conseil** : Utilisez les tâches pour capturer les actions identifiées lors de la planification des investissements ou des cycles d'approbation. Définissez des dates d'échéance pour suivre les jalons d'achat et les délais de mise en œuvre.

---

### Relations

L'onglet Relations lie ce poste CAPEX aux objets associés : Projets, Contrats, Contacts, Sites web pertinents et Pièces jointes.

**Projets** :

- Utilisez l'autocomplétion pour lier un ou plusieurs projets
- Cela aide à regrouper les dépenses d'investissement par projet dans les rapports et permet la comptabilité projet
- Retirez un projet en cliquant sur le X de sa puce, puis enregistrez

**Contrats** :

- Utilisez l'autocomplétion pour lier un ou plusieurs contrats
- Une fois lié, le nom du contrat apparaît pour référence rapide
- Un contrat peut aussi être lié à plusieurs postes CAPEX (relation plusieurs-à-plusieurs)
- Retirez un contrat en cliquant sur le X de sa puce, puis enregistrez

**Contacts** :

- Liez des contacts à ce poste CAPEX avec un rôle : **Commercial**, **Technique**, **Support** ou **Autre**
- Cliquez sur **Ajouter** pour sélectionner un contact dans vos données de référence et lui attribuer un rôle
- Les contacts hérités du fournisseur apparaissent avec une puce pleine ; les contacts ajoutés manuellement avec une puce en contour
- Cliquez sur la ligne d'un contact pour ouvrir l'espace de travail du contact
- Retirez un contact en cliquant sur l'icône de suppression dans la colonne Actions

**Sites web pertinents** :

- Ajoutez des URL liées à cet investissement (ex. : pages produit du fournisseur, documentation technique, wikis internes)
- Chaque lien a un champ **Description** optionnel pour le contexte
- Cliquez sur **Ajouter une URL** pour ajouter d'autres liens
- Les liens sont enregistrés lorsque vous cliquez sur **Enregistrer** en haut de l'espace de travail

**Pièces jointes** :

- Téléversez des fichiers liés à ce poste (ex. : devis, propositions fournisseur, spécifications techniques, notes d'approbation)
- Glissez-déposez des fichiers dans la zone de pièces jointes, ou cliquez sur **Sélectionner des fichiers** pour parcourir
- Tous les fichiers sont stockés de manière sécurisée et se téléchargent en cliquant sur leur nom
- Supprimez une pièce jointe en cliquant sur le X de sa puce (nécessite l'autorisation `capex:manager`)
- Les pièces jointes sont enregistrées immédiatement lors du téléversement (pas besoin de cliquer sur Enregistrer)

**Pourquoi lier ?** :

- **Projets** : Consolider les dépenses d'investissement par projet pour la comptabilité et le reporting projet
- **Contrats** : Savoir quels postes d'investissement sont couverts par des contrats d'achat ou de service
- **Contacts** : Garder les coordonnées des fournisseurs et parties prenantes associées à l'investissement
- **Sites web et pièces jointes** : Centraliser toute la documentation et les références de l'investissement pour y accéder facilement

**Conseil** : Téléversez les devis fournisseur, notes d'approbation et spécifications techniques en pièces jointes. Liez les contrats pour suivre les achats. Utilisez les contacts pour associer les interlocuteurs fournisseurs à chaque poste d'investissement.

---

## Import/export CSV

Vous pouvez charger en masse les postes CAPEX via CSV pour accélérer la configuration initiale ou la synchronisation avec des systèmes externes.

**Export** :

1. Cliquez sur **Export CSV** dans la liste CAPEX
2. Choisissez :
   - **Modèle** : En-têtes uniquement (utilisez-le pour créer un CSV vierge à remplir)
   - **Données** : Tous les postes CAPEX actuels avec les budgets pour A-1, A et A+1

**Structure du CSV** :

- Séparateur : point-virgule `;` (pas de virgule)
- Encodage : UTF-8 (enregistrez au format « CSV UTF-8 » dans Excel)
- En-têtes : `item_number;description;ppe_type;investment_type;priority;currency;effective_start;status;disabled_at;notes;company_name;owner_it_email;owner_business_email;analytics_category;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget;y_plus1_revision;y_plus2_budget`
- `disabled_at` est la fin de validité : la date à laquelle le poste s'arrête. Indiquez une date (`2026-12-31`) ou une date avec heure. Laissez vide s'il n'y a pas de fin
- Les anciens fichiers avec une colonne `effective_end` s'importent toujours : sa date alimente la fin de validité lorsque `disabled_at` est vide

**Import** :

1. Cliquez sur **Import CSV** dans la liste CAPEX
2. Téléversez votre fichier CSV (glisser-déposer ou sélecteur de fichiers)
3. Cliquez sur **Vérification** pour valider :
   - Les en-têtes correspondent exactement
   - Les sociétés existent dans votre espace de travail
   - Les champs obligatoires (description, ppe_type, investment_type, priority, currency, effective_start, company_name) sont présents
   - Aucune description en double
4. Examinez le rapport de vérification (il affiche les totaux et jusqu'à 5 exemples d'erreurs)
5. Si tout est correct, cliquez sur **Charger** pour importer

**Remarques importantes** :

- **Clé unique** : Les postes CAPEX sont identifiés par `description`. Si une description existe déjà, elle est **ignorée** (pas de mise à jour).
- **Insertion uniquement** : L'importateur ne crée que de nouveaux postes ; il ne met pas à jour les existants. Utilisez l'interface pour modifier les postes existants.
- **Références** : `company_name` doit correspondre à une Société par nom (insensible à la casse).
- **Type d'immobilisation** : Doit être `hardware` ou `software` (insensible à la casse).
- **Type d'investissement** : Doit être l'un des suivants : `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` (insensible à la casse).
- **Priorité** : Doit être `mandatory`, `high`, `medium` ou `low` (insensible à la casse).
- **Budgets** : Les colonnes budgétaires alimentent les versions A-1, A et A+1. Les montants sont répartis uniformément sur 12 mois (mode forfaitaire).

**Erreurs courantes** :

- **« Société introuvable »** : Créez d'abord la société dans **Données de référence > Sociétés**, puis relancez l'import.
- **« ppe_type invalide »** : Utilisez exactement `hardware` ou `software`.
- **« investment_type invalide »** : Utilisez l'un des 7 types d'investissement valides (voir la liste ci-dessus).
- **« Priorité invalide »** : Utilisez `mandatory`, `high`, `medium` ou `low`.
- **« Devise invalide »** : Utilisez des codes ISO à 3 lettres (USD, EUR, GBP) autorisés dans les paramètres de devise de votre espace de travail.
- **« En-têtes non conformes »** : Téléchargez un modèle récent ; les en-têtes doivent correspondre exactement (ordre compris).

**Conseil** : Commencez par l'export du modèle, remplissez quelques lignes et lancez une vérification pour détecter les erreurs tôt. Corrigez les erreurs dans le CSV et téléversez-le à nouveau jusqu'à ce que la vérification passe, puis chargez.

---

## Statut et cycle de vie

Chaque poste CAPEX a un **statut** (Activé ou Désactivé) et une **Fin de validité** optionnelle qui détermine quand il apparaît dans les rapports et les listes de sélection. C'est la seule date de fin d'un poste.

**Fonctionnement** :

- **Activé** : Le poste est actif et apparaît partout (listes, rapports, ventilations)
- **Fin de validité** : La date à laquelle le poste s'arrête. Laissez-la vide s'il n'y a pas de fin
- Après la fin de validité :
  - Le poste n'apparaît plus dans les listes de sélection pour de nouveaux contrats ou ventilations
  - Il est exclu des rapports pour les années strictement postérieures à la fin de validité
  - Les données historiques restent intactes ; le poste apparaît toujours dans les rapports couvrant les années où il était actif

**Définir le statut** :

- À la création du poste, vous pouvez définir sa **Fin de validité** dans le panneau **Propriétés**
- Ensuite, utilisez la bascule **Activé** ou modifiez la **Fin de validité** dans le panneau **Propriétés**
- Vous pouvez programmer une fin de validité future (utile pour les cessions d'actifs planifiées ou les dates de fin de vie)

**Afficher les postes désactivés** :

- Par défaut, la liste CAPEX n'affiche que les postes **Activés**
- Utilisez la bascule **Afficher : Activé / Désactivé / Tous** pour changer le périmètre

**Désactiver ou supprimer** :

- **Privilégiez la désactivation** : Elle préserve l'historique, garantit la cohérence des rapports et conserve la piste d'audit
- **Supprimez uniquement si** : Le poste a été créé par erreur et n'a ni budget, ni ventilation, ni tâche
- La suppression est protégée : vous ne pouvez pas supprimer un poste qui a des données budgétaires, des ventilations ou des tâches, ou qui est référencé par des contrats

**Conseil** : Utilisez la Fin de validité pour marquer les actifs entièrement amortis ou cédés, ou les projets terminés. Ne supprimez qu'en cas de véritable erreur.

---

## Autorisations

L'accès CAPEX est contrôlé par trois niveaux :

- `capex:reader` -- Consulter la liste CAPEX, ouvrir les postes, voir les budgets et ventilations (lecture seule)
- `capex:manager` -- Créer et modifier les postes CAPEX, mettre à jour les budgets et ventilations, téléverser les pièces jointes, gérer les liens et contacts
- `capex:admin` -- Tous les droits manager plus import CSV, opérations budgétaires (gel, copie, réinitialisation) et suppression en masse

De plus :

- Les tâches ont des autorisations séparées (`tasks:member` pour créer/modifier des tâches sur les postes CAPEX)
- Les utilisateurs avec `tasks:reader` peuvent consulter les tâches mais ne peuvent pas les créer ou les modifier

Si vous ne pouvez pas effectuer une action (ex. : le bouton **Import CSV** est absent), demandez à l'administrateur de votre espace de travail de revoir les autorisations de votre rôle.

---

## Conseils

- **Commencez simple** : Créez les postes avec juste l'essentiel (description, type d'immobilisation, type d'investissement, société), puis ajoutez les budgets et ventilations au fur et à mesure.
- **Utilisez la ventilation par effectif** : Pour la plupart des investissements, Effectif suffit. Réservez les ventilations manuelles aux investissements qui ne bénéficient qu'à des sociétés ou départements spécifiques.
- **Liez les contrats** : Si vous gérez les achats d'investissement via des contrats, liez-les dans l'onglet Relations pour suivre les achats.
- **Téléversez la documentation** : Utilisez les pièces jointes pour stocker les devis fournisseur, notes d'approbation et spécifications techniques avec le poste.
- **Classifiez avec précision** : Utilisez le Type d'investissement et la Priorité de manière cohérente pour permettre une analyse et une priorisation pertinentes des dépenses d'investissement.
- **Maintenez les métriques des sociétés à jour** : Les ventilations dépendent de l'effectif, des utilisateurs IT et du chiffre d'affaires des sociétés. Des métriques obsolètes causent des erreurs de ventilation.
- **Utilisez le CSV pour la configuration en masse** : Si vous migrez depuis un autre système ou avez de nombreux postes d'investissement, commencez par l'import CSV.
- **Désactivez, ne supprimez pas** : Préservez l'historique en désactivant les postes lorsque les actifs sont cédés ou les projets terminés.
- **Vérifiez la ligne de totaux** : Avant de finaliser les budgets d'investissement, vérifiez la ligne de totaux épinglée pour vous assurer que vos dépenses s'additionnent comme prévu.
- **Utilisez les liens profonds** : Cliquez directement sur une colonne de budget ou de ventilation dans la liste pour accéder directement à cet onglet et à cette année.
- **Suivez le calendrier des dépenses** : Pour les gros projets aux dépenses échelonnées, utilisez le mode manuel par mois pour suivre les dépenses par rapport aux jalons du projet.
- **Gelez après la clôture de fin d'année** : Utilisez l'Administration budgétaire pour geler les budgets de l'année précédente une fois le réalisé finalisé, ce qui empêche les modifications accidentelles.
