import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Fonctionnalités',
    description:
      'Cinq modules intégrés : budget, paysage IT, portefeuille, connaissance, assistant IA. Pensé entreprise avec RBAC, audit, SSO, multi-tenant. Open source sous AGPL v3.',
  },
  header: {
    eyebrow: 'La boîte à outils IT complète',
    title: 'Cinq modules intégrés.\nUne source de vérité.',
    lead: 'KANAP couvre le cœur de ce qu\'une DSI doit maîtriser, de la première ligne de budget à la dernière application retirée, avec un assistant IA qui lit transversalement tout le reste.',
  },
  modules: [
    {
      slug: '/features/budget',
      eyebrow: 'Module 1',
      title: 'Gestion du budget',
      body: 'Maîtrisez votre budget IT avec une planification pluriannuelle, une allocation intelligente et des rapports de refacturation exécutifs. OPEX et CAPEX avec visibilité complète.',
      bullets: [
        'Planification pluriannuelle avec colonnes dynamiques',
        'Six méthodes d\'allocation dont effectif et chiffre d\'affaires',
        'Multi-devises avec taux FX automatiques',
        'Refacturation exécutive par société et département',
        'Workflows freeze / unfreeze pour la gouvernance',
      ],
      ctaLabel: 'Explorer la gestion du budget',
      shotAlt: 'Grille budgétaire avec OPEX et CAPEX',
    },
    {
      slug: '/features/it-landscape',
      eyebrow: 'Module 2',
      title: 'Paysage IT',
      body: 'Documentez tout votre SI : applications, interfaces et infrastructure. Visualisez l\'architecture via des cartes interactives et suivez les cycles de vie.',
      bullets: [
        'Portefeuille applicatif avec instances par environnement',
        'Documentation d\'interfaces avec middleware 3 segments',
        'Registre de serveurs et d\'infrastructure',
        'Cartes d\'interfaces et de connexions interactives',
        'Suivi de lignée de versions',
      ],
      ctaLabel: 'Explorer le paysage IT',
      shotAlt: 'Carte d\'interfaces avec nœuds d\'applications',
    },
    {
      slug: '/features/portfolio',
      eyebrow: 'Module 3',
      title: 'Gestion de portefeuille',
      body: 'De la demande à la livraison : priorisez, simulez, appliquez des dates avec confiance. Des décisions basées sur les données.',
      bullets: [
        'Scoring paramétrable avec critères pondérés',
        'Conversion demande-vers-projet',
        'Feuille de route automatique selon effort, dépendances, capacité',
        'Analyse de goulots et d\'occupation',
        'Application sélective et transactionnelle des dates',
        'Baseline pour l\'analyse d\'écart',
      ],
      ctaLabel: 'Explorer la gestion de portefeuille',
      shotAlt: 'Feuille de route avec heatmap de capacité',
    },
    {
      slug: '/features/knowledge',
      eyebrow: 'Module 4',
      title: 'Connaissance',
      body: 'Gouvernez votre documentation IT avec un éditeur markdown, des bibliothèques structurées et des workflows de revue. Liez les documents à tout le reste.',
      bullets: [
        'Éditeur markdown avec verrous et autosave',
        'Bibliothèques, dossiers, types de documents',
        'Workflows de revue et d\'approbation',
        'Historique des versions avec restauration',
        'Export PDF, DOCX, ODT',
        'Intégration profonde avec apps, actifs, projets, tâches',
      ],
      ctaLabel: 'Explorer la connaissance',
      shotAlt: 'Arborescence de bibliothèque avec types de documents',
    },
    {
      slug: '/features/ai',
      eyebrow: 'Assistant IA',
      title: 'Découvrir Plaid',
      body: 'Demandez n\'importe quoi sur vos données IT en langage naturel. Plaid cherche dans tous les modules, crée des documents, gère des tâches, dans le respect de vos permissions.',
      bullets: [
        'Requêtes en langage naturel sur tous les modules',
        'Création de documents et mise à jour de tâches depuis le chat',
        'Serveur MCP pour n\'importe quel outil IA',
        'Clé API perso, OpenAI, Anthropic, Ollama, personnalisée',
        'Isolation par tenant et RBAC appliqués partout',
      ],
      ctaLabel: 'Explorer Plaid',
      shotAlt: 'Chat Plaid avec requête transverse',
    },
  ],
  crossCutting: {
    eyebrow: 'Pensé pour l\'entreprise',
    title: 'Tout connecté. Toujours maîtrisé.',
    intro: 'Cinq modules travaillent sur les mêmes données, avec la couche de gouvernance dont une DSI a réellement besoin.',
    items: [
      { title: 'Reporting & tableaux de bord', body: 'Rapports orientés direction, analyse de tendance et KPI.' },
      { title: 'Contrôle d\'accès par rôle', body: 'Permissions fines par module. Niveaux lecteur, gestionnaire, admin.' },
      { title: 'Relations complètes', body: 'Liez coûts, applications, projets, budgets, connaissance.' },
      { title: 'Piste d\'audit complète', body: 'Chaque changement tracé avec historique avant/après.' },
      { title: 'Gestion unifiée des tâches', body: 'Tâches sur OPEX, CAPEX, contrats. Échéances et avancement.' },
      { title: 'Architecture multi-tenant', body: 'Isolation sécurisée avec row-level security.' },
      { title: 'SSO via Microsoft Entra ID', body: 'Authentification unique d\'entreprise.' },
      { title: 'Open source sous AGPL v3', body: 'Véritablement open source. Inspectez, auto-hébergez, contribuez.' },
    ],
  },
  cta: {
    title: 'Prêt à mettre de la clarté dans votre DSI ?',
    body: 'Démarrez gratuitement en auto-hébergement, ou essayez le cloud à partir de 49 €/mois.',
    primary: 'Essai gratuit',
    secondary: 'Nous contacter',
  },
};

export default content;
