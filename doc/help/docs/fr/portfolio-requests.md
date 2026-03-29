# Demandes du portefeuille

Les demandes du portefeuille constituent la couche d'intake pour les travaux proposés. Une demande permet de capturer le besoin métier, d'évaluer la faisabilité, de noter la priorité, de rassembler les connaissances de support et de décider si l'initiative doit avancer sous forme de projet. En pratique, c'est là que les idées deviennent du travail gouverné plutôt que du folklore de couloir.

## Où trouver cette page

- Espace de travail : **Portefeuille**
- Chemin : **Portefeuille > Demandes**

### Autorisations

| Autorisation | Ce qu'elle permet |
| --- | --- |
| `portfolio_requests:reader` | Ouvrir la liste des demandes et consulter les espaces de travail des demandes |
| `portfolio_requests:member` | Modifier les documents gérés intégrés dans l'espace de travail, même sans droits plus larges de gestion des demandes |
| `portfolio_requests:manager` | Créer des demandes, mettre à jour les données, gérer l'équipe et les relations, ajouter des commentaires et des décisions, modifier le statut, soumettre des recommandations d'analyse et modifier l'évaluation |
| `portfolio_requests:admin` | Supprimer des demandes et utiliser l'import/export CSV |

L'onglet **Base de connaissances** suit les autorisations Knowledge pour les actions de création et de liaison. Un utilisateur peut être autorisé à travailler sur le contenu de la demande sans être autorisé à créer ou relier des documents autonomes de la base de connaissances.

## Travailler avec la liste

La liste est conçue pour le triage plutôt que la consultation d'archives. Par défaut, elle trie les demandes par priorité afin que le travail le plus urgent ou le plus stratégique apparaisse en premier.

### Filtres de périmètre

Utilisez le sélecteur de périmètre au-dessus de la grille pour contrôler quel pipeline vous consultez :

- **Mes demandes** affiche les demandes où vous êtes explicitement impliqué, en tant que demandeur, sponsor, responsable ou contributeur.
- **Demandes de mon équipe** étend cette vue aux demandes impliquant les membres de votre équipe Portefeuille. Cette option n'est pas disponible si vous n'êtes pas assigné à une équipe.
- **Toutes les demandes** retire le filtre d'implication et affiche le pipeline complet des demandes.

Votre choix de périmètre est mémorisé. Si vous ouvrez une demande depuis la liste et revenez plus tard, KANAP conserve le contexte de la liste pour que vous n'ayez pas à reconstruire vos filtres à chaque fois.

### Colonnes par défaut

La grille standard met en avant les champs importants pendant l'intake et la revue :

- **#**
- **Nom de la demande**
- **Priorité**
- **Statut**
- **Source**
- **Catégorie**
- **Flux**
- **Société**
- **Demandeur**
- **Date cible**
- **Créée**

Des colonnes supplémentaires, comme **Dernière modification**, peuvent être affichées via les préférences de la grille si nécessaire.

### Comportement des filtres

- La recherche globale fonctionne sur le contenu des demandes et les métadonnées métier visibles.
- Des filtres de colonnes sont disponibles pour les principaux champs de classification et de responsabilité.
- Les demandes avec le statut **Convertie** sont masquées par défaut pour que la liste reste focalisée sur l'intake actif. Si vous devez consulter les décisions d'intake historiques, incluez **Convertie** dans le filtre de statut.

### Actions de la liste

- **Nouvelle demande** est disponible pour les gestionnaires de demandes.
- **Import CSV** et **Export CSV** sont disponibles pour les administrateurs de demandes.

## L'espace de travail de la demande

L'espace de travail actuel utilise un modèle divisé :

- La zone principale est dédiée au récit, à l'analyse, à l'évaluation, à l'activité et à la base de connaissances.
- La barre latérale de propriétés à droite est dédiée aux métadonnées stables de la demande, à l'affectation de l'équipe et aux relations.

Cela est important car tout n'est pas enregistré de la même manière :

- Les modifications dans la **barre latérale de propriétés** sont appliquées directement à la demande.
- Les modifications dans **Résumé**, **Analyse** et **Évaluation** sont des modifications de l'espace de travail et utilisent **Enregistrer** / **Réinitialiser**.
- Les documents gérés **Objet** et **Risques et mesures d'atténuation** utilisent également le flux d'enregistrement de l'espace de travail.

Si vous créez une nouvelle demande, KANAP démarre sur **Résumé**. Les autres onglets deviennent utiles une fois que la demande existe en tant qu'enregistrement réel plutôt que comme une idée très sincère.

L'en-tête de l'espace de travail vous donne le contexte opérationnel sans quitter la page :

- une référence de demande copiable comme `REQ-42`
- le statut actuel
- la tâche d'origine lorsque la demande a été créée à partir d'un travail de tâche
- **Envoyer un lien** pour le partage
- navigation précédent/suivant basée sur le contexte exact de la liste d'où vous venez

### Modèle mental de la barre latérale de propriétés

Considérez la barre latérale comme l'ossature structurelle de la demande.

#### Propriétés principales

Cette section contient l'identité et la classification de la demande :

- Nom de la demande
- Statut
- Source, Catégorie et Flux
- Demandeur
- Société et Département
- Date de livraison cible

Ces champs façonnent la manière dont la demande est routée, filtrée et revue ailleurs dans l'espace de travail. Par exemple :

- modifier le **Statut** affecte les décisions possibles et la disponibilité de la conversion
- modifier la **Catégorie** ou le **Flux** change le contexte analytique pour la faisabilité et l'évaluation
- modifier la **Société** ou le **Demandeur** change la visibilité en termes de reporting et de responsabilité dans le portefeuille

#### Équipe

La section Équipe assigne la responsabilité plutôt que de simplement maintenir une liste de contacts :

- Sponsor métier
- Responsable métier
- Sponsor IT
- Responsable IT
- Contributeurs métier
- Contributeurs IT

Ces affectations entraînent une visibilité partagée et clarifient qui est censé sponsoriser, façonner et livrer la demande. Le Résumé utilise ces données pour montrer si la demande dispose d'une responsabilité nommée suffisante pour avancer raisonnablement.

#### Relations

Les relations expliquent comment la demande s'inscrit dans le portefeuille plus large :

- Les **dépendances** identifient le travail qui doit exister, se terminer ou rester aligné avant que cette demande puisse aboutir.
- Les **projets résultants** montrent ce qui a été créé à partir de la demande après conversion.

Cette section est importante pour l'analyse d'impact. Une demande avec des données de relation faibles peut sembler inoffensive jusqu'à ce qu'elle entre en collision avec du travail existant.

Les anciens favoris peuvent encore pointer vers `overview`, `team` ou `relations`. Dans l'espace de travail actuel, ce contenu se trouve dans **Résumé** et la barre latérale de propriétés.

## Résumé

**Résumé** est le tableau de bord de la demande. Ce n'est pas un simple onglet de vue d'ensemble ; c'est là que KANAP compresse l'état de la demande en un instantané opérationnel.

Le Résumé inclut :

- **Instantané du statut**, incluant le statut actuel, la priorité actuelle, les processus métier liés et la dernière activité
- **Instantané de l'analyse**, incluant le signal de faisabilité le plus fort et la dernière recommandation d'analyse
- **Équipe et base de connaissances**, incluant la couverture des rôles, le nombre de contributeurs, la tâche d'origine et le nombre de documents liés
- le document géré **Objet**
- un fil d'**Activité récente**

Utilisez le Résumé lorsque vous avez besoin de comprendre si la demande est simplement enregistrée ou si elle est réellement prête à être discutée, évaluée et convertie.

### L'Objet en tant que document géré

La section **Objet** est un document markdown géré intégré directement dans la demande. C'est plus qu'un simple champ de description long :

- il donne aux relecteurs une déclaration d'intention stable
- il est disponible lors de la conversion demande-vers-projet
- il peut être modifié par les utilisateurs avec `portfolio_requests:member`, même s'ils ne gèrent pas le reste de la demande
- il prend en charge l'**import DOCX** pour importer directement des documents Word existants, et l'**export** pour télécharger le contenu actuel

Cette séparation est délibérée. Elle permet aux contributeurs experts du sujet d'améliorer le récit de la demande sans ouvrir le contrôle total sur le statut, l'évaluation et la structure du portefeuille.

## Activité

**Activité** sépare la discussion de la piste d'audit :

- **Commentaires** est le flux de collaboration
- **Historique** est le journal des modifications

### Commentaires

Les commentaires supportent la discussion normale, mais ils supportent également les **décisions formelles**. Une décision formelle peut capturer :

- le contexte de la réunion ou de la décision
- le résultat de la décision
- la justification
- un changement de statut optionnel dans la même action

Cette combinaison est importante. Elle maintient la traçabilité de la gouvernance : l'enregistrement du *pourquoi* quelque chose a changé reste attaché au changement au lieu d'être reconstruit plus tard de mémoire et avec optimisme.

Les commentaires supportent le markdown et les images en ligne, ce qui est utile pour les notes de conception, les preuves, les captures d'écran et le matériel de revue.

### Historique

L'Historique est la vue d'audit. Utilisez-le lorsque vous devez répondre à des questions telles que :

- qui a changé le statut
- quand les affectations d'équipe ont changé
- si une modification d'évaluation ou d'analyse s'est produite avant ou après une décision

Si vous avez besoin de récit, utilisez les Commentaires. Si vous avez besoin de preuve, utilisez l'Historique.

## Analyse

**Analyse** est l'endroit où la demande passe de « ça semble raisonnable » à « suffisamment compris pour décider ».

Elle rassemble quatre éléments distincts :

- les processus métier impactés
- la revue de faisabilité structurée
- les **Risques et mesures d'atténuation** gérés
- la **Recommandation d'analyse** formelle

### Processus métier impactés

Liez les processus métier touchés par la demande. Cela change la signification de la demande en termes de portefeuille : une demande affectant des processus opérationnels critiques ne devrait pas être évaluée de la même manière qu'une amélioration de confort locale.

### Revue de faisabilité

La revue de faisabilité est une évaluation structurée sur sept dimensions. Chaque dimension peut être évaluée avec un niveau de préoccupation et des notes de support.

Utilisez cette section pour exposer tôt les frictions de livraison :

- toutes les demandes n'échouent pas parce que l'idée est mauvaise
- beaucoup échouent parce que les contraintes d'intégration, d'infrastructure, de sécurité, de timing ou de gestion du changement ont été ignorées jusqu'à ce qu'il soit trop tard

L'onglet Résumé fait remonter le niveau de préoccupation le plus fort de cette revue afin que les problèmes majeurs restent visibles même lorsque personne n'ouvre l'Analyse.

### Risques et mesures d'atténuation

**Risques et mesures d'atténuation** est un autre document markdown géré. Utilisez-le pour documenter les risques résiduels, les actions d'atténuation et la responsabilité. Comme l'Objet, il peut être modifié par les utilisateurs avec `portfolio_requests:member` et prend en charge l'**import DOCX** pour importer des documents Word existants ainsi que l'**export**.

C'est utile lorsque les personnes les mieux placées pour décrire les risques ne sont pas les mêmes que celles qui devraient modifier le statut de la demande ou la structure du portefeuille.

### Recommandation d'analyse

Le flux de recommandation publie une décision formelle dans l'Activité avec le contexte fixe **Recommandation d'analyse**. Il peut également changer le statut de la demande en même temps.

Cela signifie que l'Analyse n'est pas une zone de prise de notes isolée. Elle fait partie de la piste de gouvernance :

- les relecteurs peuvent voir la dernière recommandation directement dans l'Analyse
- la même recommandation apparaît dans l'Activité comme un enregistrement de décision
- les changements de statut optionnels restent liés à la recommandation qui les a justifiés

Les demandes plus anciennes peuvent également afficher une section **Analyse précédente (historique)**. Ce contenu est conservé pour la continuité, mais le modèle actuel de demande s'appuie sur la revue de faisabilité, les risques gérés et les recommandations formelles.

## Évaluation

**Évaluation** évalue la demande par rapport au modèle d'évaluation du portefeuille configuré pour votre tenant.

En pratique :

- chaque critère actif contribue à la priorité calculée
- le score résultant alimente la comparaison du portefeuille et l'ordre de la liste
- une dérogation peut être utilisée lorsque le score calculé est mathématiquement correct mais opérationnellement erroné

Si la dérogation de priorité est utilisée, elle devrait être traitée comme une exception, pas comme un mode de vie.

Lorsqu'elles sont activées par les paramètres du portefeuille, des règles de contournement obligatoire peuvent forcer la priorité maximale pour les demandes éligibles. Cela est typiquement utilisé pour du travail qui ne peut raisonnablement pas être mis en concurrence avec la demande discrétionnaire.

Une fois qu'une demande est **Convertie**, l'évaluation passe en lecture seule. À ce stade, la demande a déjà rempli son rôle en tant qu'enregistrement d'intake et de priorisation.

## Base de connaissances

L'onglet **Base de connaissances** connecte la demande aux documents autonomes de la base de connaissances. Ce n'est pas simplement une étagère de pièces jointes avec une meilleure posture.

L'onglet distingue deux types de connaissances :

- Les **documents liés** sont directement attachés à la demande.
- Les **documents associés** sont découverts via le contexte plus large de la demande, comme les dépendances, les demandes associées, les projets résultants et d'autres objets liés.

Cette distinction est importante :

- les documents directs font partie de l'ensemble documentaire explicite de la demande
- les documents associés ajoutent du contexte sans prétendre que la demande les possède

### Ce que vous pouvez faire

Avec des autorisations Knowledge suffisantes, vous pouvez :

- créer un nouveau document vierge déjà lié à la demande
- créer un document lié à partir d'un modèle
- lier un document de la base de connaissances existant
- détacher un document directement lié
- ouvrir n'importe quel document lié ou associé dans l'espace de travail Base de connaissances

Sans ces autorisations, l'onglet fonctionne toujours comme une vue de référence tant que vous êtes autorisé à voir la base de connaissances sous-jacente.

### Documents gérés versus documents de la base de connaissances

Les documents gérés **Objet** et **Risques et mesures d'atténuation** font partie de la demande elle-même. Ils ne sont pas la même chose que les documents de la base de connaissances.

Utilisez les documents gérés pour le récit central de la demande qui doit toujours voyager avec elle. Utilisez la base de connaissances pour les documents autonomes qui peuvent nécessiter leur propre cycle de vie, leurs relations, leurs exports, leurs modèles et leur réutilisation au-delà d'une seule demande.

## Convertir une demande en projet

Une fois qu'une demande atteint le statut **Approuvée**, l'espace de travail propose **Convertir en projet**.

Le flux de conversion vous permet de :

- confirmer ou ajuster le nom du projet
- définir les dates de début et de fin prévues
- revoir le texte d'Objet actuel
- reporter les estimations de charge IT et Métier dérivées des entrées d'évaluation de la demande

Après la conversion :

- la demande devient un enregistrement durable d'intake et de décision
- le projet résultant apparaît dans la section Relations de la demande
- l'évaluation est gelée sur la demande
- la demande peut toujours être ouverte pour l'audit, le contexte et le traçage de la base de connaissances

En d'autres termes, la conversion ne supprime pas la demande. Elle la promeut.

## Import et export CSV

L'import et l'export CSV sont disponibles pour `portfolio_requests:admin`.

Utilisez l'export lorsque vous avez besoin de reporting de portefeuille ou d'enrichissement hors ligne. Utilisez l'import lorsque vous devez créer ou mettre à jour des demandes en masse. Comme l'import peut modifier des enregistrements d'intake à grande échelle, il est intentionnellement réservé aux administrateurs.

## Conseils

- **Utilisez l'import DOCX pour le contenu existant** : Si vous avez déjà une déclaration d'objet ou un registre des risques dans un document Word, utilisez le bouton **Import** sur l'éditeur d'Objet ou de Risques et mesures d'atténuation au lieu de copier-coller. L'import convertit le document en markdown et vous avertit si du contenu n'a pas pu être repris.
- **Les filtres de périmètre sont persistants** : KANAP mémorise votre dernier choix de périmètre, vous n'avez pas besoin de le re-sélectionner à chaque session.
- **Les demandes converties sont masquées par défaut** : Si vous cherchez une demande déjà convertie en projet, ajoutez **Convertie** au filtre de statut de la liste.
- **Autorisation Member pour les contributeurs** : Donnez aux experts du sujet `portfolio_requests:member` pour qu'ils puissent modifier l'Objet et les Risques et mesures d'atténuation sans pouvoir changer le statut, l'évaluation ou la structure du portefeuille.
