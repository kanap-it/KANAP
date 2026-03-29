# Carte des connexions

La carte des connexions fournit une visualisation interactive de la topologie de votre réseau d'infrastructure. Les actifs apparaissent comme des nœuds et les connexions comme des arêtes, montrant comment les données circulent au niveau de l'infrastructure. Utilisez-la pour explorer les dépendances, tracer les chemins de connexion et exporter des diagrammes pour la documentation d'architecture.

## Où la trouver

Naviguez vers **Cartographie SI > Carte des connexions** pour ouvrir la visualisation.

**Autorisations** : Vous avez besoin au minimum de `applications:reader` pour voir la carte.

---

## Comprendre la visualisation

La carte utilise un graphe à disposition en force où :
- Les **nœuds** représentent des serveurs, clusters ou entités logiques
- Les **arêtes** représentent des connexions entre les composants d'infrastructure
- Les **couleurs** indiquent le type d'hébergement (on-premise, cloud) ou le type de nœud
- Le **placement par rôle** (activé par défaut) guide les nœuds en bandes de haut en bas selon les niveaux de rôle

### Types de nœuds

| Type | Forme | Couleur de bordure | Description |
|------|-------|-------------------|-------------|
| **Serveurs** | Rectangle arrondi | Vert (on-prem) ou bleu (cloud) | Instances d'infrastructure individuelles (VMs, conteneurs, etc.) |
| **Clusters** | Rectangle arrondi, bordure en pointillés | Cyan | Groupes de serveurs agissant comme une unité logique unique |
| **Entités** | Forme pilule / stade | Orange | Points de terminaison logiques (systèmes externes, services SaaS) |

Les membres d'un cluster apparaissent comme des nœuds séparés avec des lignes pointillées les reliant à leur nœud cluster parent.

---

## Filtres

### Cycle de vie

Filtre multi-sélection pour le statut de cycle de vie des connexions. Choisissez quels statuts inclure dans la visualisation (par ex., Actif, Planifié, Obsolète). Par défaut : **Actif** uniquement.

### Applications

Trouvez des serveurs par les applications qui les utilisent :
1. Sélectionnez une ou plusieurs applications dans la liste déroulante **Applications**
2. Sélectionnez des environnements dans la liste déroulante **Env App** (affiche uniquement les environnements où les applications sélectionnées ont des serveurs assignés)
3. Les serveurs correspondants sont automatiquement ajoutés au filtre **Serveurs**

Cela est utile lorsque vous souhaitez voir les connexions d'infrastructure pour une application spécifique sans connaître les serveurs sur lesquels elle fonctionne.

### Serveurs

Sélectionnez directement des serveurs, clusters ou entités à cibler :
1. Cliquez sur la liste déroulante **Serveurs**
2. Sélectionnez des éléments (groupés par type : Entités, Clusters, Serveurs)
3. Utilisez le filtre **Profondeur** pour contrôler le nombre de sauts à afficher

Lorsque vous sélectionnez des éléments ici, une pastille « +N de plus » apparaît si beaucoup sont sélectionnés. Cliquez dessus pour voir et gérer la liste complète.

### Profondeur

Limitez le nombre de « sauts » depuis les serveurs sélectionnés à afficher :
- **Tous** : Afficher toutes les connexions (pas de filtrage par profondeur)
- **0** : Afficher uniquement les serveurs sélectionnés, leurs clusters parents et les entités directement adjacentes
- **1–5** : Afficher les serveurs à N sauts des serveurs sélectionnés

La profondeur est automatiquement définie à **0** lorsque vous sélectionnez des serveurs via les filtres Applications ou Serveurs.

---

## Options d'affichage

### Afficher les connexions multi-serveurs

Basculer la visibilité des connexions multi-serveurs (connexions impliquant plus de deux serveurs dans une topologie maillée). Activé par défaut.

### Afficher les couches de connexion

Lorsque activé (par défaut), affiche les segments de connexion individuels comme des arêtes séparées. Cela montre comment une connexion multi-segments route à travers des points intermédiaires. Lorsque désactivé, les connexions sont affichées comme de simples arêtes source-destination.

### Placement par rôle

Lorsque activé (par défaut), la carte conserve sa disposition en force mais ajoute un guidage vertical par niveaux :

- Bandes **Haut / Supérieur / Centre / Inférieur / Bas**
- Les **serveurs** utilisent les affectations de rôle configurées dans les paramètres de la Cartographie SI
- Les **entités** utilisent leur niveau de graphe configuré (par défaut Haut)
- Les **serveurs non assignés** tombent par défaut au Centre
- Les **clusters** héritent du niveau de priorité la plus haute de leurs membres

Utilisez cette option lorsque vous souhaitez une vue de topologie qui se lit comme des niveaux d'architecture (composants en bordure en haut, stockage de données en bas).

Cette option est valable pour la session uniquement et se réinitialise lorsque vous rechargez la page.

---

## Contrôles du graphe

Le panneau de contrôle sur le côté gauche de la carte fournit ces outils :

| Contrôle | Action | Description |
|----------|--------|-------------|
| Pause / Lecture | **Geler / Dégeler** | Mettre en pause la simulation de force pour positionner manuellement les nœuds |
| Réticule | **Auto-centrage** | Activer/désactiver le centrage automatique lors de la sélection de nœuds (bleu = activé) |
| Zoom + | **Zoom avant** | Augmenter le niveau de zoom |
| Zoom - | **Zoom arrière** | Diminuer le niveau de zoom |
| Grille | **Aligner sur la grille** | Aligner tous les nœuds sur une grille pour des dispositions plus propres |
| SVG | **Exporter SVG** | Télécharger la vue actuelle comme image vectorielle |
| PNG | **Exporter PNG** | Télécharger la vue actuelle comme image raster |

Vous pouvez également zoomer avec la molette de la souris et faire défiler en cliquant et en faisant glisser le fond.

---

## Interagir avec la carte

### Sélection de nœuds

Cliquez sur un nœud serveur ou cluster pour :
- Mettre en surbrillance ses connexions
- Ouvrir un panneau de détail avec :
  - **Type de serveur** : Type de serveur (Web, Base de données, Application, etc.)
  - **Emplacement du serveur** : Code du site physique ou cloud
  - **Système d'exploitation** : Détails de l'OS
  - **Segment réseau** : Zone réseau
  - **Adresse IP** : Adresse réseau
  - **Applications assignées** : Applications fonctionnant sur ce serveur, groupées par environnement (cliquable)
- Bouton **Modifier le serveur** ou **Voir le cluster** pour ouvrir l'espace de travail

Cliquez sur un nœud entité pour voir son type et environnement.

### Sélection d'arêtes

Cliquez sur une arête de connexion pour :
- Voir les détails de la connexion :
  - **Objectif** : À quoi sert la connexion
  - **Protocoles** : Protocoles réseau utilisés
  - **Ports typiques** : Numéros de ports attendus
  - **Criticité** : Importance métier
  - **Topologie** : Serveur à serveur ou multi-serveurs
- Bouton **Modifier la connexion** pour ouvrir l'espace de travail de la connexion
- Section **Interfaces liées** montrant quelles interfaces applicatives utilisent cette connexion
  - Cliquez sur **Ouvrir l'interface** pour voir l'interface
  - Cliquez sur **Voir dans la carte des interfaces** pour voir l'interface en contexte

### Déplacement de nœuds

Faites glisser n'importe quel nœud pour le repositionner. Pendant que la simulation est en cours, la disposition s'ajustera autour du nœud déplacé. Lorsque la simulation est gelée, le déplacement déplace le nœud librement sans affecter les autres.

---

## Liens profonds

La carte supporte les paramètres d'URL pour partager des vues spécifiques :

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `lifecycles` | Pré-sélectionner les filtres de cycle de vie (séparés par des virgules) | `active,planned` |
| `focusConnectionId` | Mettre en surbrillance une connexion spécifique | UUID |
| `rootIds` | Pré-sélectionner des serveurs à cibler (séparés par des virgules) | UUIDs |
| `depth` | Définir la limite de profondeur | `0`, `1`, `all` |

**Exemple** : `/it/connection-map?lifecycles=active&rootIds=abc123&depth=1`

---

## Visualisation des clusters

Les clusters sont affichés comme des nœuds distincts avec une bordure cyan en pointillés :
- Les membres du cluster apparaissent comme des nœuds séparés, connectés à leur cluster parent par des lignes indicatrices en pointillés
- Lorsque vous filtrez par profondeur=0, les serveurs membres sélectionnés et leurs clusters parents sont affichés
- Les serveurs membres héritent des connexions du cluster tout en maintenant leurs connexions serveur à serveur individuelles

---

## Configurer les niveaux du graphe

Vous pouvez contrôler où les nœuds tendent à apparaître verticalement en éditant les niveaux dans **Cartographie SI > Paramètres** :

- Liste des **rôles de serveur** : définir le niveau de graphe pour chaque rôle (par ex., Web = Haut, DB = Bas)
- Liste des **entités** : définir le niveau de graphe pour chaque type d'entité (les entités sont par défaut en Haut)

Les modifications de niveau prennent effet au prochain chargement des données de la carte.

---

## Conseils

- **Commencez par les applications** : Utilisez le filtre Applications pour trouver les serveurs d'une application spécifique, puis explorez leurs connexions avec profondeur=1.
- **Utilisez profondeur=0 pour des vues ciblées** : Lorsque vous ne voulez voir que les connexions entre des serveurs spécifiques, sélectionnez-les et définissez la profondeur à 0.
- **Exportez pour la documentation d'architecture** : Utilisez l'export SVG pour créer des diagrammes réseau pour la documentation ou les revues de sécurité. L'export PNG produit une image raster haute résolution.
- **Activez les couches pour le dépannage** : Activez « Afficher les couches de connexion » pour voir exactement comment les connexions multi-segments transitent par votre infrastructure.
- **Utilisez les niveaux de rôle pour les vues d'architecture** : Gardez le « Placement par rôle » activé lors de la présentation de diagrammes d'architecture en couches.
- **Recoupez avec la carte des interfaces** : Utilisez le bouton « Voir dans la carte des interfaces » dans le panneau de connexion pour voir quelles interfaces métier dépendent de chaque connexion d'infrastructure.
- **Alignez pour plus de clarté** : Après avoir positionné les nœuds, utilisez l'alignement sur la grille pour des dispositions plus propres et alignées.
- **Gelez avant d'exporter** : Gelez la disposition et positionnez manuellement les nœuds avant d'exporter pour le résultat le plus propre.
