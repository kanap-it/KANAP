/**
 * Helpers to build JSON-LD snippets consistent with the old site's
 * structured data and Google's current guidance.
 */

export function organizationLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'KANAP',
    url: site,
    logo: new URL('/logo.svg', site).href,
    sameAs: ['https://github.com/kanap-it/kanap'],
  };
}

export function softwareApplicationLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KANAP',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Linux (self-hosted)',
    url: site,
    description:
      'AI-powered open source IT governance platform for budget control, enterprise architecture, portfolio management, and knowledge governance. Includes Plaid AI assistant with MCP integration. AGPL v3 licensed.',
    offers: [
      { '@type': 'Offer', name: 'Self-host', price: '0', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Starter', price: '49', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Standard', price: '149', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Max', price: '249', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Self-Hosted Support', price: '2490', priceCurrency: 'EUR' },
    ],
    publisher: { '@type': 'Organization', name: 'Kanap', url: site },
  };
}

export function breadcrumbLd(
  site: string,
  trail: { name: string; url: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.url, site).href,
    })),
  };
}
