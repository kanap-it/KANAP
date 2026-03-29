# Plans comptables et gestion des comptes

Les plans comptables (CoA) organisent votre structure comptable en regroupant les comptes en ensembles nommés. Chaque société peut être liée à un CoA, ce qui détermine quels comptes sont disponibles lors de l'enregistrement de postes OPEX ou CAPEX.

## Pourquoi utiliser les plans comptables ?

Sans CoA, tous les comptes sont disponibles pour toutes les sociétés, ce qui facilite l'utilisation accidentelle du mauvais compte ou le mélange de normes comptables entre entités. Les plans comptables résolvent ce problème en :

  - **Garantissant la cohérence** : Les sociétés ne voient que les comptes de leur CoA assigné
  - **Supportant plusieurs normes** : Différents pays ou unités métier peuvent utiliser différentes structures de comptes
  - **Simplifiant la sélection** : Les menus déroulants de comptes n'affichent que les comptes pertinents, pas tout votre catalogue
  - **Activant les modèles** : Chargez des ensembles de comptes pré-configurés à partir de modèles spécifiques à chaque pays

**Exemple** : Votre filiale française utilise le PCG français (Plan Comptable Général), tandis que votre entité britannique utilise le UK GAAP. Créez deux CoA -- un pour chaque norme -- et assignez les sociétés en conséquence. Lors de l'enregistrement des dépenses, les utilisateurs voient automatiquement les bons comptes.

## La relation : CoA -> Société -> Comptes

La hiérarchie fonctionne ainsi :

```
Plan comptable (FR-2024)
  -> assigné à
Société (Acme France)
  -> utilisé lors de l'enregistrement
Postes OPEX/CAPEX -> Sélection de compte (filtré aux comptes FR-2024 uniquement)
```

**Points clés** :
  - Un CoA peut être assigné à plusieurs sociétés
  - Chaque société a un CoA
  - Les comptes appartiennent à un CoA
  - Lorsque vous créez/modifiez des postes de dépenses, le menu déroulant des comptes est filtré par le CoA de la société

## Où trouver cette page

- Chemin : **Données de référence > Plans comptables**
- Autorisations :
  - Consultation : `accounts:reader`
  - Créer/modifier des comptes et CoA : `accounts:manager`
  - Import CSV, Export CSV, Suppression : `accounts:admin`

## Travailler avec la liste

La page comporte deux couches : un **sélecteur de CoA** en haut et une **grille de comptes** en dessous.

### Barre de pastilles CoA

Une rangée horizontale de pastilles représente chaque plan comptable. Cliquez sur une pastille pour basculer la grille des comptes vers ce CoA.

- La pastille sélectionnée est remplie ; les autres sont en contour.
- Un badge étoile (**★**) indique le CoA par défaut du pays pour ce CoA.
- Un badge cercle-plus indique le CoA par défaut global.
- Survolez une pastille pour voir le nom du CoA et le nombre de comptes.

Si vous avez l'autorisation `accounts:manager`, deux contrôles supplémentaires apparaissent à droite :

- **Nouveau** : Ouvre la boîte de dialogue **Nouveau plan comptable**.
- **Gérer** : Ouvre le modal **Gérer les plans comptables** pour l'administration.

Lorsqu'aucun CoA n'existe, la barre de pastilles affiche une invitation à créer votre premier plan comptable.

### Résumé du CoA

Sous la barre de pastilles, une ligne de résumé affiche le **code**, le **nombre de comptes**, le **nom** et le **pays** du CoA sélectionné (pour les CoA à portée pays).

### Grille des comptes

La grille affiche les comptes uniquement pour le CoA sélectionné.

**Colonnes par défaut** :
- **N° de compte** : Le numéro de compte. Cliquez pour ouvrir l'espace de travail du compte.
- **Nom** : Le nom du compte. Cliquez pour ouvrir l'espace de travail du compte.
- **N° compte consol.** : Le numéro de compte de consolidation.
- **Nom consol.** : Le nom du compte de consolidation.

**Colonnes supplémentaires** (masquées par défaut, activez via le sélecteur de colonnes) :
- **Nom natif** : Le nom du compte dans la langue locale.
- **Description** : Description du compte.
- **Description consol.** : Description du compte de consolidation.
- **Statut** : Si le compte est activé ou désactivé.
- **Créé** : Horodatage de création du compte.

**Filtrage** :
- Recherche rapide : Recherche dans les colonnes texte visibles.
- Bascule de périmètre par statut : Par défaut **Activé**, affichant uniquement les comptes actifs. Basculez vers **Tous** pour inclure les comptes désactivés.

**Actions** (dans l'en-tête de la page) :
- **Nouveau compte** (`accounts:manager`) : Ouvre un espace de travail de nouveau compte pré-lié au CoA sélectionné.
- **Import CSV** (`accounts:admin`) : Importer des comptes dans le CoA sélectionné.
- **Export CSV** (`accounts:admin`) : Exporter les comptes du CoA sélectionné.
- **Supprimer la sélection** (`accounts:admin`) : Supprimer les lignes de comptes sélectionnées.

## L'espace de travail du compte

Cliquez sur n'importe quelle ligne de la grille des comptes pour ouvrir l'espace de travail du compte.

### Vue d'ensemble

L'espace de travail comporte un seul onglet **Vue d'ensemble** avec un formulaire pour consulter et modifier les champs du compte.

**Ce que vous pouvez modifier** :
- **Plan comptable** : Le CoA auquel ce compte appartient (menu déroulant de tous les CoA de votre espace de travail).
- **Numéro de compte** (obligatoire) : Le numéro du compte.
- **Nom du compte** (obligatoire) : Le nom du compte en anglais (ou votre langue principale).
- **Nom natif (langue locale)** : Le nom du compte dans la langue locale.
- **Description** : Description en texte libre.
- **Numéro de compte de consolidation** : Le numéro de compte de consolidation standardisé.
- **Nom du compte de consolidation** : Le nom de consolidation standardisé.
- **Description du compte de consolidation** : Détails sur la catégorie de consolidation.
- **Statut / Date de désactivation** : Utilisez le champ de cycle de vie pour activer ou désactiver le compte. Définissez une **Date de désactivation** pour planifier quand le compte cesse d'apparaître dans les menus déroulants de sélection.

**Navigation** :
- **Préc. / Suiv.** : Naviguer entre les comptes dans l'ordre actuel de la liste.
- **Enregistrer** : Sauvegarder les modifications (activé lorsque le formulaire a été modifié et que vous avez `accounts:manager`).
- **Réinitialiser** : Annuler les modifications non enregistrées.
- **Fermer** (bouton X) : Retourner à la liste des comptes, en préservant votre sélection de CoA, tri, recherche et filtres.

**Conseil** : Vous avez besoin de `accounts:manager` pour modifier. Les utilisateurs en lecture seule voient une bannière d'information.

## Configurer les plans comptables

### Créer un CoA

Vous pouvez créer un CoA de deux manières :

1. **De zéro** : Choisissez une portée puis créez un CoA vide.
   - **Portée** : `GLOBAL` (pas de pays) ou `PAYS` (nécessite une sélection de pays)
   - Pour la portée `PAYS`, vous pouvez le marquer comme défaut pour ce pays. Un seul défaut par pays existe à la fois.
   - Vous pouvez ensuite charger des comptes via CSV.
2. **À partir d'un modèle** : Chargez un ensemble de comptes pré-configuré maintenu par les administrateurs de la plateforme.
   - Les modèles globaux créent un CoA de portée `GLOBAL` (pas de champ pays).
   - Les modèles pays créent un CoA de portée `PAYS` avec le pays du modèle pré-rempli.

**Champs de la boîte de dialogue de création** :
- **Mode** : Choisissez **Créer de zéro** ou **Copier depuis un modèle**.
- **Modèle** (mode modèle uniquement) : Sélectionnez un modèle depuis le menu déroulant. Les modèles globaux apparaissent comme « ALL -- ... » ; les modèles pays affichent leur code à 2 lettres.
- **Code** (obligatoire) : Un identifiant stable utilisé dans les exports/imports CSV et les liens profonds.
- **Nom** (obligatoire) : Un nom descriptif pour le CoA.
- **Portée** : `Pays` ou `Global`.
- **Pays** (portée pays uniquement) : Sélectionnez un pays depuis la liste.
- **Définir comme défaut pour ce pays** (portée pays uniquement) : Cochez pour faire de ce CoA le défaut pour le pays sélectionné.

En mode modèle, vous pouvez lancer une **Vérification préalable** avant de créer pour voir combien de comptes seront insérés et mis à jour. Puis cliquez sur **Créer** pour finaliser.

**Valeurs par défaut** :
  - Par pays : Vous pouvez marquer un CoA comme défaut pour chaque pays. Les nouvelles sociétés de ce pays sont automatiquement assignées à ce CoA (vous pouvez le changer ensuite dans l'onglet Vue d'ensemble de la société).
  - Repli global : Votre espace de travail peut avoir un CoA par défaut global utilisé pour les pays qui n'ont pas encore de défaut spécifique au pays. Les défauts pays ont la priorité ; le défaut global s'applique partout ailleurs.

### Charger depuis les modèles

Les modèles sont des ensembles de comptes standard gérés par les administrateurs de la plateforme. Ils peuvent être :
  - Spécifiques à un pays (ex. : PCG français, UK GAAP)
  - Globaux (disponibles pour tous les pays)

**Ce qui est copié** : Numéros de comptes, noms, noms natifs (langue locale), descriptions, mappings de consolidation et statut. Les comptes deviennent les vôtres à modifier -- les modifications du modèle de la plateforme n'affecteront pas votre CoA sauf si vous le rechargez explicitement.

**Conseil** : Après avoir chargé un modèle, vous pouvez ajouter des comptes spécifiques à la société, renommer des entrées ou désactiver des comptes inutilisés. Les modèles fournissent un point de départ, pas une structure verrouillée.

### Modèles disponibles

KANAP est livré avec **20 modèles pré-configurés** couvrant 10 normes comptables. Chaque norme existe en deux versions :

- **v1.0 (Simple)** : Un ensemble concentré d'environ 20 comptes pertinents pour l'IT -- licences logicielles, hébergement cloud, cybersécurité, télécom, conseil, coûts de personnel, formation, et plus. Idéal pour les organisations qui veulent un point de départ léger.
- **v2.0 (Détaillé)** : Tout ce qui est dans la v1.0 plus des sous-comptes granulaires supplémentaires (environ 30 comptes). Ajoute des ventilations comme Logiciel acheté vs. développé en interne, Équipement réseau, Licences SaaS vs. perpétuelles, Communications mobiles, Primes IT, Assurance IT, et plus. Idéal pour les organisations qui ont besoin d'un suivi des coûts plus fin.

Les deux versions utilisent des **numéros de compte réels de la norme comptable officielle de chaque pays** et incluent les noms natifs dans la langue locale.

| Code modèle | Pays | Norme | Comptes (v1 / v2) |
|-------------|------|-------|-------------------|
| **IFRS** | Global | International Financial Reporting Standards | 14 / 30 |
| **FR-PCG** | France | Plan Comptable Général | 20 / 31 |
| **DE-SKR03** | Allemagne | Standardkontenrahmen 03 | 20 / 32 |
| **GB-UKGAAP** | Royaume-Uni | UK GAAP | 20 / 31 |
| **ES-PGC** | Espagne | Plan General de Contabilidad | 20 / 31 |
| **IT-PDC** | Italie | Piano dei Conti | 20 / 31 |
| **NL-RGS** | Pays-Bas | Rekeningschema (RGS) | 20 / 31 |
| **BE-PCMN** | Belgique | Plan Comptable Minimum Normalisé | 20 / 31 |
| **CH-KMU** | Suisse | Kontenrahmen KMU | 20 / 31 |
| **US-USGAAP** | États-Unis | US GAAP | 20 / 32 |

**Choisir une version** :

  - Commencez avec la **v1.0** si vous voulez un plan propre et minimal qui couvre les catégories de coûts IT essentielles. Vous pouvez toujours ajouter des comptes plus tard.
  - Choisissez la **v2.0** si votre organisation suit les dépenses IT à un niveau granulaire (ex. : distinguer les abonnements SaaS des licences perpétuelles, ou séparer les salaires IT des primes).

### Consolidation IFRS intégrée

Tous les modèles -- quel que soit le pays -- mappent chaque compte vers l'un des **14 comptes de consolidation IFRS standardisés**. Cela signifie que le reporting au niveau groupe fonctionne sans configuration supplémentaire, même entre différentes normes locales.

| # | Compte de consolidation | Ce qu'il couvre |
|---|-------------------------|-----------------|
| 1000 | Immobilisations corporelles (CAPEX) | Équipement IT physique -- serveurs, postes de travail, matériel réseau |
| 1100 | Immobilisations incorporelles (CAPEX) | Logiciels capitalisés et coûts de développement |
| 1200 | Amortissements | Amortissement du matériel et des logiciels |
| 1300 | Dépréciations et mises au rebut | Dépréciations et dévalorisations d'actifs |
| 2000 | Licences logicielles (OPEX) | Licences perpétuelles, abonnements SaaS, support open-source |
| 2100 | Services cloud et hébergement | IaaS, PaaS, supervision, outils de cybersécurité |
| 2200 | Télécommunications et réseau | Internet, mobile, WAN/LAN |
| 2300 | Maintenance et support | Contrats de maintenance matériel et logiciel |
| 2400 | Conseil IT et services externes | Conseil, intégration de systèmes, prestataires |
| 2500 | Coûts du personnel IT | Salaires, primes, charges sociales, retraites |
| 2600 | Formation et certification | Programmes de formation, certifications, conférences |
| 2700 | IT poste de travail (non capitalisé) | Appareils utilisateurs sous le seuil de capitalisation |
| 2800 | Déplacements et mobilité (projets IT) | Déplacements liés aux projets |
| 2900 | Autres charges d'exploitation IT | Coûts IT divers, assurance cyber |

**Exemple** : Votre filiale française charge **FR-PCG v1.0** et votre filiale allemande charge **DE-SKR03 v1.0**. Les deux utilisent des numéros de compte locaux et des noms natifs différents, mais chaque compte se mappe vers la même structure de consolidation IFRS. Les rapports de niveau groupe s'agrègent sans aucun travail de mapping manuel.

### CoA par défaut global (Provisionnement)

Les nouveaux espaces de travail sont automatiquement provisionnés avec le modèle **IFRS v1.0**. Cela crée un CoA de portée `GLOBAL` contenant les 14 comptes de consolidation IFRS et le définit comme défaut global du tenant, pour que les sociétés puissent l'utiliser immédiatement sans aucune configuration. Vous pouvez modifier ou supprimer les comptes/CoA préchargés plus tard si nécessaire (sous réserve des garde-fous standard).

## Gérer les plans comptables

### Le modal Gérer

Cliquez sur **Gérer** dans la barre de pastilles pour ouvrir le modal d'administration. Le modal comporte deux panneaux :

**Panneau gauche** -- Liste des CoA :
- Affiche tous vos plans comptables avec leurs codes et noms.
- Badges par défaut : **★** pour le défaut pays, cercle-plus pour le défaut global.
- Cliquez sur une ligne pour voir ses détails.

**Panneau droit** -- Détails du CoA :
- **Code** et **Nom**
- **Portée** : `GLOBAL` ou `PAYS`
- **Pays** (pour les CoA à portée pays)
- **Défaut pays** : Oui/Non
- **Défaut global** : Oui/Non
- **Sociétés liées** : Nombre de sociétés assignées à ce CoA
- **Comptes** : Nombre de comptes dans ce CoA

**Actions** (dans la barre d'outils du modal) :
- **Nouveau** (`accounts:manager`) : Ouvre la boîte de dialogue Créer un CoA.
- **Définir comme défaut pays** (`accounts:manager`) : Marquer le CoA à portée pays sélectionné comme défaut pour son pays. Désactivé pour les CoA globaux.
- **Définir comme défaut global** (`accounts:manager`) : Marquer le CoA à portée globale sélectionné comme défaut global. Désactivé pour les CoA pays.
- **Supprimer la sélection** (`accounts:admin`) : Supprimer le CoA sélectionné. La suppression est bloquée si des sociétés le référencent ou si des postes OPEX/CAPEX utilisent ses comptes.

## Comptes de consolidation (Reporting de niveau groupe)

Pour les organisations multi-pays, le travail quotidien se fait en utilisant les plans comptables locaux (PCG français, UK GAAP, HGB allemand, etc.), mais le reporting de niveau groupe nécessite souvent une consolidation vers une norme commune comme **IFRS** ou **US GAAP**.

Les **comptes de consolidation** résolvent ce problème en mappant les comptes locaux vers des comptes de consolidation standardisés.

### Comment ça fonctionne

Chaque compte peut avoir trois champs de consolidation :
  - **Numéro de compte de consolidation** : Le numéro de compte standardisé (ex. : compte IFRS `6200`)
  - **Nom du compte de consolidation** : Le nom standardisé (ex. : `IT Services and Software`)
  - **Description du compte de consolidation** : Détails optionnels sur la catégorie de consolidation

### Pourquoi c'est important

**Opérations quotidiennes** : Les utilisateurs travaillent avec leurs comptes locaux familiers
  - Les utilisateurs français sélectionnent le compte `6061 - Frais postaux`
  - Les utilisateurs britanniques sélectionnent le compte `5200 - Postage and courier`
  - Les utilisateurs allemands sélectionnent le compte `4920 - Portokosten`

**Reporting groupe** : Le système peut consolider les coûts par compte de consolidation
  - Tous les coûts de services IT à travers les pays s'agrègent vers `6200 - IT Services and Software`
  - La direction voit une vue unifiée indépendamment des différences comptables locales
  - Le reporting statutaire par pays utilise toujours les comptes locaux

### Configurer les mappings de consolidation

**Option 1 : Modèles (recommandé)**
Tous les modèles intégrés incluent les mappings de consolidation IFRS sur chaque compte. Chargez n'importe quel modèle pays et les colonnes de consolidation sont déjà remplies -- aucun mapping manuel nécessaire.

**Option 2 : Import CSV**
Lors de l'import de comptes, incluez les champs de consolidation dans votre CSV :

```
coa_code;account_number;account_name;consolidation_account_number;consolidation_account_name;consolidation_account_description
FR-PCG;6061;Frais postaux;6200;IT Services and Software;
UK-GAAP;5200;Postage and courier;6200;IT Services and Software;
DE-HGB;4920;Portokosten;6200;IT Services and Software;
```

**Option 3 : Saisie manuelle**
Modifiez les comptes individuellement et remplissez les champs de consolidation dans l'espace de travail du compte.

### Bonnes pratiques

  - **Utilisez une norme commune** : IFRS est typique pour les groupes européens ; US GAAP pour les sociétés américaines. Tous les modèles intégrés se mappent déjà vers les 14 mêmes comptes de consolidation IFRS
  - **Maintenez un plan de consolidation** : Gardez un document de référence listant vos comptes de consolidation et ce qu'ils représentent. Si vous utilisez les modèles intégrés, les 14 comptes IFRS servent de cette référence
  - **Mappez au bon niveau de granularité** : Ne consolidez pas trop largement (perte d'analyse) ni trop finement (trop complexe)
  - **Impliquez la finance** : Les mappings de comptes de consolidation doivent être alignés avec les exigences de reporting financier de votre groupe
  - **Mettez à jour systématiquement** : Lorsque vous ajoutez des comptes locaux, mappez-les immédiatement vers les comptes de consolidation

## Comptes historiques (support de migration)

Les **comptes historiques** sont des comptes sans `coa_id` (créés avant l'introduction des plans comptables).

**Comment ils fonctionnent** :
  - Les sociétés SANS CoA peuvent utiliser les comptes historiques
  - Les sociétés AVEC un CoA ne peuvent pas utiliser les comptes historiques -- ils sont filtrés automatiquement
  - Les comptes historiques peuvent toujours être migrés via CSV (`coa_code`) et des workflows de réassignation

**Chemin de migration** :
  1. Créez ou chargez des plans comptables pour vos sociétés
  2. Assignez les CoA aux sociétés (dans l'onglet Vue d'ensemble de la société)
  3. Assignez le `coa_id` à vos comptes historiques (via import CSV avec `coa_code` ou modification en masse)
  4. Mettez à jour les postes OPEX/CAPEX existants qui affichent des avertissements « compte obsolète »

**Conseil** : Vous n'avez pas à tout migrer en une fois. Les sociétés sans CoA continuent de fonctionner avec les comptes historiques, permettant une adoption progressive.

## Avertissements de compte obsolète

Lors de la modification de postes OPEX ou CAPEX, vous pourriez voir :

```
Compte obsolète détecté. Le compte sélectionné n'appartient pas au
plan comptable de la société. Veuillez mettre à jour le compte.
```

**Pourquoi cela se produit** :
  - Le compte du poste appartient au CoA « A »
  - La société du poste appartient au CoA « B »
  - Incohérence détectée

**Comment corriger** : Modifiez le poste et sélectionnez un compte du plan comptable actuel de la société. L'avertissement disparaîtra une fois que le compte correspondra au CoA de la société.

## Statut et date de désactivation

Les comptes utilisent la même gestion de cycle de vie que les autres données de référence :

  - **Activé** par défaut
  - Définissez une **Date de désactivation** pour arrêter d'utiliser un compte à partir d'une date spécifique
  - Après la date de désactivation :
      - Le compte n'apparaît plus dans les menus déroulants de sélection pour les nouveaux postes
      - Les données historiques restent intactes ; les postes existants conservent leurs assignations de comptes
      - Les rapports pour les années où le compte était actif l'incluent toujours
  - La grille des comptes affiche par défaut uniquement les comptes **Activés**. Utilisez la bascule de périmètre par statut pour passer à **Tous** et inclure les comptes désactivés.

## Import/export CSV

### Plans comptables

Vous pouvez exporter une liste de vos CoA (avec métadonnées comme code, nom, pays, statut par défaut) mais pas importer directement des CoA via CSV. Créez les CoA via l'interface ou chargez-les depuis des modèles.

### Comptes (endpoint global)

Le CSV global `/accounts` inclut une colonne `coa_code` pour identifier à quel CoA chaque compte appartient.

  - **Export**
      - **Modèle** : en-têtes uniquement (utilisez-le pour préparer les imports)
      - **Données** : tous les comptes avec leurs codes CoA, numéros de comptes, noms, noms natifs, descriptions, mappings de consolidation et statut
  - **Import**
      - Commencez par la **Vérification préalable** (valide la structure, l'encodage, les champs obligatoires, les doublons)
      - Si la vérification est OK, **Charger** applique les insertions/mises à jour
      - **Correspondance** : par `(coa_code, account_number)` dans votre espace de travail
      - **Champs obligatoires** : `coa_code`, `account_number`, `account_name`
      - **Champs optionnels** : `native_name`, `description`, champs de consolidation, `status`

**Schéma CSV** (séparateur point-virgule `;`, UTF-8) :
```
coa_code;account_number;account_name;native_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status
```

### Comptes (portée CoA)

Depuis la page Plans comptables, **Import CSV** et **Export CSV** sont automatiquement limités au CoA actuellement sélectionné.

  - **Export** : comptes de ce CoA (pas besoin de colonne `coa_code`)
  - **Import** : les comptes sont insérés/mis à jour dans ce CoA automatiquement

**Notes** :
  - Utilisez l'**encodage UTF-8** et des **points-virgules** comme séparateurs
  - Le `coa_code` doit correspondre à un plan comptable existant dans votre espace de travail
  - Les numéros de comptes doivent être uniques au sein d'un CoA
  - Valeurs de statut : `enabled` ou `disabled` (par défaut enabled)

## Conseils

  - **Commencez par les modèles** : KANAP est livré avec des modèles pour 9 pays plus IFRS. Chargez-en un au lieu de construire de zéro -- vous obtenez les bons numéros de comptes, noms natifs et mappings de consolidation IFRS directement. Commencez avec la v1.0 (Simple) si vous hésitez ; passez à la v2.0 (Détaillé) si vous avez besoin de plus de granularité.
  - **Un défaut par pays** : Définissez un CoA par défaut pour chaque pays pour que les nouvelles sociétés soient automatiquement assignées à la bonne structure de comptes.
  - **Noms natifs pour la conformité** : Utilisez le champ Nom natif si les réglementations locales exigent les comptes dans la langue locale. Activez la colonne **Nom natif** dans la grille pour voir les deux noms côte à côte.
  - **Migrez progressivement** : Vous n'avez pas à tout convertir en une fois. Les sociétés sans CoA continuent de fonctionner avec les comptes historiques.
  - **Corrigez les comptes obsolètes** : Lorsque vous voyez des avertissements, mettez à jour le compte pour correspondre au CoA actuel de la société. Cela maintient vos données propres pour le reporting.
  - **Désactivez plutôt que supprimer** : Désactiver les comptes préserve l'historique. Ne supprimez que les comptes créés par erreur et jamais utilisés.
  - **Les imports CSV sont additifs** : Importer des comptes en ajoute de nouveaux et met à jour les existants (correspondance par coa_code + account_number). Cela ne supprime pas les comptes absents du fichier.
  - **Les comptes de consolidation sont clés pour les groupes** : Si vous opérez dans plusieurs pays, configurez les mappings de consolidation dès le premier jour. Cela rend le reporting de niveau groupe facile et garde les utilisateurs locaux travaillant avec des comptes familiers.

## Scénarios courants

### Scénario 1 : Organisation multi-pays

Vous avez des filiales en France, au Royaume-Uni et en Allemagne, chacune suivant des normes comptables locales.

**Configuration** :
  1. Chargez trois modèles : **FR-PCG v1.0**, **GB-UKGAAP v1.0**, **DE-SKR03 v1.0** (ou v2.0 pour plus de granularité)
  2. Définissez chacun comme défaut pour son pays
  3. Assignez les sociétés à leurs CoA respectifs
  4. Les nouvelles sociétés obtiennent automatiquement le bon CoA ; la sélection de comptes est filtrée en conséquence
  5. Les mappings de consolidation sont déjà en place -- les rapports de groupe fonctionnent immédiatement

### Scénario 2 : Migration des comptes historiques vers un CoA

Vous avez 50 comptes et 5 sociétés, tous configurés avant l'introduction des plans comptables.

**Étapes de migration** :
  1. Créez un CoA (ex. : `US-GAAP`)
  2. Exportez vos comptes en CSV
  3. Ajoutez une colonne `coa_code` (ex. : `US-GAAP`) à toutes les lignes
  4. Importez le CSV mis à jour (les comptes appartiennent maintenant au CoA)
  5. Assignez le CoA à vos sociétés
  6. Modifiez les postes OPEX/CAPEX affichant des avertissements « compte obsolète »

### Scénario 3 : Changement de CoA d'une société

Votre filiale britannique passe du UK GAAP à l'IFRS.

**Étapes** :
  1. Créez un nouveau CoA : `UK-IFRS` (ou chargez depuis un modèle)
  2. Dans l'onglet Vue d'ensemble de la société, changez le plan comptable vers `UK-IFRS`
  3. Dorénavant, les utilisateurs ne peuvent sélectionner que des comptes de `UK-IFRS`
  4. Les postes OPEX/CAPEX existants conservent leurs anciens comptes mais affichent des avertissements
  5. Mettez à jour les postes selon les besoins (ou laissez les données historiques telles quelles si le reporting le permet)

## Questions fréquentes

**Q : Un compte peut-il appartenir à plusieurs CoA ?**
R : Non. Chaque compte appartient à exactement un CoA (ou aucun pour les comptes historiques). Si vous avez besoin de la même structure de comptes dans plusieurs CoA, chargez le modèle dans chacun ou utilisez l'export/import CSV avec des valeurs de `coa_code` différentes.

**Q : Que se passe-t-il si je supprime un plan comptable ?**
R : La suppression est bloquée si des sociétés le référencent ou si des postes OPEX/CAPEX utilisent ses comptes. Réassignez d'abord les sociétés et mettez à jour les postes, puis vous pouvez supprimer le CoA.

**Q : Puis-je renommer les numéros de comptes ?**
R : Oui, dans l'espace de travail du compte. Changer le numéro de compte met à jour toutes les références dans les postes OPEX/CAPEX automatiquement (l'UUID du compte reste le même en interne).

**Q : Comment voir quelles sociétés utilisent un CoA spécifique ?**
R : Ouvrez **Gérer** sur la page Plans comptables, sélectionnez le CoA et vérifiez **Sociétés liées** dans le panneau de détails.

**Q : Que faire si mon pays n'a pas de modèle ?**
R : KANAP inclut des modèles pour 9 pays (FR, DE, GB, ES, IT, NL, BE, CH, US) plus IFRS comme norme globale. Si votre pays n'est pas couvert, créez un CoA de zéro et ajoutez des comptes manuellement ou via import CSV. Vous pouvez toujours utiliser les numéros de comptes de consolidation IFRS (1000-2900) dans vos mappings de consolidation pour rester compatible avec les modèles intégrés.

**Q : Les mappings de comptes de consolidation sont-ils obligatoires ?**
R : Non, ils sont optionnels. Si vous n'opérez que dans un seul pays ou n'avez pas besoin de consolidation de niveau groupe, vous pouvez laisser ces champs vides. Les comptes de consolidation ne sont nécessaires que pour les organisations multi-pays qui font du reporting de niveau groupe avec une norme différente de leur comptabilité locale.

**Q : Plusieurs comptes locaux peuvent-ils se mapper vers le même compte de consolidation ?**
R : Oui, c'est tout l'intérêt ! De nombreux comptes locaux à travers différents CoA peuvent se mapper vers le même compte de consolidation. C'est ainsi que vous agrégez les coûts de différents pays dans une seule catégorie consolidée.
