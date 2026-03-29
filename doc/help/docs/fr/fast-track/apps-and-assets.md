---
title: "Fast Track Cartographie SI : de l'application au serveur"
description: Documentez votre paysage applicatif en quelques minutes. Un guide pratique de la création de l'application à l'assignation du serveur.
---

# Fast Track Cartographie SI : de l'application au serveur

Ce guide vous accompagne dans la documentation d'une application et de son infrastructure de support -- de la création de l'entrée applicative à la liaison avec le serveur qui l'héberge. Il est conçu pour vous rendre productif rapidement, couvrant les étapes essentielles sans vous noyer dans les options.

!!! tip "Conseil : Vous préférez un résumé sur une page ? :material-file-pdf-box:"
    Toutes les étapes clés sur une seule page A4 -- imprimez-la, épinglez-la, partagez-la avec votre équipe.

    [:material-download: Télécharger l'aide-mémoire (PDF)](downloads/kanap-itops-fast-track.pdf){ .md-button .md-button--primary }

Pour tous les détails, consultez la documentation de référence des [Applications](../applications.md) et [Actifs](../assets.md).

---

## La vue d'ensemble

![Vue d'ensemble Application vers Serveur](images/app-to-server-overview.png)

Tout dans le module Cartographie SI de KANAP se connecte pour dresser un tableau complet de votre paysage :

| Objet | Ce qu'il représente |
|-------|---------------------|
| **Application** | Une app métier ou un service IT que vous devez documenter |
| **Environnement** | Où elle fonctionne -- Prod, QA, Dev, etc. (appelé « Instances » dans KANAP) |
| **Serveur (Actif)** | L'infrastructure qui l'héberge -- VMs, serveurs physiques, conteneurs |

La chaîne est simple : **Application > Environnement > Serveur**. À la fin de ce guide, vous aurez cette chaîne entièrement documentée.

![Modèle de relations des applications](images/app-relationship-model.png)

!!! info "Information : Pourquoi c'est important"
    Quand quelqu'un demande « où tourne cette app ? », « qui en est responsable ? » ou « est-elle conforme ? » -- vous aurez la réponse en quelques secondes au lieu de fouiller dans des tableurs.

---

## Étape 1 : Créez votre application

Allez dans **Cartographie SI > Applications** et cliquez sur **Nouvelle app / Service**.

Remplissez l'essentiel :

| Champ | Quoi saisir | Exemple |
|-------|------------|---------|
| **Nom** | Un nom clair et reconnaissable | `Salesforce CRM` |
| **Catégorie** | L'objectif principal | `Métier` |
| **Fournisseur** | Le fournisseur (depuis vos données de référence) | `Salesforce Inc` |
| **Criticité** | Importance métier | `Critique métier` |
| **Cycle de vie** | Statut actuel | `Actif` |

Cliquez sur **Enregistrer**. Votre application est maintenant dans le registre, et l'espace de travail complet s'ouvre avec neuf onglets pour une documentation détaillée.

!!! tip "Conseil : Commencez avec ce que vous savez"
    Description, éditeur, version, licences -- tout est utile, mais optionnel à ce stade. Vous pourrez enrichir plus tard. L'objectif est d'enregistrer l'app dans le système.

---

## Étape 2 : Ajoutez un environnement (Instance)

Chaque application tourne quelque part. L'onglet **Instances** documente vos environnements.

Ouvrez votre application et allez dans l'onglet **Instances**. Cliquez sur **Ajouter** et sélectionnez le type d'environnement (Prod, Pré-prod, QA, Test, Dev ou Sandbox).

Pour chaque instance, vous pouvez capturer :

| Champ | Ce qu'il fait | Exemple |
|-------|-------------|---------|
| **Environnement** | Le type d'environnement | `Prod` |
| **URL de base** | L'URL d'accès | `https://mycompany.salesforce.com` |
| **Cycle de vie** | Statut spécifique à l'instance | `Actif` |
| **SSO activé** | Le Single Sign-On est-il actif ? | `Oui` |
| **MFA supporté** | L'authentification multi-facteur est-elle supportée ? | `Oui` |
| **Notes** | Tout contexte supplémentaire | `Instance EU principale` |

!!! tip "Conseil : Copiez depuis Prod"
    Une fois votre instance Production configurée, utilisez le bouton **Copier depuis Prod** pour créer rapidement les environnements QA, Dev et autres avec des paramètres similaires.

Les modifications d'instances sont enregistrées immédiatement -- pas besoin de cliquer sur le bouton Enregistrer principal.

---

## Étape 3 : Assignez les responsables

Allez dans l'onglet **Responsabilité et audience**. C'est ici que vous documentez qui est responsable.

### Responsables métier

Les parties prenantes métier redevables de l'application. Ajoutez une ou plusieurs personnes -- leur intitulé de poste apparaîtra automatiquement.

### Responsables IT

Les membres de l'équipe IT responsables des opérations techniques et du support. Même mécanisme -- ajoutez les personnes, les rôles apparaissent.

### Audience (optionnel)

Sélectionnez quelles **sociétés** et **départements** utilisent cette application. KANAP calcule automatiquement le nombre d'utilisateurs basé sur vos données de référence.

!!! warning "Avertissement : Pourquoi les responsables sont importants"
    La responsabilité permet de **joindre les bonnes personnes** quand c'est important -- maintenance planifiée, interruptions de service, décisions de mise à niveau, renouvellements de licences. Elle alimente aussi les filtres de périmètre **Mes apps** et **Apps de mon équipe** sur la liste principale. Sans responsables, l'app n'est visible que dans la vue « Toutes les apps » -- ce qui signifie que personne ne se sent responsable, et personne n'est notifié.

---

## Étape 4 : Définissez les méthodes d'accès

Allez dans l'onglet **Technique et support**. Sous **Méthodes d'accès**, sélectionnez comment les utilisateurs accèdent à cette application :

- **Web** -- accès par navigateur
- **Application installée localement** -- client bureau
- **Application mobile** -- app téléphone/tablette
- **VDI / Bureau distant** -- bureau virtuel
- **Terminal / CLI** -- interface en ligne de commande
- **IHM propriétaire** -- interface industrielle
- **Borne** -- terminal dédié

Les méthodes d'accès sont configurables dans les [Paramètres de la Cartographie SI](../it-ops-settings.md#méthodes-daccès), votre liste peut donc inclure des options supplémentaires.

Définissez aussi :

| Champ | Ce que cela signifie |
|-------|---------------------|
| **Exposition externe** | Cette app est-elle accessible depuis Internet ? |
| **Intégration de données / ETL** | Cette app participe-t-elle à des pipelines de données ? |

---

## Étape 5 : Liez à d'autres objets (Relations)

Allez dans l'onglet **Relations** pour connecter votre application au reste de vos données de gestion IT.

| Type de lien | Ce que vous connectez | Pourquoi |
|--------------|----------------------|----------|
| **Postes OPEX** | Coûts récurrents (licences, frais SaaS) | Voir l'image complète des coûts |
| **Postes CAPEX** | Projets d'investissement | Suivre les investissements |
| **Contrats** | Accords fournisseurs | Savoir quand les renouvellements arrivent |
| **Projets** | Projets du portefeuille | Se connecter à votre portefeuille de projets |
| **Sites web pertinents** | Documentation, wikis, runbooks | Accès rapide aux ressources externes |
| **Pièces jointes** | Fichiers (glisser-déposer ou sélecteur) | Garder specs et docs à côté de l'app |

!!! tip "Conseil : Vous pouvez faire cela plus tard"
    Les relations sont puissantes mais pas bloquantes. Créez-les quand vous avez les données -- l'app est entièrement fonctionnelle sans elles.

---

## Étape 6 : Ajoutez les informations de conformité

Allez dans l'onglet **Conformité**. C'est de plus en plus important pour les audits et les exigences réglementaires.

| Champ | Quoi saisir | Exemple |
|-------|------------|---------|
| **Classification données** | Niveau de sensibilité | `Confidentiel` |
| **Contient des PII** | Stocke des données personnelles ? | `Oui` |
| **Résidence des données** | Pays où les données sont stockées | `France, Allemagne` |
| **Dernier test PRA** | Date du dernier test de reprise d'activité | `2025-11-15` |

!!! info "Information : Les classifications de données sont configurables"
    Les classes par défaut (Public, Interne, Confidentiel, Restreint) peuvent être personnalisées dans **Cartographie SI > Paramètres** pour correspondre à la politique de classification des données de votre organisation.

---

## Étape 7 : Créez votre serveur (Actif)

Allez dans **Cartographie SI > Actifs** et cliquez sur **Ajouter un actif**.

### Onglet Vue d'ensemble

Remplissez les champs principaux :

| Champ | Quoi saisir | Exemple |
|-------|------------|---------|
| **Nom** | Hostname ou identifiant | `PROD-WEB-01` |
| **Type d'actif** | Le type de serveur (menu déroulant) | `Machine virtuelle` |
| **Est un cluster** | Basculer si c'est un cluster | `Non` |
| **Site** | Où il est hébergé (obligatoire) | `Datacenter Paris` |
| **Cycle de vie** | Statut actuel | `Actif` |
| **Date de mise en production** | Quand il a été mis en service | `2025-01-15` |
| **Date de fin de vie** | Mise hors service prévue | -- |
| **Notes** | Tout contexte supplémentaire | -- |

Une fois un site sélectionné, plusieurs **champs en lecture seule** sont automatiquement dérivés :

- **Type d'hébergement** (sur site, cloud, colocation, etc.)
- **Fournisseur cloud / Société d'exploitation** (ex. : AWS, Azure ou la société gérant l'installation)
- **Pays**
- **Ville**

!!! info "Information : Le site est la clé"
    Le site détermine automatiquement de nombreux attributs de votre actif. Les sites sont gérés dans **Cartographie SI > Sites** -- configurez-les une fois et chaque actif qui leur est assigné hérite du type d'hébergement, du fournisseur, du pays et de la ville. Vous n'avez pas besoin de les remplir manuellement.

Cliquez sur **Enregistrer** pour déverrouiller l'espace de travail complet. Pour les types d'actifs physiques, des onglets supplémentaires **Matériel** et **Support** deviennent disponibles pour suivre les numéros de série, les détails du fabricant et les contrats de support fournisseur.

### Onglet Technique

Allez dans l'onglet **Technique** pour ajouter :

| Section | Champs | Détails |
|---------|--------|---------|
| **Environnement** | Menu déroulant Environnement | `Production`, `QA`, `Dev`, etc. |
| **Identité** | Hostname, Domaine, FQDN, Alias, OS | FQDN est auto-calculé depuis Hostname + Domaine |
| **Adresses IP** | Type, IP, Sous-réseau | Zone réseau et VLAN sont dérivés du sous-réseau |

!!! info "Information : Plusieurs adresses IP"
    Un serveur peut avoir plusieurs adresses IP -- ajoutez-en autant que nécessaire (ex. : interface de gestion, VLAN de production, réseau de sauvegarde). Chaque entrée peut avoir son propre type et sous-réseau, et la zone réseau et le VLAN sont dérivés automatiquement.

---

## Étape 8 : Liez le serveur à votre application

C'est la connexion finale -- relier votre serveur à l'environnement applicatif qu'il supporte.

Il y a **deux façons** de créer cette assignation :

### Depuis le côté Application

1. Ouvrez votre application
2. Allez dans l'onglet **Serveurs**
3. Sélectionnez l'environnement **Production**
4. Cliquez sur **Ajouter une assignation**
5. Sélectionnez votre actif (`PROD-WEB-01`)
6. Définissez le **Rôle** (Web, Base de données, Application, etc.)

### Depuis le côté Actif

1. Ouvrez votre actif
2. Allez dans l'onglet **Assignations**
3. Cliquez sur **Ajouter une assignation**
4. Remplissez les champs :

| Champ | Quoi saisir | Exemple |
|-------|------------|---------|
| **Application** | L'application à lier | `Salesforce CRM` |
| **Environnement / Instance** | Quelle instance | `Production` |
| **Rôle** | Rôle du serveur pour cette app | `Web` |
| **Date de début** | Quand l'assignation a commencé | `2025-01-15` |
| **Notes** | Tout contexte | -- |

!!! success "La chaîne est complète"
    Vous avez maintenant le chemin complet documenté :

    **Salesforce CRM** > **Instance Production** > **PROD-WEB-01**

    N'importe qui peut tracer de « quelle app ? » à « quel serveur ? » à « où est-il ? » en quelques secondes.

---

## Comment tout s'interconnecte

Chaque donnée que vous saisissez alimente quelque chose de plus grand :

### Vue du paysage applicatif

Votre liste Applications devient un registre vivant montrant chaque application avec ses environnements, sa criticité, son type d'hébergement et sa responsabilité -- filtrable par n'importe quel attribut.

### Cartographie d'infrastructure

Les actifs liés aux instances d'applications vous permettent de répondre à des questions comme :

- « Quels serveurs supportent cette application critique ? »
- « Quelles applications seront affectées si ce serveur tombe ? »
- « Combien d'apps sont hébergées dans ce datacenter ? »

### Reporting de conformité

La classification des données, les indicateurs PII et la résidence des données alimentent les vues de conformité. Quand l'auditeur demande « où sont stockées les données clients ? », vous avez une réponse documentée et traçable.

### Base de connaissances

Les Applications et les Actifs ont tous deux un onglet **Base de connaissances** où vous pouvez lier des runbooks, des décisions d'architecture, des procédures opérationnelles et de la documentation interne. Avoir ces références attachées aux bons enregistrements signifie que votre équipe peut trouver ce dont elle a besoin pendant les incidents sans fouiller dans les wikis.

### Carte des connexions

Une fois les actifs documentés, vous pouvez créer des **Connexions** (Serveur à serveur ou Multi-serveur) entre eux pour visualiser les flux réseau et les dépendances. La [Carte des connexions](../connection-map.md) les affiche sous forme de graphique interactif avec des niveaux verticaux basés sur les rôles pour une vue de type architecture.

### Interfaces et carte des interfaces

Allez encore plus loin : documentez les **Interfaces** entre applications pour capturer les flux de données, les points d'intégration et le contexte métier. Chaque interface a six onglets pour une documentation complète -- Vue d'ensemble, Responsabilité et criticité, Définition fonctionnelle, Définition technique, Liaisons et connexions, et Données et conformité.

Puis utilisez la [Carte des interfaces](../interface-map.md) pour visualiser le flux applicatif complet. Dans la vue Métier par défaut, vous voyez des relations source-cible épurées. Basculez en vue Technique pour révéler les plateformes middleware sous forme de noeuds en losange, montrant le chemin réel des données. Le filtrage de profondeur ne compte que les noeuds d'application principaux -- le middleware est transparent, donc sélectionner une app avec une profondeur de 2 vous montre deux sauts réels quel que soit le nombre de plateformes middleware entre les deux.

---

## Référence rapide

| Je veux... | Aller à... |
|------------|-----------|
| Créer une application | Cartographie SI > Applications > Nouvelle app / Service |
| Ajouter des environnements | Ouvrir l'app > onglet Instances |
| Assigner des responsables | Ouvrir l'app > onglet Responsabilité et audience |
| Définir les méthodes d'accès | Ouvrir l'app > onglet Technique et support |
| Lier les budgets/contrats | Ouvrir l'app > onglet Relations |
| Attacher des documents | Ouvrir l'app > onglet Base de connaissances |
| Ajouter les infos de conformité | Ouvrir l'app > onglet Conformité |
| Créer un serveur | Cartographie SI > Actifs > Ajouter un actif |
| Lier un serveur à une app (depuis l'app) | Ouvrir l'app > onglet Serveurs > Ajouter une assignation |
| Lier un serveur à une app (depuis l'actif) | Ouvrir l'actif > onglet Assignations > Ajouter une assignation |
| Voir les connexions du serveur | Ouvrir l'actif > onglet Connexions |
| Voir la carte des connexions | Cartographie SI > Carte des connexions |
| Voir la carte des interfaces | Cartographie SI > Carte des interfaces |
| Configurer les menus déroulants | Cartographie SI > Paramètres |

---

!!! success "Vous êtes prêt"
    Vous savez maintenant comment documenter la chaîne complète de l'application au serveur. Commencez par vos applications les plus critiques, ajoutez leurs environnements de production, liez les serveurs -- et vous aurez une cartographie IT vivante et interrogeable en un rien de temps. Pour la documentation détaillée de chaque fonctionnalité, explorez les sections de référence [Applications](../applications.md) et [Actifs](../assets.md).
