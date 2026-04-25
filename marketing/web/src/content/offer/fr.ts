import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Tarifs',
    description:
      'Gratuit et open source. Auto-hébergement sans limite, ou nous la gérons à partir de 49 €/mois. Toutes les fonctionnalités sur tous les plans. AGPL v3.',
  },

  header: {
    eyebrow: 'Tarifs simples et transparents',
    title: 'Gratuit et open source.\nAuto-hébergez, ou laissez-nous la gérer.',
    lead: 'Toutes les fonctionnalités sur chaque plan. Aucune option verrouillée, aucun supplément par siège, aucun enfermement. Vous payez uniquement ce que vous ne voulez pas opérer vous-même.',
  },

  selfHosted: {
    eyebrow: 'Auto-hébergement · approche prioritaire',
    title: 'Hébergez KANAP vous-même.\nGratuit, pour toujours.',
    intro:
      'La plateforme complète sous AGPL v3. Déployez sur votre infrastructure, gardez vos données, mettez à jour à votre rythme. Support payant optionnel si vous voulez de l\'aide prioritaire sans céder le contrôle.',
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
        featured: true,
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
        ctaVariant: 'ghost',
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
      'Chaque plan cloud inclut la plateforme complète, l\'hébergement, les mises à jour, les sauvegardes, le support prioritaire et une session d\'activation de 60 min offerte. Essai 14 jours, sans carte.',
    plans: [
      {
        name: 'Starter',
        badge: 'Démarrage rapide',
        target: 'Jusqu\'à 5 contributeurs',
        price: '49 €',
        period: '/mois',
        subPrice: 'ou 490 €/an (2 mois offerts)',
        features: [
          'Toutes les fonctionnalités incluses',
          'Hébergement cloud et mises à jour automatiques',
          'Utilisateurs en lecture seule illimités',
          '500 messages Plaid/mois',
          'Plaid, clé perso',
          'Session d\'activation 60 min offerte',
          'Support email prioritaire',
          '20 % de remise sur le conseil',
        ],
        ctaLabel: 'Essai gratuit',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
      },
      {
        name: 'Standard',
        badge: 'Gouvernance multi-équipes',
        target: 'Jusqu\'à 25 contributeurs',
        price: '149 €',
        period: '/mois',
        subPrice: 'ou 1 490 €/an (2 mois offerts)',
        features: [
          'Tout ce qui est dans Starter',
          '1 500 messages Plaid/mois',
        ],
        ctaLabel: 'Essai gratuit',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
        featured: true,
      },
      {
        name: 'Max',
        badge: 'Déploiement à l\'échelle',
        target: 'Contributeurs illimités',
        price: '249 €',
        period: '/mois',
        subPrice: 'ou 2 490 €/an (2 mois offerts)',
        features: [
          'Tout ce qui est dans Standard',
          '2 500 messages Plaid/mois',
        ],
        ctaLabel: 'Essai gratuit',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
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
        body: 'Vous voulez le chemin le plus court vers la valeur. Nous opérons l\'infrastructure, vous vous concentrez sur votre DSI.',
      },
    ],
  },

  services: {
    title: 'Support et conseil',
    intro: 'Besoins différents, services différents. Les abonnés reçoivent le support prioritaire inclus et 20 % de remise sur le conseil.',
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
      body: 'On vous aide à tirer de la valeur de KANAP, appels programmés, travail approfondi, advisory.',
      items: [
        'Installation, configuration, onboarding, formation',
        'Conception de workflows et bonnes pratiques',
        'Advisory CIO sur votre modèle de gouvernance IT',
        'Tout ce qui nécessite un appel programmé',
      ],
    },
  },

  rates: {
    title: 'Tarifs conseil',
    intro: 'Tarification transparente. Les abonnés ont toujours 20 % de remise.',
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
      'Déployez vous-même gratuitement, ou laissez-nous opérer la plateforme à partir de 49 €/mois avec une session d\'activation de 60 min offerte.',
    primary: 'Essai gratuit',
    secondary: 'Déployer depuis GitHub',
  },
};

export default content;
