# Contacts

Les contacts documentent les personnes avec lesquelles vous travaillez — responsables de compte fournisseur, ingénieurs support, consultants et autres parties prenantes externes. Liez les contacts aux fournisseurs pour constituer un répertoire de contacts fournisseurs, et référencez-les depuis les applications et les sites pour les informations de support.

## Premiers pas

Naviguez vers **Données de référence > Contacts** pour voir votre répertoire de contacts. Cliquez sur **Nouveau** pour créer votre première entrée.

**Champs obligatoires** :
- **Email** : L'adresse email du contact (utilisée comme identifiant unique)

**Fortement recommandé** :
- **Prénom** / **Nom** : Le nom du contact
- **Fournisseur** : Chez quel vendeur travaille ce contact
- **Type de contact** : Le rôle du contact chez le fournisseur (Commercial, Technique, Support ou Autre) — disponible une fois qu'un fournisseur est sélectionné

**Optionnel mais utile** :
- **Intitulé de poste** : Son rôle ou sa fonction
- **Téléphone** / **Mobile** : Numéros de téléphone, saisis avec un indicatif pays
- **Pays** : Localisation (code pays ISO)

**Conseil** : Liez d'abord les contacts aux fournisseurs, puis référencez-les depuis les applications et les sites pour des informations de support cohérentes.

---

## Travailler avec la liste

La grille Contacts fournit un répertoire consultable de tous les contacts externes. Chaque cellule d'une ligne est un lien cliquable qui ouvre l'espace de travail du contact.

**Colonnes par défaut** :
- **Nom** / **Prénom** : Nom du contact
- **Fournisseur** : Le vendeur pour lequel il travaille
- **Email** : Adresse email
- **Actif** : Si le contact est actuellement actif (Oui / Non)

**Colonnes supplémentaires** (via le sélecteur de colonnes) :
- **Intitulé de poste** : Son rôle
- **Téléphone** / **Mobile** : Numéros de téléphone
- **Pays** : Localisation
- **Créé** : Date de création de l'enregistrement

**Tri par défaut** : Par nom, alphabétique.

**Actions** :
- **Nouveau** : Créer un nouveau contact (nécessite `contacts:manager`)
- **Importer CSV** : Import en masse de contacts (nécessite `contacts:admin`)
- **Exporter CSV** : Exporter en CSV (nécessite `contacts:admin`)
- **Supprimer la sélection** : Supprimer les contacts sélectionnés (nécessite `contacts:admin`)

---

## L'espace de travail Contacts

Cliquez sur n'importe quelle ligne pour ouvrir l'espace de travail. Il comporte un seul onglet.

### Vue d'ensemble

**Ce que vous pouvez modifier** :
- **Email** : Adresse email (obligatoire)
- **Prénom** / **Nom** : Nom du contact
- **Fournisseur** : Lien vers un fournisseur des données de référence
- **Type de contact** : Le rôle du contact chez le fournisseur — Commercial, Technique, Support ou Autre. Ce champ devient disponible une fois qu'un fournisseur est sélectionné. Si vous effacez le fournisseur, le type de contact est également effacé.
- **Intitulé de poste** : Son rôle ou sa fonction
- **Téléphone** / **Mobile** : Numéros de téléphone. Chacun dispose d'un sélecteur d'indicatif pays à côté du champ de numéro local. La saisie d'un indicatif suggère automatiquement le pays si aucun n'est défini.
- **Pays** : Localisation, sélectionnée à partir d'une liste consultable de codes pays ISO
- **Actif** : Si ce contact est actuellement actif
- **Notes** : Notes libres (jusqu'à 2 000 caractères)

---

## Où les contacts sont utilisés

Les contacts apparaissent à plusieurs endroits dans KANAP.

### Contacts fournisseur

Chaque fournisseur dispose d'un onglet **Contacts** affichant tous les contacts liés à ce vendeur. Vous pouvez créer un nouveau contact directement depuis l'espace de travail du fournisseur :

1. Ouvrez l'espace de travail du fournisseur et allez dans l'onglet **Contacts**.
2. Cliquez sur **Créer** à côté d'un rôle de contact.
3. Remplissez les détails du contact — le fournisseur et le type de contact sont pré-remplis.
4. Après l'enregistrement, vous êtes automatiquement redirigé vers l'espace de travail du fournisseur.

### Support applicatif

Dans l'espace de travail Applications, l'onglet **Technique & Support** référence les contacts pour l'escalade du support.

### Contacts de site

Les sites peuvent avoir des contacts de support (responsables d'installations, contacts NOC, etc.).

---

## Import/export CSV

Gérez les contacts en masse via CSV.

**Export** : Télécharge tous les contacts avec leurs détails.

**Import** :
- Utilisez le **Contrôle préalable** pour valider avant d'appliquer
- Correspondance par adresse email
- Peut créer de nouveaux contacts ou mettre à jour les existants

**Champs obligatoires** : Email

**Champs optionnels** : Prénom, Nom, Nom du fournisseur, Intitulé de poste, Téléphone, Mobile, Pays, Actif

**Notes** :
- Utilisez l'**encodage UTF-8** et les **points-virgules** comme séparateurs
- Le fournisseur est mis en correspondance par nom — assurez-vous que le fournisseur existe avant d'importer

---

## Conseils

- **Définissez toujours un fournisseur** : Lier les contacts aux fournisseurs les rend plus faciles à trouver et à gérer.
- **Définissez le type de contact** : Une fois qu'un fournisseur est lié, choisissez si le contact est Commercial, Technique, Support ou Autre. Cela aide lors de la navigation des contacts depuis l'espace de travail du fournisseur.
- **Utilisez des noms cohérents** : Saisissez les noms dans un format cohérent (par ex., toujours « Prénom Nom »).
- **Marquez les contacts inactifs** : Lorsqu'une personne quitte un vendeur, marquez-la comme inactive plutôt que de la supprimer — cela préserve la piste d'audit.
- **Incluez les intitulés de poste** : Les intitulés de poste aident à identifier le bon contact selon les besoins (vente vs. support vs. gestion de compte).
