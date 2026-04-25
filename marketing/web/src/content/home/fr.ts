import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'La plateforme de gouvernance IT open source',
    description:
      'Budget, architecture d\'entreprise, portefeuille et connaissance dans une plateforme dotée d\'une IA. Conçue par un DSI. Open source sous AGPL v3. Auto-hébergement gratuit ou cloud à partir de 49 €/mois.',
  },

  hero: {
    eyebrow: 'Mettez de la clarté dans votre DSI',
    title: 'La plateforme de gouvernance IT open source.',
    lead: 'Budget, architecture, portefeuille et connaissance dans une seule plateforme, avec Plaid, l\'assistant IA intégré.\nAuto-hébergez-la, ou laissez-nous la gérer.',
    primaryCta: 'Essai gratuit',
    secondaryCta: 'Découvrir les fonctionnalités',
    trialNote: 'Essai 14 jours · sans carte · session d\'activation offerte.',
  },

  pillars: {
    eyebrow: 'Pourquoi KANAP',
    title: 'Pensée autrement.',
    items: [
      {
        title: 'Conçue par des praticiens',
        body: 'Pensée par un vétéran de l\'IT avec une vraie expérience multisectorielle. Elle résout les vrais problèmes des DSI. S\'adapte à tous les secteurs.',
      },
      {
        title: 'Simple et puissante',
        body: 'Zéro complexité inutile. Assez puissante pour les problèmes difficiles. Assez simple pour être adoptée dès aujourd\'hui.',
      },
      {
        title: 'Véritablement open source',
        body: 'AGPL v3. Tout le code source sur GitHub. Libre à auto-héberger, ouverte aux contributions. Aucun enfermement, aucune mauvaise surprise, aucune tarification freemium.',
      },
    ],
  },

  modules: {
    eyebrow: 'Boîte à outils IT complète',
    title: 'Pensée pour chaque rôle IT.\nPlateforme entière, ou tuile par tuile.',
    intro:
      'KANAP couvre tout ce qu\'une DSI doit maîtriser, de la première ligne de budget à la dernière application retirée, avec un assistant IA qui lit transversalement toutes vos données.',
    items: [
      {
        slug: '/features/budget',
        title: 'Gestion du budget',
        blurb:
          'Pour les DSI et leurs partenaires finance. Planification pluriannuelle, allocations intelligentes, refacturation prête pour la direction. Défendez le budget IT avec des chiffres que votre directeur financier validera.',
        bullets: [
          'Planification budgétaire pluriannuelle',
          'Six méthodes d\'allocation',
          'Multi-devises avec taux Banque mondiale',
          'Rapports de refacturation exécutifs',
        ],
        ctaLabel: 'En savoir plus',
      },
      {
        slug: '/features/it-landscape',
        title: 'Paysage IT',
        blurb:
          'Pour les architectes, responsables d\'application et équipes infrastructure. Documentez applications, interfaces et serveurs. Visualisez le SI d\'un coup d\'œil, planifiez les changements avec leurs dépendances sous les yeux.',
        bullets: [
          'Portefeuille applicatif avec instances par environnement',
          'Documentation des interfaces avec middleware 3 segments',
          'Registre des serveurs et infrastructures',
          'Cartes d\'interfaces et de connexions interactives',
        ],
        ctaLabel: 'En savoir plus',
      },
      {
        slug: '/features/portfolio',
        title: 'Gestion de portefeuille',
        blurb:
          'Pour les chefs de projet et les leads IT. Scorez la demande, simulez des feuilles de route qui tiennent compte de la capacité, engagez des dates sans croiser les doigts.',
        bullets: [
          'Scoring des demandes avec critères pondérés',
          'Planification automatique de la feuille de route',
          'Analyse des goulots et de l\'occupation',
          'Suivi du cycle de vie projet',
        ],
        ctaLabel: 'En savoir plus',
      },
      {
        slug: '/features/knowledge',
        title: 'Connaissance',
        blurb:
          'Pour tout le monde, et particulièrement le support et les opérations. Éditeur markdown, bibliothèques, flux de revue. Runbooks, décisions et notes d\'architecture connectés aux applications et projets qu\'ils décrivent.',
        bullets: [
          'Éditeur markdown avec flux de revue',
          'Bibliothèques, dossiers, types de documents',
          'Historique des versions et export PDF, DOCX, ODT',
          'Liens directs vers applications, projets, actifs, tâches',
        ],
        ctaLabel: 'En savoir plus',
      },
      {
        slug: '/features/ai',
        title: 'Plaid, Assistant IA',
        blurb:
          'Pour chaque rôle, pas seulement les passionnés d\'IA. Posez vos questions en langage naturel ; obtenez des réponses structurées sur tous les modules. Le chemin le plus court entre une question IT et la donnée qui y répond.',
        bullets: [
          'Requêtes en langage naturel sur tous les modules',
          'Actions sur documents et tâches avec aperçu',
          'Serveur MCP pour Claude, Cursor, Windsurf…',
          'Utilisation gratuite incluse sur les plans cloud, ou clé perso',
        ],
        ctaLabel: 'En savoir plus',
      },
      {
        title: 'Adoptez à votre rythme',
        blurb:
          'Chaque module est pleinement opérationnel par lui-même. Commencez là où ça fait mal — budget, paysage, portefeuille, connaissance — et ajoutez le reste quand vous serez prêt. La plateforme rend de plus en plus à mesure que vous l\'adoptez, mais vous n\'avez jamais besoin des cinq pour en tirer de la valeur.',
        bullets: [
          'Chaque module pleinement utilisable seul',
          'Aucune séquence imposée, aucune migration globale',
          'La valeur transverse se cumule au fil de l\'adoption',
          'Remplacez un outil aujourd\'hui, consolidez quand vous voudrez',
        ],
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Pensé pour l\'entreprise',
    title: 'Tout connecté.\nToujours maîtrisé.',
    intro:
      'Cinq modules travaillent sur les mêmes données, créant la couche de gouvernance dont une DSI a réellement besoin.',
    items: [
      {
        title: 'Reporting & tableaux de bord',
        body: 'Tableaux de bord orientés direction, analyses de tendance, exports CSV et PNG.',
      },
      {
        title: 'Contrôle d\'accès par rôle',
        body: 'Permissions fines par module. Niveaux lecteur, gestionnaire, administrateur.',
      },
      {
        title: 'Relations riches',
        body: 'Liez les coûts aux applications, les applications aux projets, les projets aux budgets, la connaissance à tout.',
      },
      {
        title: 'Piste d\'audit complète',
        body: 'Chaque changement tracé. Qui a changé quoi, quand, avec l\'historique avant/après complet.',
      },
      {
        title: 'Gestion unifiée des tâches',
        body: 'Affectez des tâches aux OPEX, CAPEX, contrats, projets. Une seule pile de tâches à travers la plateforme.',
      },
      {
        title: 'SSO via Microsoft Entra ID',
        body: 'Authentification unique pour l\'entreprise. Un seul identifiant pour toute l\'organisation.',
      },
    ],
  },

  cta: {
    title: 'Prêt à mettre de la clarté dans votre DSI ?',
    body:
      'Démarrez gratuitement en auto-hébergement, ou essayez le cloud à partir de 49 €/mois.\nToutes les fonctionnalités sur chaque plan, cloud comme auto-hébergement.',
    primary: 'Essai gratuit',
    secondary: 'Déployer depuis GitHub',
  },
};

export default content;
