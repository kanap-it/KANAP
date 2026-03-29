# Administration budgétaire

L'administration budgétaire met à votre disposition un ensemble d'outils pour gérer et transformer les données budgétaires entre les années et les colonnes. Ce sont les opérations que vous utilisez pendant les cycles de planification budgétaire -- préparer les chiffres de l'année suivante, verrouiller les budgets approuvés et gérer les transitions d'une année à l'autre.

## Où trouver cette page

- Chemin : **Gestion budgétaire > Administration**
- Autorisations : La plupart des opérations nécessitent `budget_ops:admin`

La page d'accueil affiche quatre cartes, chacune renvoyant à un outil dédié :

| Outil | Objectif |
|-------|----------|
| **Geler / Dégeler les données** | Verrouiller les colonnes budgétaires pour empêcher les modifications |
| **Copier les colonnes budgétaires** | Copier des données entre années et colonnes avec des ajustements |
| **Copier les ventilations** | Copier les méthodes de ventilation d'une année à l'autre |
| **Réinitialiser une colonne budgétaire** | Effacer toutes les données d'une colonne spécifique |

---

## Geler / Dégeler les données

Verrouillez les colonnes budgétaires pour qu'elles ne puissent être ni modifiées, ni importées, ni altérées de quelque manière que ce soit. Le gel protège les chiffres approuvés contre les modifications accidentelles.

### Quand l'utiliser

- Après l'approbation du budget annuel
- Lors de la clôture d'une période fiscale
- Pour protéger le réalisé contre toute modification

### Comment ça fonctionne

1. **Sélectionnez une année** dans le menu déroulant (plage : année en cours moins un à année en cours plus quatre)
2. **Sélectionnez les périmètres** : cochez **OPEX**, **CAPEX** ou les deux
3. **Sélectionnez les colonnes** pour chaque périmètre : Budget, Révision, Réalisé, Atterrissage (les quatre sont sélectionnées par défaut)
4. Cliquez sur **Geler les données** pour verrouiller, ou **Dégeler les données** pour déverrouiller

### Ce que fait le gel

- Empêche les modifications des colonnes gelées dans les espaces de travail OPEX et CAPEX
- Bloque les imports CSV vers les colonnes gelées
- Bloque les opérations de copie et de réinitialisation ciblant les colonnes gelées
- N'affecte **pas** l'accès en lecture -- les données restent visibles

### Statut actuel

Sous les contrôles, deux cartes affichent l'état de gel en temps réel pour chaque colonne en OPEX et CAPEX. Chaque colonne affiche soit **Gelé** (en rouge) soit **Modifiable**.

### Autorisations

Sans `budget_ops:admin`, vous pouvez toujours voir le statut de gel, mais les contrôles sont désactivés. Une bannière d'information explique ce qui est nécessaire.

---

## Copier les colonnes budgétaires

Copiez les données budgétaires d'une année et colonne vers une autre, avec un ajustement en pourcentage optionnel. C'est l'outil principal pour alimenter le budget de l'année suivante à partir de l'année en cours.

### Quand l'utiliser

- Préparer le budget de l'année suivante à partir de l'année en cours
- Créer une révision à partir du budget approuvé
- Reporter des projections avec un facteur d'inflation

### Champs

| Champ | Description |
|-------|-------------|
| **Année source** | Année à copier (plage : année en cours moins un à année en cours plus cinq) |
| **Colonne source** | Budget, Révision, Suivi ou Atterrissage |
| **Année destination** | Année vers laquelle copier (même plage) |
| **Colonne destination** | Budget, Révision, Suivi ou Atterrissage |
| **Augmentation en pourcentage** | Ajustement appliqué aux valeurs copiées (ex. : `3` = +3 %). Par défaut 0. Accepte les décimales. |
| **Écraser les données existantes** | Bascule. Désactivé : les postes qui ont déjà une valeur dans la destination sont ignorés. Activé : toutes les valeurs destination sont remplacées. |

### Processus en deux étapes : Simulation, puis Copie

1. Cliquez sur **Simulation** pour générer un aperçu sans modifier aucune donnée
2. Examinez la grille d'aperçu, qui affiche :
   - Nom du **Produit** (les postes marqués `[IGNORÉ]` ne seront pas modifiés)
   - **Valeur source** (de l'année/colonne source)
   - **Valeur destination actuelle**
   - **Valeur d'aperçu** (ce que la destination deviendra après la copie)
3. Lorsque vous êtes satisfait, cliquez sur **Copier les données** pour appliquer

Le bouton **Copier les données** n'est activé qu'après une simulation réussie.

### Statistiques récapitulatives

Sous la grille, une barre de statistiques affiche :

- **Total des postes** dans le jeu de données
- **Postes à traiter** (non ignorés)
- **Total source** (somme des valeurs sources)
- **Total destination actuel**
- **Total de l'aperçu** (affiché après la simulation)

### Comportement de l'écrasement

| Écraser | La destination a des données | Résultat |
|---------|------------------------------|----------|
| Désactivé | Oui | Ignoré |
| Désactivé | Non (zéro) | Copié |
| Activé | Oui | Remplacé |
| Activé | Non (zéro) | Copié |

### Protection des colonnes gelées

Si la colonne destination est gelée, **Simulation** et **Copier les données** sont tous deux désactivés. Une bannière d'erreur vous invite à dégeler d'abord.

---

## Copier les ventilations

Copiez les méthodes et pourcentages de ventilation d'une année à l'autre pour tous les postes OPEX. Cela vous évite de ressaisir les configurations de refacturation lors de la mise en place d'une nouvelle année fiscale.

### Quand l'utiliser

- Préparer le budget de l'année suivante avec les mêmes ventilations de coûts
- Reporter les configurations de refacturation
- Mettre en place une nouvelle année fiscale

### Champs

| Champ | Description |
|-------|-------------|
| **Année source** | Année à partir de laquelle copier les ventilations (plage : année en cours moins un à année en cours plus cinq) |
| **Année destination** | Année vers laquelle copier les ventilations (même plage). Doit différer de l'année source. |
| **Écraser les données existantes** | Bascule. Désactivé : les postes qui ont déjà des ventilations dans la destination sont ignorés. |

### Processus en deux étapes : Simulation, puis Copie

1. Cliquez sur **Simulation** pour voir un aperçu
2. La grille d'aperçu affiche chaque poste OPEX avec :
   - Nom du **Produit**
   - **Action** -- ce qui va se passer (Sera copié, Ignoré -- pas d'année source, Ignoré -- pas de ventilations dans la source, Ignoré -- la destination a des données, Erreur)
   - Méthode et libellé **Source**
   - Méthode et libellé **Destination** actuels
   - **Résultat après copie** -- ce à quoi ressemblera la destination
3. Cliquez sur **Copier les données** pour appliquer

### Validation

- Les années source et destination doivent être différentes. Si elles sont identiques, une bannière d'avertissement apparaît et les deux boutons sont désactivés.
- Changer un filtre efface l'aperçu, nécessitant une nouvelle simulation.

### Résumé

Après une simulation, une bannière affiche le nombre de postes prêts à être copiés, ignorés et en erreur. Si des postes ont été ignorés parce que la destination a déjà des ventilations, un avertissement séparé suggère d'activer l'écrasement.

---

## Réinitialiser une colonne budgétaire

Effacez toutes les données d'une colonne budgétaire spécifique pour une année donnée. C'est une opération destructive -- utilisez-la lorsque vous devez repartir de zéro.

### Quand l'utiliser

- Repartir de zéro avec la planification budgétaire
- Corriger des erreurs de saisie en masse
- Nettoyer des données de test

### Champs

| Champ | Description |
|-------|-------------|
| **Année** | L'année fiscale à nettoyer (plage : année en cours moins un à année en cours plus cinq) |
| **Colonne budgétaire** | Budget, Révision, Suivi ou Atterrissage |

### Aperçu

La page charge une grille montrant chaque poste OPEX et sa valeur actuelle dans la colonne sélectionnée. Les postes avec des données sont surlignés en rouge. Sous la grille, trois statistiques apparaissent :

- **Total des postes**
- **Postes avec données** (seront effacés)
- **Valeur totale actuelle**

### Confirmation

Cliquer sur **Effacer la colonne** ouvre une boîte de dialogue de confirmation qui affiche :

- La colonne et l'année en cours de réinitialisation
- Le nombre de postes affectés
- La valeur totale en cours de suppression
- Un avertissement clair que cette action ne peut pas être annulée

Vous devez cliquer sur **Effacer la colonne** dans la boîte de dialogue pour continuer, ou **Annuler** pour abandonner.

### Dispositifs de sécurité

- Le bouton **Effacer la colonne** est désactivé lorsqu'il n'y a pas de données à effacer
- Les colonnes gelées ne peuvent pas être réinitialisées -- dégélez d'abord
- La boîte de dialogue de confirmation nécessite un acquittement explicite

---

## Exemple de flux : Cycle budgétaire annuel

Voici une séquence typique utilisant ces outils :

### 1. Fin de l'année N

1. Geler le réalisé de l'année N (protéger les données historiques)
2. Copier le Budget N vers le Budget N+1 (avec un pourcentage d'augmentation pour l'inflation)
3. Copier les ventilations N vers N+1

### 2. Pendant la planification budgétaire (N+1)

1. Les équipes modifient la colonne Budget N+1
2. Le directeur financier examine et approuve

### 3. Approbation du budget

1. Geler le Budget N+1 (verrouiller le budget approuvé)
2. Copier le Budget N+1 vers la Révision N+1 (point de départ pour le suivi en cours d'année)

### 4. Révision de milieu d'année

1. Les équipes mettent à jour la Révision N+1 avec les changements de prévisions
2. Une fois finalisé, geler la Révision N+1

---

## Conseils

- **Toujours simuler d'abord** : La copie des colonnes budgétaires et la copie des ventilations supportent toutes deux une simulation. Utilisez-la à chaque fois pour vérifier le résultat avant de valider.
- **Geler après approbation** : Verrouiller les colonnes après approbation maintient votre piste d'audit et prévient les modifications accidentelles.
- **Utilisez les ajustements en pourcentage** : Lors de la copie entre années, appliquez un facteur d'inflation ou de croissance pour ne pas avoir à ajuster chaque ligne manuellement.
- **Vérifiez le statut de gel avant les opérations en masse** : Les colonnes gelées bloquent les opérations de copie et de réinitialisation. Si un bouton est grisé, vérifiez d'abord la page de gel.
- **Réinitialisez avec prudence** : La réinitialisation de colonne est irréversible. Vérifiez bien l'année et la colonne avant de confirmer.
