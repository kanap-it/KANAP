# Plaid

Plaid est l'assistant de chat intégré à KANAP. Il est connecté aux mêmes données que vous manipulez déjà -- applications, actifs, projets, demandes, tâches, contrats, documents de connaissances et données de référence -- afin que vous puissiez poser des questions en langage naturel au lieu de cliquer sur plusieurs écrans pour trouver une réponse.

Plaid ne remplace pas le reste de l'application. C'est un moyen plus rapide de résumer un contexte, de localiser des enregistrements, de rédiger du texte ou de préparer des modifications. Les opérations sensibles sont toujours présentées sous forme d'aperçus que vous devez approuver avant que quoi que ce soit ne soit réécrit dans KANAP.

## Où le trouver

- Espace de travail : **Plaid** (navigation principale)
- Route : `/ai`
- Autorisation : `ai_chat:reader` vous permet d'ouvrir l'espace de travail de chat et de démarrer des conversations
- Indicateur de fonctionnalité : nécessite que la surface de chat soit activée sur votre instance. Si elle est désactivée, l'espace de travail affiche une notification au lieu de l'interface de chat.

L'espace de travail est également accessible aux administrateurs disposant de `ai_chat:admin`, qui peuvent voir et modérer tout ce que font les utilisateurs réguliers.

## Démarrer une conversation

Lorsque vous ouvrez Plaid pour la première fois, vous arrivez sur un écran d'accueil avec :

- Un court slogan (« Plaid est prêt ») et une description de ce que vous pouvez demander
- Une section **Essayez de demander** avec des exemples de prompts cliquables à envoyer
- La zone de saisie en bas, prête à recevoir votre premier message

Cliquez sur n'importe quelle suggestion pour l'envoyer directement, ou -- pour les prompts contenant un espace réservé `@` -- déposer la suggestion dans la zone de saisie pour la compléter.

Tapez un message et appuyez sur **Entrée** pour l'envoyer. **Maj+Entrée** insère un saut de ligne. Le bouton d'envoi est désactivé tant qu'il n'y a rien à envoyer et se transforme en bouton **Stop** rouge pendant que Plaid répond.

## La liste des conversations

La barre latérale gauche liste vos conversations passées. Utilisez l'icône menu en haut à gauche de la zone de chat pour la réduire ou la développer.

La liste contient :

- Un bouton **Nouvelle conversation** en haut
- Un champ de recherche qui apparaît dès que vous avez au moins une conversation
- Les conversations regroupées par date : **Aujourd'hui**, **Hier**, **7 derniers jours**, **Plus anciennes**

Chaque ligne affiche le titre de la conversation (ou **Sans titre** lorsqu'aucun n'a été défini). Survolez ou ciblez une ligne pour révéler :

- Une icône crayon -- **Renommer** la conversation. Double-cliquez sur le titre pour faire la même chose.
- Une icône poubelle -- **Archiver** la conversation. Les conversations archivées disparaissent de la liste. Si vous archivez la conversation actuellement ouverte, Plaid bascule sur un nouveau chat vide.

La recherche filtre la liste par titre au fur et à mesure que vous tapez. Le renommage et l'archivage sont enregistrés immédiatement.

## Rédiger un message

La zone de saisie est le point de contrôle principal de l'espace de travail. Elle prend en charge :

- Du texte multi-lignes jusqu'à 10 lignes visibles avant défilement
- Des pièces jointes images en ligne (PNG, JPG, GIF, WEBP)
- Des `@`-mentions d'enregistrements KANAP
- Un rappel des raccourcis clavier (« Entrée pour envoyer · Maj+Entrée pour saut de ligne »)

### Joindre des images

Vous pouvez ajouter des images de trois manières :

- Cliquer sur l'icône trombone et sélectionner les fichiers depuis votre ordinateur
- Glisser-déposer des fichiers images sur la zone de saisie (une superposition d'indication confirme la cible de dépôt)
- Coller une image directement depuis le presse-papiers

Chaque image en attente apparaît sous forme de miniature au-dessus du texte. Cliquez sur le petit **X** d'une miniature pour la supprimer. Il existe une limite de pièces jointes par message ; une fois atteinte, le trombone est désactivé jusqu'à ce que vous supprimiez ou envoyiez les pièces jointes en cours.

Les images sont téléversées avec votre message afin que Plaid puisse les décrire, les comparer ou en extraire des détails.

### Mentionner des enregistrements avec `@`

Taper `@` ouvre le **sélecteur de mentions** au-dessus de la zone de saisie. Il vous permet de référencer n'importe quel enregistrement KANAP auquel vous avez accès, avec deux modes complémentaires :

- **Préfixe par jeton de type** : codes courts qui correspondent à une seule famille d'entités. Exemples :
  - `@T-5` -- tâche avec la référence T-5
  - `@DOC` -- documents de connaissances récents
  - `@APP backup` -- applications correspondant à « backup »
  - `@PRJ`, `@REQ`, `@AST`, `@CONN`, `@INT`, `@LOC`, `@CTR`, `@CPX`, `@COMP`, `@CONT`, `@DEPT`, `@SUP`, `@BP`
- **Texte libre** : tout le reste (`@payroll`, `@server-2`) lance une recherche multi-types triée par pertinence.

Utilisez les flèches pour parcourir les suggestions, **Entrée** ou **Tab** pour confirmer, **Échap** pour fermer le sélecteur. Les résultats sont regroupés par type d'entité (Connaissances, Tâches, Projets, Applications, Actifs, Contrats, etc.) afin que vous puissiez identifier d'un coup d'œil quel type d'enregistrement vous êtes sur le point d'insérer.

Lorsque vous confirmez une suggestion, la zone de saisie continue d'afficher un libellé lisible (`@DOC-152`, `@SAP S/4HANA`). Lors de l'envoi du message, chaque mention est développée en un véritable lien que Plaid peut suivre vers l'enregistrement source.

### Modifier ou régénérer un message

Survolez l'un de vos messages précédents pour obtenir les actions au niveau du message :

- **Copier** -- copier le texte du message dans le presse-papiers
- **Modifier** -- rouvrir le message dans un éditeur en ligne ; l'enregistrement envoie la nouvelle version et tronque tout ce qui suivait (la conversation est rejouée à partir de ce point)
- **Régénérer** (sur les réponses de l'assistant) -- demander à Plaid de produire une autre réponse au même prompt

Modifier est le bon outil lorsque vous réalisez que votre question précédente n'était pas claire. Régénérer est le bon outil lorsque la question était bonne mais pas la réponse.

## Comment Plaid répond

Plaid diffuse sa réponse caractère par caractère. Pendant la diffusion :

- La zone de saisie reste utilisable pour préparer un suivi
- Le bouton d'envoi affiche une icône **Stop** rouge -- cliquer dessus annule la réponse en cours
- Un petit indicateur « Utilisation des outils… » apparaît lorsque Plaid effectue une recherche dans KANAP, récupère un document ou exécute un autre appel d'outil
- Le nombre et le type d'outils utilisés sont résumés sous la réponse une fois celle-ci terminée

Lorsque le flux se termine, le focus revient sur la zone de saisie afin que vous puissiez poursuivre la conversation sans avoir à atteindre la souris.

### Appels d'outils

Plaid utilise un petit ensemble d'outils internes pour répondre aux questions : `Search all`, `Search knowledge`, `Get document`, `Get entity context`, et quelques autres. Chaque appel d'outil apparaît sous forme de ligne compacte sous le message (« used Search all · 8 results »). Vous n'avez généralement pas besoin de lire les détails des outils, mais ils sont là si vous voulez voir exactement sur quels enregistrements la réponse était basée.

## Artefacts et aperçus

Certaines réponses sont accompagnées de matériel supplémentaire qui ne s'intègre pas naturellement dans le fil de discussion. KANAP appelle ces éléments des **artefacts**.

Cas courants :

- Un long bloc de texte ou de markdown que Plaid a préparé pour vous
- Un comparatif côte à côte **Avant / Après** d'un enregistrement que Plaid souhaite mettre à jour
- Un brouillon d'import ou un jeu de modifications nécessitant votre validation

Les artefacts s'ouvrent dans un panneau latéral à droite de l'espace de travail. Le panneau peut être basculé en cliquant sur le bouton de l'onglet **Artefacts** au bord droit de l'écran.

Le panneau s'ouvre automatiquement lorsque :

- Un long aperçu arrive pendant une réponse en streaming
- Un aperçu en attente nécessite votre décision (ceux-ci ouvrent toujours le panneau, car vous devez agir)

Pour les aperçus de modifications en attente, le panneau propose deux boutons :

- **Approuver** -- confirme la modification et permet à Plaid de l'appliquer
- **Rejeter** -- annule la modification. Plaid acquitte le rejet et continue la conversation.

Aucune modification de données KANAP n'est appliquée silencieusement. L'aperçu est le garde-fou.

## Indicateurs d'utilisation

Au-dessus de la zone de saisie, deux petits indicateurs vous aident à rester conscient des coûts et des limites :

- **Utilisation intégrée** : lorsque votre tenant utilise le fournisseur Plaid AI intégré (au lieu de votre propre clé API), cela indique combien de messages restent dans le mois en cours et la date de réinitialisation du quota. Lorsque la limite est atteinte, la zone de saisie est désactivée et un texte d'aide invite les administrateurs à passer à un fournisseur personnalisé.
- **Utilisation de tokens** : une barre fine avec compteurs de tokens en entrée/sortie pour la conversation en cours, plus la taille de la dernière requête. Les conversations longues deviennent plus coûteuses au fil du temps ; la barre rend ce coût visible afin que vous puissiez décider quand démarrer un nouveau fil.

La barre d'utilisation des tokens n'apparaît qu'une fois que la conversation a au moins un échange.

## Conseils

- **Utilisez les préfixes pour la précision** : `@T-`, `@DOC-`, `@PRJ-`, `@REQ-` correspondent directement aux références natives KANAP. Ce sont les moyens les plus rapides de pointer Plaid vers un enregistrement spécifique et ils survivent au copier-coller car ils sont identiques à ce que vous voyez ailleurs dans l'application.
- **Démarrez une nouvelle conversation par sujet** : garder des questions sans rapport dans des conversations distinctes réduit la fenêtre de contexte, accélère les réponses et diminue la facture en tokens. La liste des conversations est regroupée par date pour que vous puissiez les retrouver facilement.
- **Approuvez et rejetez délibérément** : les aperçus sont la seule chose qui se trouve entre Plaid et vos données en production. Prenez la seconde supplémentaire pour lire le diff avant de cliquer sur **Approuver**.
- **Arrêtez plutôt que d'attendre** : si Plaid prend la mauvaise direction en plein streaming, appuyez sur le bouton **Stop** plutôt que d'attendre la fin. Vous économiserez des tokens et votre message de suivi pourra corriger le tir.
- **Déposez les images directement** : faire glisser une capture d'écran sur la zone de saisie est plus rapide que le sélecteur de fichiers, et coller depuis le presse-papiers fonctionne aussi. Utilisez-le pour décrire un problème d'interface ou demander à Plaid de lire un graphique.
