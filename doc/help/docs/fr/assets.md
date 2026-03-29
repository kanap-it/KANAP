# Actifs

Les actifs documentent votre inventaire d'infrastructure -- serveurs physiques, machines virtuelles, conteneurs, instances cloud et équipements réseau. Liez les actifs aux applications, sites, connexions et enregistrements financiers pour construire une image complète de votre infrastructure IT.

## Premiers pas

Rendez-vous dans **Cartographie SI > Actifs** pour voir votre inventaire d'actifs. Cliquez sur **Ajouter un actif** pour créer votre première entrée.

**Champs obligatoires** :
- **Nom** : Un nom d'actif ou un hostname unique
- **Type d'actif** : Serveur web, base de données, serveur d'application, équipement réseau, etc.
- **Site** : Où l'actif est hébergé (détermine le fournisseur, le type d'hébergement et le pays)

**Fortement recommandé** :
- **Cycle de vie** : Statut actuel (Actif, Obsolète, Retiré, etc.)
- **Environnement** : À quel environnement cet actif appartient (Prod, Pré-prod, QA, etc.)

**Conseil** : Utilisez des conventions de nommage cohérentes qui incluent l'environnement et le rôle (ex. : `prod-web-01`, `dev-db-master`). Lors de la création d'un nouvel actif, le hostname est automatiquement dérivé du nom que vous saisissez.

---

## Travailler avec la liste

La liste des actifs vous donne un aperçu filtrable et triable de chaque actif de votre inventaire.

**Colonnes par défaut** :

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **Nom** | Nom de l'actif (cliquez pour ouvrir l'espace de travail) |
| **Type d'actif** | Le rôle de l'actif (ex. : Machine virtuelle, Serveur physique) |
| **Cluster** | Appartenance à un cluster, ou un badge « Cluster » si cet actif est un cluster |
| **Environnement** | Prod, Pré-prod, QA, Test, Dev, Sandbox |
| **Site** | Où l'actif est hébergé |
| **Hébergement** | Type d'hébergement (dérivé du site) |
| **OS** | Système d'exploitation |
| **Zone réseau** | Segment réseau (dérivé du sous-réseau) |
| **Cycle de vie** | Statut actuel du cycle de vie |
| **Assignations** | Nombre d'assignations d'applications |
| **Créé** | Quand l'enregistrement a été créé |

**Colonnes supplémentaires** (masquées par défaut, disponibles via le sélecteur de colonnes) :
- **Sous-site** : Zone spécifique au sein du site (bâtiment, salle, baie)
- **Mise en production** : Date de mise en production de l'actif
- **Fin de vie** : Date de retrait prévue ou effective

**Filtrage** :

La plupart des colonnes supportent des filtres par jeu de cases à cocher pour un filtrage multi-sélection rapide. Les options de filtre se mettent à jour dynamiquement en fonction des autres filtres actifs et de la recherche, vous ne voyez donc que les valeurs existantes dans le jeu de résultats actuel.

| Colonne | Notes |
|---------|-------|
| Type d'actif | Filtrer par un ou plusieurs types d'actifs |
| Cluster | Inclut « (Pas de cluster) » pour les actifs autonomes |
| Environnement | Prod, Pré-prod, QA, Test, Dev, Sandbox |
| Site | Inclut « (Pas de site) » pour les actifs non assignés |
| Sous-site | Inclut « (Pas de sous-site) » pour les actifs sans sous-site |
| Hébergement | Filtrer par type d'hébergement |
| OS | Filtrer par système d'exploitation |
| Zone réseau | Filtrer par segment réseau |
| Cycle de vie | Filtrer par statut de cycle de vie |

**Conseil** : Combinez les filtres sur plusieurs colonnes pour affiner les résultats. Par exemple, filtrez par Environnement = « Prod » et Cycle de vie = « Actif » pour ne voir que les actifs de production actifs.

**Actions** :
- **Ajouter un actif** : Créer un nouvel actif (nécessite `infrastructure:member`)
- **Import CSV** / **Export CSV** : Opérations en masse (nécessite `infrastructure:admin`)
- **Supprimer la sélection** : Supprimer les actifs sélectionnés (nécessite `infrastructure:admin`)

---

## Clusters

Les actifs peuvent être organisés en clusters :

- **Actif classique** : Une instance d'infrastructure individuelle
- **Cluster** : Un groupe d'actifs agissant comme une seule unité logique

Lors de la création ou de la modification d'un actif, activez **Ce serveur représente un cluster** pour le marquer comme cluster. Les actifs de type cluster peuvent être des points de terminaison dans les connexions, mais les instances d'application doivent être assignées aux hôtes membres, pas au cluster lui-même.

Les membres du cluster sont gérés depuis l'onglet **Technique** de l'espace de travail du cluster.

---

## L'espace de travail des actifs

Cliquez sur n'importe quelle ligne pour ouvrir l'espace de travail. L'en-tête affiche le nom de l'actif, un badge « Cluster » (le cas échéant) et votre position dans la liste (ex. : « 3 sur 47 »). Utilisez les boutons fléchés pour naviguer vers l'actif précédent ou suivant sans revenir à la liste.

### Vue d'ensemble

L'onglet Vue d'ensemble capture l'identité et la localisation de l'actif.

**Ce que vous pouvez modifier** :
- **Nom** : Hostname ou identifiant de l'actif
- **Type d'actif** : Rôle (Serveur web, Base de données, Serveur d'application, etc.)
- **Est un cluster** : Basculer pour marquer cet actif comme un cluster
- **Site** : Lien vers un enregistrement de site (obligatoire). La sélection d'un site remplit automatiquement les champs en lecture seule ci-dessous.
- **Sous-site** : Lorsque le site sélectionné a des sous-sites définis (bâtiments, salles, baies), ce menu déroulant apparaît pour que vous puissiez spécifier exactement où l'actif se trouve au sein du site.
- **Cycle de vie** : Statut actuel (Actif, Obsolète, Retiré, etc.)
- **Date de mise en production** : Quand l'actif est entré en production
- **Date de fin de vie** : Date de retrait prévue ou effective
- **Notes** : Notes libres sur l'actif

**Champs en lecture seule** (dérivés du site sélectionné) :
- **Type d'hébergement** : Sur site, colocation, cloud, etc.
- **Fournisseur cloud / Société d'exploitation** : Pour les sites cloud, affiche le fournisseur cloud ; pour les sites sur site, affiche la société d'exploitation
- **Pays** : Pays du site
- **Ville** : Ville du site

---

### Technique

L'onglet Technique organise l'identité réseau et la configuration en sections logiques.

**Environnement** :
- **Environnement** : Prod, Pré-prod, QA, Test, Dev ou Sandbox

**Sections cluster** :
- Si cet actif **est un cluster** : Affiche le tableau **Membres** listant tous les actifs membres (Nom, Environnement, Statut, Système d'exploitation). Cliquez sur **Modifier les membres** pour ajouter ou retirer des membres via une boîte de dialogue de recherche.
- Si cet actif **n'est pas un cluster** : Affiche l'**Appartenance au cluster** -- à quels clusters cet actif appartient, le cas échéant.

**Identité** :
- **Hostname** : Le hostname réseau de l'actif. Automatiquement pré-rempli à partir du nom de l'actif lors de la création ; vous pouvez le remplacer à tout moment. Obligatoire lorsqu'un domaine est sélectionné.
- **Domaine** : Le domaine Active Directory ou DNS auquel l'actif appartient. Choisissez parmi les domaines configurés dans **Paramètres > Cartographie SI**. Les options système incluent « Workgroup » (autonome) et « N/A » (non applicable).
- **FQDN** : Nom de domaine complet, calculé automatiquement à partir du hostname et du suffixe DNS du domaine. Lecture seule.
- **Alias** : Noms DNS supplémentaires ou alias pour cet actif. Tapez et appuyez sur Entrée pour ajouter.
- **Système d'exploitation** : Type et version de l'OS (ex. : Windows Server 2022, Ubuntu 24.04 LTS). Désactivé pour les clusters -- l'OS est défini par membre. Une fois sélectionné, affiche les dates de fin de support standard et étendu.

**Adresses IP** :

Les actifs supportent plusieurs adresses IP, chacune avec sa propre configuration réseau :

- Cliquez sur **Ajouter une adresse IP** pour ajouter une nouvelle entrée
- **Type** : L'objectif de l'adresse IP (Host, IPMI, Management, iSCSI, ou types personnalisés depuis les Paramètres)
- **Adresse IP** : L'adresse elle-même
- **Sous-réseau** : Sous-réseau de la liste configurée (filtré par le site de l'actif)
- **Zone réseau** : Automatiquement dérivée du sous-réseau sélectionné (lecture seule)
- **VLAN** : Automatiquement dérivé du sous-réseau sélectionné (lecture seule)

Cela vous permet de documenter plusieurs interfaces réseau par actif -- par exemple, un serveur physique avec à la fois une IP host et une adresse de gestion IPMI sur des sous-réseaux différents.

---

### Matériel

*Visible uniquement pour les types d'actifs physiques.*

Suit les détails du matériel physique :
- **Numéro de série**
- **Fabricant**
- **Modèle**
- **Date d'achat**
- **Emplacement baie** (ex. : Rangée A, Baie 12)
- **Unité de baie** (ex. : U1-U4)
- **Notes**

---

### Support

*Visible uniquement pour les types d'actifs physiques.*

Suit les informations de support et de contact fournisseur :
- **Fournisseur** : Sélectionner depuis le répertoire des fournisseurs
- **Contrat de support** : Lien vers un enregistrement de contrat
- **Niveau de support** : Texte libre (ex. : Gold, Silver, 24x7)
- **Expiration du support** : Date d'expiration
- **Notes**

**Contacts de support** : Un tableau où vous pouvez ajouter des contacts depuis le répertoire des contacts, chacun avec un libellé de rôle. Le tableau affiche automatiquement l'e-mail, le téléphone et le mobile de chaque contact.

---

### Relations

L'onglet Relations vous permet de définir comment cet actif se connecte à d'autres enregistrements dans KANAP.

**Relations entre actifs** :
- **Dépend de** : Autres actifs dont celui-ci dépend (ex. : un serveur de base de données)
- **Contient** : Actifs contenus dans celui-ci (ex. : serveurs dans une baie)
- **Contenu par** / **Requis par** : Vues inverses en lecture seule montrant quels autres actifs référencent celui-ci

**Finances** :
- **Postes OPEX** : Lien vers des postes de dépenses opérationnelles
- **Postes CAPEX** : Lien vers des postes de dépenses d'investissement
- **Contrats** : Lien vers des enregistrements de contrats

**Projets** : Lien vers des projets du portefeuille liés à cet actif.

**Sites web pertinents** : Ajoutez des URL avec des descriptions optionnelles -- utile pour les portails fournisseurs, les tableaux de bord de supervision ou les liens de documentation.

**Pièces jointes** : Glissez-déposez des fichiers ou cliquez sur **Sélectionner des fichiers** pour téléverser. Cliquez sur une pastille de pièce jointe pour la télécharger.

---

### Base de connaissances

Attachez des articles de la base de connaissances à cet actif. Si vous avez l'autorisation `knowledge:member`, vous pouvez créer de nouveaux articles directement depuis cet onglet.

---

### Assignations

Consultez et gérez quelles applications fonctionnent sur cet actif. Chaque assignation lie l'actif à une instance d'application (un environnement spécifique d'une application).

**Pour ajouter une assignation** :
1. Cliquez sur **Ajouter une assignation**
2. Sélectionnez une **Application**
3. Choisissez un **Environnement** (instance)
4. Sélectionnez un **Rôle** (depuis la liste des rôles de serveur dans les Paramètres)
5. Optionnellement, définissez une **Date de début** et des **Notes**

Les actifs de type cluster ne peuvent pas héberger d'assignations d'applications -- assignez les hôtes membres à la place.

Chaque ligne d'assignation affiche le nom de l'application (cliquable pour y naviguer), l'environnement, le rôle, la date de début et les notes. Vous pouvez modifier ou supprimer les assignations depuis la colonne d'actions.

---

### Connexions

Une vue en lecture seule de toutes les connexions impliquant cet actif. Chaque ligne affiche :

| Colonne | Ce qu'elle affiche |
|---------|-------------------|
| **ID de connexion** | Lien cliquable vers l'espace de travail de la connexion |
| **Nom** | Nom de la connexion |
| **Topologie** | Serveur à serveur ou Multi-serveur |
| **Protocoles** | Pastilles de protocoles |
| **Source** | Libellé du point de terminaison source |
| **Destination** | Libellé du point de terminaison destination |
| **Cycle de vie** | Statut du cycle de vie de la connexion |

Pour gérer les connexions, rendez-vous dans **Cartographie SI > Connexions**.

---

## Import/export CSV

Maintenez votre inventaire d'actifs à grande échelle grâce à l'import et l'export CSV. Cette fonctionnalité prend en charge les opérations en masse pour le chargement initial de données, les mises à jour périodiques depuis des systèmes externes et l'extraction de données pour le reporting.

### Accéder aux fonctionnalités CSV

Depuis la liste des Actifs :
- **Export CSV** : Télécharger les actifs dans un fichier CSV
- **Import CSV** : Téléverser un fichier CSV pour créer ou mettre à jour des actifs

**Autorisations requises** : `infrastructure:admin` pour les opérations d'import/export.

### Options d'export

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
     - `Upsert` (par défaut) : Créer de nouveaux actifs ou mettre à jour les existants
     - `Mise à jour uniquement` : Ne modifier que les actifs existants, ignorer les nouveaux
     - `Insertion uniquement` : Ne créer que de nouveaux actifs, ignorer les existants

3. **Validez d'abord** : Cliquez sur **Vérification préalable** pour valider votre fichier sans apporter de modifications. Examinez les erreurs et avertissements.

4. **Appliquez les modifications** : Si la validation réussit, cliquez sur **Importer** pour valider les changements.

### Référence des champs

**Champs principaux** :

| Colonne CSV | Description | Obligatoire | Notes |
|-------------|-------------|-------------|-------|
| `id` | UUID de l'actif | Non | Pour les mises à jour ; laisser vide pour les nouveaux actifs |
| `name` | Nom de l'actif | Oui | Utilisé comme identifiant unique pour la correspondance |
| `location_code` | Code du site | Oui | Doit correspondre à un code de site existant |
| `kind` | Type d'actif | Oui | Accepte code ou libellé (ex. : `vm` ou `Virtual Machine`) |
| `environment` | Environnement | Oui | `prod`, `pre_prod`, `qa`, `test`, `dev`, `sandbox` |
| `status` | Statut du cycle de vie | Non | Accepte code ou libellé (ex. : `active` ou `Active`) |
| `is_cluster` | Est-ce un cluster | Non | `true` ou `false` |
| `hostname` | Hostname réseau | Non | |
| `domain` | Domaine DNS | Non | Accepte code ou libellé depuis les Paramètres |
| `aliases` | Alias DNS | Non | Liste séparée par des virgules |
| `operating_system` | Type d'OS | Non | Accepte code ou libellé depuis les Paramètres |
| `cluster` | Appartenance au cluster | Non | Nom du cluster parent |
| `notes` | Notes libres | Non | |

**Champs d'adresse IP** (jusqu'à 4 adresses par actif) :

| Colonne CSV | Description | Notes |
|-------------|-------------|-------|
| `ip_1_type` | Type d'adresse IP | Accepte code ou libellé (ex. : `host` ou `Host IP`) |
| `ip_1_address` | Adresse IP | |
| `ip_1_subnet_cidr` | Sous-réseau en notation CIDR | |
| `ip_2_type` à `ip_4_type` | Types IP supplémentaires | Même schéma pour les emplacements 2-4 |
| `ip_2_address` à `ip_4_address` | Adresses supplémentaires | |
| `ip_2_subnet_cidr` à `ip_4_subnet_cidr` | Sous-réseaux supplémentaires | |

### Acceptation des libellés et codes

Pour les champs configurés dans **Paramètres > Cartographie SI**, vous pouvez utiliser soit le code interne soit le libellé d'affichage :

| Champ | Exemples de codes | Exemples de libellés |
|-------|-------------------|---------------------|
| Type d'actif (`kind`) | `vm`, `physical`, `container` | `Virtual Machine`, `Physical Server`, `Container` |
| Cycle de vie (`status`) | `active`, `inactive`, `decommissioned` | `Active`, `Inactive`, `Decommissioned` |
| Système d'exploitation | `windows_2022`, `ubuntu_24` | `Windows Server 2022`, `Ubuntu 24.04 LTS` |
| Domaine | `corp`, `dmz` | `Corporate Domain`, `DMZ` |
| Type d'adresse IP | `host`, `ipmi`, `mgmt` | `Host IP`, `IPMI`, `Management` |

Le système normalise automatiquement les valeurs lors de l'import, donc `Virtual Machine`, `virtual machine` et `vm` se résolvent tous vers le même type d'actif.

### Correspondance et mises à jour

Les actifs sont identifiés par **nom** (insensible à la casse). Lorsqu'une correspondance est trouvée :
- En mode `Enrichir` : Seules les valeurs CSV non vides mettent à jour l'actif
- En mode `Remplacer` : Tous les champs sont mis à jour, les valeurs vides effacent les données existantes

Si vous incluez la colonne `id` avec un UUID valide, la correspondance utilise d'abord l'ID, puis se rabat sur le nom.

### Champs dérivés

Certains champs sont calculés et ne peuvent pas être importés :
- **Fournisseur** : Automatiquement dérivé du site de l'actif
- **FQDN** : Calculé à partir du hostname + domaine

### Limitations

- **Maximum 4 adresses IP** : Les actifs supportent jusqu'à 4 entrées d'adresse IP via CSV
- **Assignation de cluster par nom** : Utilisez le nom du cluster, pas l'ID, dans la colonne `cluster`
- **Site obligatoire** : Chaque actif doit avoir un code de site valide
- **Relations non incluses** : Les assignations d'applications, connexions, liens financiers et pièces jointes doivent être gérés dans l'espace de travail

### Résolution de problèmes

**Erreur « Le fichier n'est pas correctement formaté »** : Cela indique généralement un problème d'encodage. Assurez-vous que votre CSV est enregistré en **UTF-8** :

- **Dans LibreOffice** : Lors de l'ouverture d'un CSV, sélectionnez `UTF-8` dans le menu déroulant Jeu de caractères (pas « Japanese (Macintosh) » ni d'autres encodages). Lors de l'enregistrement, cochez « Modifier les paramètres de filtre » et choisissez UTF-8.
- **Dans Excel** : Enregistrer sous > CSV UTF-8 (délimité par des virgules), puis ouvrez dans un éditeur de texte pour remplacer les virgules par des points-virgules.
- **Conseil général** : Si vous voyez des caractères illisibles au début de votre fichier, l'encodage est incorrect.

### Exemple CSV

```csv
name;location_code;kind;environment;status;hostname;domain;ip_1_type;ip_1_address
PROD-WEB-01;NYC-DC1;Virtual Machine;prod;Active;prodweb01;corp;Host IP;10.0.1.10
PROD-DB-01;NYC-DC1;vm;prod;active;proddb01;corp;host;10.0.1.20
```

---

## Conseils

- **Nommez de manière cohérente** : Incluez l'environnement, le rôle et la séquence dans les noms d'actifs pour une identification facile.
- **Utilisez les clusters** : Regroupez les actifs apparentés (ex. : cluster web, cluster base de données) pour simplifier la gestion.
- **Suivez le cycle de vie** : Marquez les actifs obsolètes et retirés pour maintenir des comptages d'inventaire précis.
- **Liez aux sites** : Assignez les actifs à des sites pour le reporting géographique et la planification de reprise d'activité.
- **Assignez aux applications** : Liez les actifs aux instances d'applications pour comprendre ce qui fonctionne où.
- **Utilisez l'onglet Relations** : Connectez les actifs aux postes OPEX/CAPEX, contrats et projets pour la visibilité financière.
- **Joignez la documentation** : Téléversez les fichiers de configuration, schémas d'architecture ou documents fournisseur directement sur l'actif.
