import type { ContactContent } from './types';

const content: ContactContent = {
  meta: {
    title: 'Contact',
    description:
      'Écrivez-nous. Démos produit, questions de déploiement, coordination achats, partenariats. Nous répondons sous un jour ouvré.',
  },
  header: {
    eyebrow: 'Contact',
    title: 'On a hâte de vous lire.',
    lead: 'Démo, question de déploiement, achats, partenariat — quelle que soit la raison, nous lisons chaque message.',
  },
  responsePromise: 'Réponse sous un jour ouvré',
  highlightsLabel: 'Ce sur quoi nous pouvons aider',
  highlights: [
    'Démos produit et accompagnement à la prise en main',
    'Coordination achats et facturation',
    'Installation et mises à niveau en auto-hébergement',
    'Partenariats et intégrations',
  ],
  form: {
    nameLabel: 'Nom complet',
    emailLabel: 'Email professionnel',
    companyLabel: 'Entreprise',
    messageLabel: 'Comment pouvons-nous aider ?',
    messagePlaceholder: 'Dites-nous en quelques mots ce que vous cherchez.',
    submitLabel: 'Envoyer le message',
    submitting: 'Envoi…',
    successTitle: 'Message envoyé.',
    successBody: 'Nous vous répondrons sous un jour ouvré.',
    errorGeneric: 'Une erreur est survenue. Réessayez ou écrivez directement à admin@kanap.net.',
  },
  alternate: {
    label: 'Vous préférez l\'email direct ?',
    email: 'admin@kanap.net',
  },
};

export default content;
