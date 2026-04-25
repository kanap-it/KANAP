import type { FaqContent } from './types';

const content: FaqContent = {
  meta: {
    title: 'FAQ',
    description:
      'Questions fréquentes sur les tarifs, la licence, l\'auto-hébergement, les plans cloud, Plaid, le support et la facturation KANAP.',
  },
  header: {
    eyebrow: 'FAQ',
    title: 'Questions fréquentes.',
    lead:
      'Tout ce que vous devez savoir sur KANAP, licence, tarifs, hébergement et Plaid. Si vous ne trouvez pas votre réponse, écrivez-nous.',
  },
  groups: [
    {
      label: 'Licence et open source',
      items: [
        {
          q: 'Sous quelle licence est KANAP ?',
          a: 'KANAP est publié sous licence <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener" target="_blank">AGPL v3</a>, une licence open source largement reconnue et approuvée par l\'OSI. Vous pouvez librement utiliser, modifier et distribuer le logiciel. La clause copyleft de l\'AGPL garantit que quiconque exécute une version modifiée en tant que service doit partager ses changements. Cela protège la communauté et maintient KANAP réellement ouvert.',
        },
        {
          q: 'Puis-je utiliser KANAP commercialement ?',
          a: 'Oui. Usage interne, commercial, SaaS externe, tout est permis. La clause copyleft n\'oblige à partager vos modifications que si vous exécutez une version modifiée comme service réseau. Un usage purement interne ne déclenche aucune obligation.',
        },
        {
          q: 'Puis-je contribuer à KANAP ?',
          a: 'Oui, avec plaisir. Tout le code source est sur <a href="https://github.com/kanap-it/kanap" rel="noopener" target="_blank">GitHub</a>. Issues, pull requests et discussions sont les bienvenues. Consultez CONTRIBUTING.md pour les conventions.',
        },
      ],
    },
    {
      label: 'Cloud et essai',
      items: [
        {
          q: 'Comment fonctionne l\'essai gratuit ?',
          a: 'Chaque plan cloud payant commence par un essai gratuit de 14 jours. Sans carte bancaire. Accès complet à toutes les fonctionnalités, plus une session d\'activation de 60 minutes offerte par entreprise si elle est réservée pendant l\'essai.',
        },
        {
          q: 'Que se passe-t-il à la fin de mon essai ?',
          a: 'Après votre essai de 14 jours, vous devez choisir un plan payant pour continuer. Votre tenant reste disponible 30 jours de plus avec un accès limité. À l\'issue de cette période de 30 jours, votre tenant est supprimé.',
        },
        {
          q: 'Qu\'est-ce que la session d\'activation gratuite ?',
          a: 'Chaque essai inclut une session d\'activation de 60 minutes offerte par entreprise. Après souscription, nous vous envoyons un email pour planifier l\'appel. La session est un appel vidéo centré sur les premiers jalons de valeur, en fonction de vos objectifs principaux.',
        },
        {
          q: 'Quelle est la différence entre cloud et auto-hébergé ?',
          a: 'L\'hébergement cloud signifie que nous opérons tout pour vous, mises à jour, sauvegardes, infrastructure. L\'auto-hébergement signifie que vous exécutez KANAP sur vos propres serveurs. Les plans cloud payants (Starter, Standard, Max) incluent l\'hébergement cloud ; le plan gratuit est en auto-hébergement uniquement. Vous pouvez acheter le Support auto-hébergé pour vos installations auto-hébergées.',
        },
      ],
    },
    {
      label: 'Auto-hébergement et support',
      items: [
        {
          q: 'Qu\'est-ce que le Support auto-hébergé ?',
          a: 'Le Support auto-hébergé est un module de support professionnel pour les installations auto-hébergées. Il inclut le support email prioritaire, l\'aide au diagnostic pour l\'installation et les mises à niveau, et 20 % de remise sur les services de conseil. Tarifé à 2 490 €/an.',
        },
        {
          q: 'Comment fonctionne le support prioritaire ?',
          a: 'Pour les abonnés payants, écrivez-nous à propos de tout problème opérationnel. Nous visons une réponse sous 24h et la résolution de votre problème. C\'est en meilleur effort, sans SLA, mais nous sommes de vrais humains qui lisent et répondent à chaque message.',
        },
      ],
    },
    {
      label: 'Facturation',
      items: [
        {
          q: 'Puis-je payer par facture ?',
          a: 'Le paiement par facture (virement bancaire) est disponible pour les abonnements au-dessus de 1 000 € pour les clients EUR uniquement. Aujourd\'hui cela concerne Standard annuel, Max annuel et Support auto-hébergé. Les abonnements inférieurs ou égaux à 1 000 € sont payés par carte. Les factures sont à NET30.',
        },
        {
          q: 'Puis-je changer de plan à la hausse ou à la baisse ?',
          a: 'Oui. Passez entre Starter, Standard et Max à tout moment depuis les paramètres de votre workspace. Si vous montez en cours de cycle, vous êtes facturé de la différence au prorata. La baisse s\'applique à la fin de votre période de facturation.',
        },
        {
          q: 'Puis-je annuler mon abonnement ?',
          a: 'Bien sûr. Annulez depuis votre Centre de facturation à tout moment, votre abonnement reste actif jusqu\'à la fin de la période de facturation en cours, sans questions.',
        },
      ],
    },
    {
      label: 'Plaid (assistant IA)',
      items: [
        {
          q: 'Quelle est la différence entre les messages Plaid inclus et Bring Your Own Key ?',
          a: 'Chaque plan cloud inclut un nombre généreux de messages Plaid, propulsés par un modèle intermédiaire que nous avons soigneusement sélectionné et testé avec KANAP. Pour des réponses encore plus performantes, l\'option Bring Your Own Key vous permet de connecter les modèles de pointe d\'OpenAI, Anthropic ou de tout fournisseur compatible. BYOK vous donne aussi la maîtrise complète du traitement de vos données, et supprime toute limite de messages.',
        },
        {
          q: 'Comment puis-je contrôler Plaid ?',
          a: 'Au niveau plateforme, Plaid peut être totalement désactivé, activé en lecture seule, ou activé en lecture-écriture (avec aperçu et confirmation pour toutes les modifications). La recherche web et MCP s\'activent ou se désactivent séparément. Au niveau utilisateur, vous contrôlez qui accède à quelle fonctionnalité Plaid via les permissions par rôle. Le RBAC est toujours appliqué, Plaid ne voit jamais plus que ce qui est permis à l\'utilisateur.',
        },
      ],
    },
  ],
  cta: {
    title: 'Encore des questions ?',
    body: 'Écrivez-nous, nous lisons chaque message.',
    primary: 'Nous contacter',
    secondary: 'Essai gratuit',
  },
};

export default content;
