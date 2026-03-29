# Projets du portefeuille

Les projets du portefeuille sont les espaces de travail d'exécution pour les initiatives approuvées. C'est là que la livraison est planifiée, l'avancement est suivi, la charge de travail est mesurée, les tâches sont coordonnées et les connaissances spécifiques au projet sont reliées au reste de KANAP.

Les projets proviennent généralement de demandes approuvées, mais ils peuvent aussi être créés directement en tant que projets **Fast-track** ou **Historiques** lorsque l'étape de demande ne fait pas partie du processus.

Pour le séquencement et la planification à l'échelle du portefeuille, utilisez [Planification du portefeuille](portfolio-planning.md). La zone Projets est dédiée au pilotage du travail une fois qu'un projet existe.

## Où trouver cette page

- Espace de travail : **Portefeuille**
- Chemin : **Portefeuille > Projets**

## Autorisations

- `portfolio_projects:reader` : ouvrir la liste et consulter les espaces de travail des projets
- `portfolio_projects:contributor` : mettre à jour le document géré **Objet** et gérer les entrées de temps d'overhead projet
- `portfolio_projects:manager` : créer des projets et gérer les données du projet, le statut, l'équipe, les relations, la chronologie, l'avancement, les tâches, l'évaluation, les commentaires et les décisions
- `portfolio_projects:admin` : inclut les capacités manager et peut également importer/exporter en CSV et gérer les entrées de temps d'overhead projet d'autres utilisateurs
- La consultation des connaissances nécessite également un accès Knowledge
- La création ou la liaison de connaissances autonomes nécessite également un rôle de création Knowledge

Si Projets n'apparaît pas dans la navigation, demandez à un administrateur de vous accorder l'accès.

## Travailler avec la liste

La liste des projets est conçue pour répondre rapidement à deux questions : « de quoi devrais-je me préoccuper ? » et « qu'est-ce qui avance ? »

**Sélecteur de périmètre**

- **Mes projets** affiche les projets où vous êtes explicitement impliqué en tant que sponsor, responsable ou contributeur
- **Projets de mon équipe** étend cette vue aux projets impliquant les membres de votre équipe Portefeuille
- **Tous les projets** retire ce filtre d'implication
- Si vous n'êtes pas assigné à une équipe Portefeuille, le périmètre équipe n'est pas disponible
- Votre préférence de périmètre est mémorisée, la liste revient comme vous l'avez laissée

**Comportement par défaut**

- Les projets sont triés par score de priorité sauf si vous changez le tri
- Les projets au statut **Terminé** sont masqués par défaut
- La recherche fonctionne sur le contenu textuel
- Les filtres de statut, origine, source, catégorie, flux et société sont disponibles directement dans la grille

**Ce que la grille met en avant**

- Numéro de référence (`PRJ-...`) et nom pour une identification rapide
- Priorité et statut pour la posture d'exécution
- Origine pour distinguer le travail issu de demandes du travail fast-track ou historique
- Avancement pour la visibilité de la livraison
- Champs de classification pour le reporting et le découpage du portefeuille
- Dates planifiées et date de création pour le contexte de planification

L'ouverture d'un projet depuis la liste préserve le contexte actuel de la liste. C'est important car l'espace de travail du projet utilise le même contexte pour la navigation **Précédent** et **Suivant**, ce qui vous permet de revoir un ensemble filtré sans perdre votre place.

**Administration en masse**

- **Nouveau projet** est disponible pour les gestionnaires
- **Import CSV** et **Export CSV** sont disponibles pour les administrateurs

## Créer un projet

La création directe de projet est destinée au travail qui doit entrer en exécution sans enregistrement de demande séparé.

- Les nouveaux projets s'ouvrent sur **Résumé** uniquement
- Tant que le projet n'est pas enregistré une première fois, les autres onglets ne sont pas disponibles
- Les projets créés directement utilisent une origine **Fast-track** ou **Historique**
- Les projets issus de demandes conservent leur origine et leur lien source

Utilisez **Fast-track** pour le travail qui est réellement introduit directement en livraison. Utilisez **Historique** pour le travail qui existe déjà en dehors de l'historique d'intake normal. Cette distinction affecte le reporting et rend l'analyse de portefeuille ultérieure beaucoup moins confuse.

## Modèle mental de l'espace de travail

L'espace de travail du projet comporte deux couches :

- La **zone de contenu principale** pour les onglets opérationnels : **Résumé**, **Activité**, **Chronologie**, **Avancement**, **Tâches**, **Évaluation** et **Base de connaissances**
- Une **barre latérale Propriétés du projet** persistante pour les propriétés principales, l'affectation de l'équipe et les relations

Voici le changement de comportement le plus important par rapport à la documentation antérieure : **Équipe** et **Relations** ne sont plus des onglets autonomes. Ils résident désormais dans la barre latérale et restent disponibles pendant que vous travaillez ailleurs.

Pour les projets existants, la barre latérale se comporte comme un panneau de propriétés en direct : les modifications y sont enregistrées immédiatement. Le contenu de l'onglet principal suit le flux habituel **Enregistrer** et **Réinitialiser** lorsque cet onglet contient des modifications en brouillon. Si vous changez d'onglet ou passez au projet précédent ou suivant avec des modifications non enregistrées, KANAP vous demande si vous souhaitez d'abord enregistrer.

## En-tête et navigation

L'en-tête de l'espace de travail n'est pas qu'une décoration ; c'est la barre de contrôle du projet.

- La pastille `PRJ-...` est la référence stable lisible par l'humain et peut être copiée directement
- La pastille de statut affiche l'état d'exécution actuel
- La pastille d'origine indique comment le projet est entré dans le portefeuille
- Les projets issus de demandes exposent un chemin direct vers la demande source
- La barre de progression dans l'en-tête affiche l'avancement d'exécution sans quitter la page
- **Précédent** et **Suivant** parcourent l'ensemble des résultats de la liste actuelle, pas tous les projets du système
- **Envoyer un lien** envoie par e-mail l'URL du projet actuel avec un message optionnel

Envoyer un lien ne donne pas accès. Il ne fait que partager l'emplacement. Les autorisations restent exactement les mêmes qu'avant l'envoi de l'e-mail, ce qui est le comportement souhaité.

## Barre latérale Propriétés du projet

Considérez la barre latérale comme la carte d'identité persistante du projet.

### Propriétés principales

La section principale contient les champs du projet qui définissent comment le projet apparaît ailleurs dans KANAP :

- nom du projet
- statut
- origine (uniquement lors de la création initiale)
- source, catégorie et flux
- société et département
- début prévu et fin prévue

Ces champs pilotent le reporting, la planification, le filtrage et le contexte par défaut du portefeuille. Les choix de classification sont particulièrement importants car ils affectent où le projet apparaît dans l'analyse transversale du portefeuille.

Changer le statut depuis la barre latérale est plus qu'une mise à jour de libellé. KANAP ouvre une boîte de dialogue de changement de statut pour que la transition puisse être enregistrée correctement. C'est là que vous pouvez consigner le changement comme une décision formelle, capturer le contexte et stocker la justification avec la transition au lieu de la laisser disparaître dans la mémoire de couloir.

Le workflow est intentionnellement contrôlé :

- **Liste d'attente** peut passer à **Planifié**, **En attente** ou **Annulé**
- **Planifié** peut passer à **En cours**, **En attente** ou **Annulé**
- **En cours** peut passer à **En test**, **Terminé**, **En attente** ou **Annulé**
- **En test** peut revenir à **En cours**, ou avancer vers **Terminé**, **En attente** ou **Annulé**
- **En attente** peut revenir à **Liste d'attente**, **Planifié** ou **En cours**, ou être **Annulé**
- **Terminé** et **Annulé** sont des états terminaux

### Équipe

L'affectation de l'équipe fait partie de la barre latérale pour rester disponible pendant que vous travaillez sur le planning, la charge ou les tâches.

- Sponsor métier / Sponsor IT capturent la responsabilité exécutive
- Responsable métier / Responsable IT identifient le leadership au quotidien
- Contributeurs métier / Contributeurs IT définissent l'équipe de travail élargie

Ces affectations font plus que remplir des cases :

- elles déterminent ce qui apparaît dans **Mes projets** et **Projets de mon équipe**
- elles alimentent le contexte du projet dans le résumé et le reporting
- elles définissent qui est disponible pour l'allocation de charge dans l'onglet **Avancement**

Si les responsables et les contributeurs sont incorrects, votre planification de charge sera également incorrecte.

### Relations

La section relations rassemble les liens qui expliquent comment le projet s'inscrit dans le reste du portefeuille.

- Les **dépendances** suivent les dépendances de livraison avec d'autres demandes ou projets
- Les **demandes source** montrent l'enregistrement de demande qui a produit le projet
- des relations supplémentaires capturent le contexte métier et technique connecté

Les dépendances sont opérationnelles, pas cosmétiques. Elles façonnent la manière dont les retards et le séquencement doivent être interprétés. Les liens vers les demandes source préservent la chaîne de l'intake à l'exécution, ce qui est essentiel lorsque quelqu'un demande plus tard « pourquoi faisons-nous ce projet ? »

## Résumé

L'onglet **Résumé** est le tableau de bord du projet. Il est conçu pour répondre à l'état actuel du projet en une seule passe, pas pour dupliquer chaque champ de la barre latérale.

Les cartes du résumé couvrent :

- statut et priorité actuels
- fenêtre de livraison et écart de planning
- consommation de charge et posture des tâches
- couverture de l'équipe et des relations
- empreinte base de connaissances
- dernière activité

Cet onglet est l'endroit où un gestionnaire peut comprendre si le projet est simplement vivant dans la base de données ou réellement sous contrôle.

### Objet

La section **Objet** du Résumé est un document projet géré, pas un champ de notes jetable.

- utilisez-le pour le brief narratif du projet : intention, résultat attendu, périmètre et tout cadrage qui doit voyager avec le projet
- les modifications de l'objet suivent le flux **Enregistrer** et **Réinitialiser** de l'espace de travail
- les contributeurs peuvent mettre à jour l'Objet même lorsqu'ils ne peuvent pas gérer le reste du projet

Cette séparation est délibérée. Elle permet à la propriété narrative d'être plus large que l'administration structurelle du projet.

L'éditeur d'Objet inclut l'import et l'export de documents :

- **Import** accepte un fichier `.docx` et le convertit au format markdown interne. Si l'Objet a déjà du contenu, KANAP demande une confirmation avant de le remplacer.
- **Export** vous permet de télécharger l'Objet actuel en PDF, DOCX ou ODT.

Ces outils sont utiles lorsqu'un brief projet a été rédigé dans Word ou lorsque les parties prenantes ont besoin d'une copie formatée en dehors de KANAP.

Le document géré Objet est différent de l'onglet **Base de connaissances** :

- **Objet** est le brief intégré, propriété du projet
- **Base de connaissances** est pour les documents autonomes qui peuvent nécessiter leur propre cycle de vie, réutilisation ou relations

## Activité

L'onglet **Activité** sépare la conversation de la preuve d'audit :

- **Commentaires** pour la discussion, les notes contextuelles et les décisions formelles
- **Historique** pour la piste d'audit des modifications de champs et de statut

Les gestionnaires peuvent ajouter et modifier les commentaires du projet. Les commentaires peuvent aussi être enregistrés comme des décisions formelles, avec un résultat et un changement de statut optionnel. Utilisez cela lorsque la discussion elle-même change le cours du projet.

Les images peuvent être incluses dans les commentaires d'activité lorsque la preuve visuelle est utile. C'est pratique pour les schémas d'architecture, les captures d'écran ou les preuves de revue.

Utilisez l'**Historique** lorsque vous devez savoir ce qui a changé. Utilisez les **Commentaires** lorsque vous devez savoir pourquoi.

## Chronologie

L'onglet **Chronologie** est l'endroit où la structure de livraison devient explicite.

### Dates du projet

La Chronologie affiche à la fois les dates prévues et les dates réelles.

- les dates prévues décrivent la fenêtre de livraison visée
- les dates réelles sont capturées par les événements d'exécution et sont en lecture seule dans l'espace de travail

Une fois que le projet entre en exécution, KANAP capture également les dates de référence pour que la dérive de planning puisse être mesurée plutôt que devinée.

### Phases

Les projets peuvent démarrer avec un modèle de phases ou un plan de phases entièrement personnalisé.

- si aucune phase n'existe encore, appliquez un modèle pour créer la structure initiale
- une fois les phases créées, elles peuvent être réordonnées, renommées, datées et gérées en statut
- les phases peuvent être marquées comme jalons
- chaque phase inclut un raccourci pour créer une tâche déjà liée à cette phase et ce projet
- **Remplacer par un modèle** reconstruit la structure des phases, ne l'utilisez que lorsque vous voulez réellement « recommencer le modèle de phases »

Le modèle de phases affecte plus que la chronologie :

- la phase active apparaît dans le **Résumé**
- les tâches liées aux phases héritent immédiatement du contexte de livraison
- les jalons de phase fournissent des marqueurs d'achèvement sans créer un schéma de suivi séparé

### Jalons

Les jalons peuvent être créés de deux manières :

- en activant le suivi de jalon sur une phase
- en ajoutant des jalons autonomes manuellement

Les jalons liés aux phases suivent la phase à laquelle ils sont attachés. Les jalons autonomes sont pour les points de contrôle qui doivent exister en dehors de la structure des phases.

### Vues Tableau et Gantt

La chronologie peut être gérée sous forme de tableau ou de vue Gantt.

- utilisez le tableau lorsque vous façonnez la structure
- utilisez le Gantt lorsque vous devez voir les chevauchements, le séquencement et la répartition des dates

Seules les phases avec des dates de début et de fin exploitables apparaissent de manière significative sur le Gantt. Si les dates sont vagues, le diagramme sera également vague.

## Avancement

L'onglet **Avancement** combine l'avancement d'exécution, la planification de la charge et la consommation réelle de temps. Cette combinaison est importante car un projet qui affiche 80 % d'avancement avec 20 % de la charge consommée n'est pas nécessairement efficace ; il peut simplement être mal estimé.

### Avancement et charge

- **Avancement d'exécution** est le signal d'achèvement global du projet
- **Consommation de charge** compare la charge réelle avec la charge planifiée

Gardez ces deux chiffres alignés avec la réalité. Si l'avancement progresse sans charge correspondante, ou si la charge s'accumule sans mouvement de livraison, le décalage vous dit généralement quelque chose d'important sur le périmètre, l'estimation ou la discipline de reporting.

### Charge estimée et ventilations

L'Avancement sépare la charge estimée en :

- **Charge IT**
- **Charge Métier**

Chaque côté peut être ventilé entre le responsable et les contributeurs concernés. Ces ventilations dépendent de l'équipe configurée dans la barre latérale, donc les changements d'équipe ont des conséquences de planification ici aussi.

### Charge réelle et journal de temps

La charge réelle est calculée à partir de deux sources :

- Le temps d'**Overhead projet** saisi directement sur le projet
- Le **Temps des tâches** saisi depuis les tâches du projet

Le journal de temps fusionne les deux dans une seule vue et identifie la source de chaque entrée. C'est intentionnel : la charge du projet doit être comprise comme l'empreinte totale de livraison, pas comme un combat entre « travail projet » et « travail de tâches ».

Conséquences importantes :

- le temps des tâches contribue automatiquement à la charge réelle du projet
- le temps des tâches est visible ici mais doit être corrigé dans l'espace de travail de la tâche
- les entrées d'overhead projet sont gérées depuis l'onglet Avancement
- les contributeurs peuvent gérer leurs propres entrées d'overhead projet
- les administrateurs peuvent gérer les entrées d'overhead projet de tous les utilisateurs

### Charge de référence

Lorsque le projet passe à **En cours**, KANAP capture les valeurs de charge de référence. Les modifications ultérieures sont affichées comme un écart par rapport à cette référence, ce qui est utile pour distinguer les mises à jour normales de livraison d'une dérive de périmètre silencieuse.

## Tâches

L'onglet **Tâches** est la file d'exécution du projet.

- les tâches créées ici sont automatiquement liées au projet
- les tâches peuvent aussi être créées directement depuis une phase de la chronologie, ce qui les lie à la fois au projet et à la phase sélectionnée
- l'onglet supporte le filtrage par statut et par phase
- la vue par défaut des tâches se concentre sur le travail actif en masquant les éléments terminés et annulés

Cet onglet est dédié à la gestion des tâches liées au projet en contexte, pas au remplacement de l'espace de travail complet des tâches. L'ouverture d'une tâche vous amène dans son propre espace de travail, où les détails spécifiques et la saisie de temps continuent.

Du point de vue du projet, la conséquence importante est la suivante : le statut et le temps des tâches ne sont pas isolés. Ils alimentent le **Résumé** et l'**Avancement**, de sorte que les tâches négligées rendent l'ensemble du tableau de bord du projet moins fiable.

## Évaluation

L'onglet **Évaluation** maintient le lien entre la livraison et la priorisation.

- pour les projets issus de demandes, la demande source reste visible comme référence d'évaluation
- pour les projets fast-track et historiques, l'évaluation est gérée directement sur le projet
- les gestionnaires peuvent revoir ou mettre à jour l'évaluation, y compris les dérogations de priorité lorsque les règles du portefeuille le permettent

Le score de priorité résultant est important en dehors de cet onglet :

- il apparaît dans l'en-tête du projet
- il est visible dans la liste
- il affecte le classement des projets lorsque la liste est triée par priorité

Si l'évaluation s'éloigne de la réalité de livraison, les discussions de portefeuille deviennent plus difficiles qu'elles ne devraient l'être.

## Base de connaissances

L'onglet **Base de connaissances** connecte le projet aux documents autonomes de la base de connaissances.

Il distingue entre :

- les **documents liés** : documents directement attachés au projet
- les **documents associés** : documents découverts via d'autres entités liées telles que les demandes source, les dépendances ou les éléments connectés

Cette distinction est importante :

- les liens directs représentent la documentation que le projet possède ou utilise explicitement
- les liens associés fournissent du contexte sans prétendre que tout appartient directement au projet

Selon vos autorisations Knowledge, vous pouvez :

- créer un nouveau document vierge déjà lié au projet
- créer un document lié à partir d'un modèle
- lier un document existant
- détacher des documents directement liés
- ouvrir n'importe quel document lié ou associé dans la base de connaissances

Si vous pouvez ouvrir le projet mais n'avez pas les droits de consultation Knowledge, KANAP vous indiquera que des connaissances existent sans exposer le contenu du document. C'est le comportement attendu, pas un onglet défaillant.

La base de connaissances remonte également dans le **Résumé**, où le projet affiche le nombre de documents autonomes liés et quand cette documentation a été mise à jour pour la dernière fois.

## Import et export CSV

Les outils CSV de projet sont disponibles depuis la page de liste pour les administrateurs.

### Export

Les exports supportent :

- **Export complet**
- **Enrichissement de données**
- **Sélection personnalisée**

Utilisez l'**Enrichissement de données** lorsque vous souhaitez exporter, ajuster certains champs en externe, puis réimporter le résultat dans KANAP sans difficulté.

### Import

Les imports sont conçus pour des modifications en masse contrôlées :

- téléchargez d'abord un modèle lorsque vous avez besoin de la bonne structure
- validez avant d'importer
- utilisez les options avancées pour choisir entre le comportement d'enrichissement ou de remplacement et les règles d'insertion/mise à jour

L'import en masse est utile pour la maintenance de grands portefeuilles, mais ce n'est pas un raccourci autour de la gouvernance de projet. La planification des phases, les tâches, la base de connaissances et le contrôle continu de la livraison restent dans l'espace de travail.

## Envoyer un lien

Utilisez **Envoyer un lien** depuis l'en-tête de l'espace de travail pour envoyer par e-mail un lien direct vers le projet à des destinataires internes ou externes.

- vous pouvez l'envoyer à des utilisateurs de la plateforme ou à n'importe quelle adresse e-mail
- vous pouvez inclure un message optionnel
- le lien copié ou envoyé pointe directement vers l'espace de travail du projet

Encore une fois, envoyer un lien ne donne pas accès. Il évite simplement aux gens de devoir chercher le projet eux-mêmes.

## Conseils pratiques

- Utilisez la barre latérale pour les données structurelles qui doivent rester visibles pendant que vous travaillez.
- Utilisez le **Résumé** pour le récit du projet et la vue d'ensemble opérationnelle.
- Utilisez la **Chronologie** pour définir la structure de livraison avant que le volume de tâches ne croisse.
- Utilisez l'**Avancement** régulièrement, sinon l'écart de charge arrive comme une surprise alors que les données vous avertissaient déjà.
- Utilisez la **Base de connaissances** pour la documentation réutilisable ou gouvernée, pas comme une deuxième copie du brief d'Objet.
- Utilisez l'**Import** sur l'éditeur d'Objet lorsqu'un brief projet existe déjà en tant que document Word, plutôt que de le reformater à la main.
