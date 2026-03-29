# Carte des interfaces

La carte des interfaces fournit une visualisation interactive de votre paysage d'intégration applicatif. Les applications apparaissent comme des nœuds et les interfaces comme des arêtes de connexion, vous donnant une vue d'ensemble de la circulation des données entre vos systèmes.

## Où la trouver

Naviguez vers **Cartographie SI > Carte des interfaces** pour ouvrir la visualisation.

**Autorisations** : Vous avez besoin au minimum de `applications:reader` pour voir la carte.

---

## Comprendre la visualisation

La carte utilise un graphe à disposition en force où :

- Les **nœuds** représentent des applications
- Les **arêtes** représentent des interfaces entre applications
- La **taille des nœuds** reflète le nombre d'interfaces connectées
- Les **libellés d'arêtes** affichent l'identifiant de l'interface le long de chaque connexion

### Vue métier vs vue technique

**Vue métier** (par défaut) :

- Masque les applications middleware
- Affiche les relations directes source-cible
- Idéale pour comprendre les flux de données métier

**Vue technique** :

- Affiche les plateformes middleware comme nœuds intermédiaires (en forme de losange)
- Affiche le chemin réel des données (Source → Middleware → Cible)
- Idéale pour comprendre l'architecture technique

Basculez entre les vues en utilisant l'option **Afficher le middleware** dans la barre d'outils.

---

## Filtres

Tous les filtres sont situés dans la barre d'outils au-dessus de la carte.

### Environnement

Filtrez les interfaces par environnement de déploiement :

- Production, Pré-prod, QA, Test, Développement, Sandbox

Par défaut : **Production**.

### Cycle de vie

Filtre multi-sélection pour le statut de cycle de vie des interfaces. Choisissez quels statuts inclure dans la visualisation (par ex., Actif, Planifié, Obsolète). La sélection par défaut est **Actif**.

### Applications

Concentrez la carte sur des applications ou services spécifiques :

1. Cliquez sur la liste déroulante **Applications**
2. Sélectionnez une ou plusieurs applications (groupées par type : Applications vs Services d'infrastructure)
3. La carte se filtre pour ne montrer que les interfaces connectées à votre sélection

Lorsque vous sélectionnez des applications ici, le filtre **Profondeur** passe automatiquement de « Tous » à « 1 » pour que vous ne voyiez que le voisinage immédiat.

### Profondeur

Limitez le nombre de sauts depuis les applications sélectionnées à afficher :

- **Tous** : Afficher tous les nœuds connectés (sans limite)
- **1–5** : Afficher uniquement les nœuds à N sauts des applications sélectionnées

Les nœuds middleware ne comptent pas comme un saut — le compteur de profondeur ne s'incrémente que lors de la traversée d'un nœud d'application principal.

Ce filtre est automatiquement activé lorsque vous sélectionnez des applications dans le filtre Applications.

---

## Contrôles du graphe

Le panneau de contrôle sur le côté gauche de la carte fournit ces outils :

| Icône | Action | Description |
|-------|--------|-------------|
| Pause / Lecture | **Geler / Dégeler** | Mettre en pause la simulation de force pour positionner manuellement les nœuds |
| Centre | **Auto-centrage** | Activer/désactiver le centrage automatique lors de la sélection de nœuds (surligné quand activé) |
| Zoom + | **Zoom avant** | Augmenter le niveau de zoom |
| Zoom − | **Zoom arrière** | Diminuer le niveau de zoom |
| Grille | **Aligner sur la grille** | Aligner tous les nœuds sur une grille pour des dispositions plus propres |
| SVG | **Exporter SVG** | Télécharger la vue actuelle comme image vectorielle |
| PNG | **Exporter PNG** | Télécharger la vue actuelle comme image raster |

Les boutons de gel et d'auto-centrage changent de couleur lorsqu'ils sont actifs, vous pouvez donc voir d'un coup d'œil s'ils sont activés ou désactivés.

---

## Interagir avec la carte

### Sélection de nœuds

Cliquez sur un nœud application pour mettre en surbrillance ses connexions et ouvrir un panneau de détail à droite.

### Sélection d'arêtes

Cliquez sur une arête d'interface pour voir les détails de l'interface dans le panneau latéral. Les arêtes ont une zone de clic invisible plus large, vous n'avez donc pas besoin de cliquer précisément sur la ligne.

### Déplacement de nœuds

Faites glisser n'importe quel nœud pour le repositionner manuellement. Pendant que la simulation est en cours, la disposition continue de s'ajuster autour du nœud déplacé. Lorsque la simulation est gelée, le nœud reste exactement là où vous le placez.

### Effacer la sélection

Cliquez sur la zone de fond vide de la carte pour fermer le panneau de détail et effacer toute sélection.

### Liens profonds

La carte supporte les paramètres d'URL pour partager des vues spécifiques :

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `environment` | Pré-sélectionner un environnement | `prod`, `dev` |
| `lifecycles` | Pré-sélectionner les filtres de cycle de vie (séparés par des virgules) | `active,planned` |
| `focusInterfaceId` | Mettre en surbrillance une interface spécifique | UUID |
| `rootIds` | Pré-sélectionner des applications à cibler (séparées par des virgules) | UUIDs |
| `depth` | Définir la limite de profondeur | `1`, `2`, `all` |

**Exemple** : `/it/interface-map?environment=prod&rootIds=abc123&depth=2`

---

## Le panneau de détail

Lorsque vous sélectionnez un nœud ou une arête, un panneau latéral s'ouvre à droite avec les détails.

### Panneau application

- **Description** : Ce que fait l'application
- **Éditeur** : Éditeur du logiciel
- **Criticité** : Importance métier (Critique métier, Haute, Moyenne, Basse)
- **Serveurs** : Serveurs hébergeant cette application, groupés par environnement. Cliquez sur un nom de serveur pour ouvrir son espace de travail.
- **Responsables métier** : Contacts métier responsables
- **Responsables IT** : Contacts techniques responsables
- **Informations de support** : Contacts de support avec leurs rôles. Cliquez sur un nom de contact pour naviguer vers l'onglet Technique de l'application.
- **Modifier l'application** : Ouvre l'espace de travail de l'application

### Panneau interface

- **Criticité** : Niveau d'importance métier
- **Route** : Type de route d'intégration
- **Bindings** : Nombre de bindings d'environnement
- **Via middleware** : Si l'interface transite par un middleware
- **Points de terminaison** : Pour l'environnement sélectionné, affiche les applications source et cible, les noms de jobs et les URLs de points de terminaison
- **Connexions infra** : Connexions d'infrastructure liées à cette interface pour l'environnement actuel. Chaque carte de connexion affiche source, destination et protocoles. Depuis ici, vous pouvez :
  - Cliquer sur **Modifier** pour ouvrir l'espace de travail de la connexion
  - Cliquer sur **Voir dans la carte des connexions** pour voir la topologie d'infrastructure
- **Modifier l'interface** : Ouvre l'espace de travail de l'interface

---

## Conseils

- **Commencez par la Production** : Sélectionnez l'environnement Prod pour voir vos intégrations les plus critiques en premier.
- **Concentrez-vous sur des applications spécifiques** : Utilisez le filtre Applications avec profondeur 2 pour ne voir que le voisinage d'une application sans le paysage complet.
- **Exportez pour la documentation** : Utilisez l'export SVG pour créer des diagrammes d'architecture pour la documentation ou les présentations. Utilisez PNG lorsque vous avez besoin d'une image raster.
- **Alignez pour plus de clarté** : Après avoir fait glisser les nœuds en position, utilisez l'alignement sur la grille pour créer des dispositions plus propres et alignées.
- **Liens profonds pour le partage** : Copiez l'URL après avoir défini les filtres pour partager des vues spécifiques avec des collègues.
- **Passez en vue technique** : Lors du dépannage, activez la visibilité du middleware pour voir le chemin réel des données à travers les plateformes d'intégration.
