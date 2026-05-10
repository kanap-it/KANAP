# Intégrations

Utilisez la page Intégrations pour connecter KANAP à des outils tiers qui complètent les données que vous gérez déjà dans la plateforme. Aujourd'hui, la page se concentre sur **l'import des tickets GLPI** via Plaid ; de nouvelles intégrations seront ajoutées ici au fil du temps.

## Où la trouver

- Espace de travail : **Administration**
- Chemin : **Administration → Intégrations**
- Route : `/admin/integrations`
- Autorisation : `ai_settings:admin`
- Indicateur de fonctionnalité : partage la même surface `ai_settings` que la page de paramètres Plaid. Lorsque la surface est désactivée, l'entrée n'apparaît pas dans la barre latérale.

## Intégration GLPI

[GLPI](https://glpi-project.org/) est un outil open source populaire de gestion des services informatiques. L'intégration permet à votre équipe de demander à Plaid de trouver des tickets dans GLPI et d'importer ceux qui sont pertinents dans KANAP sous forme de tâches, avec une étape de confirmation à chaque import.

### Comment ça fonctionne

1. Un utilisateur final demande à Plaid quelque chose comme « importe les tickets GLPI ouverts assignés à mon équipe ».
2. Plaid interroge GLPI via les identifiants que vous configurez ici.
3. Les tickets candidats sont retournés sous forme d'aperçu dans le chat.
4. L'utilisateur examine l'aperçu et clique sur **Approuver** pour les tickets qu'il souhaite importer dans KANAP.
5. KANAP crée une tâche par ticket approuvé.

Rien n'est écrit dans KANAP sans cette approbation explicite, ce qui permet aux administrateurs de mettre l'intégration entre les mains des utilisateurs finaux sans craindre de modifications silencieuses des données.

### Prérequis

- **Le chat Plaid doit être activé** sur votre tenant. La page affiche une infobulle d'information à côté du titre de la section pour vous rappeler cette dépendance. L'intégration est configurée tenant par tenant ; les identifiants ci-dessous ne quittent jamais votre tenant.
- Une instance GLPI accessible depuis KANAP via HTTPS.
- Un **User Token** pour un compte utilisateur GLPI ayant un accès en lecture aux tickets que vous souhaitez exposer.
- Un **App Token** optionnel si votre instance GLPI nécessite une authentification au niveau application.

### Champs

Le formulaire de configuration contient :

- **Activer l'import des tickets GLPI** -- interrupteur principal pour l'intégration. Lorsqu'il est désactivé, Plaid ne tentera pas d'interroger GLPI même si les identifiants sont définis.
- **URL GLPI** -- l'URL de base de votre instance GLPI, par exemple `https://glpi.example.com`.
- **User Token** -- le token API personnel du compte GLPI que Plaid utilisera. Les tokens existants sont masqués ; laissez le champ vide lors d'un enregistrement ou d'un test pour conserver la valeur stockée.
- **App Token** -- le token application GLPI optionnel. Même comportement « vide pour conserver » que le user token.

### Actions

- **Enregistrer les paramètres** -- persiste le formulaire. Les tokens saisis dans le formulaire remplacent ceux stockés ; les champs token vides conservent ce qui est déjà stocké.
- **Tester la connexion** -- exécute un aller-retour authentifié contre l'URL GLPI en utilisant les valeurs du formulaire (ou, lorsqu'elles sont vides, les valeurs stockées). La bannière de résultat affiche le succès ou l'erreur sous-jacente avec la latence.

### Stockage des secrets

Si votre instance KANAP n'a pas de coffre-fort de secrets configuré, un texte d'aide apparaît sous chaque champ token vous avertissant que les valeurs ne peuvent pas être persistées. Configurez le stockage des secrets au niveau de l'instance avant de vous appuyer sur cette intégration en production.

## Conseils

- **Utilisez un compte GLPI dédié** : créez un compte de service dans GLPI avec juste assez de permissions pour lire les catégories de tickets que vous souhaitez exposer. Cela garde le journal d'audit propre et vous permet de révoquer l'accès sans affecter un véritable utilisateur.
- **Testez avant d'annoncer** : exécutez **Tester la connexion** après chaque modification de l'URL ou des tokens. Le message d'erreur est bien plus exploitable qu'un échec qui apparaît au sein de la conversation chat de quelqu'un.
- **Combinez avec les permissions Plaid** : seuls les utilisateurs disposant de `ai_chat:reader` peuvent demander à Plaid d'importer des tickets. Combinez cela avec un contrôle d'accès basé sur les rôles pour les tâches si vous souhaitez limiter qui crée réellement des enregistrements de tâches à partir des imports.
- **Planifiez la rotation des tokens** : les tokens personnels GLPI peuvent être régénérés. Lorsque vous le faites, enregistrez la nouvelle valeur ici et exécutez le test de connexion avant que les utilisateurs n'utilisent à nouveau l'intégration.
