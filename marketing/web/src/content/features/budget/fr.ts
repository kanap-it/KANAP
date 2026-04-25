import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Gestion du budget',
    description:
      'Planification budgétaire pluriannuelle, six méthodes d\'allocation, multi-devises avec taux Banque mondiale, refacturation exécutive. Open source.',
  },
  header: {
    eyebrow: 'Gestion du budget',
    title: 'Maîtrisez votre budget IT avec une visibilité totale.',
    lead: 'Planification pluriannuelle, allocation intelligente des coûts, rapports de refacturation prêts pour la direction. OPEX et CAPEX suivis à travers les sociétés et départements.',
  },
  sections: [
    {
      title: 'Planification budgétaire pluriannuelle',
      body: 'Planifiez votre budget IT sur plusieurs années avec des colonnes dynamiques : Budget, Révision, Suivi et Atterrissage. OPEX et CAPEX dans une vue unifiée.',
      bullets: [
        'Suivi OPEX et CAPEX dans des grilles dédiées',
        'Colonnes dynamiques Budget / Révision / Suivi / Atterrissage par année',
        'Comparaisons année après année et analyse de tendance',
        'Copie en masse entre années budgétaires',
        'Workflows freeze / unfreeze pour la gouvernance',
      ],
      shotAlt: 'Grille budgétaire pluriannuelle avec colonnes dynamiques',
    },
    {
      title: 'Allocation intelligente des coûts',
      body: 'Répartissez les coûts IT entre sociétés et départements avec six méthodes d\'allocation. Recalcul automatique quand les métriques changent, transparence complète, piste d\'audit.',
      bullets: [
        'Allocation par effectif',
        'Allocation par utilisateurs IT',
        'Allocation pondérée par le chiffre d\'affaires',
        'Répartitions manuelles par société et département',
        'Allocation par défaut proportionnelle à l\'effectif',
      ],
      shotAlt: 'Éditeur d\'allocation affichant six méthodes',
    },
    {
      title: 'Multi-devises avec taux en temps réel',
      body: 'Travaillez en plusieurs devises tout en consolidant dans une devise canonique. Taux live depuis l\'API Banque mondiale, figés lors du verrouillage d\'une version budgétaire.',
      bullets: [
        'Devise de reporting unique pour tous les agrégats',
        'Taux FX automatiques depuis la Banque mondiale',
        'Snapshots de taux figés au verrouillage',
        'Liste de devises autorisées paramétrable',
        'Taux historiques pour les exercices passés',
      ],
      shotAlt: 'Paramètres de devise avec taux Banque mondiale',
    },
    {
      title: 'Rapports de refacturation exécutifs',
      body: 'Rapports de refacturation prêts pour le comité de direction montrant la répartition des coûts IT par société et département. Drill-down jusqu\'aux items individuels avec transparence sur les méthodes.',
      bullets: [
        'Rapport global par société',
        'Rapports société par département',
        'Détail des allocations ligne par ligne',
        'KPI et part du total',
        'Export CSV et téléchargement des graphiques',
      ],
      shotAlt: 'Rapport de refacturation avec drill-down',
    },
  ],
  more: {
    title: 'Plus dans Budget',
    items: [
      { title: 'Gestion des tâches', body: 'Affectez des tâches de suivi aux items OPEX et CAPEX. Dates d\'échéance et avancement.' },
      { title: 'Liens contrats', body: 'Liez les items de dépense aux contrats. Suivi des dates de renouvellement et résiliation.' },
      { title: 'Plan comptable', body: 'Mappez les coûts sur votre structure comptable. CoA spécifiques pays et globaux.' },
      { title: 'Hygiène des données', body: 'Les puces du tableau de bord signalent les propriétaires manquants, les sociétés payeuses et les incohérences de CoA.' },
    ],
  },
  crossLinks: {
    label: 'Explorez les autres modules',
    links: [
      { label: 'Paysage IT', href: '/features/it-landscape' },
      { label: 'Gestion de portefeuille', href: '/features/portfolio' },
      { label: 'Connaissance', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'Prêt à maîtriser votre budget IT ?',
    body: 'Démarrez gratuitement en auto-hébergement, ou essayez le cloud à partir de 49 €/mois.',
    primary: 'Essai gratuit',
    secondary: 'Nous contacter',
  },
};

export default content;
