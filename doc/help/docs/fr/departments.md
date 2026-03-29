# Départements

Les départements représentent les unités organisationnelles au sein de vos sociétés. Utilisez-les pour suivre l'effectif par année, ventiler les coûts et définir les audiences pour les applications. Chaque département appartient à une société et porte des données d'effectif annuelles qui alimentent les calculs de refacturation et de ventilation.

## Premiers pas

Naviguez vers **Données de référence > Départements** pour voir votre liste de départements. Cliquez sur **Nouveau** pour créer votre première entrée.

**Champs obligatoires** :
- **Nom** : Le nom du département
- **Société** : À quelle société ce département appartient

**Optionnel mais utile** :
- **Description** : Description libre de l'objet ou du périmètre du département
- **Effectif** : Nombre d'employés, suivi par année (défini dans l'onglet Détails après création)

**Conseil** : Importez les départements depuis votre système RH pour maintenir votre structure organisationnelle alignée.

---

## Travailler avec la liste

La grille des départements vous offre une vue d'ensemble de tous les départements avec leur effectif pour une année donnée.

**Colonnes par défaut** :
- **Nom** : Nom du département — cliquez pour ouvrir l'onglet Vue d'ensemble de l'espace de travail
- **Société** : Société parente — cliquez pour ouvrir l'onglet Vue d'ensemble de l'espace de travail
- **Effectif (Année)** : Nombre d'employés pour l'année sélectionnée — cliquez pour accéder directement à l'onglet Détails pour modification

**Colonnes supplémentaires** (via le sélecteur de colonnes) :
- **Statut** : Activé ou Désactivé
- **Créé** : Date de création du département

**Sélecteur d'année** : Utilisez le champ **Année** dans la barre d'outils pour changer l'année d'effectif affichée. La grille se rafraîchit automatiquement lorsque vous changez d'année.

**Filtre de statut** : Utilisez le bouton bascule **Activé / Désactivé / Tous** pour filtrer par statut de département. La liste affiche par défaut uniquement les départements activés.

**Recherche rapide** : La barre de recherche filtre les noms de départements.

**Liens profonds** : Chaque cellule de la grille est un lien cliquable. Nom et Société ouvrent l'onglet Vue d'ensemble ; Effectif ouvre l'onglet Détails. Lorsque vous naviguez vers un espace de travail puis revenez, votre ordre de tri, requête de recherche et filtres sont préservés.

**Actions** :
- **Nouveau** : Créer un nouveau département (nécessite `departments:manager`)
- **Importer CSV** : Import en masse de départements (nécessite `departments:admin`)
- **Exporter CSV** : Exporter en CSV (nécessite `departments:admin`)
- **Supprimer la sélection** : Supprimer les départements sélectionnés (nécessite `departments:admin`)

---

## L'espace de travail Départements

Cliquez sur n'importe quelle ligne pour ouvrir l'espace de travail. Il comporte deux onglets disposés verticalement à gauche : **Vue d'ensemble** et **Détails**.

La barre d'outils de l'espace de travail inclut les boutons **Préc** / **Suiv** pour naviguer entre les départements sans revenir à la liste, plus les boutons **Réinitialiser** et **Enregistrer**. Si vous avez des modifications non enregistrées en quittant la page, vous serez invité à enregistrer ou à les annuler.

### Vue d'ensemble

L'onglet Vue d'ensemble capture l'identité et le statut du département.

**Ce que vous pouvez modifier** :
- **Nom** : Nom du département (obligatoire)
- **Société** : Société parente — liée aux données de référence Sociétés (obligatoire). Les sociétés qui ont déjà un département du même nom sont automatiquement exclues de la liste déroulante pour éviter les doublons.
- **Description** : Description libre
- **Statut** : Activé ou Désactivé, avec une date de désactivation planifiée optionnelle

**Conseil** : Lors de la création d'un nouveau département, l'onglet Détails ne devient disponible qu'après l'enregistrement initial.

---

### Détails

L'onglet Détails gère les métriques d'effectif année par année.

**Sélecteur d'année** : Choisissez l'année à consulter ou modifier en utilisant les onglets d'année en haut du panneau. Cinq années sont disponibles : de deux ans avant l'année en cours à deux ans après.

**Métriques par année** :
- **Effectif** : Nombre total d'employés dans ce département pour l'année sélectionnée

**Comment ça fonctionne** :
- L'effectif alimente les calculs d'audience pour les applications
- Les valeurs sont enregistrées par année — changer d'année charge indépendamment les données de cette année
- Si les métriques pour l'année sélectionnée ont été **gelées** (par un administrateur), le champ est verrouillé et un avis explique comment dégeler

**Conseil** : Mettez à jour l'effectif annuellement lors de votre cycle de planification budgétaire. Utilisez les onglets d'année pour consulter ou pré-remplir les années futures.

---

## Import/export CSV

Maintenez les départements synchronisés avec votre système RH via CSV.

**Export** :
- Télécharge tous les départements avec les métriques de l'année en cours

**Import** :
- Utilisez le **Contrôle préalable** pour valider avant d'appliquer
- Correspondance par nom de département + nom de société
- Peut créer de nouveaux départements ou mettre à jour les existants

**Champs obligatoires** : Nom, Société

**Champs optionnels** : Effectif, Statut

**Notes** :
- Utilisez l'**encodage UTF-8** et les **points-virgules** comme séparateurs
- Les valeurs d'effectif sont spécifiques à l'année — les valeurs importées s'appliquent à l'année en cours

---

## Conseils

- **Reproduisez votre structure organisationnelle** : Reflétez la hiérarchie des départements de votre système RH pour plus de cohérence.
- **Mettez à jour l'effectif annuellement** : Programmez un rappel pour rafraîchir les métriques des départements lors de la planification budgétaire.
- **Utilisez pour les ventilations** : L'effectif des départements alimente les calculs de ventilation des coûts — gardez-le précis.
- **Désactivez plutôt que supprimer** : Lorsque les départements sont réorganisés, désactivez les anciens plutôt que de les supprimer pour préserver les données historiques.
- **Exploitez les liens profonds** : Cliquez directement sur le chiffre d'effectif depuis la liste pour accéder à l'onglet Détails et modifier les métriques sans clic supplémentaire.
