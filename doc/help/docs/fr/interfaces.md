# Interfaces

Les interfaces documentent les flux de données logiques entre vos applications. Contrairement aux connexions de code directes, une interface représente une intégration métier -- le « pourquoi » et le « quoi » de l'échange de données -- indépendamment de l'implémentation technique. Chaque interface peut avoir plusieurs liaisons spécifiques à un environnement qui définissent les points de terminaison et les configurations réels.

## Premiers pas

Rendez-vous dans **Cartographie SI > Interfaces** pour voir votre registre d'intégration. Cliquez sur **Ajouter une interface** pour créer votre première entrée.

**Champs obligatoires** :

- **ID d'interface** : Un identifiant unique (ex. : `INT-CRM-ERP-001`)
- **Nom** : Un nom descriptif pour l'intégration
- **Objet métier** : Pourquoi cette intégration existe
- **Application source** : D'où proviennent les données
- **Application cible** : Où vont les données
- **Catégorie de données** : Le type de données transférées

**Fortement recommandé** :

- **Processus métier** : Quel processus métier cette interface supporte
- **Cycle de vie** : Statut actuel (Actif, Obsolète, etc.)

**Conseil** : Commencez par documenter vos interfaces de production. Utilisez l'onglet Liaisons et connexions pour ajouter des liaisons spécifiques à chaque environnement une fois l'interface logique définie.

---

## Travailler avec la liste

La grille Interfaces affiche votre registre d'intégration en un coup d'oeil.

**Colonnes par défaut** :

- **ID d'interface** : L'identifiant unique (cliquez pour ouvrir l'espace de travail)
- **Nom** : Nom de l'interface (cliquez pour ouvrir l'espace de travail)
- **Environnements** : Pastilles colorées montrant quels environnements ont des liaisons configurées (ex. : PROD, QA, DEV)
- **App source** : L'application source
- **App cible** : L'application cible
- **Cycle de vie** : Statut actuel
- **Criticité** : Importance métier
- **Créé** : Quand l'enregistrement a été créé

**Colonnes supplémentaires** (via le sélecteur de colonnes) :

- **Processus métier** : Processus métier lié
- **Catégorie de données** : Type de données transférées
- **Contient des PII** : Si l'interface traite des données personnelles
- **Couverture env.** : Nombre d'environnements avec des liaisons
- **Liaisons** : Nombre total de liaisons d'environnement

**Filtrage** :

- Recherche rapide : Recherche dans toutes les colonnes texte
- Filtres de colonnes : Filtrer par cycle de vie, criticité, catégorie de données, processus métier, contient des PII, et plus

**Actions** :

- **Ajouter une interface** : Créer une nouvelle interface (nécessite `applications:manager`)
- **Dupliquer l'interface** : Créer une copie d'une interface sélectionnée (nécessite `applications:manager`). Sélectionnez exactement une ligne pour activer cette action. Une boîte de dialogue vous permet de choisir si vous souhaitez copier les liaisons d'environnement -- voir [Copier des interfaces](#copier-des-interfaces) ci-dessous.
- **Supprimer la sélection** : Supprimer les interfaces sélectionnées (nécessite `applications:admin`). Une option par case à cocher permet de supprimer aussi les liaisons associées ; si elle n'est pas cochée, les interfaces avec des liaisons ne seront pas supprimées.

---

## L'espace de travail des interfaces

Cliquez sur n'importe quelle ligne pour ouvrir l'espace de travail. Il comporte six onglets.

### Vue d'ensemble

L'onglet Vue d'ensemble capture l'identité et le contexte métier de l'interface.

**Ce que vous pouvez modifier** :

- **ID d'interface** : Identifiant unique
- **Nom** : Nom d'affichage
- **Processus métier** : Lien vers un processus métier depuis les données de référence
- **Objet métier** : Description en texte libre de la raison d'être de cette intégration
- **Application source** / **Application cible** : Les applications connectées
- **Catégorie de données** : Le type de données transférées
- **Type de route d'intégration** : Direct ou Via middleware
- **Applications middleware** : Si le type de route est Via middleware, sélectionnez les plateformes middleware impliquées (seules les applications marquées comme ETL/middleware apparaissent ici)
- **Cycle de vie** : Statut actuel
- **Notes de la vue d'ensemble** : Contexte supplémentaire ou résumé

**Conseil** : La catégorie de données et le type de route d'intégration façonnent ce qui est disponible dans les onglets suivants. Définissez-les tôt.

---

### Responsabilité et criticité

Cet onglet documente qui est responsable de l'interface et quelle est son importance.

**Responsables métier** : Les parties prenantes métier redevables de l'intégration. Chaque ligne affiche l'utilisateur, son nom, prénom et intitulé de poste (lecture seule, issus du profil utilisateur). Ajoutez ou supprimez des lignes selon les besoins.

**Responsables IT** : Les membres de l'équipe technique responsables de la maintenance. Même disposition que les responsables métier.

**Criticité et impact** :

- **Criticité** : Critique métier, Haute, Moyenne ou Basse
- **Impact d'une défaillance** : Description en texte libre de ce qui se passe si cette interface tombe en panne

**Sociétés impactées** : Quelles sociétés ou entités juridiques sont affectées par cette interface. Sélectionnez depuis vos données de référence.

---

### Définition fonctionnelle

L'onglet Définition fonctionnelle capture la logique métier de l'intégration.

**Ce que vous pouvez documenter** :

- **Objets métier** : Quelles entités de données sont transférées (texte libre)
- **Cas d'utilisation principaux** : Scénarios principaux que cette interface supporte
- **Règles fonctionnelles** : Règles métier de haut niveau régissant le flux de données
- **Identifiants clés** : Mappings d'identifiants source et destination. Chaque ligne mappe un identifiant source vers un identifiant destination, avec des notes optionnelles. Utilisez cela pour documenter les relations d'ID entre systèmes (ex. : le numéro de matériau SAP correspond à l'ID produit CRM).
- **Dépendances** : Interfaces amont et aval dont ce flux dépend. Sélectionnez d'autres interfaces depuis votre registre.
- **Liens de documentation fonctionnelle** : Ajoutez des URL vers de la documentation externe (Confluence, SharePoint, etc.)
- **Pièces jointes fonctionnelles** : Téléversez directement des documents de spécification

---

### Définition technique

L'onglet Définition technique définit comment l'intégration fonctionne au niveau technique.

**Modèle de legs** : Un tableau définissant les legs du flux de données (Extract, Transform, Load ou Direct). Chaque leg spécifie :

- **Type de leg** : EXTRACT, TRANSFORM, LOAD ou DIRECT
- **De / Vers** : Quel rôle gère chaque étape (App source, App cible ou Middleware)
- **Type de déclencheur** : Ce qui initie ce leg (ex. : planifié, événementiel, manuel)
- **Pattern** : Le pattern d'intégration (ex. : batch, temps réel, pub/sub)
- **Format** : Le format des données (ex. : JSON, XML, CSV, fichier plat)
- **Nom du job** : Un nom de job ou de processus optionnel

Les legs sont des modèles partagés entre tous les environnements. Les points de terminaison et identifiants réels vont dans l'onglet Liaisons et connexions.

**Champs supplémentaires** :

- **Transformations principales (résumé)** : Comment les données sont transformées entre la source et la cible
- **Gestion des erreurs (résumé)** : Comment les erreurs sont gérées et escaladées

**Documentation** :

- **Liens de documentation technique** : Ajoutez des URL vers les spécifications techniques
- **Pièces jointes techniques** : Téléversez des documents techniques

**Conseil** : Si aucun leg n'apparaît, assurez-vous d'avoir sélectionné les applications source et cible ainsi qu'un type de route d'intégration dans l'onglet Vue d'ensemble. Les legs sont générés automatiquement à partir du type de route.

---

### Liaisons et connexions

Cet onglet gère les liaisons spécifiques à chaque environnement. Il présente une matrice d'environnements et de legs, vous permettant de configurer chaque combinaison indépendamment.

**Comment ça fonctionne** :

- Chaque environnement (Prod, Pré-prod, QA, Test, Dev, Sandbox ou personnalisé) peut avoir des liaisons pour chaque leg
- Les environnements sont découverts automatiquement depuis vos instances d'application, ou vous pouvez ajouter des environnements personnalisés
- Cliquez sur une cellule vide pour créer une liaison, ou cliquez sur une existante pour la modifier

**Champs de liaison** :

- **Instance source** / **Instance cible** : Quelles instances d'application utiliser dans cet environnement
- **Statut** : Activé, Désactivé ou En test
- **Point de terminaison source** / **Point de terminaison cible** : Points de terminaison techniques (URL, chemins, noms de files, etc.)
- **Détails du déclencheur** : Configuration de déclencheur spécifique à l'environnement
- **Nom de job env.** : Remplacement du nom de job du modèle pour cet environnement
- **Mode d'authentification** : Comment la liaison s'authentifie
- **URL de supervision** : Lien vers la supervision ou l'observabilité de cette liaison
- **Application outil d'intégration** : Le cas échéant, l'outil d'intégration utilisé
- **Notes env.** : Notes spécifiques à l'environnement

**Liaison aux connexions** : Chaque liaison peut être liée aux connexions d'infrastructure de votre registre de connexions. Cela vous permet de tracer le chemin complet de l'interface logique aux connexions réseau physiques.

---

### Données et conformité

L'onglet Données et conformité capture les informations de protection des données et de sécurité.

**Ce que vous pouvez modifier** :

- **Classification des données** : Niveau de sensibilité (Public, Interne, Confidentiel, Restreint)
- **Contient des PII** : Si des données personnelles sont transférées. Lorsque coché, un champ **Description PII** apparaît pour détailler quelles PII sont incluses.
- **Données typiques** : Description d'un payload de données typique
- **Audit et journalisation** : Comment l'interface est auditée
- **Contrôles de sécurité (résumé)** : Mesures de sécurité en place
- **Résidence des données** : Codes pays ISO à 2 lettres séparés par des virgules où les données circulent (ex. : FR, DE, US)

---

## Copier des interfaces

Il existe deux façons de copier des interfaces dans KANAP :

### Dupliquer l'interface (depuis la page Interfaces)

Utilisez cela lorsque vous souhaitez créer une copie indépendante d'une interface -- typiquement pour créer une interface similaire entre les mêmes applications ou des applications différentes.

1. Sélectionnez une interface dans la grille
2. Cliquez sur **Dupliquer l'interface**
3. Choisissez si vous souhaitez copier les liaisons d'environnement :
   - **Sans liaisons** : Crée une copie propre -- juste la définition de l'interface, les legs, les responsables et les métadonnées
   - **Avec liaisons** : Copie également les liaisons d'environnement, mais efface les détails spécifiques à l'environnement (points de terminaison, authentification, noms de jobs) pour que vous puissiez les configurer de zéro

**Ce qui est copié** :

| Données | Copiées |
|---------|---------|
| Définition de l'interface (nom, apps, type de route) | Oui |
| Legs (extract/transform/load/direct) | Oui |
| Applications middleware | Oui |
| Responsables (métier et IT) | Oui |
| Sociétés impactées | Oui |
| Dépendances | Oui |
| Identifiants clés | Oui |
| Liens (documentation) | Oui |
| Résidence des données | Oui |
| Liaisons | Optionnel |
| Pièces jointes | Non |

**Nommage** : La copie reçoit « - copie » ajouté au nom et à l'ID d'interface.

### Migration de version (depuis le versionnage d'application)

Utilisez cela lors de la mise à niveau d'une application vers une nouvelle version et que vous devez migrer les interfaces vers la nouvelle version. Voir [Applications > Gestion des versions](applications.md#gestion-des-versions) pour les détails.

**Différences clés avec la duplication** :

| Aspect | Duplication | Migration de version |
|--------|-------------|---------------------|
| Objectif | Créer une copie indépendante | Migrer vers une nouvelle version d'app |
| Références app | Inchangées | Mises à jour vers la nouvelle version |
| Références middleware | Inchangées | Mises à jour si l'app est middleware |
| Dépendances* | Copiées | Non copiées |
| Liaisons | Optionnel (instances inchangées) | Optionnel (instances mappées vers la nouvelle app) |
| Cycle de vie | Préservé | Réinitialisé à Proposé |
| Suffixe de nom | « - copie » | « (nouvelle version) » |

*Les dépendances sont les relations d'interfaces amont/aval (ex. : « La synchro commandes doit s'exécuter avant la synchro factures »).

---

## Conseils

- **Documentez le « pourquoi » d'abord** : Concentrez-vous sur l'objet métier avant les détails techniques. Les spécifications techniques peuvent venir après.
- **Utilisez les liaisons d'environnement** : Ne créez pas d'interfaces séparées pour chaque environnement -- utilisez une interface avec plusieurs liaisons.
- **Liez aux processus métier** : Connecter les interfaces aux processus métier aide à l'analyse d'impact.
- **Rendez le middleware explicite** : Si les données transitent par un middleware, modélisez-le explicitement avec le type de route Via middleware pour voir le vrai chemin des données.
- **Utilisez la duplication pour les interfaces similaires** : Lorsque vous créez une nouvelle interface similaire à une existante, utilisez **Dupliquer l'interface** pour copier tous les paramètres, puis modifiez ce qui diffère. Incluez optionnellement les liaisons pour prendre de l'avance sur la configuration des environnements.
- **Suivez les ID inter-systèmes** : Utilisez les identifiants clés dans l'onglet Définition fonctionnelle pour mapper comment les enregistrements sont identifiés entre les systèmes source et cible.
