# Personnalisation

Utilisez la page Personnalisation pour appliquer l'identité de votre entreprise dans KANAP.

Route : `/admin/branding`

## Accès & portée

- Autorisation requise : `users:admin`
- Disponible uniquement sur les hôtes tenant (pas sur l'hôte platform-admin)
- Les modifications s'appliquent uniquement à votre tenant actuel

## Ce que vous pouvez personnaliser

- **Logo**
  - Apparaît dans la barre supérieure de l'application (lorsque connecté)
  - Apparaît dans l'en-tête de la page de connexion
- **Couleurs primaires**
  - Une couleur primaire pour le **mode clair**
  - Une couleur primaire pour le **mode sombre**
  - Utilisées par les barres d'application, les boutons primaires et les liens

## Configuration du logo

### Fichiers supportés

- Formats : `PNG`, `JPG/JPEG`, `GIF`, `WEBP`
- Taille maximale : `20 Mo`

### Format de logo recommandé

- Utilisez un logo large et horizontal (fond transparent de préférence)
- Gardez le contenu important centré (la zone d'en-tête est compacte)
- Pour un rendu net, utilisez au moins ~2x la taille d'affichage (par exemple `280x72` ou plus)

### Actions

1. Cliquez sur **Télécharger le logo** et choisissez votre fichier.
2. Utilisez les aperçus d'en-tête intégrés clair et sombre pour valider l'apparence.
3. Activez **Afficher le logo en mode sombre** si nécessaire.
4. Cliquez sur **Enregistrer les modifications** pour publier.

Pour supprimer le logo, cliquez sur **Supprimer le logo**.

Lorsqu'aucun logo n'est défini (ou que l'affichage du logo en mode sombre est désactivé), KANAP revient à la personnalisation texte/icône par défaut.

## Configuration des couleurs primaires

### Comment choisir les couleurs

Vous pouvez définir les couleurs en utilisant :
- Saisie hexadécimale (`#RRGGBB`)
- Bouton sélecteur de couleur
- Pastilles de palette prédéfinies
- Bouton **Effacer** (supprimer la valeur personnalisée)

### Comportement clair/sombre

- La **couleur primaire claire** est utilisée en mode clair.
- La **couleur primaire sombre** est utilisée en mode sombre.
- Si une seule couleur est définie, KANAP la réutilise dans les deux modes.
- Si les deux sont vides, KANAP utilise les couleurs par défaut.

### Avertissement de contraste

La page affiche un avertissement si le contraste est faible.
Cet avertissement est indicatif (vous pouvez quand même enregistrer), mais un contraste faible peut réduire la lisibilité.

## Enregistrer, annuler et réinitialiser

- **Enregistrer les modifications** : applique le logo téléchargé + les paramètres de couleur
- **Annuler** : revient aux modifications non enregistrées sur la page
- **Rétablir les valeurs par défaut** : supprime le logo et efface toutes les couleurs personnalisées

La réinitialisation nécessite une confirmation.

## Conseils pour un résultat professionnel

- Testez dans les deux modes de thème clair et sombre avant d'enregistrer.
- Gardez les couleurs de la marque lisibles sur fond blanc et sombre.
- Préférez les logos simples avec un fond transparent pour le rendu d'en-tête le plus propre.
- Utilisez la réinitialisation pour retrouver rapidement les valeurs par défaut si un style d'essai n'est pas satisfaisant.
