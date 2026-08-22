# Intégrations

Utilisez la page Intégrations pour connecter KANAP à des outils tiers qui complètent les données que vous gérez déjà dans la plateforme. Aujourd'hui, la page configure une seule connexion : votre centre de services **GLPI**. Cette unique connexion remplit désormais deux fonctions à la fois — elle permet à **Plaid** (le chat interactif) de trouver et d'importer des tickets dans KANAP sous forme de tâches, et elle alimente les **Agents IA** qui surveillent votre centre de services et proposent ou réalisent le travail sur les tickets. De nouvelles intégrations viendront s'ajouter ici au fil du temps.

## Où la trouver

- Espace de travail : **Administration**
- Chemin : **Administration → Intégrations**
- Route : `/admin/integrations`
- Autorisation : `ai_settings:admin` pour consulter et modifier la connexion sur cette page
- Indicateur de fonctionnalité : partage la même surface `ai_settings` que la page de paramètres Plaid. Lorsque la surface est désactivée, l'entrée n'apparaît pas dans la barre latérale.

Les identifiants que vous saisissez ici sont ceux que Plaid comme n'importe quel Agent IA utilisent pour atteindre GLPI — vous configurez la connexion une seule fois, à un seul endroit.

---

## Intégration GLPI

[GLPI](https://glpi-project.org/) est un outil populaire et open source de gestion des services informatiques. Cette page stocke les identifiants que KANAP utilise pour atteindre votre instance GLPI. Ce que KANAP fait de cette connexion dépend de la fonctionnalité que vous y raccordez.

### Comment ça fonctionne

La connexion alimente deux workflows que vous activez et pilotez séparément.

**1. Import via le chat Plaid (aperçu et approbation).** Un utilisateur final demande à Plaid quelque chose comme « importe les tickets GLPI ouverts assignés à mon équipe ». Plaid interroge GLPI à l'aide des identifiants que vous configurez ici, renvoie les tickets candidats sous forme d'aperçu dans le chat, et ne crée une tâche par ticket qu'après que l'utilisateur a examiné l'aperçu et cliqué sur **Approuver**. Rien n'est écrit dans KANAP sans cette approbation explicite ; les administrateurs peuvent donc confier cette fonction aux utilisateurs finaux sans craindre une modification silencieuse des données.

**2. Des Agents IA qui surveillent le centre de services.** Une fois GLPI connecté ici, un administrateur peut y raccorder un agent **Helpdesk** et le laisser surveiller les tickets nouveaux et mis à jour, puis proposer le travail — réponses au demandeur, notes internes et mises à jour de la classification, du statut, de l'affectation, des participants et de la clôture/résolution. Chaque modification de l'agent est toujours proposée à votre approbation avant d'être envoyée à GLPI, et des limites de sécurité strictes, des budgets et des contrôles de fraîcheur s'appliquent en permanence. Cette page ne configure aucun comportement d'agent ; elle fournit uniquement la connexion utilisée par les agents.

### Utilisé par les Agents IA

Après avoir enregistré ici une connexion fonctionnelle, un administrateur configure les agents dans la section Agents IA — voir [Agents IA — Vue d'ensemble](agents-overview.md). Depuis **Nouvel agent** ou les **Paramètres** d'un agent existant, il choisit cette connexion GLPI comme centre de services surveillé par l'agent. L'agent la consulte et rédige à partir d'elle, mais par défaut il n'envoie jamais rien de lui-même : chaque réponse, note ou changement de statut proposé passe d'abord par la file d'approbation.

### Prérequis

- **Le chat Plaid doit être activé** sur votre tenant pour le workflow d'import via le chat. La page affiche une infobulle d'information à côté du titre de la section pour vous rappeler cette dépendance.
- **Les Agents IA doivent être activés** sur l'instance pour le workflow d'agent, et l'agent doit être configuré par une personne disposant du niveau Administrateur des Agents IA (`ai_agents:admin`).
- Une instance GLPI joignable depuis KANAP en HTTPS.
- Un **Jeton utilisateur** pour un compte utilisateur GLPI disposant d'un accès en lecture aux tickets que vous souhaitez exposer.
- Un **Jeton d'application** facultatif si votre instance GLPI exige une authentification au niveau applicatif.

L'intégration se configure tenant par tenant ; les identifiants ci-dessous sont limités à votre tenant et n'en sortent jamais.

### Champs

Le formulaire de configuration contient :

- **Activer l'import de tickets GLPI** — interrupteur principal de la connexion. Lorsqu'il est désactivé, KANAP n'essaiera pas d'interroger GLPI même si des identifiants sont renseignés — ni les imports Plaid ni les contrôles d'agent n'atteindront votre centre de services.
- **URL GLPI** — l'URL de base de votre instance GLPI, par exemple `https://glpi.example.com`.
- **Jeton utilisateur** — le jeton d'API personnel du compte GLPI que KANAP utilisera. Les jetons existants sont masqués ; laissez le champ vide lors d'un enregistrement ou d'un test pour conserver la valeur stockée.
- **Jeton d'application** — le jeton d'application GLPI facultatif. Même comportement « laisser vide pour conserver » que pour le jeton utilisateur.

### Actions

- **Enregistrer les paramètres** — enregistre le formulaire. Les jetons saisis dans le formulaire remplacent ceux qui sont stockés ; les champs de jeton laissés vides conservent la valeur déjà enregistrée.
- **Tester la connexion** — effectue un aller-retour authentifié vers l'URL GLPI à l'aide des valeurs du formulaire (ou, lorsqu'elles sont vides, des valeurs stockées). La bannière de résultat indique la réussite ou l'erreur sous-jacente, ainsi que la latence.

### Stockage des secrets

Si votre instance KANAP ne dispose pas d'un coffre à secrets configuré, un texte d'aide apparaît sous chaque champ de jeton pour vous avertir que les valeurs ne peuvent pas être conservées. Configurez le stockage des secrets au niveau de l'instance avant de vous appuyer sur cette intégration en production.

---

## Conseils

- **Utilisez un compte GLPI dédié** : créez un compte de service dans GLPI avec juste assez d'autorisations pour lire les catégories de tickets que vous souhaitez exposer. Cela garde le journal d'audit propre et vous permet de révoquer l'accès sans affecter un utilisateur réel. Si les agents doivent envoyer des réponses et des changements de statut, accordez à ce même compte l'accès en écriture requis par ces actions.
- **Testez avant d'annoncer** : lancez **Tester la connexion** après chaque modification de l'URL ou des jetons. Le message d'erreur est bien plus exploitable qu'un échec qui apparaît au sein de la conversation de chat d'un utilisateur ou dans un contrôle d'agent bloqué.
- **Associez les bonnes autorisations** : seuls les utilisateurs disposant de `ai_chat:reader` peuvent demander à Plaid d'importer des tickets. Raccorder un agent à cette connexion nécessite le rôle Agents IA — `ai_agents:reader` pour consulter un agent, `ai_agents:admin` pour en configurer un — avec les Agents IA activés sur l'instance. Combinez cela avec un accès basé sur les rôles aux tâches si vous souhaitez limiter qui crée réellement des enregistrements de tâches à partir des imports.
- **Prévoyez la rotation des jetons** : les jetons personnels GLPI peuvent être régénérés. Lorsque vous le faites, enregistrez la nouvelle valeur ici et lancez le test de connexion avant que les utilisateurs — ou les agents — ne sollicitent à nouveau l'intégration.
