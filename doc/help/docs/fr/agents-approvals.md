# Agents IA — Approbations

Les Approbations constituent la file de revue quotidienne de tout ce que vos agents IA veulent faire. Avant qu'un agent ne publie une réponse, n'ajoute une note, ne reclasse un ticket, ne change son statut, ne le réaffecte ou ne le clôture, il vous soumet ce travail ici sous forme de **proposition**. Rien sur cette page ne s'est encore produit du côté du demandeur : une proposition est la suggestion de l'agent, et elle n'atteint votre système de tickets connecté qu'une fois que vous l'avez approuvée. C'est là qu'un opérateur passe le plus clair de son temps à superviser un agent helpdesk : lire les brouillons, appliquer les bons et rejeter le reste.

## Où la trouver

- Espace de travail : **Agents IA**
- Chemin : **Agents IA → Approbations**
- Route : `/agents/approvals`
- Autorisation : nécessite que l'IA soit activée sur l'instance et le rôle Lecteur des Agents IA (`ai_agents:reader`)
- La même file apparaît, limitée à un seul agent, dans l'onglet **Approbations** de l'[espace de l'agent](agents-workspace.md). La page `/agents/approvals` est la vue combinée de tous les agents ; l'onglet de l'espace n'affiche que les propositions de l'agent que vous consultez. La disposition et les commandes sont identiques.

---

## Ce qu'est une proposition

Chaque proposition correspond à une action concrète qu'un agent souhaite effectuer sur un ticket. Il existe huit types d'actions, chacun avec son propre libellé et sa propre icône :

| Action | Effet |
| --- | --- |
| **Réponse demandeur** | Un message que l'agent souhaite envoyer à la personne qui a ouvert le ticket. |
| **Note interne** | Une note que l'agent souhaite ajouter pour votre équipe, non visible par le demandeur. |
| **Classification** | Une modification de la catégorie, du type, de l'urgence ou d'attributs similaires du ticket. |
| **Statut** | Un passage à un autre statut de ticket (par exemple, de **Nouveau** à **En attente**). |
| **Clôturer le ticket** | Un changement de statut terminal qui clôture le ticket — voir [Actions terminales](#actions-terminales). |
| **Résoudre le ticket** | Un changement de statut terminal qui marque le ticket comme résolu — voir [Actions terminales](#actions-terminales). |
| **Affectation** | Une modification de la personne à qui le ticket est affecté. |
| **Participants** | Une modification des observateurs ou des demandeurs du ticket. |

Pour une **Réponse demandeur** ou une **Note interne**, le corps que vous voyez est le message rédigé complet, exactement tel qu'il serait publié. Lisez-le comme le ferait le demandeur (ou votre équipe). Pour les cinq autres types, le corps est un bref résumé du changement plutôt qu'un texte libre — par exemple `Status: New -> Pending`, `Assignee: Unassigned -> Jane`, ou un différentiel de classification champ par champ — souvent suivi d'une ligne **Motif** expliquant pourquoi l'agent le propose.

Les propositions sont regroupées par ticket. Chaque groupe a pour en-tête le ticket (**Ticket #N**), son statut actuel, un décompte tel que **3 propositions** et sa date de dernière mise à jour. Un ticket peut contenir plusieurs propositions à la fois — par exemple une réponse, une reclassification et un changement de statut — et vous pouvez les décider individuellement ou toutes ensemble.

---

## Les quatre sections

La file est organisée en quatre sections selon la position de chaque élément dans son cycle de vie. Chacune a son propre message d'état vide, afin que vous puissiez distinguer « rien ici » de « chargement en cours ».

### Nécessite votre décision

Les propositions qui vous attendent, regroupées par ticket. C'est la seule section où vous agissez ; les trois autres sont informatives. Lorsqu'elle est vide, elle affiche *Rien ne nécessite votre décision.* Une fois que vous avez décidé d'une proposition, elle se réduit à une seule ligne de statut au sein de son groupe de ticket, tandis que les propositions restantes du ticket demeurent ouvertes pour vous.

### En cours

Le travail déjà en mouvement et qui ne requiert rien de votre part : les propositions que vous avez approuvées et qui sont en cours d'application sur le système de tickets connecté, ainsi que les tickets qu'un agent est en train de contrôler. Les lignes affichent ici un statut en direct tel que **En attente de démarrage**, **En cours**, **Exécution…** ou **Agent au travail…**. Au repos, elle affiche *Aucun travail agent n'est en cours.*

### Attention requise

Tout ce qui a échoué ou est bloqué — une proposition qui n'a pas pu être envoyée au système de tickets connecté, ou un contrôle qui a échoué. Chaque ligne porte une légende rouge expliquant ce qui n'a pas fonctionné, ainsi qu'un lien **Trace** vers la chronologie de l'[Activité](agents-activity.md) pour que vous puissiez voir toute l'histoire. Lorsqu'elle est vide, elle affiche *Aucun travail agent ne nécessite d'attention.* C'est la section à surveiller : les éléments y arrivent lorsqu'un changement a été approuvé mais que le système de tickets l'a refusé ou n'a pas pu le mener à terme.

### Récemment terminés

Un historique repliable des éléments les plus récemment terminés — appliqués, rejetés, ignorés ou effectués. Il reste replié jusqu'à ce que vous l'ouvriez, mémorise ce choix, et affiche jusqu'à une trentaine de lignes avec une ligne **+N autres** s'il y en a davantage. Utilisez-le pour confirmer qu'une approbation a bien abouti, ou pour vérifier ce qu'un agent a fait pendant votre absence.

---

## Prendre une décision : Approuver, Exécuter et Rejeter

Chaque proposition en attente comporte deux boutons.

- Le bouton principal affiche **Approuver** sur une proposition que vous n'avez pas encore décidée, et **Exécuter** sur une proposition que vous avez déjà approuvée mais qui n'a pas encore été exécutée. Dans les deux cas, il fait la même chose : il envoie l'action à votre système de tickets connecté, où l'agent publie la réponse ou la note, ou applique le changement. L'approbation est le moment où le demandeur (ou votre équipe) peut être affecté — jusque-là, rien n'a quitté KANAP.
- **Rejeter** n'applique pas l'action. La proposition est abandonnée mais reste dans le journal d'audit, de sorte qu'il existe toujours une trace de ce que l'agent a suggéré et du fait que vous l'avez refusé. Le rejet d'une seule proposition prend effet immédiatement.

Si une proposition est actuellement **bloquée** — par exemple parce qu'un contrôle de fraîcheur ou de sécurité n'est plus valide, ou parce que le système de tickets n'accepte pas le changement pour le moment — son bouton est désactivé et la raison apparaît dans l'infobulle du bouton. La proposition reste visible pour que vous puissiez voir pourquoi elle ne peut pas aboutir.

**Tout approuver** et **Tout rejeter** apparaissent sur un groupe de ticket lorsqu'il y a plus d'un élément à traiter, ce qui vous permet de vider un ticket entier en une seule étape. **Tout rejeter** ouvre une courte boîte de dialogue qui confirme le nombre de propositions qui seront rejetées et propose une note facultative pour le journal d'audit. Le passage en automatique se fait par type d'action, uniquement une fois qu'assez de vos décisions ont été recueillies pour promouvoir ce type d'action de **Demander d'abord** à **Automatique** dans les [Paramètres](agents-workspace.md) de l'agent ; jusque-là, et toujours pour le travail sensible, chaque proposition passe par cette file.

---

## Actions terminales

Les propositions **Clôturer le ticket** et **Résoudre le ticket** sont signalées **Terminale** en rouge, car elles mettent fin au ticket et le demandeur voit le changement immédiatement. Elles bénéficient d'un garde-fou supplémentaire.

L'approbation d'une proposition terminale — seule ou dans le cadre d'un **Tout approuver** où au moins un élément est terminal — ouvre une confirmation **Appliquer l'action terminale**. Elle nomme l'action et le ticket exacts, avertit que le demandeur verra le changement immédiatement, liste chaque élément terminal d'une approbation groupée, et vous fournit un champ de motif pour la trace. Vous confirmez avec **Appliquer quand même**. Il s'agit d'une friction délibérée : les réponses et notes de routine s'appliquent en un clic, mais la clôture ou la résolution d'un ticket vous demande toujours de marquer une pause et de confirmer.

---

## Lire les réponses rédigées : la note de secours

Lorsqu'un agent rédige une **Réponse demandeur** ou une **Note interne**, il ancre normalement ce brouillon dans vos bibliothèques de la [Base de connaissances](knowledge.md) et cite les sources qu'il a utilisées. Il arrive que vous voyiez une petite légende **Synthèse de secours** sur une telle proposition. Cela signifie que l'agent n'a pas pu étayer ce brouillon particulier avec des sources citées — traitez-le donc comme une simple suggestion et lisez-le attentivement avant de l'approuver, plutôt que de lui faire confiance comme s'il était vérifié par rapport aux sources.

La légende nomme la raison en termes simples, par exemple :

- **Erreur de synthèse** — un problème est survenu lors de la composition de la réponse étayée.
- **Synthèse désactivée** — la rédaction étayée est désactivée pour cette instance.
- **Projection au-delà du plafond du run** — la composition de la réponse étayée aurait dépassé le budget de ce contrôle.
- **Fuite de contexte opérationnel bloquée** — le brouillon a été retenu car il risquait d'exposer des consignes internes au demandeur.
- **Synthèse invalide ou non étayée** — le brouillon n'a pas pu être vérifié par rapport à vos sources.

L'essentiel à retenir est que **l'absence de cette note est le cas normal et sain.** La plupart des brouillons sont étayés et ne portent aucune légende. Et une réponse peut légitimement n'avoir aucune source citée — un accusé de réception administratif ou une escalade purement interne n'est pas censé être rédigé à partir de votre base de connaissances — sans déclencher cet avertissement. Ne voyez donc pas l'absence de note de secours comme un problème ; cela signifie que le brouillon est soit correctement étayé, soit qu'il n'était pas censé l'être. La note n'apparaît que lorsque l'agent a tenté d'étayer une réponse et n'y est pas parvenu.

---

## Remonter d'une proposition à son contrôle

Chaque groupe de ticket et chaque ligne d'attention porte un lien **Trace**. Il renvoie directement vers l'entrée correspondante dans la chronologie de l'[Activité](agents-activity.md), où vous pouvez suivre le contrôle complet qui a produit la proposition — ce que l'agent a consulté, ce qu'il a décidé et pourquoi. Utilisez-le chaque fois qu'un brouillon ou une mise à jour vous surprend et que vous voulez en connaître le raisonnement. Pour les administrateurs qui ont besoin du détail de bas niveau, l'Activité expose également une vue de diagnostic facultative des étapes de traitement brutes.

---

## Conseils

- Travaillez de haut en bas : videz **Nécessite votre décision**, puis jetez un œil à **Attention requise** pour tout ce qui n'a pas atteint le système de tickets. Les deux sections du milieu ne requièrent aucune action de votre part.
- Rien ici n'a atteint le demandeur tant que vous ne l'avez pas approuvé. Lire un brouillon, le tracer ou le laisser dans la file ne change rien au ticket.
- Rejetez plutôt que d'ignorer. Une proposition rejetée reste dans le journal d'audit avec votre note facultative, ce qui est bien plus utile par la suite qu'une proposition qui a simplement expiré sans avoir été traitée.
- L'absence de note **Synthèse de secours** est une bonne nouvelle, pas une information manquante. Réservez votre lecture la plus attentive aux brouillons qui *en* portent une.
- Si un changement approuvé se retrouve dans **Attention requise**, la légende rouge et le lien **Trace** vous indiquent si c'est l'agent, un contrôle de sécurité ou le système de tickets connecté qui l'a bloqué — corrigez la cause sous-jacente plutôt que de réapprouver à l'aveugle.
- La file combinée `/agents/approvals` est la plus rapide lorsque vous exécutez plusieurs agents ; passez à l'onglet **Approbations** propre à un agent lorsque vous voulez vous concentrer sur celui-là uniquement.
