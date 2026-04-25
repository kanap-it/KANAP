import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Plaid, Assistant IA pour la gouvernance IT',
    description:
      'Interrogez Plaid sur vos données IT. Créez des documents, mettez à jour des tâches, connectez n\'importe quel outil IA via MCP. Usage gratuit inclus sur les plans cloud.',
  },
  header: {
    eyebrow: 'Plaid · Assistant IA',
    title: 'Pas un chatbot.\nUn vrai assistant pour l\'IT.',
    lead: 'Demandez n\'importe quoi sur votre budget, vos applications, vos projets, votre documentation. Plaid comprend vos données, agit, et se connecte à n\'importe quel outil IA d\'entreprise via MCP.',
  },
  sections: [
    {
      title: 'Cherchez et interrogez tout',
      body: 'Posez à Plaid des questions sur vos applications, serveurs, contrats, items de budget, projets, tâches, documents. Réponses instantanées avec des données structurées, pas des résumés flous.',
      bullets: [
        'Recherche transverse sur toutes les entités',
        'Requêtes structurées avec filtres et tris',
        'Agrégations et statistiques',
        'Recherche plein texte dans la base de connaissances',
      ],
      shotAlt: 'Plaid répondant à une requête transverse',
    },
    {
      title: 'Passez à l\'action avec aperçu',
      body: 'Plaid ne fait pas que lire, il écrit. Créez de la documentation, rédigez des briefs projet, gérez des tâches. Chaque écriture est prévisualisée avant application.',
      bullets: [
        'Création et édition de documents en markdown',
        'Rédaction de briefs et de résumés projet',
        'Mise à jour de tâches : statut, affectataires, commentaires',
        'Aperçu des changements avant application',
      ],
      shotAlt: 'Plaid montrant un aperçu de mises à jour',
    },
    {
      title: 'MCP, utilisez KANAP depuis n\'importe quel outil IA',
      body: 'KANAP expose un serveur MCP (Model Context Protocol) complet. Connectez Claude Desktop, Cursor, Windsurf ou tout client compatible, et interrogez vos données de gouvernance IT sans quitter votre flux.',
      bullets: [
        'Protocole MCP standard, compatible avec tout client',
        'Authentification par clé API avec scoping granulaire',
        'Mêmes requêtes et actions que le chat intégré',
        'Conservez vos flux IA existants, ajoutez le contexte KANAP',
      ],
      shotAlt: 'Configuration MCP avec scoping de clé',
    },
    {
      title: 'Contrôle et conformité totaux',
      body: 'Plaid respecte vos règles. Chaque action est régie par les permissions utilisateur. Les administrateurs gardent le contrôle total sur ce que Plaid peut ou ne peut pas faire.',
      bullets: [
        'Respect total des permissions utilisateur sur chaque requête',
        'Clés API sécurisées avec scoping MCP granulaire',
        'Recherche web activable ou désactivable indépendamment',
        'Aperçu et confirmation de toutes les écritures',
        'Mode lecture seule disponible pour des déploiements prudents',
      ],
      shotAlt: 'Contrôles admin Plaid avec matrice de permissions',
    },
  ],
  more: {
    title: 'Ce que vous pouvez demander à Plaid',
    items: [
      { title: '« Où en est le projet Atlas ? »', body: 'Plaid récupère le projet, ses tâches, sa timeline, son équipe, et fournit un brief de statut avec bloqueurs et jalons à venir.' },
      { title: '« Liste les applications AWS sans propriétaire »', body: 'Requête structurée sur votre paysage IT. Résultats filtrés et triés depuis des données live.' },
      { title: '« Rédige une politique de sécurité d\'accès distant »', body: 'Plaid crée un nouveau document dans votre base, avec métadonnées et contenu markdown corrects.' },
      { title: '« Quels contrats expirent dans 90 jours ? »', body: 'Réponse instantanée avec noms de fournisseurs, montants et dates de renouvellement.' },
    ],
  },
  crossLinks: {
    label: 'Explorez les autres modules',
    links: [
      { label: 'Gestion du budget', href: '/features/budget' },
      { label: 'Paysage IT', href: '/features/it-landscape' },
      { label: 'Gestion de portefeuille', href: '/features/portfolio' },
      { label: 'Connaissance', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'La gouvernance IT augmentée par l\'IA commence ici.',
    body: 'Plaid est inclus dans chaque workspace KANAP, avec un usage gratuit généreux sur les plans cloud. Auto-hébergement gratuit, ou cloud à partir de 49 €/mois.',
    primary: 'Essai gratuit',
    secondary: 'Nous contacter',
  },
};

export default content;
