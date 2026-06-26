export const HOME_SCREENSHOT = '/screenshots/home-dashboard.png';

export const HOME_HERO_SCREENSHOTS = {
  main: '/screenshots/ai-conversation.png',
  map: '/screenshots/it-interface-map.png',
  budget: '/screenshots/budget-chargeback.png',
} as const;

export const FEATURE_HUB_SCREENSHOTS = [
  '/screenshots/budget-chargeback.png',
  '/screenshots/it-interface-map.png',
  '/screenshots/portfolio-capacity.png',
  '/screenshots/ai-conversation.png',
  '/screenshots/it-applications.png',
] as const;

export const FEATURE_SCREENSHOTS = {
  budget: [
    '/screenshots/budget-opex-grid.png',
    '/screenshots/budget-allocations.png',
    '/screenshots/budget-currency.png',
    '/screenshots/budget-chargeback.png',
  ],
  'it-landscape': [
    '/screenshots/it-applications.png',
    '/screenshots/it-interface-technical.png',
    '/screenshots/it-assets.png',
    '/screenshots/it-interface-map.png',
  ],
  portfolio: [
    '/screenshots/portfolio-request-scoring.png',
    '/screenshots/portfolio-request-summary.png',
    '/screenshots/portfolio-project-timeline.png',
    '/screenshots/portfolio-capacity.png',
  ],
  knowledge: [
    '/screenshots/knowledge-editor.png',
    '/screenshots/knowledge-library.png',
    '/screenshots/knowledge-document.png',
    '/screenshots/knowledge-linked-entities.png',
  ],
  ai: [
    '/screenshots/ai-conversation.png',
    '/screenshots/ai-preview.png',
    '/screenshots/ai-integrations.png',
    '/screenshots/ai-admin.png',
  ],
} as const;

/**
 * Agents page screenshots (plan §8). TODO: capture from the live agent UI
 * (no mockups) and drop the PNGs in public/screenshots/, then fill this
 * array in section order. Until then the Agents page renders ScreenshotFrame
 * placeholders, so the layout is stable and the gap is visible.
 *
 * Needed, in section order:
 *   1. The autonomy setting for an agent
 *   2. An agent proposal: classification, drafted action, and the sources used
 *   3. The agent settings (persona, targeting) for "one runtime, any tool"
 *   4. The agent activity / audit record
 *   5. An agent working a queue (the task list view)
 */
export const AGENT_SCREENSHOTS: readonly (string | undefined)[] = [];

export type FeatureScreenshotSlug = keyof typeof FEATURE_SCREENSHOTS;

export function getFeatureSlugFromPath(pathname: string): FeatureScreenshotSlug | null {
  const parts = pathname.split('/').filter(Boolean);
  const featureIndex = parts.indexOf('features');
  const slug = featureIndex >= 0 ? parts[featureIndex + 1] : undefined;
  return slug && slug in FEATURE_SCREENSHOTS ? (slug as FeatureScreenshotSlug) : null;
}
