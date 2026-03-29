# Paramètres de la Cartographie SI

La page **Paramètres de la Cartographie SI** vous permet de personnaliser les valeurs des menus déroulants utilisés dans toute la Cartographie SI. Ces listes contrôlent les options qui apparaissent lorsque les utilisateurs créent ou modifient des Applications, Interfaces, Actifs, Connexions et Sites. Les modifications ici s'appliquent à tous les utilisateurs de votre espace de travail.

Pour la lisibilité des cartes, les **Entités** et les **Rôles de serveur** incluent également un champ **Niveau graphique** utilisé par le placement basé sur les rôles de la Carte des connexions.

## Où trouver cette page

- Espace de travail : **Cartographie SI**
- Chemin : **Cartographie SI > Paramètres**
- Autorisations :
  - Vous avez besoin au minimum de `settings:reader` pour consulter la page.
  - Vous avez besoin de `settings:admin` pour modifier les valeurs.

Si vous ne voyez pas l'entrée **Paramètres** dans le tiroir de la Cartographie SI, demandez à votre administrateur de vous accorder les autorisations appropriées.

## Organisation de la page

Les paramètres sont regroupés en trois sections repliables :

1. **Sites** - Listes utilisées lors de la création ou modification de Sites.
2. **Serveurs et connexions** - Listes pour les Serveurs, Connexions et données d'infrastructure associées.
3. **Apps, services et interfaces** - Listes utilisées pour les Applications, Instances d'applications, Interfaces et Liaisons.

Chaque liste apparaît comme un panneau extensible. Cliquez sur un en-tête de panneau pour le développer et voir les valeurs. Le contenu de chaque section ne se charge que lorsque vous la développez pour la première fois, ce qui maintient la rapidité de la page même avec de nombreuses listes.

### Contrôles de l'éditeur

Chaque liste possède ses propres contrôles en haut :

- **Ajouter un élément** - Insère une nouvelle ligne en haut de la liste, focalisée et prête à saisir.
- **Enregistrer les modifications** - Enregistre vos modifications sur le serveur. Activé lorsque vous avez des modifications non enregistrées.
- **Réinitialiser** - Revient au dernier état enregistré (pas aux valeurs d'usine).

Pour les longues listes (plus de 25 lignes), le tableau virtualise les lignes, affichant environ 20 à la fois avec un défilement fluide et des en-têtes fixes.

---

## Sites

### Fournisseurs cloud

Fournisseurs cloud disponibles pour les Actifs et les Sites de type cloud (ex. : AWS, Azure, GCP).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Vue d'ensemble > Champ **Fournisseur**
- Espace de travail Sites > Onglet Vue d'ensemble > **Fournisseur cloud** (lorsque le type d'hébergement est cloud)

### Types d'hébergement

Modèles d'hébergement des sites (ex. : Sur site, Colocation, Cloud public, Cloud privé, SaaS).

**Colonnes** : Libellé, Code, Catégorie (Sur site/Colocation ou Cloud/SaaS), Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Sites > Onglet Vue d'ensemble > Champ **Type d'hébergement**

La catégorie détermine quels champs apparaissent lors de la modification d'un Site :
- **Sur site / Colocation** affiche Société d'exploitation et champs Datacenter
- **Cloud / SaaS** affiche Fournisseur cloud, Région et champs d'informations complémentaires

---

## Serveurs et connexions

### Types de connexion

Un catalogue à deux niveaux de protocoles de connexion organisés par catégorie, avec les ports typiques.

**Colonnes** : Catégorie (ex. : Base de données, Accès distant), Libellé, Code, Ports typiques, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Connexions > Sélecteur **Type de connexion**

Le champ **Ports typiques** est en texte libre - vous pouvez saisir des ports uniques (`443`), des listes (`80, 443`), des plages (`9101-9103`), ou des indicateurs comme `multiple` ou `à préciser`.

Les catégories par défaut incluent : Application, Authentification, Sauvegarde, Base de données, Email, Partage de fichiers, Transfert de fichiers, Messagerie, Supervision, Services réseau, Accès distant, Réplication, Stockage, VPN / Tunnel, Générique.

### Domaines

Domaines Active Directory ou DNS auxquels les actifs peuvent appartenir. Utilisés pour calculer le nom de domaine complet (FQDN) de chaque actif.

**Colonnes** : Nom, Code, Suffixe DNS, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Domaine**
- Espace de travail Actifs > Onglet Technique > **FQDN** (auto-calculé depuis hostname + suffixe DNS)

**Entrées système** (ne peuvent pas être modifiées ni supprimées) :
- **Workgroup** - Pour les actifs autonomes non joints à un domaine
- **N/A** - Pour les types d'actifs où l'appartenance au domaine ne s'applique pas (ex. : équipements réseau, baies)

**Comportement de remplissage automatique** : Lors de l'ajout d'un nouveau domaine, les champs Code et Suffixe DNS se remplissent automatiquement à partir du Nom que vous saisissez. Vous pouvez remplacer ces valeurs si nécessaire.

**Exemple** : Un domaine nommé « Corporate AD » avec le suffixe DNS `corp.example.com` produirait un FQDN de `hostname.corp.example.com` pour un actif avec le hostname `web-server-01`.

### Entités

Entités source et cible pour les flux de données et les schémas d'accès (ex. : Utilisateurs internes, Internet, Réseaux partenaires, Systèmes externes).

**Colonnes** : Libellé, Code, Niveau graphique, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Connexions > Champs **Entité source** et **Entité cible**
- Carte des connexions > Les entités apparaissent comme des points de terminaison de flux et utilisent le Niveau graphique pour le placement vertical (les entités par défaut sont Haut)

### Valeurs du Niveau graphique

Le Niveau graphique contrôle la bande verticale préférée dans la Carte des connexions lorsque le **Placement basé sur les rôles** est activé :

- **Haut** : Points de terminaison les plus exposés aux utilisateurs ou externes
- **Supérieur** : Couche applicative/service supérieure
- **Centre** : Couche intermédiaire neutre/par défaut
- **Inférieur** : Infrastructure de support
- **Bas** : Points de terminaison orientés données/stockage

### Types d'adresse IP

Types d'adresses IP pouvant être assignées aux actifs. Utile pour distinguer différentes interfaces réseau comme les IP host, les interfaces de gestion et les réseaux de stockage.

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Valeurs par défaut** : Host, IPMI, Management, iSCSI

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Section **Adresses IP** > Menu déroulant **Type**

Les actifs peuvent avoir plusieurs adresses IP, chacune avec son propre type. Par exemple, un serveur physique peut avoir :
- Une IP **Host** pour le trafic applicatif
- Une IP **IPMI** pour la gestion hors bande
- Une IP **iSCSI** pour la connectivité réseau de stockage

### Zones réseau

Zones réseau utilisées pour catégoriser les sous-réseaux et décrire la connectivité des actifs (ex. : LAN, DMZ, LAN industriel, WiFi, Cloud public, Invité, Management, Stockage, VPN).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Liste des sous-réseaux > Sélecteur **Zone réseau**
- Espace de travail Actifs > Onglet Technique > **Zone réseau** (auto-remplie lorsqu'un sous-réseau est sélectionné)

### Sous-réseaux

Définissez les sous-réseaux avec la notation CIDR, des assignations VLAN optionnelles et la classification par zone réseau. Chaque sous-réseau appartient à un Site spécifique.

**Colonnes** : Site, CIDR, VLAN (1-4094), Zone réseau, Description, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Sous-réseau**

**Règles de validation** :
- Le CIDR doit être une notation IPv4 valide (ex. : `192.168.1.0/24`)
- Les numéros VLAN doivent être entre 1 et 4094
- Les numéros CIDR et VLAN sont uniques par site (les mêmes valeurs peuvent exister à des sites différents)

**Auto-remplissage** : Lorsque vous sélectionnez un sous-réseau sur un actif, la zone réseau est automatiquement remplie depuis la configuration du sous-réseau.

### Systèmes d'exploitation

Catalogue de systèmes d'exploitation pour les Actifs, incluant les dates de cycle de vie du support.

**Colonnes** : Nom, Code, Date de fin de support standard, Date de fin de support étendu, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Système d'exploitation** (le texte d'aide affiche les dates de support)

Les dates sont stockées au format `AAAA-MM-JJ` mais affichées et modifiées au format `JJ/MM/AAAA`.

Les entrées par défaut incluent les versions Windows Server, Ubuntu LTS, RHEL, Debian et SLES avec les dates de support appropriées.

### Rôles de serveur

Rôles assignés aux actifs lors de leur liaison à des instances d'application (ex. : Serveur web, Serveur de base de données, Worker).

**Colonnes** : Libellé, Code, Niveau graphique, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Serveurs > Menu déroulant **Rôle** lors de la liaison d'un actif à une instance
- Carte des connexions > Bande de placement dérivée des rôles pour les serveurs et clusters

Exemples par défaut intégrés :
- `web`, `proxy` > **Haut**
- `app`, `cloud-service` > **Supérieur**
- `db` > **Bas**

### Types d'actifs

Types logiques pour les actifs d'infrastructure (ex. : Serveur physique, Machine virtuelle, Conteneur, Serverless, Appliance).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Vue d'ensemble > Champ **Type**

---

## Apps, services et interfaces

### Méthodes d'accès

Méthodes par lesquelles les utilisateurs accèdent aux applications (ex. : Navigateur web, Application mobile, Session VDI).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Valeurs par défaut** : Web, Application installée localement, Application mobile, IHM propriétaire (interface industrielle), Terminal / CLI, VDI / Bureau distant, Borne

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Technique et support > Champ multi-sélection **Méthodes d'accès**

**Conseil** : Personnalisez les méthodes d'accès pour correspondre à la manière dont votre organisation catégorise l'accès aux applications. Par exemple, ajoutez « Citrix » ou « Client léger » si ce sont des modes d'accès courants dans votre environnement.

### Catégories d'applications

Catégories qui décrivent l'objectif principal de chaque application ou service.

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Valeurs par défaut** : Métier, Productivité, Sécurité, Analytique, Développement, Intégration, Infrastructure

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Vue d'ensemble > Champ **Catégorie**
- Liste Applications > Colonne et filtre **Catégorie**

**Conseil** : Personnalisez les catégories pour correspondre à la terminologie de votre organisation. Par exemple, renommez « Métier » en « Applications métier » si c'est ainsi que votre équipe les désigne.

### Classifications de données

Niveaux de classification des données pour les Applications et Interfaces.

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Codes verrouillés** : Les niveaux intégrés (Public, Interne, Confidentiel, Restreint) ne peuvent pas être supprimés ni rendus obsolètes.

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Conformité > Champ **Classification données**
- Espace de travail Interfaces > Onglet Vue d'ensemble > Champ **Classification données**
- Liste Applications > Colonne **Classification données**

### Patterns d'intégration

Patterns d'intégration pour les legs d'interfaces (ex. : API REST, Batch fichier, File d'attente, Staging BDD).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Pattern**

### Modes d'authentification d'interface

Modes d'authentification pour les liaisons d'interfaces (ex. : Compte de service, OAuth2, Clé API, Certificat).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Liaisons d'interfaces > Champ **Mode d'authentification**

### Catégories de données d'interface

Catégories de données métier pour les Interfaces (ex. : Master Data, Transactionnel, Reporting, Contrôle).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Espace de travail Interfaces > Champ **Catégorie de données**

### Formats de données d'interface

Formats de payload pour les legs d'interfaces (ex. : CSV, JSON, XML, IDoc, Binaire).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Format**

### Protocoles d'interface

Protocoles techniques pour les liaisons d'interfaces (ex. : HTTP/REST, gRPC, SFTP, Kafka, Base de données).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Liaisons d'interfaces > Champ **Protocole** (liaisons historiques)

### Types de déclencheur d'interface

Mécanismes de déclenchement pour les legs d'interfaces (ex. : Événementiel, Planifié, Temps réel, Manuel).

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Déclencheur**

### Statuts de cycle de vie

États de cycle de vie partagés pour les Applications, Instances d'applications, Interfaces, Liaisons d'interfaces et Actifs.

**Colonnes** : Libellé, Code, Indicateur Obsolète

**Codes verrouillés** : Les statuts intégrés (Proposé, Actif, Obsolète, Retiré) ne peuvent pas être supprimés ni voir leur code modifié.

**Où c'est utilisé** :
- Applications, Instances d'applications, Interfaces, Liaisons d'interfaces, Actifs > Champs **Statut**

---

## Impact des modifications sur les données existantes

- **Les enregistrements existants conservent leurs codes stockés** - Changer un libellé ne modifie que ce que les utilisateurs voient, pas les données sous-jacentes.
- **Valeurs obsolètes** :
  - Restent valides pour les enregistrements qui les utilisent déjà.
  - Sont masquées des menus déroulants lors de la création de nouveaux enregistrements.
  - Apparaissent toujours lors de la modification si l'enregistrement utilise déjà cette valeur.
- **Nouvelles valeurs** deviennent immédiatement disponibles dans les menus déroulants concernés et sont validées côté serveur.

Cette approche vous permet de faire évoluer votre taxonomie au fil du temps sans casser les enregistrements existants.

---

## Référence rapide : quelle liste alimente quel champ

| Liste | Où c'est utilisé |
|-------|------------------|
| **Méthodes d'accès** | Applications (Onglet Technique et support > Méthodes d'accès) |
| **Catégories d'applications** | Applications (Catégorie) |
| **Fournisseurs cloud** | Actifs (Fournisseur), Sites (Fournisseur cloud) |
| **Types de connexion** | Connexions (Type de connexion) |
| **Classifications de données** | Applications (Onglet Conformité), Interfaces (Vue d'ensemble), Liste Applications |
| **Domaines** | Actifs (Onglet Technique > Domaine, FQDN) |
| **Entités** | Connexions (Entité source/cible), Carte des connexions (Placement Niveau graphique) |
| **Types d'hébergement** | Sites (Vue d'ensemble) |
| **Patterns d'intégration** | Legs d'interfaces (Pattern) |
| **Modes d'auth. d'interface** | Liaisons d'interfaces (Mode d'auth.) |
| **Catégories de données d'interface** | Interfaces (Catégorie de données) |
| **Formats de données d'interface** | Legs d'interfaces (Format) |
| **Protocoles d'interface** | Liaisons d'interfaces (Protocole) |
| **Types de déclencheur d'interface** | Legs d'interfaces (Déclencheur) |
| **Types d'adresse IP** | Actifs (Onglet Technique > Adresses IP > Type) |
| **Statuts de cycle de vie** | Applications, Instances, Interfaces, Liaisons, Actifs |
| **Zones réseau** | Sous-réseaux (Zone réseau), Actifs (auto-rempli depuis le sous-réseau) |
| **Systèmes d'exploitation** | Actifs (Onglet Technique) |
| **Sous-réseaux** | Actifs (Onglet Technique > Adresses IP > Sélecteur de sous-réseau) |
| **Rôles de serveur** | Applications > Onglet Serveurs (rôle lors de la liaison actif-app), Carte des connexions (Placement Niveau graphique) |
| **Types d'actifs** | Actifs (Vue d'ensemble > Type) |

---

## Conseils

- **Alignez les libellés avec votre terminologie** - Revoyez les valeurs par défaut et renommez les libellés pour correspondre à la manière dont votre organisation parle de ces concepts. Les codes restent les mêmes ; seul le texte d'affichage change.
- **Rendez obsolète progressivement** - Lors de la transition vers une nouvelle valeur, marquez-la comme obsolète plutôt que de la supprimer. Cela préserve les données historiques tout en orientant les utilisateurs vers les nouvelles options.
- **Coordonnez les classifications de données avec la sécurité** - Les modifications des classifications de données doivent être alignées avec vos politiques de sécurité de l'information. Consultez la conformité avant d'ajouter ou renommer les niveaux de classification.
- **Utilisez les ports typiques comme documentation** - Le champ « Ports typiques » des Types de connexion est informatif. Remplissez-le pour aider les utilisateurs à comprendre quels ports chaque type de connexion utilise couramment.
- **Ajustez la lisibilité des cartes avec les niveaux** - Gardez les niveaux graphiques des Entités et Rôles de serveur alignés avec vos couches d'architecture (edge, app, données) pour des dispositions de Carte des connexions plus claires.
