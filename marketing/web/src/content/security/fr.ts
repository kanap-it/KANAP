import type { SecurityContent } from './types';

const content: SecurityContent = {
  meta: {
    title: 'Sécurité',
    description:
      'Comment KANAP protège vos données : row-level security, chiffrement, RBAC, piste d\'audit, SSO et transparence open source. Auto-hébergé ou cloud.',
  },
  header: {
    eyebrow: 'Sécurité',
    title: 'Une sécurité qui respecte vos données.',
    lead:
      'Contrôles de niveau gouvernance dès le premier jour. La même plateforme tourne sur notre cloud et sur vos serveurs, avec la même isolation, le même chiffrement et la même auditabilité.',
  },
  overview: {
    title: 'Principes',
    intro:
      'KANAP est conçu pour les DSI qui manipulent des données sensibles. Nous traitons vos données comme nous voulons que nos fournisseurs IT traitent les nôtres, transparentes, isolées, à portée de main quand il le faut.',
    pillars: [
      {
        title: 'Transparent par défaut',
        body: 'Tout le code source est sur GitHub sous AGPL v3. Votre équipe sécurité le lit, l\'audite ou le fork. Rien n\'est caché derrière des binaires propriétaires.',
      },
      {
        title: 'Isolé par conception',
        body: 'La row-level security au niveau base de données impose l\'isolation des tenants à chaque requête. Il n\'existe aucun raccourci cross-tenant à contourner, parce qu\'il n\'existe aucun raccourci tout court.',
      },
      {
        title: 'Toujours exportable',
        body: 'Vos données sont à vous. Export CSV sur chaque grille, export documents en PDF, DOCX, ODT, export tenant complet sur demande. Aucune taxe d\'extraction.',
      },
    ],
  },
  tenancy: {
    title: 'Isolation des tenants',
    body:
      'KANAP est multi-tenant au niveau base de données. Chaque ligne de chaque table partagée porte un `tenant_id`, et les policies PostgreSQL Row-Level Security appliquent le filtre sur chaque lecture et écriture. La policy fait partie du schéma, pas de l\'application, une requête malveillante ne peut pas la contourner.',
    bullets: [
      'Policies PostgreSQL RLS sur chaque table partagée',
      'Filtrage `tenant_id` imposé au niveau base de données, pas juste dans l\'app',
      'Pools de connexions par tenant avec variables de session définissant le tenant courant',
      'Opérations batch avec `tenant_id = ANY($1)`, jamais de fuite N+1',
      'Tests de régression multi-tenant à chaque exécution CI',
    ],
  },
  dataProtection: {
    title: 'Protection des données',
    body:
      'Pratiques standards, appliquées rigoureusement. Chiffrement en transit et au repos, hash des mots de passe, minimisation des données sensibles.',
    bullets: [
      'TLS partout, aucun texte clair entre les composants',
      'Hash Argon2 des mots de passe avec sels par utilisateur',
      'Secrets stockés via l\'environnement, jamais dans le code',
      'Déploiements cloud avec volumes persistants chiffrés',
      'Clés API (Plaid BYOK, tokens MCP) chiffrées au repos',
      'Aucun identifiant en clair dans les logs ; logs structurés avec règles de rédaction',
    ],
  },
  access: {
    title: 'Contrôle d\'accès',
    body:
      'Permissions fines par module, par rôle. Chaque feature gate et chaque requête d\'entité respecte la même matrice RBAC, y compris Plaid et MCP.',
    bullets: [
      'Niveaux lecteur / gestionnaire / administrateur par module',
      'Rôle admin workspace distinct des admins de module',
      'SSO via Microsoft Entra ID (OIDC) en cloud et auto-hébergé',
      'Authentification locale par mot de passe avec Argon2 + flux optionnel de réinitialisation',
      'Plaid et MCP appliquent le même RBAC que l\'UI, pas d\'escalade de privilèges',
      'Tokens API limités aux utilisateurs individuels, révocables à tout moment',
    ],
  },
  audit: {
    title: 'Piste d\'audit',
    body:
      'Chaque modification significative est enregistrée. Qui a changé quoi, quand, avec des instantanés complets avant/après. Activité visible dans l\'app et interrogeable via export.',
    bullets: [
      'Chronologie d\'activité par entité (tâches, projets, documents, etc.)',
      'Actions utilisateur loguées avec horodatage et métadonnées IP',
      'Actions de connexion et d\'administration remontées dans un flux d\'audit dédié',
      'Exportable en CSV pour ingestion SIEM',
      'Structure immuable, en append seul, les lignes sont ajoutées, jamais réécrites',
    ],
  },
  deployment: {
    title: 'Déploiement et exploitation',
    body:
      'Les déploiements cloud tournent sur des hôtes Linux durcis en UE. Les déploiements auto-hébergés tournent où vous décidez. Les deux embarquent le même modèle de sécurité.',
    bullets: [
      'Infrastructure cloud UE uniquement (OVH, France)',
      'Mises à jour régulières des dépendances et images de conteneurs',
      'Tarballs d\'auto-hébergement ou images de conteneurs, déterministes, auditables',
      'Logs standards vers stdout pour intégration avec votre stack d\'observabilité',
      'Sauvegardes : pg_dump standard, chiffrez-le avec votre propre pipeline',
    ],
  },
  disclosure: {
    title: 'Divulgation responsable',
    body:
      'Si vous trouvez un problème de sécurité, nous voulons le savoir. Écrivez-nous d\'abord, laissez-nous un délai raisonnable pour corriger, et nous vous créditerons dans l\'avis sauf si vous préférez rester anonyme.',
    emailLabel: 'security@kanap.net',
    email: 'security@kanap.net',
  },
  cta: {
    title: 'Des questions sur la sécurité ?',
    body: 'Nous partageons volontiers les détails d\'architecture, passons en revue un modèle de menaces, ou mettons votre équipe sécurité en contact avec la nôtre.',
    primary: 'Parlons-en',
    secondary: 'Auto-hébergez et auditez le code',
  },
};

export default content;
