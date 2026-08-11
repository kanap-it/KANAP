# Agents IA — Vue d'ensemble

Les agents IA sont des assistants automatisés qui surveillent votre centre de services connecté et effectuent le premier passage sur les tickets à votre place : rédiger une réponse au demandeur, ajouter une note interne, ou proposer une mise à jour de la classification, du statut, de l'affectation, des participants d'un ticket, ou une clôture/résolution. Cette page est le tableau de bord du parc — l'endroit unique pour voir tous les agents d'un coup d'œil, savoir combien de travail attend votre décision, comment le parc se comporte, et où actionner le frein d'urgence si quelque chose ne va pas.

L'idée essentielle à retenir : l'agent propose, vous disposez. Tout ce qu'un agent veut envoyer à un demandeur ou écrire dans un ticket est d'abord proposé à votre approbation, et des limites de sécurité strictes, des budgets, des contrôles de fraîcheur et des pauses s'appliquent toujours — même après avoir laissé un agent agir de lui-même. La configuration quotidienne d'un agent se trouve sur son [Espace de l'agent](agents-workspace.md) ; cette page est celle où vous supervisez l'ensemble du parc.

## Où la trouver

- Espace de travail : **Agents IA**
- Chemin : **Agents IA → Vue d'ensemble**
- Route : `/agents`
- Autorisation : `ai_agents:reader` pour consulter la section. Les commandes de création, de pause d'urgence et de suppression décrites ci-dessous nécessitent le niveau administrateur des Agents IA (`ai_agents:admin`) ; l'administrateur des paramètres Plaid (`ai_settings:admin`) les débloque également.
- Indicateur de fonctionnalité : toute la section Agents IA nécessite que l'IA soit activée sur l'instance. Si l'IA est désactivée, la section n'est pas disponible.

---

## Concepts, en une minute

Quelques notions reviennent sur chaque page de cette section. Apprenez-les une bonne fois ici.

- **Ce qu'un agent surveille.** Chaque agent est dirigé vers votre système de tickets connecté (aujourd'hui GLPI, configuré sous **Administration → Intégrations** — voir [la connexion GLPI](integrations.md)). Dans les écrans des agents, il est désigné de manière générique comme le système de tickets connecté ou la connexion.
- **Ce sur quoi un agent agit.** Les tickets. Le travail qu'un agent peut proposer : une réponse au demandeur, une note interne, un changement de classification, un changement de statut (y compris clôture/résolution), un changement d'affectation, ainsi que l'ajout ou le retrait de participants.
- **Demander d'abord ou automatique.** Chaque type d'action commence en **Demander d'abord** — l'agent rédige le changement, qui reste dans votre file d'approbations jusqu'à ce que vous l'approuviez ou le rejetiez. Une fois qu'un agent a accumulé un historique suffisant sur un type d'action donné, un administrateur peut promouvoir uniquement ce type d'action en **Automatique** afin qu'il s'applique sans attendre. La promotion se fait par type d'action, et les limites de sécurité ci-dessous ne cessent jamais de s'appliquer.
- **Surveillance ou test uniquement.** Un agent en **surveillance** contrôle de lui-même le système de tickets connecté à la recherche de tickets correspondants, environ toutes les cinq minutes. Un agent qui n'est pas en surveillance ne s'exécute que lorsque vous le testez manuellement sur un ticket unique depuis son [espace](agents-workspace.md) — rien ne se produit automatiquement. Les nouveaux agents commencent toujours en test uniquement.
- **La sécurité s'applique toujours.** Les plafonds par contrôle, les budgets par exécution et quotidiens, les contrôles de fraîcheur (que faire si le ticket a changé après que l'agent a rédigé son travail) et les pauses s'appliquent, que le type d'action soit en demander d'abord ou automatique. Vous pouvez toujours tout arrêter — voir [Pause d'urgence](#pause-durgence) ci-dessous.

Seul le type d'agent **Helpdesk** est utilisable de bout en bout aujourd'hui. D'autres types peuvent apparaître dans la liste des types d'agent, mais ils ne sont pas prêts à fonctionner — restez sur Helpdesk.

Deux autres surfaces IA se confondent facilement avec les agents, mais sont des choses distinctes : [Plaid](ai-assistant.md) est l'assistant de chat interactif que vous pilotez vous-même, et [Paramètres Plaid](ai-settings.md) configure cet assistant. Les modèles eux-mêmes se gèrent sur la page [Modèles IA](ai-models.md), où se définissent le modèle de chaque agent — et le modèle par défaut de l'organisation sur lequel il se rabat.

---

## Le tableau de bord du parc

Cinq indicateurs mutualisés figurent en haut, agrégés sur l'ensemble des agents helpdesk du tenant — et non les chiffres d'un seul agent :

- **Approbations en attente** — combien de propositions, sur l'ensemble du parc, attendent une décision humaine en ce moment. C'est le même nombre qui alimente le badge de la barre latérale.
- **Actions du jour** — combien de propositions ont réellement été exécutées aujourd'hui (approuvées et appliquées, ou appliquées automatiquement).
- **Acceptation** — la part des propositions décidées qui ont été approuvées plutôt que rejetées. Affiche **Données insuffisantes** tant qu'il n'y a pas assez d'historique de décisions pour être significatif.
- **Écartées** — la part des propositions examinées par un humain qui ont été mises de côté plutôt qu'approuvées ou rejetées. Un écartement ne pénalise pas l'agent ; une valeur durablement élevée traduit donc généralement un problème de ciblage — l'agent prend en charge des tickets qu'il ne devrait pas traiter — plutôt qu'un problème de qualité des réponses ; corrigez-le dans les paramètres de l'agent. Affiche également **Données insuffisantes** tant qu'il n'y a pas assez d'historique d'examen.
- **Coût par ticket** — le coût IA estimé par ticket traité, en EUR. Affiche également **Données insuffisantes** tant qu'il n'y a pas d'historique.

Considérez ces indicateurs comme la santé du parc, non comme une comptabilité par agent. Pour les chiffres d'un agent en particulier, ouvrez son espace et utilisez l'onglet **Performance**.

---

## Les cartes du parc

Sous le tableau de bord, la section **Parc d'agents** affiche une carte par agent. Chaque carte porte le **nom** et la **description** de l'agent (ou **Aucune description.** si aucune n'a été renseignée), un statut en langage clair, une rangée de puces, et — pour un agent en surveillance — une bande de chiffres en temps réel.

**Le statut** (en haut à droite de la carte) vous indique ce que l'agent fait en ce moment :

- **Non démarré** — créé mais jamais exécuté. C'est là que commence chaque nouvel agent.
- **Désactivé** — désactivé ; il ne surveille ni n'agit.
- **Archivé** — retiré de l'usage actif.
- **Test** — activé mais pas en surveillance. Il ne s'exécute que lorsque vous le testez manuellement sur un ticket unique.
- **Surveillance — avec validation** — surveille de lui-même, mais chaque type d'action vous est toujours soumis pour approbation.
- **Surveillance — partiellement automatique** — surveille, avec au moins un type d'action promu pour s'exécuter sans approbation. Les autres demandent encore d'abord.
- **En pause** — retenu par une pause d'urgence (à l'échelle du tenant ou pour ce seul agent). Les contrôles et les écritures en attente sont gelés jusqu'à la levée de la pause.

**Les puces** résument l'agent d'un coup d'œil :

- **Type** — le type d'agent, par exemple **Helpdesk**.
- **Environnement** — l'environnement de connexion vers lequel il pointe : **Production**, **Pré-production**, **Bac à sable**, **Labo** ou **Simulation**. C'est votre repère pour savoir si l'agent touche à de vrais tickets.
- **N en attente** — propositions de cet agent en attente de votre décision (mises en évidence lorsqu'elles dépassent zéro).
- **N en échec** — tickets de cet agent qui sont bloqués et nécessitent un examen (mis en évidence lorsqu'ils dépassent zéro). Ils apparaissent comme **Attention requise** dans la file quotidienne.
- **N automatique(s)** ou **Demander d'abord** — soit le nombre de types d'action promus en automatique, soit **Demander d'abord** lorsque rien n'a été promu.

**Lorsqu'un agent est en surveillance**, quatre chiffres apparaissent sur la carte :

- **Dernier contrôle** — le résultat du dernier contrôle automatique.
- **Périmètre** — **Tous les tickets** ou **Tickets filtrés**, selon que l'agent est restreint à une entité ou une catégorie spécifique.
- **Exécutions du jour** — combien de fois il s'est exécuté aujourd'hui, par rapport à son plafond quotidien d'exécutions.
- **Mis à jour** — l'heure de son dernier contrôle.

Cliquer n'importe où sur une carte ouvre l'[espace](agents-workspace.md) de cet agent, où vous le suivez, examinez ses approbations, consultez ses performances et modifiez ses paramètres.

Les administrateurs voient également une petite icône de corbeille sur les cartes des agents personnalisés qu'ils ont créés — elle supprime l'agent ainsi que sa file et son historique de surveillance (les tickets de votre système de tickets ne sont jamais touchés, et l'action est irréversible). L'agent helpdesk intégré n'a pas de commande de suppression.

---

## Créer un agent

Les administrateurs disposent d'une carte **Nouvel agent** à la fin de la grille du parc. Elle ouvre un assistant en cinq étapes qui produit toujours un agent helpdesk à partir d'un modèle de départ sécurisé :

1. **Type** — donnez à l'agent un **Nom** et une **Description**. Le **Type d'agent** est fixé à **Helpdesk**.
2. **Connexion** — choisissez le système de tickets sur lequel il travaille (**GLPI**). Un lien **Gérer les intégrations** mène à **Administration → Intégrations** si la connexion n'est pas encore configurée.
3. **Surveillance** — décidez s'il doit surveiller de lui-même à l'aide de l'interrupteur **Surveiller les nouveaux tickets**, puis choisissez les tickets qu'il cible. Des préréglages (**Nouveaux tickets**, **Tous ouverts**, **Traités par cet agent**) vous donnent un point de départ ; le constructeur de filtres l'affine davantage, tous les filtres étant combinés et leurs valeurs issues du système de tickets connecté.
4. **Limites** — le cadre de sécurité. Cela couvre le **Modèle IA** sur lequel l'agent s'exécute (**Modèle par défaut de l'organisation** sauf si vous en fixez un), la **Priorité agent** et **Réviser toutes les (heures)** (à quelle fréquence il revient sur le même ticket), la gestion via **Collision ticket** lorsqu'un autre agent est déjà sur un ticket, **Tickets max par contrôle** et **Requêtes fournisseur max** par contrôle, la **Fenêtre d'approbation (heures)** (durée pendant laquelle les propositions de chaque contrôle restent ouvertes avant d'expirer — elles expirent toutes ensemble), le comportement **Si le ticket a changé** (réviser à nouveau, annuler ou appliquer quand même), et les plafonds par exécution et quotidiens sur les **Tokens**, le **Coût** et les **Exécutions**. Le modèle est livré avec des valeurs par défaut raisonnables ; la signification complète de chaque champ est documentée dans l'onglet Paramètres de l'[Espace de l'agent](agents-workspace.md).
5. **Vérification** — un récapitulatif de tout ce qui précède.

Les nouveaux agents sont toujours créés en **Non démarré**, et vous arrivez sur leur onglet **Paramètres**. La démarche recommandée est de tester d'abord l'agent sur un vrai ticket, puis d'activer la surveillance une fois que vous avez confiance en sa production.

---

## Pause d'urgence

Si quelque chose semble anormal à tous les niveaux — réponses inattendues envoyées, mauvaise configuration, incident — les administrateurs peuvent tout geler d'un coup avec **Mettre tous les agents en pause**. Un motif vous est demandé (il rejoint le journal d'audit), puis une bannière persistante affiche **Pause d'urgence active : {motif}** dans toute la section. Tant qu'elle est active, les contrôles de chaque agent et toute écriture en attente sont suspendus pour l'ensemble du tenant. Cliquez sur **Lever la pause** dans la bannière pour reprendre.

Ce frein à l'échelle du tenant est volontairement radical. Pour geler un seul agent au comportement problématique sans toucher au reste du parc, utilisez plutôt la pause propre à l'agent, dans l'onglet **Suivi** de cet agent — voir l'[Espace de l'agent](agents-workspace.md).

---

## Gérer le parc au quotidien

La vue d'ensemble est l'endroit où vous supervisez ; deux pages dédiées sont là où se déroule le travail quotidien concret :

- [Approbations](agents-approvals.md) est la file de revue — réponses, notes et mises à jour de tickets proposées, en attente de votre décision, regroupées par ticket.
- [Activité](agents-activity.md) est la chronologie d'audit en lecture seule de chaque proposition, décision, exécution, pause et erreur.

La guidance de fond réutilisable que vous souhaitez partager entre plusieurs agents se trouve sur la page [Contexte partagé](agents-shared-context.md). Notez que le contexte partagé façonne la manière dont les agents interprètent les tickets, mais n'est jamais cité dans une réponse — les sources qu'un agent cite réellement proviennent de vos [Bibliothèques de connaissances](knowledge.md).

---

## Conseils

- **Lisez la puce d'environnement avant de vous fier à un chiffre.** Un agent **Production** touche à de vrais tickets et à de vrais demandeurs ; **Bac à sable**, **Labo** et **Simulation** sont sûrs pour expérimenter. Lorsque vous créez un nouvel agent, tenez-le à l'écart des tickets de production jusqu'à ce que sa production soit correcte.
- **Un nombre d'échecs qui augmente est votre signal d'alerte précoce.** La puce **N en échec** fait remonter les tickets bloqués. Ouvrez l'agent et traitez les éléments **Attention requise** avant qu'ils ne s'accumulent — ils pointent généralement vers un problème de connexion ou un ticket qui a changé sous l'agent.
- **Testez avant de surveiller.** Un agent créé par l'assistant est intentionnellement en **Non démarré**. Exécutez-le d'abord manuellement sur une poignée de tickets représentatifs depuis son espace ; n'activez la surveillance qu'une fois satisfait de ce qu'il rédige.
- **L'automatique se mérite et se révoque.** Promouvoir un type d'action en automatique ne supprime aucun garde-fou — les budgets quotidiens et par exécution, les contrôles de fraîcheur et les pauses s'appliquent toujours, et un taux d'acceptation qui baisse ramènera le type d'action en demander d'abord.
- **Préférez la pause propre à l'agent.** Ne recourez à **Mettre tous les agents en pause** que pour un véritable problème à l'échelle du parc. Pour un seul agent bruyant, la pause propre à l'agent, dans son onglet Suivi, laisse le reste de votre parc fonctionner.
