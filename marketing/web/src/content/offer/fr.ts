import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Tarifs',
    description:
      'Gratuit et open source. Auto-hébergement sans limite, support si vous en avez besoin, ou KANAP hébergé. Toutes les fonctionnalités sur tous les plans. AGPL v3.',
  },

  header: {
    eyebrow: 'Tarifs simples et transparents',
    title: 'Gratuit et open source.\nAuto-hébergez, ou laissez-nous la gérer.',
    lead: 'Toutes les fonctionnalités sur chaque plan. Aucune option verrouillée, aucune taxe par siège, aucun enfermement. Vous payez uniquement l\'exploitation et le support que vous ne voulez pas assurer vous-même.',
  },

  selfHosted: {
    eyebrow: 'Choisissez votre chemin',
    title: 'Même produit.\nTrois façons de l\'exécuter.',
    intro:
      'Démarrez avec la plateforme open source complète, ajoutez le support prioritaire si vous voulez de l\'aide, ou choisissez KANAP hébergé si vous voulez nous confier l\'exploitation.',
    plans: [
      {
        name: 'Auto-hébergement',
        badge: 'Gratuit à vie',
        target: 'Utilisateurs illimités · workspaces illimités',
        price: '0 €',
        period: '',
        features: [
          'Toutes les fonctionnalités incluses',
          'Contributeurs illimités',
          'Support communautaire via GitHub issues',
          'Sous licence AGPL v3 : lisez, modifiez, contribuez',
          'Déploiement Docker Compose en quelques minutes',
          'Vos données restent sur votre infrastructure',
        ],
        ctaLabel: 'Déployer depuis GitHub',
        ctaHref: 'https://github.com/kanap-it/kanap',
        ctaVariant: 'primary',
      },
      {
        name: 'Support auto-hébergé',
        badge: 'Conformité & contrôle',
        target: 'Utilisateurs illimités · workspaces illimités',
        price: '2 490 €',
        period: '/an',
        features: [
          'Tout ce qui est inclus en auto-hébergement',
          'Support email prioritaire',
          '20 % de remise sur le conseil',
          'Plaid, clé perso',
          'Aide à l\'installation',
          'Facturation annuelle uniquement',
        ],
        ctaLabel: 'Souscrire',
        ctaHref: '/contact',
        ctaVariant: 'primary',
      },
    ],
  },

  openSourceBanner: {
    title: 'Véritablement open source, AGPL v3',
    body:
      'Tout le code source de KANAP est sur GitHub. Lisez-le, auditez-le, étendez-le, contribuez. L\'AGPL v3 garantit que le code reste ouvert, pour tout le monde. Pas de fork propriétaire, pas d\'enfermement.',
    linkLabel: 'Lire la licence',
    linkHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  },

  cloud: {
    eyebrow: 'Hébergement cloud · si vous préférez nous confier l\'exploitation',
    title: 'La même plateforme, opérée par nous.',
    intro:
      'KANAP hébergé, c\'est la même plateforme open source, opérée par nous : hébergement, mises à jour, sauvegardes, support prioritaire et session d\'activation de 60 min offerte. Essai 14 jours, sans carte.',
    plans: [
      {
        name: 'KANAP hébergé',
        badge: 'Opéré par nous',
        target: 'Utilisateurs illimités · workspaces illimités',
        price: '249 €',
        period: '/mois',
        subPrice: 'ou 2 490 €/an (2 mois offerts)',
        features: [
          'Toutes les fonctionnalités incluses',
          'Contributeurs et lecteurs illimités',
          'Hébergement cloud et mises à jour automatiques',
          'Sauvegardes gérées',
          '2 500 messages Plaid/mois inclus',
          'Plaid, clé perso',
          'Session d\'activation 60 min offerte',
          'Support email prioritaire',
          '20 % de remise sur le conseil',
        ],
        ctaLabel: 'Essai gratuit',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
      },
    ],
  },

  howToChoose: {
    title: 'Comment choisir',
    intro: 'Choisissez selon qui opère la plateforme. Toutes les fonctionnalités produit sont dans chaque plan.',
    items: [
      {
        title: 'Auto-hébergement · gratuit',
        body: 'Vous avez les ressources IT et voulez le contrôle complet. Le meilleur rapport, sans contrepartie. Support communautaire.',
      },
      {
        title: 'Auto-hébergement · avec support',
        body: 'Vous avez besoin du mode auto-hébergé pour la conformité ou la confidentialité, mais vous voulez un support prioritaire et des remises conseil.',
      },
      {
        title: 'Hébergement cloud',
        body: 'Vous voulez le chemin le plus court vers la valeur sans opérer l\'infrastructure. Même produit, opéré par KANAP.',
      },
    ],
  },

  services: {
    title: 'Aide experte, quand vous en voulez',
    intro: 'KANAP est conçu pour une adoption autonome. Si vous voulez aller plus vite, les offres payantes incluent le support prioritaire et 20 % de remise sur le conseil.',
    support: {
      title: 'Support prioritaire',
      subtitle: 'Inclus avec tout plan payant',
      body: 'On maintient le service opérationnel. De vrais humains, des délais raisonnables, pas de théâtre SLA.',
      items: [
        'Bugs, erreurs, incidents, problèmes d\'accès',
        'Aide à l\'installation auto-hébergée',
        'Questions « est-ce le comportement attendu ? »',
        'Clarifications rapides',
      ],
    },
    consulting: {
      title: 'Conseil',
      subtitle: 'Payant · 20 % de remise pour les abonnés',
      body: 'Aide optionnelle pour tirer plus de valeur de KANAP : appels programmés, travail approfondi, advisory.',
      items: [
        'Installation, configuration, onboarding, formation',
        'Conception de workflows et bonnes pratiques',
        'Advisory CIO sur votre modèle de gouvernance IT',
        'Tout ce qui nécessite un appel programmé',
      ],
    },
  },

  rates: {
    title: 'Tarifs conseil optionnel',
    intro: 'Tarification transparente pour les équipes qui veulent une aide experte. Les abonnés ont toujours 20 % de remise.',
    headings: {
      duration: 'Durée',
      useCases: 'Cas d\'usage',
      rate: 'Tarif',
      subscriber: 'Abonné',
    },
    rows: [
      {
        duration: '1 heure',
        useCases: 'Dépannage, questions ciblées, conseil rapide',
        rate: '190 €',
        subscriber: '150 €',
      },
      {
        duration: 'Demi-journée (4h)',
        useCases: 'Onboarding, formation, atelier de configuration',
        rate: '690 €',
        subscriber: '550 €',
      },
      {
        duration: 'Journée (8h)',
        useCases: 'Formation grande équipe, conseil approfondi, advisory CIO',
        rate: '1 250 €',
        subscriber: '1 000 €',
      },
    ],
    note: 'Tarifs par session, hors TVA. Frais de déplacement facturés en sus si présence sur site.',
  },

  faqTeaser: {
    title: 'Questions fréquentes',
    body: 'Licence, auto-hébergement, cloud, Plaid, support et facturation. Toutes nos réponses.',
    ctaLabel: 'Lire la FAQ',
  },

  cta: {
    title: 'Prêt à démarrer ?',
    body:
      'Déployez KANAP vous-même gratuitement, ou essayez la version hébergée si vous voulez nous confier l\'exploitation.',
    primary: 'Déployer gratuitement',
    secondary: 'Essayer le cloud hébergé',
  },
};

export default content;
