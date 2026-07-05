# Agents IA — Espace de l'agent

L'espace de l'agent est l'endroit où vit un agent en particulier : vous y observez ce qu'il fait, examinez ses propositions, jugez de sa performance et — si vous êtes administrateur — configurez chaque détail de son fonctionnement. C'est la surface la plus détaillée de l'espace Agents IA. Tout ce qui concerne un agent donné et qui n'est pas un contrôle à l'échelle du parc s'y trouve, réparti sur quatre onglets.

Ouvrez un agent en cliquant sur sa carte dans [Agents IA — Vue d'ensemble](agents-overview.md). L'espace de travail s'ouvre toujours sur **Suivi** ; vous pouvez créer un lien direct vers n'importe quel onglet, et les liens provenant d'autres parties du produit (par exemple le bouton **Examiner** de l'onglet **Performance**) vous amènent directement au bon onglet.

## Où le trouver

- **Espace de travail :** Agents IA
- **Chemin :** **Agents IA → Vue d'ensemble →** ouvrez la carte d'un agent
- **Route :** `/agents/:agentKey`
- **Autorisation :** la consultation nécessite le rôle Lecteur des Agents IA (`ai_agents:reader`). L'onglet **Paramètres** n'apparaît que pour le niveau Administrateur des Agents IA (`ai_agents:admin`) ; l'administrateur des Paramètres IA (`ai_settings:admin`) le débloque également, ainsi que les commandes **Démarrer l'agent**, **Désactiver** et **Mettre l'agent en pause** de l'onglet **Suivi**.
- **Disponibilité :** l'ensemble de l'espace Agents IA nécessite que l'IA soit activée sur l'instance. Si vous ouvrez un lien vers un agent qui n'existe pas pour votre tenant, vous verrez **Agent introuvable** — « Cet agent n'est pas disponible dans le tenant actuel. » — avec un moyen de revenir au parc.

Les onglets sont **Suivi**, **Approbations**, **Performance** et **Paramètres**. Les lecteurs voient les trois premiers ; seuls les administrateurs voient **Paramètres**.

---

## Suivi

L'onglet Suivi est le tableau de bord en temps réel de cet agent en particulier. Il se rafraîchit à mesure que le travail avance, c'est donc l'onglet à garder ouvert lorsque vous surveillez l'activité.

### Statut

La carte **Statut** résume le mode actuel de l'agent et regroupe ses commandes d'exécution (administrateurs uniquement) :

- **Démarrer l'agent** fait passer à l'état activé un agent non démarré ou désactivé, afin qu'il commence à surveiller.
- **Désactiver** empêche un agent activé de surveiller. Il conserve sa configuration et son historique ; vous pouvez le redémarrer plus tard.
- **Mettre l'agent en pause** est le frein d'urgence. Il demande un motif, puis suspend les contrôles de cet agent et toute écriture en attente jusqu'à ce que vous leviez la pause. Les autres agents continuent de fonctionner. Lorsqu'une pause est active, vous verrez ici **Lever la pause**. Une pause définie pour l'ensemble du tenant affiche à la place **En pause pour tous les agents** et vous renvoie vers la vue d'ensemble du parc pour la gérer — vous ne pouvez pas lever une pause à l'échelle du tenant depuis un seul agent.
- **Contrôler maintenant** lance un contrôle immédiatement, sans attendre le prochain contrôle planifié. Cette commande est désactivée lorsqu'un contrôle est déjà en cours ou lorsque l'agent est en pause.

Sous les commandes, quatre tuiles en lecture seule vous indiquent où en sont les choses :

- **Cycle de vie** — l'état global de l'agent en langage clair : **Non démarré**, **Désactivé**, **Test**, **En pause**, **Archivé** ou, lorsqu'il est en activité, **Surveillance — avec validation** / **Surveillance — partiellement automatique** (ce dernier dès qu'au moins un type d'action a été promu en automatique).
- **Surveillance** — **Tous les tickets**, **Filtré** (lorsqu'une catégorie ou une entité restreint le périmètre) ou **Désactivé**.
- **Dernier contrôle** — le résultat du contrôle le plus récent.
- **Prochain contrôle** — **Toutes les 5 minutes** tant que l'agent surveille ; sinon **Non renseigné**.

### File

La carte **File** comptabilise le travail que l'agent détient actuellement :

- **En attente** — les tickets dont les propositions attendent votre approbation.
- **En cours** — les tickets sur lesquels l'agent travaille activement. Chaque ticket en cours est également listé en dessous avec un indicateur d'activité et son état, afin que vous voyiez exactement ce qui avance.
- **Échec** — les tickets en erreur ou passés en **Attention requise** et qui ne réessaieront pas d'eux-mêmes.
- **Approbations en attente** — le nombre total de propositions individuelles réparties sur l'ensemble des tickets en attente (un même ticket peut en comporter plusieurs).

### Limites

La carte **Limites** affiche la consommation du jour par rapport aux plafonds de sécurité définis dans l'onglet **Paramètres** : **Exécutions du jour**, **Tokens du jour** et **Coût du jour** (en EUR), chacun sous la forme *utilisé / plafond*. Ce sont des plafonds stricts — lorsqu'un plafond est atteint, l'agent s'arrête pour la journée quoi qu'il arrive ; c'est donc sur cette carte que vous remarquez un agent sur le point de devenir silencieux.

### Tester sur un ticket

**Tester sur un ticket** exécute l'agent une seule fois sur un ticket que vous désignez — le moyen le plus rapide de voir comment il se comporte avant de le laisser surveiller de lui-même, ou de vérifier son raisonnement sur un cas précis. Saisissez un numéro de ticket (par exemple `64`) et cliquez sur **Lancer le test**. L'agent effectue une passe complète sur ce seul ticket ; tout ce qu'il propose arrive dans l'onglet **Approbations** pour votre examen, comme n'importe quel autre travail. Rien n'est envoyé au demandeur sans approbation. Cela fonctionne même lorsque l'agent est non démarré, ce qui en fait le compagnon naturel de l'étape **Non démarré** d'un nouvel agent.

### Activité récente

Le bas de l'onglet Suivi intègre une chronologie en temps réel, en lecture seule, des propositions, décisions, exécutions, pauses et erreurs de cet agent. C'est le même flux que la page [Activité](agents-activity.md) complète, déjà filtré sur cet agent. Chaque entrée peut ouvrir une vue de diagnostic **Trace technique** facultative, destinée aux administrateurs qui veulent le détail pas à pas d'un contrôle.

---

## Approbations

L'onglet **Approbations** est la file d'examen — réponses, notes et mises à jour de tickets proposées, en attente de votre décision — limitée à ce seul agent. Il se comporte exactement comme la file autonome, y compris pour l'approbation ou le rejet en masse et la confirmation d'action terminale. Consultez [Approbations](agents-approvals.md) pour l'explication complète du fonctionnement de la file ; rien n'y change, si ce n'est que vous ne voyez que les éléments de cet agent.

---

## Performance

L'onglet Performance vous indique si l'agent gagne en autonomie. La rangée de chiffres clés couvre, pour cet agent :

- **Acceptation** — la part de ses propositions que vous avez approuvées. C'est le chiffre qui influence le plus la possibilité pour un type d'action de passer en automatique.
- **Délai d'approbation** — le temps typique, en minutes, entre l'apparition d'une proposition et la décision prise à son sujet. Un chiffre en hausse signifie généralement que la file a besoin de plus d'attention de la part des relecteurs, et non que l'agent est moins performant.
- **Taux de connaissances** — la fréquence à laquelle ses réponses s'appuyaient sur vos sources de connaissances.
- **Coût par ticket** — la dépense moyenne par ticket traité, en EUR.
- **Exécutions par ticket** — le nombre de contrôles nécessaires, en moyenne, pour résoudre un ticket.

En dessous, une bande **Tendances** sur 14 jours montre le volume proposé par rapport au volume exécuté par jour, de sorte que vous pouvez voir en un coup d'œil l'agent monter en puissance (ou un pic).

L'**Échelle d'autonomie** liste chaque type d'action pour lequel l'agent dispose de données, avec le nombre de décisions examinées qu'il a capturées par rapport au nombre requis avant que le mode **Automatique** puisse être examiné. Lorsqu'un type d'action dispose de suffisamment d'éléments, utilisez **Examiner** pour accéder à la section **Autonomie** de l'onglet **Paramètres**, où la promotion est réellement effectuée.

---

## Paramètres

L'onglet **Paramètres** est réservé aux administrateurs et regroupe tous les réglages de configuration de l'agent. Il **s'enregistre automatiquement** : il n'y a pas de boutons d'enregistrement, et chaque section affiche un petit indicateur **Enregistrement…** / **Enregistré** dans son en-tête à mesure que vos modifications sont écrites. Les modifications sont appliquées sur place, de sorte que la page ne se recharge pas et ne perd pas votre position pendant que vous travaillez.

### Objectif et capacités

C'est le persona de l'agent — qui il est et comment il rédige :

- **Nom** et **Statut**. Le statut contrôle la disponibilité : **Non démarré**, **Activé**, **Désactivé** ou **Archivé**. (L'archivage est la manière délibérée de retirer un agent.)
- **Description** — texte libre pour votre propre équipe.
- **Mission** — le rôle de l'agent en une phrase ou deux.
- **Instructions** — une instruction par ligne ; chaque ligne est traitée comme une règle distincte.
- **Style de sortie** — le ton dans lequel l'agent rédige (par exemple, *clair et concis*).
- **Langue de réponse** — la langue des réponses destinées au demandeur : **Langue du ticket** (correspond à la langue dans laquelle le ticket est rédigé), **Français**, **Anglais**, **Allemand** ou **Espagnol**.
- **Guidance d'escalade** — quand et comment l'agent doit confier un ticket à un humain plutôt que d'essayer de le résoudre.
- **Contexte partagé** — activez **Utiliser le contexte partagé** et choisissez un profil pour superposer à cet agent un contexte réutilisable sur votre environnement, ou utilisez **+ Nouveau profil** pour en créer un sur-le-champ. Un aperçu des lignes du profil sélectionné est affiché en dessous. Le contexte partagé oriente la façon dont l'agent interprète les tickets et rédige ses réponses, mais il ne constitue jamais une autorisation d'accès et n'est **pas** une source citable — contrairement aux [bibliothèques de connaissances](knowledge.md), dont les résultats *sont* cités dans les réponses. Gérez entièrement les profils sur la page [Contexte partagé](agents-shared-context.md).

À côté de l'éditeur de persona se trouve l'aperçu en lecture seule **Prompt effectif** : exactement ce qui est fourni au runtime de l'agent, compilé à partir de tout ce qui précède plus les règles propres à la plateforme. Utilisez le sélecteur pour inspecter chaque étape — **Planificateur d'actions**, **Planificateur** et **Interpréteur** sont les étapes où l'agent décide *quoi faire* ; **Synthèse** est celle où il rédige la réponse en s'appuyant sur vos sources de connaissances. L'aperçu se met à jour après chaque enregistrement. Comme l'indique l'aide, **la guidance ne peut pas remplacer les règles de sécurité** — rien de ce que vous écrivez dans le persona ne peut assouplir les limites strictes de la plateforme.

### Capacités

Des interrupteurs déterminant quels types de modification l'agent peut proposer : **Notes internes**, **Réponses demandeur**, **Classification**, **Mises à jour statut**, **Affectation** et **Participants**. En désactiver un supprime entièrement ce type d'action — l'agent ne peut pas le proposer et il ne peut pas apparaître dans l'échelle d'autonomie. Ce sont les limites externes ; la section **Autonomie** ci-dessous décide lesquels des types activés continuent de demander d'abord.

### Ciblage

Le ciblage détermine quels tickets l'agent surveille. L'interrupteur principal — **Surveiller les nouveaux tickets** (ou **Surveiller les tickets automatiquement** sur un agent personnalisé) — active ou désactive la surveillance. Les préréglages rapides (**Nouveaux tickets**, **Tous ouverts**, **Traités par cet agent**) insèrent un jeu de filtres de départ ; si vous avez déjà des filtres, une confirmation vous est demandée avant leur remplacement.

Le générateur de filtres vous permet de combiner des conditions — tous les filtres sont combinés ensemble, et les valeurs disponibles proviennent directement du système de tickets connecté. Un aperçu en temps réel montre l'effet concret :

- **Correspondances** — combien de tickets correspondent actuellement.
- **Échantillon** — combien ont réellement été inspectés pour produire l'estimation.
- **Chevauchement** — les tickets que d'autres agents ciblent également, afin de repérer deux agents qui se disputent le même travail.
- **Exéc./jour** — le nombre de contrôles attendus par jour à ce périmètre.

Une note apparaît lorsque l'aperçu est limité par vos plafonds par contrôle — le nombre réel de correspondances peut être supérieur à celui affiché dans l'aperçu.

### Paramètres d'exploitation

Les commandes de rythme et de budget :

- **Priorité agent** — utilisée avec **Collision ticket** pour décider qui traite un ticket que deux agents veulent tous les deux.
- **Réviser toutes les (heures)** — combien de temps l'agent attend avant de réexaminer un ticket qu'il a déjà traité.
- **Collision ticket** — que faire lorsqu'un autre agent est déjà sur un ticket : **Différer** (ne pas y toucher) ou **Remplacer à priorité égale** (prendre le relais d'un agent de même priorité).
- **Tickets max par contrôle** et **Requêtes fournisseur max** — la quantité de travail qu'un seul contrôle peut prendre en charge.
- **Fenêtre d'approbation (heures)** — combien de temps chaque proposition d'un ticket reste ouverte avant d'expirer. Toutes les propositions d'un même contrôle partagent cette fenêtre, elles expirent donc ensemble plutôt qu'au coup par coup.
- **Si le ticket a changé** — que faire si le ticket a évolué entre la proposition et votre approbation : **Réviser à nouveau**, **Annuler** ou **Appliquer quand même**.
- **Tokens par exécution** / **Coût par exécution (EUR)** et **Exécutions par jour** / **Tokens par jour** / **Coût par jour (EUR)** — les plafonds de dépense par contrôle et par jour. Les chiffres quotidiens sont les mêmes plafonds que ceux que vous suivez sur la carte **Limites** de l'onglet Suivi.

### Sources de connaissances et web

D'où l'agent tire ses informations :

- **Rechercher dans les connaissances KANAP** — activé, l'agent puise dans vos [bibliothèques de connaissances](knowledge.md) et les cite dans ses réponses. Désactivé, l'agent répond à partir des connaissances propres au modèle (et du web, si celui-ci est activé).
- **Rechercher dans toutes les bibliothèques disponibles**, ou désactivez cette option pour choisir des **Bibliothèques** précises — l'agent ne recherche alors que dans celles-ci, dans la limite de ce à quoi il a accès. Les noms des bibliothèques proviennent de la section Base de connaissances.
- **Rechercher sur le web** — permet à l'agent de consulter également le web public ; les connaissances KANAP restent toujours prioritaires et les résultats web sont cités. Cet interrupteur n'est disponible que si la recherche web est activée pour l'ensemble de la plateforme. Dans le cas contraire, l'interrupteur est désactivé et une note vous renvoie vers votre administrateur — voir [Paramètres Plaid / Fournisseur IA](ai-settings.md).

### Autonomie

Par défaut, chaque type d'action **demande d'abord** — l'agent propose et attend votre décision. Cette section est l'endroit où vous promouvez un type d'action de **Demander d'abord** à **Automatique**, type par type, une fois qu'il l'a mérité. Chaque ligne affiche le mode actuel et une ligne d'éligibilité : décisions capturées, taux d'acceptation et jours d'activité, chacun par rapport à ce qui est requis. Lorsqu'un type d'action n'est pas encore éligible, la ligne explique pourquoi (par exemple, pas assez de propositions examinées, ou un taux d'acceptation sous le seuil).

- **Activer** apparaît dès qu'un type d'action est éligible. Il ouvre une confirmation qui résume les éléments et vous rappelle que les actions automatiques respectent toujours les limites quotidiennes et la pause d'urgence, et reviennent en mode demander d'abord si l'acceptation baisse.
- **Forcer** apparaît lorsqu'un type d'action n'est pas éligible mais que le forçage est autorisé. Il exige un motif écrit et avertit clairement qu'un forçage contourne *uniquement* les seuils de recommandation — les limites de sécurité strictes, les contrôles de fraîcheur, la prise en charge par le fournisseur, les budgets, les pauses et les restrictions sur les réponses au demandeur restent tous applicables.
- **Désactiver** ramène tout type d'action automatique au mode demander d'abord.

Quel que soit le mode d'un type d'action, les limites de sécurité strictes de la plateforme, les budgets, les contrôles de fraîcheur et les pauses s'appliquent toujours — automatique ne signifie jamais sans supervision.

---

## Conseils

- **Utilisez Tester sur un ticket avant d'activer.** Une exécution de test vous donne de vraies propositions à évaluer sans que l'agent ne touche à quoi que ce soit d'autre. C'est la manière honnête d'ajuster un persona : modifier, re-tester, recommencer.
- **La carte Limites est votre voyant d'alerte précoce.** Un agent qui devient soudainement silencieux a généralement atteint un plafond quotidien — vérifiez *Exécutions / Tokens / Coût du jour* dans Suivi avant de conclure à une panne.
- **Lisez le Prompt effectif après une modification du persona.** C'est la référence exacte de ce que l'agent reçoit réellement, et cela rend évident le fait qu'une instruction a bien été prise en compte comme vous le souhaitiez.
- **Développez l'autonomie un type d'action à la fois.** Promouvez d'abord les types à faible risque (notes internes) et laissez les réponses au demandeur en mode demander d'abord jusqu'à ce que l'acceptation soit durablement élevée — l'échelle ne vous laissera pas passer en automatique sans les éléments requis, mais c'est vous qui définissez le niveau de tolérance.
- **Préférez le contexte partagé pour le contexte de fond, les bibliothèques pour les faits.** Le contexte partagé colore le jugement de l'agent mais n'est jamais cité ; seules les bibliothèques de connaissances (et, si elle est activée, le web) apparaissent comme sources dans une réponse.
- **Surveillez le Chevauchement dans l'aperçu de ciblage.** Un chiffre de chevauchement élevé signifie que deux agents se disputent les mêmes tickets — restreignez les filtres de l'un des agents, ou utilisez **Priorité agent** et **Collision ticket** pour décider qui l'emporte.
