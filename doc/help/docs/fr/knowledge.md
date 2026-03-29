# Base de connaissances

La base de connaissances est l'espace de travail documentaire de KANAP pour les politiques, procédures, notes techniques, documents de référence et toute documentation qui doit rester connectée au travail réel. Elle combine l'écriture libre avec des fonctionnalités de gouvernance telles que les modèles, la responsabilité, la revue, l'historique des versions et les relations avec les applications, actifs, projets, demandes et tâches.

Contrairement à un partage de fichiers, la base de connaissances n'est pas qu'un endroit pour stocker des documents. Le choix de conception important est que chaque article peut être classifié, revu, versionné, exporté et lié à des objets opérationnels dans toute la plateforme. Cela rend l'article plus facile à trouver et lui donne du contexte lorsqu'on l'ouvre depuis un autre espace de travail.

## Où trouver cette page

- Espace de travail : **Base de connaissances**
- Autorisations :
  - `knowledge:reader` permet d'ouvrir et de lire les documents
  - `knowledge:member` permet de créer, modifier, commenter, organiser les dossiers et gérer les métadonnées des documents
  - `knowledge:admin` ajoute l'administration des bibliothèques et les déplacements inter-bibliothèques

Si vous pouvez lire un document mais ne pouvez pas le modifier, l'espace de travail reste disponible en mode lecture seule.

## Organisation de la base de connaissances

La base de connaissances est construite autour de quatre niveaux d'organisation : les bibliothèques, les dossiers, les types de documents et les relations.

### Bibliothèques

Les bibliothèques sont les conteneurs de plus haut niveau. Elles séparent les populations de documents qui doivent être gérées différemment.

Schémas typiques :
- Utilisez une bibliothèque classique pour la base de connaissances de travail de votre équipe.
- Utilisez la bibliothèque **Modèles** pour les documents de démarrage réutilisables.
- Utilisez la bibliothèque **Documents gérés** pour les documents qui proviennent d'un autre espace de travail et restent partiellement contrôlés par celui-ci.

Conséquences du choix de bibliothèque :
- La bibliothèque active détermine quelle arborescence de dossiers vous voyez et où les nouveaux documents vierges sont créés.
- Dans une bibliothèque normale, les documents se comportent comme des articles de base de connaissances standard.
- Dans **Modèles**, les documents publiés deviennent des points de départ réutilisables pour de nouveaux articles et sont regroupés par type de document dans le sélecteur de modèles.
- Dans **Documents gérés**, les articles peuvent toujours être lisibles et modifiables, mais certaines métadonnées sont contrôlées par l'espace de travail source plutôt que depuis la base de connaissances elle-même.

L'administration des bibliothèques est intentionnellement plus stricte que la modification des documents. Créer, renommer, supprimer ou réorganiser des bibliothèques est une responsabilité d'administrateur car ces modifications affectent la navigation et la propriété pour tout le monde.

### Dossiers

Les dossiers organisent les documents au sein d'une bibliothèque. Ils ne sont pas cosmétiques : ils façonnent la manière dont les utilisateurs parcourent la bibliothèque et comment les équipes maintiennent une structure partagée au fil du temps.

Comportement important :
- Les dossiers existent au sein d'une bibliothèque. Ils ne sont pas partagés entre bibliothèques.
- Dans une vue mono-bibliothèque, les documents peuvent être glissés dans des dossiers pour une réorganisation rapide.
- Les dossiers peuvent être imbriqués pour créer une structure de navigation.
- Supprimer un dossier ne supprime pas ses documents. Les documents reviennent dans **Non classé**.
- Un dossier avec des sous-dossiers ne peut pas être supprimé tant que la hiérarchie n'est pas nettoyée.

Utilisez les dossiers pour des domaines stables, pas pour des états de workflow temporaires. Le statut et le workflow existent déjà pour cela.

### Filtres de périmètre

Le filtre de périmètre de premier niveau change quels documents sont listés :

- **Mes documents** se concentre sur les documents que vous possédez.
- **Documents de mon équipe** se concentre sur les documents possédés par votre équipe.
- **Tous les documents** retire le périmètre de propriété et affiche la population complète que vous êtes autorisé à voir.

Si vous n'êtes pas assigné à une équipe, le périmètre équipe n'est pas disponible. Votre dernier choix de périmètre est mémorisé, ce qui est pratique lorsqu'il correspond à votre mode de travail normal et légèrement déroutant lorsque vous avez oublié que vous l'avez changé hier.

### Modèles et types de documents

Les modèles sont des documents ordinaires de la base de connaissances stockés dans la bibliothèque **Modèles** et publiés pour réutilisation. Créer un document à partir d'un modèle copie le contenu du modèle dans un nouvel article et conserve la référence au modèle.

Les types de documents sont importants car ils :
- classifient l'article pour le filtrage et le reporting
- regroupent les modèles dans le sélecteur de création
- aident les lecteurs à comprendre quel type de document ils ouvrent

Un comportement subtil mais important : si un document a été créé à partir d'un modèle et que vous changez ensuite son type de document vers un type différent, le lien avec le modèle est effacé. Cela empêche l'article de prétendre qu'il suit encore un modèle auquel il ne correspond plus.

Lorsque vous parcourez la bibliothèque **Modèles**, les administrateurs peuvent ouvrir le panneau **Gérer les types** pour créer, renommer ou désactiver des types de documents.

### Documents gérés

Certains articles de la base de connaissances sont créés depuis des Demandes, Projets, Applications, Actifs ou Tâches. Ceux-ci apparaissent comme des documents **Intégrés**.

Les documents gérés gardent l'expérience d'écriture dans la base de connaissances, mais l'espace de travail source continue de contrôler une partie de leurs métadonnées. En pratique, cela signifie :
- le statut peut être contrôlé par l'objet source
- le placement en dossier peut être fixé par l'espace de travail source
- le type de document ou le modèle peut être fixé
- les relations directes peuvent être en lecture seule dans la base de connaissances
- le workflow de revue de la base de connaissances n'est pas disponible pour ces documents
- les documents gérés ne peuvent pas être déplacés hors de la base de connaissances ni supprimés depuis la liste

Cela protège le lien entre le document et l'enregistrement opérationnel qui le possède.

## Travailler avec la liste de la base de connaissances

La page principale de la base de connaissances est un registre de documents avec des outils de navigation et d'organisation autour.

### Ce que la liste affiche

La grille par défaut se concentre sur l'identité et la gouvernance du document :

- **Réf** : la référence permanente `DOC-{numéro}`
- **Titre**
- **Statut**
- **Type**
- **Version**
- **Responsable**
- **Dossier**
- **Mis à jour**

**Colonnes supplémentaires** (masquées par défaut, disponibles via le sélecteur de colonnes) :
- **Modèle** : affiche le modèle à partir duquel le document a été créé, le cas échéant
- **Bibliothèque** : apparaît automatiquement lorsque **Toutes les bibliothèques** est activé, et peut être affichée manuellement sinon

### Recherche, filtres et navigation

La base de connaissances supporte deux styles de navigation :

- Parcourir une bibliothèque avec son arborescence de dossiers lorsque vous connaissez déjà le domaine.
- Rechercher dans toutes les bibliothèques lorsque vous vous intéressez plus à l'article qu'à son emplacement de stockage.

Le commutateur **Toutes les bibliothèques** change significativement l'expérience :
- l'arborescence des dossiers n'est plus le moteur principal
- la recherche devient plus large
- la liste peut comparer le contenu entre bibliothèques
- la colonne Bibliothèque fait partie du contexte des résultats

La navigation mono-bibliothèque est meilleure pour la curation. La recherche toutes-bibliothèques est meilleure pour la récupération.

**Filtrage** :
- Barre de recherche rapide en haut de la grille
- Filtres de colonnes sur **Statut**, **Type**, **Responsable**, **Dossier**, **Modèle** et **Bibliothèque** utilisant des sélecteurs par jeu de cases à cocher

### Déplacer des documents et des dossiers

Dans une vue mono-bibliothèque, les documents peuvent être glissés dans des dossiers. Une poignée de glissement apparaît sur chaque ligne lorsque le glissement est disponible. C'est la manière la plus rapide de ranger une bibliothèque sans ouvrir chaque article.

Les déplacements inter-bibliothèques sont plus contrôlés :
- ils nécessitent une autorisation supérieure
- ils ne sont pas disponibles pour les documents gérés
- les documents modèles sont intentionnellement restreints car les modèles sont censés rester dans le système de modèles, pas se promener dans la nature

Les dossiers peuvent aussi être glissés entre bibliothèques en les déposant sur l'onglet de la bibliothèque cible.

Les déplacements de dossiers suivent la même logique. Réorganiser un dossier change la structure de navigation pour tout le monde utilisant cette bibliothèque, traitez cela comme un changement d'architecture de l'information, pas simplement comme du rangement personnel.

### Actions de la liste

- **Nouveau** (bouton divisé) : crée un document vierge dans la bibliothèque active, ou ouvre le sélecteur de modèles pour créer à partir d'un modèle publié
- **Déplacer** : déplace les documents sélectionnés vers un autre dossier ou bibliothèque
- **Supprimer** : supprime définitivement les documents sélectionnés (admin uniquement ; non disponible pour les documents gérés)

## Créer et façonner un document

Les nouveaux articles peuvent démarrer de deux manières :

- **Document vierge** : idéal lorsque vous connaissez déjà la structure dont vous avez besoin
- **À partir d'un modèle** : idéal lorsque l'équipe veut des sections, un langage ou des attentes de revue cohérents

Lorsque vous créez à partir d'un modèle, le contenu du modèle est copié dans le nouveau document. À partir de ce moment, le nouvel article est indépendant. Mettre à jour le modèle ultérieurement ne réécrit pas les documents existants.

L'espace de travail du document garde l'écriture au centre et la gouvernance dans la barre latérale.

Les propriétés principales incluent :
- **Titre** : le libellé principal que les lecteurs recherchent et citent
- **Statut** : le cycle de vie de l'article
- **Dossier** : où l'article vit au sein de sa bibliothèque
- **Type** : quel type de document c'est
- **Basé sur le modèle** : la lignée du modèle, le cas échéant
- **Résumé** : une courte description pour le contexte

Après le premier enregistrement, le modèle complet de gouvernance du document devient disponible. C'est à ce moment que vous pouvez gérer les contributeurs, les classifications, les relations, les commentaires et l'historique des versions contre une référence de document stable.

### Statut et sa signification

Le statut n'est pas décoratif. Il indique aux lecteurs avec quel sérieux ils doivent traiter l'article.

| Statut | Signification | Conséquence pratique |
|--------|--------------|---------------------|
| **Brouillon** | Travail en cours | Adapté à la rédaction et à l'itération interne |
| **En revue** | Sous revue formelle | La modification est bloquée tant que le workflow est actif |
| **Publié** | Approuvé pour utilisation normale | Meilleur choix pour le contenu sur lequel on doit pouvoir s'appuyer |
| **Archivé** | Conservé pour mémoire | Généralement encore utile pour l'historique, pas pour la guidance active |
| **Obsolète** | Remplacé ou plus valide | Les lecteurs ne devraient pas le suivre comme pratique actuelle |

La base de connaissances permet la publication directe même sans workflow de revue formelle. C'est utile pour le contenu à faible risque, mais cela signifie aussi que les équipes doivent faire preuve de discipline pour savoir quand la revue est optionnelle et quand elle devrait être attendue.

## Écriture, verrous et sauvegarde automatique

La base de connaissances utilise un verrou d'édition pour qu'une seule personne modifie activement un document à la fois.

Comment ça fonctionne :
- entrer en mode édition acquiert le verrou
- les autres utilisateurs peuvent toujours ouvrir et lire l'article
- ils ne peuvent pas modifier tant que le verrou est détenu par quelqu'un d'autre
- si le verrou expire ou est perdu, le mode édition s'arrête et doit être relancé

Cela évite les écrasements silencieux, ce qui est excellent pour l'intégrité documentaire et moins excellent si deux personnes pensaient toutes les deux avoir « juste une petite retouche ».

Pendant que vous éditez :
- les modifications sont enregistrées manuellement avec **Enregistrer**
- le contenu non enregistré est aussi sauvegardé automatiquement périodiquement tant que votre verrou est actif
- **Annuler** revient au dernier état enregistré

L'espace de travail supporte aussi le téléversement d'images en ligne dans la zone de contenu markdown, les captures d'écran et schémas peuvent donc vivre avec l'article plutôt que dans un dossier mystérieux sur le bureau de quelqu'un. Lorsque vous collez ou référencez une image depuis une URL externe, l'image est automatiquement importée et stockée dans le document pour qu'elle reste disponible même si l'URL originale devient inaccessible.

## Importer un document

Vous pouvez importer un document Word (.docx) dans un article existant de la base de connaissances. Le bouton **Import** apparaît dans la barre d'outils de l'espace de travail une fois que le document a été enregistré au moins une fois et que vous êtes en mode édition.

Comment ça fonctionne :
- Cliquez sur **Import** et sélectionnez un fichier `.docx` depuis votre ordinateur.
- Si l'article a déjà du contenu, une boîte de dialogue de confirmation demande si vous souhaitez le remplacer. Choisir **Continuer** écrase le markdown actuel avec le contenu importé.
- Le contenu Word importé est converti en markdown et chargé dans l'éditeur. Les images intégrées dans le fichier Word sont extraites et stockées comme pièces jointes en ligne.
- Après l'import, vos modifications ne sont pas enregistrées. Utilisez **Enregistrer** pour persister le contenu importé.

Si l'import rencontre un conflit de verrou (quelqu'un d'autre a acquis le verrou) ou un verrou expiré, le mode édition se termine et un message approprié s'affiche. Repassez en mode édition et réessayez.

Les avertissements d'import, comme le formatage non supporté simplifié lors de la conversion, apparaissent brièvement comme une notification en bas de l'écran.

## Formats d'export

Les articles de la base de connaissances peuvent être exportés en :

- **PDF**
- **DOCX**
- **ODT**

L'export est disponible lorsque l'article a du contenu. C'est utile lorsque :
- un document doit circuler en dehors de KANAP
- un relecteur préfère les annotations au format Word
- un instantané PDF stable est nécessaire pour le partage ou l'archivage

L'export ne remplace pas l'article en ligne. La version dans la base de connaissances reste la source gouvernée, tandis que les fichiers exportés sont des formats de distribution.

## Contributeurs et workflow de revue

Chaque document peut avoir un modèle de contributeurs structuré :

- **Responsable** : la personne redevable de l'article
- **Auteurs** : les personnes qui aident à maintenir le contenu
- **Relecteurs** : relecteurs de l'étape 1
- **Approbateurs** : approbateurs de l'étape 2

Le responsable est important opérationnellement. Le filtrage par périmètre est basé sur la propriété, et un document sans responsable clair est beaucoup plus susceptible de devenir du « matériel de référence important » que personne ne met à jour.

### Workflow de revue

Le workflow de revue est optionnel mais délibéré :

- les relecteurs travaillent en premier
- les approbateurs agissent une fois l'étape de revue terminée
- les approbateurs et relecteurs peuvent enregistrer des notes de décision
- demander des modifications renvoie le document en révision
- le workflow garde trace de la dernière révision approuvée

Conséquences importantes :
- vous ne pouvez pas demander une revue tant qu'il y a des modifications non enregistrées
- vous avez besoin de relecteurs ou approbateurs assignés avant de pouvoir demander une revue
- les documents archivés et obsolètes ne sont pas candidats à une nouvelle demande de revue
- une fois la revue commencée, la modification normale est désactivée jusqu'à ce que la revue soit approuvée, que des modifications soient demandées ou que la revue soit annulée

Cela rend la revue significative. Si les auteurs pouvaient continuer à modifier le contenu pendant l'approbation, le document approuvé serait une cible mouvante, ce qui est un moyen splendide de créer des arguments et un mauvais moyen de créer de la documentation.

## La barre latérale de l'espace de travail du document

La barre latérale a deux onglets : **Propriétés** et **Commentaires**.

### Onglet Propriétés

L'onglet Propriétés organise les données de gouvernance en sections repliables :

- **Statut, Dossier, Type, Modèle et Résumé** sont toujours visibles en haut.
- **Contributeurs** : assigner responsable, auteurs, relecteurs et approbateurs. Chaque rôle est enregistré indépendamment de l'enregistrement principal du document.
- **Workflow de revue** : affiche l'état actuel du workflow lorsqu'une revue est active, incluant l'avancement des étapes, les décisions des participants et l'activité récente du workflow. Lorsqu'aucun workflow n'est actif, vous pouvez demander une revue depuis ici.
- **Classification** : taguer le document avec des catégories et des flux de votre schéma de classification organisationnel. Plusieurs lignes de classification peuvent être ajoutées.
- **Relations** : lier le document à des applications, actifs, projets, demandes ou tâches. Chaque type de relation a son propre champ de recherche et sélection.
- **Versions** : liste les révisions enregistrées avec horodatage. **Restaurer** n'est disponible que lorsque vous détenez un verrou d'édition actif.

### Onglet Commentaires

L'onglet Commentaires affiche l'activité autour du document : commentaires, événements de workflow et historique des modifications. Utilisez les commentaires pour le contexte de revue, les clarifications éditoriales ou la justification des changements qui doivent rester attachés à l'article.

## Relations et contexte inter-espaces de travail

Les documents de la base de connaissances peuvent être liés directement à :

- Des applications
- Des actifs
- Des projets
- Des demandes
- Des tâches

Les relations ne sont pas de simples tags. Elles contrôlent où le document apparaît ailleurs dans KANAP et comment les utilisateurs le découvrent depuis les espaces de travail opérationnels.

Conséquences de l'ajout de relations :
- le document devient plus facile à trouver depuis l'objet lié
- les lecteurs ouvrant l'objet obtiennent une documentation contextuelle sans avoir à chercher manuellement
- le reporting et la gouvernance autour de l'objet deviennent plus complets

Conséquences de relations insuffisantes :
- des documents utiles restent invisibles en dehors de la base de connaissances
- les utilisateurs créent des doublons parce qu'ils ne trouvent pas l'article existant
- le même sujet commence à dériver entre plusieurs documents

Dans les espaces de travail liés, les panneaux de la base de connaissances distinguent entre :
- **Documents liés** : directement attachés à l'objet
- **Documents associés** : remontés par le contexte et la provenance du travail connecté

Cette distinction est importante. Les liens directs expriment une relation intentionnelle. Les documents associés expriment un contexte utile, mais pas le même niveau de propriété.

## Bonnes pratiques opérationnelles

- Utilisez les bibliothèques pour les limites de gouvernance, les dossiers pour la navigation et les relations pour le contexte métier.
- Maintenez la propriété à jour. Un bon article avec le mauvais responsable vit généralement en sursis.
- Utilisez les modèles lorsque la cohérence compte entre les équipes.
- Utilisez la revue pour les documents qui guident des décisions, des contrôles ou des processus reproductibles.
- Marquez le contenu obsolète comme archivé ou obsolète au lieu de laisser les lecteurs deviner.
- Importez les documents Word lors de la migration de contenu existant vers la base de connaissances plutôt que de copier-coller, afin que les images intégrées soient préservées automatiquement.
