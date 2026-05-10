# Paramètres Plaid

Utilisez la page de paramètres Plaid pour configurer le comportement de l'assistant de chat pour votre tenant : le fournisseur d'IA auquel il s'adresse, les fonctionnalités activées, la durée de conservation des conversations et les clés permettant aux clients MCP externes de se connecter à vos données. La page offre également aux administrateurs une vue d'ensemble de l'utilisation pour surveiller le trafic et les coûts.

## Où la trouver

- Espace de travail : **Administration**
- Chemin : **Administration → Plaid**
- Route : `/admin/ai`
- Autorisation : `ai_settings:admin`
- Indicateur de fonctionnalité : nécessite que la surface `ai_settings` soit activée. Lorsque la surface est désactivée, la page affiche une notification (« Les paramètres IA sont désactivés pour cette instance ») et aucun contrôle n'est disponible.

## Fournisseur

La section Fournisseur est l'endroit où vous choisissez quel grand modèle de langage Plaid doit utiliser.

### Source du fournisseur

Lorsque le fournisseur intégré est proposé sur votre instance, vous pouvez choisir entre :

- **Plaid AI - Intégré** : le service Plaid AI hébergé par KANAP. Pratique, avec un quota mensuel de messages suivi par tenant.
- **Votre propre fournisseur** : apportez votre propre clé API pour **Anthropic**, **OpenAI**, **Ollama** ou un endpoint **personnalisé** compatible OpenAI. Pas de quota au-delà de ce que votre fournisseur impose.

Lorsque l'option intégrée n'est pas proposée (typique pour les déploiements on-premise), seule la configuration du fournisseur personnalisé est affichée.

### Utilisation intégrée

Si vous sélectionnez le fournisseur intégré, une carte d'utilisation apparaît avec :

- Une barre de progression des messages utilisés ce mois-ci par rapport à la limite par tenant
- La date de réinitialisation du quota
- Un bref rappel que passer à vos propres clés supprime le plafond

### Configuration du fournisseur personnalisé

Sélectionnez **Votre propre fournisseur** pour afficher :

- **Fournisseur** -- Anthropic, OpenAI, Ollama ou Personnalisé (compatible OpenAI)
- **Modèle** -- l'identifiant exact du modèle (par ex. `claude-sonnet-4-20250514`, `gpt-4o`, `llama3`)
- **URL de l'endpoint** -- uniquement pour les fournisseurs Ollama et Personnalisé. Pour Ollama s'exécutant sur l'hôte alors que KANAP s'exécute dans Docker, utilisez `http://host.docker.internal:<port>/v1`.
- **Clé API** -- requise lorsque le fournisseur en a besoin. Les clés existantes sont masquées ; laissez le champ vide pour conserver la valeur stockée lors d'un enregistrement ou d'un test.

Une fois tout configuré, cliquez sur **Tester la connexion** pour exécuter un ping sans coût contre le fournisseur. Le résultat est affiché dans une bannière avec le fournisseur, le modèle et la latence aller-retour.

### Pastilles de statut

L'en-tête de la carte Fournisseur affiche trois indicateurs en un coup d'œil :

- **Chat activé / désactivé** -- l'interrupteur principal pour le chat utilisateur final
- **MCP activé / désactivé** -- si les clients MCP externes peuvent se connecter
- **Fournisseur prêt / incomplet** -- si la configuration du fournisseur est valide

Les erreurs de validation (clé API manquante, format d'endpoint incorrect, modèle inconnu) apparaissent dans un avertissement jaune au-dessus du formulaire afin que vous sachiez exactement ce qu'il faut corriger.

## Fonctionnalités

La section Fonctionnalités active ou désactive les surfaces optionnelles de Plaid :

- **Activer le chat** -- active ou désactive l'espace de travail de chat dans l'application pour les utilisateurs finaux
- **Activer MCP** -- active ou désactive l'API MCP pour les clients externes
- **Recherche web** -- permet à Plaid d'effectuer des recherches sur le web (nécessite que `BRAVE_SEARCH_API_KEY` soit configuré au niveau de l'instance ; sinon le bouton est désactivé avec une infobulle). Activer le bouton lance automatiquement un test de connectivité.
- **Enrichissement web** -- permet à Plaid de compléter une recherche en récupérant des pages pour un contexte plus riche. Disponible uniquement lorsque la recherche web est activée.

## Rétention

La section Rétention limite la durée pendant laquelle Plaid conserve le contenu utilisateur :

- **Rétention des conversations (jours)** -- les conversations et leurs messages plus anciens que cette valeur sont éligibles à la suppression par le job de nettoyage. Laissez vide pour les conserver indéfiniment.

## Clés API MCP

La section MCP (Model Context Protocol) vous permet de générer des clés API à longue durée de vie afin que les assistants externes et les IDE puissent dialoguer avec KANAP en utilisant les mêmes données que Plaid voit.

La carte affiche :

- Un bouton **Créer une clé**
- **Durée de vie maximale d'une clé (jours)** -- la durée de vie maximale avec laquelle toute nouvelle clé peut être émise. Laissez vide pour aucune limite d'expiration.
- Un tableau des clés existantes avec **Libellé**, **Préfixe**, **Créée**, **Expire**, **Dernière utilisation** et **Statut** (Active ou Révoquée)

### Créer une clé

1. Cliquez sur **Créer une clé**.
2. Saisissez un **Libellé** descriptif (par exemple, « Client MCP de bureau »).
3. Cliquez sur **Créer**. KANAP génère un secret unique.
4. Copiez le secret immédiatement -- il n'est affiché qu'une seule fois et ne peut pas être récupéré ultérieurement.

### Révoquer une clé

Cliquez sur l'icône poubelle de toute ligne active pour révoquer la clé. Les clés révoquées restent dans le tableau à des fins d'audit mais ne peuvent plus s'authentifier.

## Vue d'ensemble de l'utilisation

En bas de la page, la carte **Vue d'ensemble de l'utilisation** présente les métriques de chat à l'échelle du tenant :

- **Toutes les conversations** -- nombre total de conversations jamais créées
- **Conversations actives (7j / 30j)** -- conversations mises à jour au cours des 7 ou 30 derniers jours
- **Utilisateurs actifs (30j)** -- utilisateurs uniques ayant chatté au cours des 30 derniers jours

Un tableau **Utilisation de tokens** détaille les fenêtres **mois en cours** et **30 derniers jours** par tokens d'entrée, tokens de sortie, total de tokens et nombre de messages. Les totaux de tokens sont agrégés à partir des messages de chat (le trafic MCP n'est pas inclus).

## Conseils

- **Tester avant d'enregistrer** : le bouton **Tester la connexion** valide les identifiants sans rien écrire. Utilisez-le avant d'activer le chat pour les utilisateurs finaux.
- **Faites tourner les clés MCP** : préférez des clés à courte durée de vie pour les postes partagés. Le champ **Durée de vie maximale d'une clé** plafonne la durée de validité de toute nouvelle clé, indépendamment de la requête.
- **Surveillez la barre de tokens** : une utilisation supérieure à 1M tokens par mois sur un seul tenant signifie généralement que quelques très longues conversations consomment le budget -- encouragez les utilisateurs à démarrer de nouveaux fils par sujet.
- **Définissez une rétention** : conserver les conversations indéfiniment est pratique jusqu'à ce que la base de données devienne volumineuse ou qu'une revue de conformité demande pendant combien de temps le contenu de chat est conservé. Un point de départ courant est 90 ou 180 jours.
