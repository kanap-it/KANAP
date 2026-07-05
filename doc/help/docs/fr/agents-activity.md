# Agents IA — Activité

L'Activité est l'historique en lecture seule de tout ce que vos agents ont fait et de toutes les décisions que vous avez prises concernant leur travail : les propositions qu'ils ont rédigées, vos approbations et rejets, les modifications réellement envoyées à un ticket, les limites de sécurité déclenchées, les pauses, les changements de configuration et les erreurs. Rien sur cette page ne modifie un ticket ni un agent — elle existe pour vous permettre de répondre à la question « que s'est-il passé, quand et pourquoi » après coup, et pour vous fournir une trace écrite lorsqu'un demandeur ou un technicien vous interroge. La même chronologie apparaît sous forme d'un extrait d'activité récente dans l'[onglet Suivi](agents-workspace.md) d'un agent ; cette page en est la version complète et filtrable, couvrant tous les agents.

## Où la trouver

- Espace de travail : **Agents IA**
- Chemin : **Agents IA → Activité**
- Route : `/agents/activity`
- Autorisation : `ai_agents:reader` (consultation uniquement — toute personne pouvant ouvrir Agents IA peut lire la chronologie)
- Nécessite que l'IA soit activée sur l'instance. Cette page est en lecture seule : rien ici n'approuve, ne rejette ni n'envoie quoi que ce soit. Pour agir sur une proposition, utilisez les [Approbations](agents-approvals.md).

---

## Filtres

La chronologie affiche les événements les plus récents en premier. Deux contrôles permettent de l'affiner :

- **Numéro de ticket** — saisissez un numéro de ticket et appuyez sur **Rechercher** (ou Entrée) pour ne voir que les événements liés à ce ticket précis. C'est le moyen le plus rapide de reconstituer l'histoire complète d'un même ticket : chaque contrôle, brouillon, décision et modification, dans l'ordre. Videz le champ et relancez la recherche pour revenir au flux complet.
- **Puces de type** — six bascules en haut : **Proposition**, **Décision**, **Exécution**, **Configuration**, **Pause** et **Erreur**. Cliquez sur l'une d'elles pour n'afficher que ce type d'événement ; cliquez à nouveau pour la désactiver. C'est un moyen rapide de répondre à des questions comme « qu'a réellement envoyé l'agent ? » (Exécution) ou « qu'avons-nous rejeté ? » (Décision).

La recherche par ticket et la puce de type se combinent, ce qui vous permet, par exemple, de consulter uniquement les erreurs du ticket #482.

---

## Lire une entrée de la chronologie

Chaque entrée correspond à un événement, et elle contient suffisamment de contexte pour être comprise d'un coup d'œil :

- Une **puce de type** — à laquelle des six catégories ci-dessus l'événement appartient.
- Une **puce de type d'action** (lorsque l'événement porte sur un type de travail précis sur le ticket) : **Note interne**, **Réponse demandeur**, **Mise à jour classification**, **Mise à jour statut**, **Affectation** ou **Participants**.
- Une **pastille de statut** avec un libellé en langage clair (par exemple « En attente de validation », « Terminé », « Rejeté », « Attention requise ») décrivant où en est cet élément.
- Le **nom de l'agent** et le **ticket** concerné (affiché sous la forme `#N`).
- Un **titre d'événement** (par exemple « Proposition créée » ou « Vérification des tickets terminée »).
- Un **aperçu sur une ligne** de l'essentiel — la première ligne d'un message rédigé, une modification de champ ou le motif — de sorte que vous n'avez souvent rien à développer.
- Un **horodatage**, ainsi que **Afficher les détails** et, lorsqu'un contrôle est à l'origine de l'événement, **Trace**.

### Ce que signifient les événements

Le catalogue couvre l'ensemble du cycle de vie du travail des agents. Regroupés selon la puce de type dont ils relèvent :

- **Proposition** — l'agent a rédigé quelque chose à examiner : une réponse, une note ou une mise à jour de ticket a été créée et attend une décision.
- **Décision** — une proposition a été **approuvée** ou **rejetée** (par une personne, ou automatiquement une fois que ce type d'action fonctionne de manière autonome).
- **Exécution** — une modification a été réellement envoyée au ticket, ou une exécution a **échoué**. Les exécutions automatiques et leurs échecs apparaissent également ici.
- **Configuration** — quelqu'un a modifié le fonctionnement d'un agent : ses **paramètres de surveillance** ou sa **configuration** générale ont été mis à jour, un type d'action a été basculé en **automatique** ou **désactivé** (ou **rétrogradé** en mode demander d'abord), ou un **agent a été supprimé**.
- **Pause** — une **pause d'urgence a été activée** ou **levée**, ou la **surveillance des tickets a été suspendue** parce qu'une pause était en vigueur.
- **Erreur** — un incident est survenu que vous devez connaître : un **contrôle a échoué**, un **ticket n'a pas pu être traité**, ou une exécution automatique a échoué. Les erreurs apparaissent aussi lorsqu'une limite de sécurité est atteinte — une **limite quotidienne de sécurité** ou une **limite de sécurité par exécution** — ce qui n'est pas un dysfonctionnement mais un arrêt délibéré. Les achèvements de routine tels que **Vérification des tickets terminée** figurent également ici, ce qui vous permet de confirmer que l'agent surveille même lors d'une journée calme.

Nul besoin de les mémoriser — les titres d'événements sont rédigés en langage clair, et les puces de type vous permettent de filtrer ceux qui vous intéressent.

---

## Afficher les détails

**Afficher les détails** développe une entrée pour révéler l'ensemble des éléments qui la sous-tendent. Selon l'événement, vous pouvez voir :

- Le **Message proposé** complet — le texte intégral rédigé par l'agent, pas seulement l'aperçu sur une ligne.
- Les **modifications de champ**, écrites sous la forme « Champ : ancien → nouveau » (par exemple « Statut : Assigné → En attente »), de sorte qu'une modification de classification, de statut, d'affectation ou de participant est lisible sans ouvrir le ticket.
- Le **Motif** — la courte justification de la proposition par l'agent.
- La **Note du relecteur** — la note saisie au moment où la proposition a été tranchée.
- Une ligne **« {n} sources citées »** — combien de résultats de votre [bibliothèque de connaissances](knowledge.md) ont étayé la réponse rédigée. C'est le signal honnête indiquant si la réponse s'appuie sur vos propres sources ; une réponse avec des sources citées est une réponse que l'agent peut assumer. Son absence sur une réponse administrative ou procédurale est normale et ne signifie pas qu'un problème est survenu — pour savoir comment cela se traduit lors de l'examen, voir les [Approbations](agents-approvals.md).

---

## Trace technique

Le bouton **Trace** ouvre la boîte de dialogue **Trace technique**. Il s'agit d'une vue de diagnostic facultative destinée aux administrateurs qui investiguent un contrôle précis — vous n'en avez jamais besoin pour l'examen quotidien, et tout ce qu'un demandeur ou un technicien pourrait vouloir figure déjà dans **Afficher les détails**.

Elle reconstitue le déroulement d'un même contrôle :

- Les **étapes** numérotées suivies par l'agent, chacune avec son propre statut.
- Les **appels d'outils** qu'il a effectués, avec la durée de chacun — utile lorsqu'un contrôle a été lent ou a expiré.
- Les **sources** qu'il a rassemblées, présentées sous forme d'un bref résumé accompagné du type de source dont elles proviennent.

Une bascule **Afficher la trace brute** révèle l'enregistrement sous-jacent lisible par machine pour les rares cas où vous avez besoin du détail exact ; laissez-la repliée sinon.

Le même bouton **Trace** figure dans les [Approbations](agents-approvals.md) — le suivre depuis là vous amène directement dans cette boîte de dialogue pour le contrôle à l'origine d'une proposition, ce qui est la façon habituelle d'arriver ici pendant l'examen.

---

## Conseils

- La recherche par **numéro de ticket** est le moyen le plus rapide de transmettre à quelqu'un l'histoire complète et ordonnée d'un ticket — proposition, décision et ce qui a été envoyé — sans naviguer dans le ticket lui-même.
- Utilisez le filtre **Exécution** pour ne voir que ce qui est réellement sorti. Les propositions et les décisions sont des intentions ; les exécutions sont les modifications qu'un demandeur ou un technicien peut voir.
- Une entrée **limite de sécurité atteinte** sous Erreur correspond au système fonctionnant comme prévu, pas à un bug. Si un agent est resté silencieux le reste de la journée, c'est généralement pour cette raison — relevez ses limites quotidiennes dans les [Paramètres](agents-workspace.md) de l'agent si le plafond est trop serré pour votre volume.
- N'utilisez **Trace** que lorsque vous enquêtez sur un contrôle lent ou en échec ; pour « qu'a-t-il dit et pourquoi l'avons-nous approuvé », **Afficher les détails** contient déjà la réponse.
- Astuce pour confirmer qu'un agent est actif lors d'une journée creuse : filtrez sur **Erreur** et recherchez les entrées **Vérification des tickets terminée** — l'agent surveille même lorsqu'il ne propose rien.
- Cette page ne modifie jamais rien ; il est donc sûr d'accorder un accès en lecture seule (`ai_agents:reader`) à toute personne devant auditer le comportement des agents sans pouvoir agir dessus.
