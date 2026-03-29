# Applications

Applications est votre registre central pour documenter le paysage applicatif IT. Il couvre les applications métier, les outils de productivité, les services d'infrastructure et tout ce qui se trouve entre les deux. Utilisez-le pour suivre la responsabilité, les environnements, les intégrations et les informations de conformité sur l'ensemble de votre portefeuille.

## Catégories d'applications

Chaque application ou service appartient à une **catégorie** qui décrit son objectif principal. Cette classification aide les différentes parties prenantes à filtrer et se concentrer sur ce qui les concerne.

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **Métier** | Applications métier de base qui supportent des processus métier spécifiques | SAP, Salesforce, Workday, ERP sur mesure |
| **Productivité** | Outils du quotidien pour les utilisateurs, incluant utilitaires et collaboration | Office 365, Acrobat Reader, Teams, Slack, Chrome |
| **Sécurité** | Outils de protection des systèmes, données et accès | CrowdStrike, Okta, plateformes SIEM, pare-feux |
| **Analytique** | Reporting, intelligence métier et outils d'entrepôt de données | Power BI, Tableau, Snowflake |
| **Développement** | Outils utilisés par les développeurs et équipes DevOps | Python, Git, Jenkins, VS Code, Docker |
| **Intégration** | Plateformes qui connectent les systèmes et déplacent les données | MuleSoft, Kafka, passerelles API, outils ETL |
| **Infrastructure** | Services fondamentaux dont dépendent les autres systèmes | PostgreSQL, Redis, Kubernetes, systèmes de stockage |

**Conseils de classification** :
- Choisissez en fonction de l'**objectif principal** de l'application, pas de qui la gère
- En cas de doute, demandez-vous : « À quoi cet outil sert-il principalement ? »
- Les catégories peuvent être personnalisées dans **Cartographie SI > Paramètres** pour correspondre à la terminologie de votre organisation

### Filtrage par partie prenante

Les différentes équipes peuvent utiliser les catégories pour se concentrer sur leur domaine de responsabilité :

| Partie prenante | Filtre suggéré |
|-----------------|---------------|
| Cybersécurité | Catégorie Sécurité, ou criticité élevée dans toutes les catégories |
| Service Desk | Productivité + Métier (applications utilisateur) |
| Infrastructure | Infrastructure + Intégration |
| Architecture d'entreprise | Toutes les catégories |

---

## Premiers pas

Rendez-vous dans **Cartographie SI > Applications** pour voir votre liste. Cliquez sur **Nouvelle app / Service** pour créer votre première entrée.

**Champs obligatoires** :
  - **Nom** : Un nom reconnaissable pour l'application ou le service
  - **Catégorie** : L'objectif principal de cette application (voir les catégories ci-dessus)

**Fortement recommandé** :
  - **Fournisseur** : Le fournisseur du logiciel (lié à vos données de référence Fournisseurs)
  - **Criticité** : Importance pour votre métier (Critique métier, Haute, Moyenne, Basse)
  - **Cycle de vie** : Statut actuel (Actif, Proposé, Obsolète, Retiré)
  - **Catégorie** : L'objectif principal de l'application (Métier, Productivité, Sécurité, etc.)

**Optionnel mais utile** :
  - **Éditeur** : L'éditeur du logiciel (ex. : Microsoft, SAP, Oracle)
  - **Description** : Ce que fait cette application
  - **Version** : Numéro de version actuel (ex. : « 4.2.1 », « 2023 », « Q1 2024 »)
  - **Date de mise en production** / **Fin de support** / **Date de retrait** : Dates du cycle de vie de la version
  - **Licences** : Conditions de licence et notes
  - **Notes** : Notes internes libres

Une fois enregistré, l'espace de travail déverrouille tous les onglets pour une documentation détaillée.

**Conseil** : Commencez par documenter vos applications les plus critiques. Utilisez l'onglet **Instances** pour capturer les environnements existants (Prod, QA, Dev), puis liez les actifs et les interfaces au fur et à mesure.

---

## Travailler avec la liste

La grille Applications offre une vue complète de votre portefeuille applicatif.

**Filtre de périmètre en haut** :
  - **Mes apps** (par défaut) : affiche les apps où vous êtes listé dans **Responsabilité et audience** comme **Responsable métier** ou **Responsable IT**. Les entrées multi-responsables sont supportées.
  - **Apps de mon équipe** : affiche les apps où tout membre de votre équipe Portefeuille est listé comme Responsable métier ou Responsable IT. Votre propre responsabilité est aussi incluse dans ce périmètre.
  - **Toutes les apps** : affiche la grille complète des Applications (avec le comportement de filtre par défaut du cycle de vie).
  - Si vous n'êtes pas assigné à une équipe Portefeuille, **Apps de mon équipe** est désactivé
  - Votre sélection est mémorisée entre les sessions -- revenir sur la page restaure votre dernier choix

**Colonnes par défaut** :
  - **Nom** : Nom de l'application avec badge de catégorie et appartenance à une suite
  - **Catégorie** : L'objectif principal de l'application (Métier, Productivité, etc.)
  - **Environnements** : Pastilles montrant les environnements actifs (Prod, Pré-prod, QA, Test, Dev, Sandbox)
  - **Cycle de vie** : Statut actuel
  - **Criticité** : Niveau d'importance métier
  - **Éditeur** : Éditeur du logiciel
  - **Utilisateurs dérivés (A)** : Nombre d'utilisateurs calculé pour l'année en cours
  - **Créé** : Quand l'enregistrement a été créé

**Tri par défaut** :
  - **Nom** croissant (A à Z)

**Colonnes supplémentaires** (via le sélecteur de colonnes) :
  - **Suites** : Suites parentes auxquelles cette application appartient
  - **Fournisseur** : Nom du fournisseur lié
  - **Responsables métier** / **Responsables IT** : Responsables assignés
  - **Hébergement** : Dérivé des sites des serveurs assignés aux instances de l'app
  - **Exposition externe** : Si l'app est accessible depuis Internet
  - **SSO activé** / **MFA activé** : Fonctionnalités d'authentification
  - **Intégration de données / ETL** : Si l'app participe à des intégrations de données
  - **Postes OPEX** / **Postes CAPEX** / **Contrats** : Dépenses et contrats liés
  - **Composants** : Applications enfants (si c'est une suite)
  - **Classification données** / **Contient des PII** / **Résidence des données** : Informations de conformité

**Filtrage** :
  - Catégorie, Environnements, Cycle de vie, Criticité, Hébergement, Exposition externe, SSO activé, MFA activé, Classification données et Contient des PII utilisent des filtres par jeu de cases à cocher
  - Le filtre flottant affiche `Tous`, `Aucun` ou `N sélectionnés` avec un **x** pour effacer
  - Les applications retirées sont masquées par défaut ; utilisez le filtre Cycle de vie pour inclure les applications retirées

**Actions** :
  - **Nouvelle app / Service** : Créer une nouvelle entrée (nécessite l'autorisation manager)
  - **Import CSV** : Import en masse depuis un fichier CSV (nécessite l'autorisation admin)
  - **Export CSV** : Exporter la liste en CSV (nécessite l'autorisation admin)
  - **Copier l'élément** : Dupliquer une application sélectionnée avec toutes ses relations (nécessite l'autorisation manager)
  - **Supprimer la sélection** : Supprimer les applications sélectionnées (nécessite l'autorisation admin)

---

## L'espace de travail des applications

Cliquez sur n'importe quelle ligne de la liste pour ouvrir l'espace de travail. Il comporte neuf onglets :

### Vue d'ensemble

L'onglet Vue d'ensemble capture l'identité principale de votre application.

**Ce que vous pouvez modifier** :
  - **Nom** : Le nom d'affichage de l'application
  - **Description** : Ce que fait cette application
  - **Catégorie** : L'objectif principal de l'application (configurable dans les Paramètres de la Cartographie SI)
  - **Fournisseur** : Lien vers un fournisseur depuis vos données de référence
  - **Éditeur** : L'éditeur du logiciel
  - **Criticité** : Critique métier, Haute, Moyenne ou Basse
  - **Cycle de vie** : Statut actuel (configurable dans les Paramètres de la Cartographie SI)
  - **Peut avoir des apps enfants** : Activez cette option pour utiliser cette application comme une « suite » regroupant d'autres applications
  - **Licences** : Conditions de licence et notes
  - **Notes** : Notes libres

**Informations de version** (affichées dans une section séparée) :
  - **Version** : Identifiant de la version actuelle (texte libre, ex. : « 4.2.1 », « 2023 »)
  - **Date de mise en production** : Quand cette version a été ou sera mise en service
  - **Fin de support** : Quand le support éditeur prend fin pour cette version
  - **Date de retrait** : Quand cette version a été effectivement mise hors service

**Historique des versions** : Si cette application a été créée à partir d'une autre version (via la fonctionnalité **Créer une nouvelle version**), une chronologie des versions apparaît en haut de l'onglet Vue d'ensemble. Cliquez sur n'importe quelle pastille de version pour y naviguer.

**Appartenance à une suite** : Si une application appartient à une suite, vous verrez le badge de suite dans la liste. La bascule « Peut avoir des apps enfants » est désactivée lorsqu'une application appartient à une suite parente -- retirez d'abord la relation de suite pour la réactiver.

---

### Instances

L'onglet Instances documente où votre application fonctionne dans les différents environnements.

**Environnements** (par ordre) : Production, Pré-prod, QA, Test, Dev, Sandbox

**Pour chaque instance, vous pouvez capturer** :
  - **URL de base** : L'URL d'accès pour cet environnement
  - **Région** / **Zone** : Informations de déploiement géographique
  - **Cycle de vie** : Statut spécifique à l'instance (Actif, Obsolète, etc.)
  - **SSO activé** / **MFA supporté** : Capacités d'authentification
  - **Statut** : Activé ou Désactivé
  - **Notes** : Notes spécifiques à l'environnement

**Actions en masse** :
  - **Copier depuis Prod** : Créer rapidement des instances pour d'autres environnements basées sur votre configuration Production
  - **Application en masse** : Appliquer des modifications à plusieurs environnements à la fois

**Conseil** : Les modifications d'instances sont enregistrées immédiatement -- pas besoin de cliquer sur le bouton Enregistrer principal.

---

### Serveurs

L'onglet Serveurs affiche quels actifs d'infrastructure supportent chaque instance d'application.

**Comment ça fonctionne** :
  - Sélectionnez un environnement pour voir ses assignations d'actifs
  - Ajoutez des actifs en utilisant le bouton **Ajouter un serveur**
  - Chaque assignation capture l'**Actif**, le **Rôle** (ex. : Web, Base de données, Application) et des **Notes** optionnelles
  - Cliquez sur un nom d'actif pour naviguer vers l'espace de travail de l'actif

**Conseil** : Assurez-vous que vos actifs sont documentés dans la page Actifs d'abord, puis liez-les ici.

---

### Interfaces

L'onglet Interfaces affiche toutes les intégrations auxquelles cette application participe -- en tant que source, cible ou middleware.

**Ce que vous verrez** :
  - Les interfaces regroupées par environnement (Prod, Pré-prod, QA, etc.)
  - Pour chaque interface : **Nom**, **Application source**, **Application cible** et indicateur **Via middleware**
  - Cliquez sur n'importe quel nom d'interface ou d'application pour naviguer vers son espace de travail

**Conseil** : Les interfaces sont gérées depuis la page Interfaces. Cet onglet fournit une vue pratique en lecture seule de toutes les intégrations impliquant cette application.

---

### Responsabilité et audience

L'onglet Responsabilité et audience documente qui est responsable et qui utilise cette application.

**Responsables métier** : Les parties prenantes métier redevables de cette application
  - Ajoutez plusieurs responsables ; chacun affiche son intitulé de poste

**Responsables IT** : Les membres de l'équipe IT responsables du support technique
  - Ajoutez plusieurs responsables ; chacun affiche son intitulé de poste

**Audience** : Quelles parties de votre organisation utilisent cette application
  - Sélectionnez une **Société** et optionnellement un **Département**
  - Le système calcule le nombre d'utilisateurs basé sur vos métriques de données de référence (Utilisateurs IT ou Effectif)
  - Ajoutez plusieurs lignes pour capturer toutes les audiences

**Nombre d'utilisateurs** : Choisissez entre :
  - **Dérivé** : Calculé automatiquement à partir des sélections d'audience
  - **Manuel** : Saisie d'un nombre spécifique

---

### Technique et support

L'onglet Technique et support capture les détails techniques et les contacts de support.

**Informations techniques** :
  - **Suites** : Suites parentes auxquelles cette application appartient
  - **Méthodes d'accès** : Comment les utilisateurs accèdent à cette application (multi-sélection). Les options sont configurables dans les [Paramètres de la Cartographie SI](it-ops-settings.md#methodes-dacces). Les options par défaut incluent :
    - Web
    - Application installée localement
    - Application mobile
    - IHM propriétaire (interface industrielle)
    - Terminal / CLI
    - VDI / Bureau distant
    - Borne
  - **Exposition externe** : Si l'application est accessible depuis Internet
  - **Intégration de données / ETL** : Si l'application participe à des pipelines d'intégration de données

**Informations de support** :
  - Ajoutez des contacts de support avec leur **Rôle** (ex. : Responsable commercial, Support technique)
  - Les contacts sont liés depuis vos données de référence Contacts
  - Chaque contact affiche son **E-mail**, **Téléphone** et **Mobile**
  - **Notes de support** : Notes libres sur les arrangements de support

---

### Relations

L'onglet Relations lie cette application à vos données financières, contractuelles et projet.

**Liens disponibles** :
  - **Postes OPEX** : Coûts récurrents associés à cette application
  - **Postes CAPEX** : Projets de dépenses d'investissement
  - **Contrats** : Contrats fournisseurs
  - **Projets** : Projets du portefeuille liés à cette application
  - **Sites web pertinents** : Liens et documentation externes
  - **Pièces jointes** : Téléversez des fichiers par glisser-déposer ou sélecteur de fichiers. Téléchargez en cliquant sur la pastille du fichier.

**Si c'est une suite** :
  - Vous verrez également une section **Composants** listant les applications enfants
  - Gérez les applications enfants en activant « Peut avoir des apps enfants » dans l'onglet Vue d'ensemble

---

### Base de connaissances

L'onglet Base de connaissances connecte cette application à la base de connaissances de votre organisation. Vous pouvez lier des documents existants ou en créer de nouveaux directement depuis l'espace de travail.

C'est utile pour attacher des runbooks, des décisions d'architecture, des procédures opérationnelles ou toute documentation interne liée à l'application.

**Conseil** : Les documents de la base de connaissances sont partagés dans toute l'organisation. En lier un ici ne restreint pas sa visibilité -- cela crée simplement une référence croisée pratique.

---

### Conformité

L'onglet Conformité capture les informations de protection des données et de réglementation.

**Ce que vous pouvez modifier** :
  - **Classification données** : Niveau de sensibilité (Public, Interne, Confidentiel, Restreint)
  - **Dernier test PRA** : Date du test de reprise d'activité le plus récent
  - **Contient des PII** : Si l'application stocke des données personnelles identifiables
  - **Résidence des données** : Pays où les données sont stockées (multi-sélection)

**Conseil** : Les classifications de données sont configurables dans **Cartographie SI > Paramètres**. Personnalisez-les pour correspondre à la politique de classification des données de votre organisation.

---

## Gestion des versions

KANAP propose **deux approches pour gérer les versions d'applications**, selon la manière dont votre organisation gère les mises à niveau :

| Approche | Idéale pour | Ce qui se passe |
|----------|-------------|-----------------|
| **Simple** | La plupart des applications | Mettez à jour les champs de version en place -- même enregistrement, nouveau numéro de version |
| **Avancée** | Migrations majeures | Créez un nouvel enregistrement d'application avec suivi de lignée -- exécutez ancienne et nouvelle versions côte à côte |

### Suivi de version simple (mise à jour en place)

Pour la plupart des applications -- où vous mettez à niveau et l'ancienne version disparaît simplement -- mettez à jour les champs de version dans l'onglet **Vue d'ensemble** :
  - **Version** : Saisissez la version actuelle (ex. : « 4.2.1 », « 2023 », « Q1 2024 »)
  - **Date de mise en production** : Quand cette version a été ou sera mise en service
  - **Fin de support** : Quand le support éditeur prend fin
  - **Date de retrait** : Quand vous avez effectivement mis hors service cette version

Cette approche garde tout dans un seul enregistrement. Lors d'une mise à niveau, mettez à jour les champs de version et c'est fait. L'historique est suivi dans le journal d'audit.

**À utiliser quand** : les mises à niveau se font en place sans chevauchement -- une version remplace l'autre.

### Créer une nouvelle version (migrations parallèles)

Pour les mises à niveau majeures d'applications où vous devez exécuter les anciennes et nouvelles versions en parallèle dans différents environnements (ex. : SAP S/4HANA 1909 en Prod alors que 2023 est en QA), utilisez la fonctionnalité **Créer une nouvelle version** :

1. Ouvrez l'application que vous souhaitez mettre à niveau
2. Enregistrez les modifications en attente (le bouton est désactivé si vous avez des modifications non enregistrées)
3. Cliquez sur **Créer une nouvelle version** dans l'en-tête
4. Complétez l'assistant en trois étapes :
   - **Étape 1 - Détails de la version** : Saisissez le nouveau nom d'application, la version et les dates
   - **Étape 2 - Options de copie** : Choisissez ce qui doit être copié depuis la source (responsables, sociétés, départements, etc.)
   - **Étape 3 - Interfaces** : Sélectionnez les interfaces à migrer vers la nouvelle version
5. Cliquez sur **Créer la version**

La nouvelle version est créée comme une application séparée avec :
  - Un cycle de vie **Proposé** (prête à être configurée avant la mise en production)
  - Un lien vers le prédécesseur (affiché dans la chronologie des versions)
  - Les données copiées selon vos sélections
  - Les interfaces dupliquées pointant vers la nouvelle version

### Chronologie des versions

Lorsqu'une application a une lignée de versions (prédécesseur ou successeurs), une chronologie des versions apparaît en haut de l'onglet **Vue d'ensemble** :

  - Chaque version apparaît sous forme de pastille avec son numéro de version
  - La version actuelle est mise en surbrillance
  - Les versions retirées apparaissent avec un style barré
  - Cliquez sur n'importe quelle pastille pour naviguer vers cette version

### Ce qui est copié

Lors de la création d'une nouvelle version, vous pouvez choisir de copier :
  - **Responsables** (Métier et IT)
  - **Sociétés** (Audience)
  - **Départements**
  - **Résidence des données**
  - **Liens** (Documentation)
  - **Contacts de support**
  - **Postes OPEX/CAPEX** - activé par défaut
  - **Contrats** - activé par défaut
  - **Instances** (Environnements) - optionnel, désactivé par défaut
  - **Liaisons** (connexions d'environnement) - optionnel, disponible uniquement lorsque Instances est sélectionné

**Non copié** (à configurer de zéro) :
  - Appartenance à une suite
  - Pièces jointes
  - Assignations d'actifs

### Migration d'interfaces

Pendant la création de version, vous pouvez sélectionner des interfaces spécifiques à migrer :
  - L'assistant affiche toutes les interfaces où cette application est la source ou la cible
  - Les interfaces sélectionnées sont dupliquées avec les références mises à jour vers la nouvelle version
  - Les interfaces originales restent liées à l'ancienne version
  - Chaque interface migrée inclut toutes ses relations : legs, responsables, sociétés, identifiants clés, liens et résidence des données
  - La nouvelle interface démarre avec un cycle de vie « Proposé »

**Copie des liaisons** : Si vous sélectionnez à la fois « Instances » et « Liaisons » à l'étape 2, les liaisons d'interfaces sont également copiées :
  - Les liaisons sont mappées vers les instances de la nouvelle application (mêmes environnements)
  - Les détails spécifiques à l'environnement (endpoints, authentification, noms de jobs) sont effacés pour une configuration fraîche
  - Le statut de liaison est réinitialisé à « Proposé »

**Applications ETL/Middleware** : Si l'application a « Intégration de données / ETL » activé, l'assistant affiche également les interfaces qui *transitent par* cette application en tant que middleware. Ce sont des interfaces où une autre source envoie des données vers une autre cible via votre ETL. Copier ces interfaces crée de nouvelles définitions d'interfaces pour l'ETL mis à niveau, avec les références middleware correctement mises à jour.

**Conseil** : Utilisez cela lors de la mise à niveau de votre ERP ou ETL : migrez les interfaces critiques et copiez optionnellement les liaisons pour prendre de l'avance sur la configuration des environnements.

---

## Copier des applications

Il existe deux façons de copier une application dans KANAP :

### Copier l'élément (depuis la grille Applications)

Utilisez cela lorsque vous souhaitez créer un duplicata indépendant d'une application -- typiquement pour créer une entrée d'application similaire sans lignée de version.

1. Sélectionnez une application dans la grille
2. Cliquez sur **Copier l'élément**
3. Le système crée une copie avec « (copie) » ajouté au nom
4. Vous êtes redirigé vers la nouvelle application pour effectuer des modifications

**Ce qui est copié** : Tous les champs principaux (sauf la date du dernier test PRA), responsables, sociétés, départements, suites, postes OPEX/CAPEX, contrats, liens, résidence des données et contacts de support.

**Ce qui N'est PAS copié** : Instances, interfaces, assignations d'actifs, pièces jointes, champs de version (version, date de mise en production, fin de support).

### Comparaison : Copier l'élément vs Créer une nouvelle version

| Aspect | Copier l'élément | Créer une nouvelle version |
|--------|------------------|---------------------------|
| **Objectif** | Créer un duplicata indépendant | Créer une version avec lignée |
| **Options utilisateur** | Aucune (automatique) | Assistant étape par étape |
| **Lignée** | Pas de lien prédécesseur | Définit predecessor_id |
| **Cycle de vie** | Préservé | Réinitialisé à Proposé |
| **Nom** | Suffixe « (copie) » | Spécifié par l'utilisateur |

**Ce qui est copié - Relations** :

| Relation | Copier l'élément | Créer une nouvelle version |
|----------|------------------|---------------------------|
| Responsables (métier et IT) | Oui | Optionnel (par défaut : oui) |
| Sociétés (audience) | Oui | Optionnel (par défaut : oui) |
| Départements | Oui | Optionnel (par défaut : oui) |
| Résidence des données | Oui | Optionnel (par défaut : oui) |
| Liens (documentation) | Oui | Optionnel (par défaut : oui) |
| Contacts de support | Oui | Optionnel (par défaut : oui) |
| Suites (appartenance) | Oui | Non |
| Postes OPEX | Oui | Optionnel (par défaut : oui) |
| Postes CAPEX | Oui | Optionnel (par défaut : oui) |
| Contrats | Oui | Optionnel (par défaut : oui) |
| Instances | Non | Optionnel (par défaut : non) |
| Liaisons | Non | Optionnel (par défaut : non) |
| Interfaces | Non | Sélectionné par l'utilisateur |
| Assignations d'actifs | Non | Non |
| Pièces jointes | Non | Non |

**Ce qui est copié - Champs principaux** :

| Champ | Copier l'élément | Créer une nouvelle version |
|-------|------------------|---------------------------|
| Description | Oui | Oui |
| ETL activé | Oui | Oui |
| Notes de support | Oui | Oui |
| Dernier test PRA | Non | Non |
| Champs de version | Non | Spécifié par l'utilisateur |
| Saisie manuelle utilisateurs | Oui | Réinitialisé à null |
| Année utilisateurs | Oui | Réinitialisé à l'année en cours |

---

## Import/export CSV

Maintenez votre inventaire applicatif à grande échelle grâce à l'import et l'export CSV. Cette fonctionnalité prend en charge les opérations en masse pour le chargement initial de données, les mises à jour périodiques depuis des systèmes externes et l'extraction de données pour le reporting.

### Accéder aux fonctionnalités CSV

Depuis la liste des Applications :
  - **Export CSV** : Télécharger les applications dans un fichier CSV
  - **Import CSV** : Téléverser un fichier CSV pour créer ou mettre à jour des applications
  - **Télécharger le modèle** : Obtenir un CSV vierge avec les en-têtes corrects

**Autorisations requises** : `applications:admin` pour les opérations d'import/export.

### Options d'export

**Préréglages** (sélections de champs pré-configurées) :

| Préréglage | Description |
|------------|-------------|
| **Export complet** | Tous les champs exportables incluant les données calculées/lecture seule (horodatages, résidence des données, métriques utilisateurs) |
| **Enrichissement de données** | Uniquement les champs importables -- idéal pour les flux d'édition aller-retour |

**Export modèle** : Télécharge uniquement les en-têtes -- utile pour préparer des fichiers d'import avec la bonne structure. Le modèle inclut tous les champs importables.

**Sélection personnalisée** : Choisissez les champs spécifiques à inclure dans votre export.

### Processus d'import

1. **Préparez votre fichier** : Utilisez l'encodage UTF-8 avec des séparateurs point-virgule (`;`). Téléchargez un modèle pour vous assurer des bons en-têtes.

2. **Choisissez les paramètres d'import** :
   - **Mode** :
     - `Enrichir` (par défaut) : Les cellules vides conservent les valeurs existantes -- ne mettez à jour que ce que vous spécifiez
     - `Remplacer` : Les cellules vides effacent les valeurs existantes -- remplacement complet de tous les champs
   - **Opération** :
     - `Upsert` (par défaut) : Créer de nouvelles applications ou mettre à jour les existantes
     - `Mise à jour uniquement` : Ne modifier que les applications existantes, ignorer les nouvelles
     - `Insertion uniquement` : Ne créer que de nouvelles applications, ignorer les existantes

3. **Validez d'abord** : Cliquez sur **Vérification préalable** pour valider votre fichier sans apporter de modifications. Examinez les erreurs et avertissements.

4. **Appliquez les modifications** : Si la validation réussit, cliquez sur **Importer** pour valider les changements.

### Correspondance et mises à jour

Les applications sont identifiées par **nom** (insensible à la casse). Lorsqu'une correspondance est trouvée :
  - En mode `Enrichir` : Seules les valeurs CSV non vides mettent à jour l'application
  - En mode `Remplacer` : Tous les champs sont mis à jour, les valeurs vides effacent les données existantes

Si vous incluez la colonne `id` avec un UUID valide, la correspondance utilise d'abord l'ID, puis se rabat sur le nom.

### Limitations

  - **Instances non incluses** : Les instances d'environnement (Prod, QA, Dev) nécessitent une configuration dans l'espace de travail
  - **Assignations d'actifs exclues** : Les liaisons serveur doivent être configurées dans l'onglet Serveurs
  - **Interfaces exclues** : Les définitions d'intégration ne font pas partie de l'import/export CSV
  - **Maximum 4 responsables par type** : Jusqu'à 4 responsables métier et 4 responsables IT peuvent être importés/exportés
  - **Métriques utilisateurs en export uniquement** : Les champs d'audience et de comptage d'utilisateurs (`users_mode`, `users_year`, `users_override`) sont gérés dans l'espace de travail
  - **Résidence des données en export uniquement** : Les sélections de pays doivent être gérées dans l'onglet Conformité

### Résolution de problèmes

**Erreur « Le fichier n'est pas correctement formaté »** : Cela indique généralement un problème d'encodage. Assurez-vous que votre CSV est enregistré en **UTF-8** :

  - **Dans LibreOffice** : Lors de l'ouverture d'un CSV, sélectionnez `UTF-8` dans le menu déroulant Jeu de caractères (pas « Japanese (Macintosh) » ni d'autres encodages). Lors de l'enregistrement, cochez « Modifier les paramètres de filtre » et choisissez UTF-8.
  - **Dans Excel** : Enregistrer sous > CSV UTF-8 (délimité par des virgules), puis ouvrez dans un éditeur de texte pour remplacer les virgules par des points-virgules.
  - **Conseil général** : Si vous voyez des caractères illisibles (`?¿`, `ï»¿`) au début de votre fichier, l'encodage est incorrect.

### Exemple CSV

```csv
name;category;supplier_name;criticality;lifecycle;go_live_date;external_facing
Salesforce CRM;Line-of-business;Salesforce Inc;business_critical;Active;2020-01-15;true
Microsoft 365;Productivity;Microsoft;high;active;2019-06-01;false
Custom ERP;lob;;medium;Active;2018-03-20;false
```

---

## Conseils

  - **Commencez par les apps critiques** : Documentez d'abord vos applications critiques pour le métier, puis descendez dans les niveaux de criticité.
  - **Utilisez les suites pour regrouper** : Marquez une application comme suite pour regrouper les composants liés (ex. : modules SAP sous une suite SAP).
  - **Liez aux dépenses tôt** : Connectez les postes OPEX et CAPEX dans l'onglet Relations pour voir l'image complète des coûts.
  - **Maintenez les environnements à jour** : L'onglet Instances alimente les pastilles d'environnement dans la liste -- maintenez-le à jour pour une visibilité précise.
  - **Exploitez le filtrage par catégorie** : Utilisez le filtre de la colonne Catégorie pour vous concentrer sur des types d'applications spécifiques (ex. : afficher uniquement les apps Métier, ou exclure les outils de Productivité).
  - **Attachez les connaissances tôt** : Liez les runbooks et les documents d'architecture dans l'onglet Base de connaissances pour que l'équipe sache où chercher lors des incidents.
