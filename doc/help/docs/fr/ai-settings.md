# Paramètres Plaid

Le fournisseur que vous configurez sur cette page est le modèle d'IA par défaut de l'ensemble de votre tenant : il alimente à la fois l'[assistant de chat Plaid](ai-assistant.md) interactif et les [Agents IA](agents-overview.md) automatisés qui trient les tickets. Ce n'est donc pas un écran réservé au chat : choisir un fournisseur, activer la prise en charge multimodale ou atteindre une limite mensuelle affecte les agents autant que la fenêtre de chat. La page contrôle également quelles surfaces d'IA sont activées, combien de temps les conversations sont conservées, quelles clés permettent aux clients MCP externes d'accéder à vos données, et elle offre aux administrateurs une vue d'ensemble de l'utilisation à l'échelle du tenant pour surveiller le trafic et les coûts.

## Où la trouver

- Espace de travail : **Administration**
- Chemin : **Administration → Plaid**
- Route : `/admin/ai`
- Autorisation : `ai_settings:admin`
- Indicateur de fonctionnalité : nécessite que la surface des paramètres d'IA soit activée. Lorsqu'elle est désactivée, la page affiche un avis (« Les paramètres d'IA sont désactivés pour cette instance ») et aucun contrôle n'est disponible.

---

## Fournisseur

La section **Fournisseur** détermine quel grand modèle de langage votre tenant utilise. Le modèle que vous définissez ici est celui auquel l'assistant de chat Plaid s'adresse *et* celui que chaque agent IA utilise pour lire les tickets, planifier le travail et rédiger les réponses — il n'existe pas de réglage de modèle distinct pour les agents.

### Source du fournisseur

Lorsque le fournisseur intégré est proposé sur votre instance, vous pouvez choisir entre :

- **Plaid AI - Built-in** — le service hébergé de KANAP, avec un quota mensuel de messages suivi par tenant.
- **Your own provider** — utilisez votre propre clé API pour **Anthropic**, **OpenAI**, **Ollama** ou un point d'accès **Custom** (compatible OpenAI). Aucun quota au-delà de ce que votre propre fournisseur impose.

Lorsque l'option intégrée n'est pas proposée (cas typique des déploiements sur site), seule la configuration du fournisseur personnalisé est affichée.

### Built-in usage

Si vous sélectionnez le fournisseur intégré, une carte **Built-in usage** apparaît avec :

- Une barre de progression des **messages utilisés ce mois-ci** par rapport à la limite par tenant
- La date de **réinitialisation** du quota
- Un rappel indiquant que le passage à vos propres clés supprime le plafond

Le quota intégré est partagé entre les requêtes de chat et MCP de ce tenant, et un « message » est compté de la même manière que dans la [Vue d'ensemble de l'utilisation](#vue-densemble-de-lutilisation) ci-dessous — une question de chat *ou* un ticket examiné par un agent. Autrement dit, l'activité des agents puise dans le même quota mensuel que le chat : une flotte d'agents active le consomme donc plus vite.

### Configuration du fournisseur personnalisé

Sélectionnez **Your own provider** pour afficher :

- **Fournisseur** — Anthropic, OpenAI, Ollama ou Custom (compatible OpenAI). Laissez-le sur **Aucun** pour effacer le réglage.
- **Modèle** — l'identifiant exact du modèle (par exemple `claude-sonnet-4-20250514`, `gpt-4o` ou `llama3`).
- **URL du point d'accès** — affichée uniquement pour les fournisseurs Ollama et Custom. Lorsque Ollama s'exécute sur l'hôte tandis que KANAP s'exécute dans Docker, utilisez `http://host.docker.internal:<port>/v1` plutôt que `localhost`.
- **Clé API** — requise lorsque le fournisseur en a besoin. Les clés existantes sont masquées ; laissez le champ vide pour conserver la valeur enregistrée lors d'une sauvegarde ou d'un test. Si le stockage des secrets n'est pas configuré sur l'instance, le champ l'indique.

Une fois tout configuré, cliquez sur **Tester la connexion** pour lancer un test sans frais auprès du fournisseur. Le résultat s'affiche dans une bannière avec le fournisseur, le modèle et la latence aller-retour.

### LLM multimodal

Le commutateur **LLM multimodal** détermine si le modèle est autorisé à analyser des images. Lorsqu'il est activé, l'assistant de chat comme les agents IA peuvent lire les images jointes — le plus utile étant les **captures d'écran de tickets** que les demandeurs collent dans un ticket, que les agents utilisent ensuite comme preuves lors de la rédaction d'une réponse. Ne l'activez que si le modèle configuré prend réellement en charge la vision ; désactivez-le si le modèle est uniquement textuel, faute de quoi les requêtes contenant des images échoueront. Les nouveaux tenants l'ont activé par défaut.

### Indicateurs d'état

L'en-tête de la carte Fournisseur affiche trois indicateurs consultables d'un coup d'œil :

- **Chat activé / Chat désactivé** — l'interrupteur principal du chat pour les utilisateurs finaux
- **MCP activé / MCP désactivé** — indique si les clients MCP externes peuvent se connecter
- **Fournisseur prêt / Fournisseur incomplet** — indique si la configuration du fournisseur est valide et utilisable

Les erreurs de validation (clé API manquante, format de point d'accès incorrect, modèle inconnu) apparaissent dans un avertissement au-dessus du formulaire, sous **Erreurs de validation du fournisseur actuel**, pour que vous sachiez exactement quoi corriger.

---

## Fonctionnalités

La section **Fonctionnalités** active ou désactive les surfaces d'IA facultatives :

- **Activer le chat** — active ou désactive l'espace de chat intégré pour les utilisateurs finaux.
- **Activer MCP** — active ou désactive l'API MCP pour les clients externes.
- **Recherche web** — permet à l'assistant de chat Plaid d'effectuer des recherches sur le web. Cela nécessite que la clé de recherche web au niveau de l'instance soit configurée ; sans elle, le commutateur est désactivé et une infobulle en explique la raison. Son activation lance automatiquement un test de connectivité et en signale le résultat. Ce commutateur s'applique **uniquement à l'assistant de chat** — les agents IA disposent de leur propre réglage de recherche web indépendant, dans l'onglet [Paramètres](agents-workspace.md) de chaque agent, qui repose sur la même configuration au niveau de l'instance.

---

## Conservation

- **Conservation des conversations (jours)** — les conversations de chat et leurs messages plus anciens que cette valeur deviennent éligibles à un nettoyage automatique. Laissez le champ vide pour les conserver indéfiniment.

---

## Clés API MCP

La section **Clés API MCP** génère des clés à longue durée de vie pour que des assistants externes et des IDE puissent communiquer avec KANAP via le Model Context Protocol, en utilisant les mêmes données que celles vues par Plaid.

La carte présente un bouton **Créer une clé**, le plafond **Durée de vie maximale de la clé (jours)** et un tableau des clés existantes avec **Libellé**, **Préfixe**, **Créé**, **Expire**, **Dernière utilisation** et **Statut** (**Active** ou **Révoquée**).

### Créer une clé

1. Cliquez sur **Créer une clé**.
2. Saisissez un **Libellé** descriptif (par exemple « Client MCP de bureau »).
3. Cliquez sur **Créer**. KANAP génère un secret à usage unique.
4. Copiez le secret immédiatement — il n'est affiché qu'une seule fois et ne pourra pas être récupéré par la suite.

Le champ **Durée de vie maximale de la clé (jours)** limite la durée de vie de toute clé nouvellement émise, quelle que soit la valeur demandée dans la requête. Laissez-le vide pour aucune limite d'expiration.

### Révoquer une clé

Cliquez sur l'icône de corbeille sur n'importe quelle ligne active pour révoquer la clé. Les clés révoquées restent dans le tableau à des fins d'audit mais ne peuvent plus s'authentifier.

---

## Vue d'ensemble de l'utilisation

En bas de la page, la carte **Vue d'ensemble de l'utilisation** récapitule l'activité d'IA de l'ensemble de l'organisation. Comme l'explique la carte, un **message** correspond à une question envoyée à Plaid *ou* à un ticket examiné par un agent — l'unité comptée par le volume mensuel inclus.

La rangée supérieure de cartes de métriques concerne les conversations de chat :

- **Toutes les conversations** — nombre total de conversations créées depuis le début
- **Conversations actives (7j)** et **Conversations actives (30j)** — conversations mises à jour au cours des 7 ou 30 derniers jours
- **Utilisateurs actifs (30j)** — utilisateurs uniques ayant discuté au cours des 30 derniers jours

En dessous, le tableau **Utilisation des tokens** décompose deux fenêtres — **Mois en cours** et **30 derniers jours** — en **Tokens en entrée**, **Tokens en sortie**, **Tokens totaux** et **Messages utilisateur** (les questions de chat posées dans chaque fenêtre).

Si un agent a effectué du travail, un bloc **Messages des agents (ce mois-ci)** apparaît en dessous. **Tous les agents** affiche le nombre cumulé de tickets examinés ce mois-ci par l'ensemble de la flotte, et une carte par agent affiche le nombre propre à cet agent ; la légende de chaque carte indique le chiffre des **30 derniers jours** pour le même périmètre. Il s'agit de la contrepartie à l'échelle du tenant des chiffres par agent présentés dans l'[espace de l'agent](agents-workspace.md) — utilisez-le pour voir quels agents effectuent le plus de travail et pour vérifier que le volume des agents est cohérent avec le budget de votre fournisseur.

Les totaux de tokens récapitulent les entrées et sorties du modèle pour chaque fenêtre ; le volume des agents est suivi séparément sous forme de nombres de messages dans le bloc **Messages des agents**, plutôt que d'être détaillé sur sa propre ligne de tokens ici.

---

## Conseils

- **Choisissez le modèle en pensant aux agents.** Comme les agents partagent ce fournisseur, un modèle uniquement textuel moins coûteux fait économiser sur le chat mais empêche vos agents de tri de lire les captures d'écran — décidez en gardant les deux usages à l'esprit, et associez un modèle capable de vision au commutateur **LLM multimodal** si les agents traitent des tickets riches en images.
- **Testez avant d'activer le chat.** Le bouton **Tester la connexion** valide les identifiants sans rien écrire ni consommer de quota. Lancez-le avant d'activer le chat pour les utilisateurs finaux ou de démarrer un agent.
- **Renouvelez les clés MCP.** Préférez des clés à courte durée de vie pour les postes de travail partagés, et utilisez **Durée de vie maximale de la clé (jours)** pour imposer un plafond qu'aucune requête ne peut dépasser.
- **Surveillez ensemble les totaux de tokens et les nombres d'agents.** Un mois isolé avec des totaux très élevés provient généralement de quelques longues conversations ou d'une lourde charge de travail des agents — le bloc **Messages des agents** vous indique laquelle, afin que vous puissiez encourager des fils de discussion distincts par sujet ou revoir la cadence de contrôle d'un agent.
- **Définissez une fenêtre de conservation.** Conserver les conversations indéfiniment est pratique jusqu'à ce que la base de données devienne volumineuse ou qu'une revue de conformité demande combien de temps le contenu du chat est conservé — 90 ou 180 jours constituent un point de départ courant.
- **GLPI se configure ailleurs.** La connexion au système de ticketing sur laquelle travaillent vos agents se configure sous **Administration → Intégrations**, et non ici — voir [Intégrations](integrations.md).
