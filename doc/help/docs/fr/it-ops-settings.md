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
- Les modifications sont enregistrées automatiquement environ une seconde et demie après votre dernière saisie, dès que toutes les lignes sont valides. Un indicateur d'enregistrement s'affiche à côté de la liste.

Pour les longues listes (plus de 25 lignes), le tableau virtualise les lignes, affichant environ 20 à la fois avec un défilement fluide et des en-têtes fixes.

### Les noms identifient les valeurs

Vous ne voyez et ne saisissez jamais que des **noms**. KANAP génère un code interne stable à partir du nom lors du premier enregistrement d'une valeur et le conserve définitivement : renommer une valeur ne casse donc jamais les enregistrements qui l'utilisent. Ce code est visible des intégrateurs dans l'API et peut être utilisé dans les fichiers CSV, mais l'export CSV écrit les noms et l'import accepte l'un comme l'autre.

Parce que les noms identifient les valeurs, quelques règles s'appliquent au sein d'une liste :

- chaque valeur doit avoir un nom, et deux valeurs ne peuvent pas porter le même nom (la casse n'est pas prise en compte) ;
- un nom ne peut pas être identique au code interne d'une autre valeur de la même liste ;
- les noms des **Méthodes d'accès** ne peuvent contenir ni virgule ni point-virgule, car l'export CSV les regroupe dans une seule cellule séparée par des virgules.

Une liste qui enfreint l'une de ces règles n'est pas enregistrée tant que vous ne l'avez pas corrigée ; la ligne indique ce qui ne va pas.

### Supprimer une valeur

**Supprimer** efface une valeur que rien n'utilise. Lorsque des enregistrements référencent encore la valeur, KANAP indique combien (applications, actifs, interfaces, connexions, sites, incidents, sous-réseaux…), avec un lien vers la liste filtrée lorsqu'une liste peut être filtrée sur ce champ, et propose **Ne plus proposer** à la place : la valeur reste visible sur les enregistrements qui l'utilisent déjà et n'est plus proposée pour les nouveaux. Une valeur utilisée n'est jamais supprimée, même via l'API.

Les valeurs intégrées que KANAP gère lui-même (les quatre statuts de cycle de vie, les domaines Workgroup et N/A) ne peuvent être ni modifiées ni supprimées. Les zones réseau et types d'actifs par défaut peuvent être modifiés et retirés, mais pas supprimés : le serveur les recréerait.

### Traduire vos valeurs

Les valeurs que vous saisissez s'affichent telles quelles dans toutes les langues. Pour les afficher dans la langue de chaque utilisateur, utilisez l'action **Traduire** sur une ligne : la boîte de dialogue présente le nom de base (et la description pour les niveaux de classification) ainsi qu'un champ par langue. Un champ laissé vide utilise la traduction automatique tant que la valeur est encore une valeur par défaut de KANAP, sinon le texte de base. L'enregistrement des traductions ne modifie jamais le texte de base, et un nom traduit peut être utilisé dans les fichiers CSV et l'API au même titre que le nom lui-même ; c'est pourquoi il ne doit pas faire doublon avec une autre valeur de la liste.

Les éditeurs affichent et modifient toujours le texte de base ; lorsque le nom affiché diffère pour votre langue, la ligne l'indique (« Affiché : … »).

---

## Sites

### Fournisseurs cloud

Fournisseurs cloud disponibles pour les Actifs et les Sites de type cloud (ex. : AWS, Azure, GCP).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Vue d'ensemble > Champ **Fournisseur**
- Espace de travail Sites > Onglet Vue d'ensemble > **Fournisseur cloud** (lorsque le type d'hébergement est cloud)

### Types d'hébergement

Modèles d'hébergement des sites (ex. : Sur site, Colocation, Cloud public, Cloud privé, SaaS).

**Colonnes** : Nom, Catégorie (Sur site/Colocation ou Cloud/SaaS), Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Sites > Onglet Vue d'ensemble > Champ **Type d'hébergement**

La catégorie détermine quels champs apparaissent lors de la modification d'un Site :
- **Sur site / Colocation** affiche Société d'exploitation et champs Datacenter
- **Cloud / SaaS** affiche Fournisseur cloud, Région et champs d'informations complémentaires

---

## Serveurs et connexions

### Types de connexion

Un catalogue à deux niveaux de protocoles de connexion organisés par catégorie, avec les ports typiques.

**Colonnes** : Catégorie (ex. : Base de données, Accès distant), Nom, Ports typiques, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Connexions > Sélecteur **Type de connexion**

Le champ **Ports typiques** est en texte libre - vous pouvez saisir des ports uniques (`443`), des listes (`80, 443`), des plages (`9101-9103`), ou des indicateurs comme `multiple` ou `à préciser`.

Les catégories par défaut incluent : Application, Authentification, Sauvegarde, Base de données, Email, Partage de fichiers, Transfert de fichiers, Messagerie, Supervision, Services réseau, Accès distant, Réplication, Stockage, VPN / Tunnel, Générique.

### Domaines

Domaines Active Directory ou DNS auxquels les actifs peuvent appartenir. Utilisés pour calculer le nom de domaine complet (FQDN) de chaque actif.

**Colonnes** : Nom, Suffixe DNS, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Domaine**
- Espace de travail Actifs > Onglet Technique > **FQDN** (auto-calculé depuis hostname + suffixe DNS)

**Entrées système** (ne peuvent pas être modifiées ni supprimées) :
- **Workgroup** - Pour les actifs autonomes non joints à un domaine
- **N/A** - Pour les types d'actifs où l'appartenance au domaine ne s'applique pas (ex. : équipements réseau, baies)

**Comportement de remplissage automatique** : Lors de l'ajout d'un nouveau domaine, le suffixe DNS se remplit automatiquement à partir du nom que vous saisissez, jusqu'à ce que vous le modifiiez vous-même.

**Exemple** : Un domaine nommé « Corporate AD » avec le suffixe DNS `corp.example.com` produirait un FQDN de `hostname.corp.example.com` pour un actif avec le hostname `web-server-01`.

### Entités

Entités source et cible pour les flux de données et les schémas d'accès (ex. : Utilisateurs internes, Internet, Réseaux partenaires, Systèmes externes).

**Colonnes** : Nom, Niveau graphique, Ne plus proposer

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

**Colonnes** : Nom, Ne plus proposer

**Valeurs par défaut** : Host, IPMI, Management, iSCSI

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Section **Adresses IP** > Menu déroulant **Type**

Les actifs peuvent avoir plusieurs adresses IP, chacune avec son propre type. Par exemple, un serveur physique peut avoir :
- Une IP **Host** pour le trafic applicatif
- Une IP **IPMI** pour la gestion hors bande
- Une IP **iSCSI** pour la connectivité réseau de stockage

### Zones réseau

Zones réseau utilisées pour catégoriser les sous-réseaux et décrire la connectivité des actifs (ex. : LAN, DMZ, LAN industriel, WiFi, Cloud public, Invité, Management, Stockage, VPN).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Liste des sous-réseaux > Sélecteur **Zone réseau**
- Espace de travail Actifs > Onglet Technique > **Zone réseau** (auto-remplie lorsqu'un sous-réseau est sélectionné)

### Sous-réseaux

Définissez les sous-réseaux avec la notation CIDR, des assignations VLAN optionnelles et la classification par zone réseau. Chaque sous-réseau appartient à un Site spécifique.

**Colonnes** : Site, CIDR, VLAN (1-4094), Zone réseau, Description, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Sous-réseau**

**Règles de validation** :
- Le CIDR doit être une notation IPv4 valide (ex. : `192.168.1.0/24`)
- Les numéros VLAN doivent être entre 1 et 4094
- Les numéros CIDR et VLAN sont uniques par site (les mêmes valeurs peuvent exister à des sites différents)

**Auto-remplissage** : Lorsque vous sélectionnez un sous-réseau sur un actif, la zone réseau est automatiquement remplie depuis la configuration du sous-réseau.

### Systèmes d'exploitation

Catalogue de systèmes d'exploitation pour les Actifs, incluant les dates de cycle de vie du support.

**Colonnes** : Nom, Date de fin de support standard, Date de fin de support étendu, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Technique > Sélecteur **Système d'exploitation** (le texte d'aide affiche les dates de support)

Les dates sont stockées au format `AAAA-MM-JJ` mais affichées et modifiées au format `JJ/MM/AAAA`.

Les entrées par défaut incluent les versions Windows Server, Ubuntu LTS, RHEL, Debian et SLES avec les dates de support appropriées.

### Rôles de serveur

Rôles assignés aux actifs lors de leur liaison à des instances d'application (ex. : Serveur web, Serveur de base de données, Worker).

**Colonnes** : Nom, Niveau graphique, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Serveurs > Menu déroulant **Rôle** lors de la liaison d'un actif à une instance
- Carte des connexions > Bande de placement dérivée des rôles pour les serveurs et clusters

Exemples par défaut intégrés :
- `web`, `proxy` > **Haut**
- `app`, `cloud-service` > **Supérieur**
- `db` > **Bas**

### Types d'actifs

Types logiques pour les actifs d'infrastructure (ex. : Serveur physique, Machine virtuelle, Conteneur, Serverless, Appliance).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Actifs > Onglet Vue d'ensemble > Champ **Type**

---

## Apps, services et interfaces

### Méthodes d'accès

Méthodes par lesquelles les utilisateurs accèdent aux applications (ex. : Navigateur web, Application mobile, Session VDI).

**Colonnes** : Nom, Ne plus proposer

**Valeurs par défaut** : Web, Application installée localement, Application mobile, IHM propriétaire (interface industrielle), Terminal / CLI, VDI / Bureau distant, Borne

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Technique et support > Champ multi-sélection **Méthodes d'accès**

**Conseil** : Personnalisez les méthodes d'accès pour correspondre à la manière dont votre organisation catégorise l'accès aux applications. Par exemple, ajoutez « Citrix » ou « Client léger » si ce sont des modes d'accès courants dans votre environnement.

### Catégories d'applications

Catégories qui décrivent l'objectif principal de chaque application ou service.

**Colonnes** : Nom, Ne plus proposer

**Valeurs par défaut** : Métier, Productivité, Sécurité, Analytique, Développement, Intégration, Infrastructure

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Vue d'ensemble > Champ **Catégorie**
- Liste Applications > Colonne et filtre **Catégorie**

**Conseil** : Personnalisez les catégories pour correspondre à la terminologie de votre organisation. Par exemple, renommez « Métier » en « Applications métier » si c'est ainsi que votre équipe les désigne.

### Classifications de données

Niveaux de classification des données pour les Applications et Interfaces.

**Colonnes** : Nom, Ne plus proposer

**Codes verrouillés** : Les niveaux intégrés (Public, Interne, Confidentiel, Restreint) ne peuvent pas être supprimés ni rendus obsolètes.

**Où c'est utilisé** :
- Espace de travail Applications > Onglet Conformité > Champ **Classification données**
- Espace de travail Interfaces > Onglet Vue d'ensemble > Champ **Classification données**
- Liste Applications > Colonne **Classification données**

### Classifications et continuité

Cet éditeur configure les niveaux utilisés pour classifier les applications. Il est disponible aux utilisateurs `settings:admin` dans la section **Applications, services et interfaces** et s'ouvre dans une seule boîte de dialogue, avec une liste par catalogue :

- **Criticité business** : les niveaux qu'une application peut recevoir. Chaque niveau a un nom, une description affichée sous le nom au moment du choix, une **durée maximale tolérable d'interruption (DMIA)** facultative en minutes et un indicateur **Ne plus proposer**. La DMIA documente le niveau et déclenche un avertissement sur une application dont le RTO l'atteint ; c'est un attribut du niveau, pas une valeur saisie sur les applications.
- **Criticité cyber** : niveaux de conséquences indépendants.
- **Confidentialité des données** : le catalogue des classes de données, avec descriptions.
- **Vagues de reprise** : étapes ordonnées de restauration ; l'ordre n'est ni une gravité ni une estimation de durée.

**L'ordre est la position dans la liste.** Les catalogues de gravité vont du niveau le plus critique en haut au moins critique en bas ; les vagues de reprise suivent l'ordre de restauration. Utilisez les flèches pour déplacer un niveau ; la position détermine l'ordre de tri des listes, la règle du « niveau le plus élevé » utilisée par les interfaces et les connexions, et l'ordre des menus de sélection. **Ajouter un niveau** ajoute en bas de la liste.

**Modifier le catalogue ne modifie jamais les applications.** Une application enregistre le code de son niveau. Renommer un niveau, modifier sa description ou sa DMIA et réordonner le catalogue laissent chaque application sur le même niveau et n'invalident pas les revues. Un niveau encore utilisé par une application, une interface ou une connexion ne peut pas être supprimé ; marquez-le plutôt **Ne plus proposer** : il reste visible sur les enregistrements existants et n'est plus proposé pour les nouveaux.

Les codes sont générés à partir des noms et ne sont jamais affichés ; les règles de nommage ci-dessus s'appliquent.

Les niveaux business alimentent aussi la criticité opérationnelle des interfaces et des connexions. Les dérivations incomplètes sont signalées comme telles ; elles ne sont pas traitées comme le niveau le plus faible.

### Patterns d'intégration

Patterns d'intégration pour les legs d'interfaces (ex. : API REST, Batch fichier, File d'attente, Staging BDD).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Pattern**

### Modes d'authentification d'interface

Modes d'authentification pour les liaisons d'interfaces (ex. : Compte de service, OAuth2, Clé API, Certificat).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Liaisons d'interfaces > Champ **Mode d'authentification**

### Catégories de données d'interface

Catégories de données métier pour les Interfaces (ex. : Master Data, Transactionnel, Reporting, Contrôle).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Espace de travail Interfaces > Champ **Catégorie de données**

### Formats de données d'interface

Formats de payload pour les legs d'interfaces (ex. : CSV, JSON, XML, IDoc, Binaire).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Format**

### Protocoles d'interface

Protocoles techniques pour les liaisons d'interfaces (ex. : HTTP/REST, gRPC, SFTP, Kafka, Base de données).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Liaisons d'interfaces > Champ **Protocole** (liaisons historiques)

### Types de déclencheur d'interface

Mécanismes de déclenchement pour les legs d'interfaces (ex. : Événementiel, Planifié, Temps réel, Manuel).

**Colonnes** : Nom, Ne plus proposer

**Où c'est utilisé** :
- Legs d'interfaces > Champ **Déclencheur**

### Statuts de cycle de vie

États de cycle de vie partagés pour les Applications, Instances d'applications, Interfaces, Liaisons d'interfaces et Actifs.

**Colonnes** : Nom, Ne plus proposer

**Codes verrouillés** : Les statuts intégrés (Proposé, Actif, Obsolète, Retiré) ne peuvent pas être supprimés ni voir leur code modifié.

**Où c'est utilisé** :
- Applications, Instances d'applications, Interfaces, Liaisons d'interfaces, Actifs > Champs **Statut**

---

## Impact des modifications sur les données existantes

- **Les enregistrements existants conservent leur valeur** - Renommer ne modifie que ce que les utilisateurs voient, pas les données sous-jacentes.
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

- **Alignez les noms avec votre terminologie** - Revoyez les valeurs par défaut et renommez les valeurs pour correspondre à la manière dont votre organisation parle de ces concepts. Les enregistrements conservent leur lien avec la valeur ; seul le nom change.
- **Rendez obsolète progressivement** - Lors de la transition vers une nouvelle valeur, marquez-la comme obsolète plutôt que de la supprimer. Cela préserve les données historiques tout en orientant les utilisateurs vers les nouvelles options.
- **Coordonnez les classifications de données avec la sécurité** - Les modifications des classifications de données doivent être alignées avec vos politiques de sécurité de l'information. Consultez la conformité avant d'ajouter ou renommer les niveaux de classification.
- **Utilisez les ports typiques comme documentation** - Le champ « Ports typiques » des Types de connexion est informatif. Remplissez-le pour aider les utilisateurs à comprendre quels ports chaque type de connexion utilise couramment.
- **Ajustez la lisibilité des cartes avec les niveaux** - Gardez les niveaux graphiques des Entités et Rôles de serveur alignés avec vos couches d'architecture (edge, app, données) pour des dispositions de Carte des connexions plus claires.
