/** Feature deep-dive page content shape. */

export interface FeatureSection {
  title: string;
  body: string;
  bullets: string[];
  /** Placeholder alt text until screenshots land. */
  shotAlt: string;
}

export interface FeatureMore {
  title: string;
  body: string;
}

export interface FeatureCrossLink {
  label: string;
  href: string; // relative, will get locale-prefixed
}

export interface FeatureContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  sections: FeatureSection[];
  more: {
    title: string;
    items: FeatureMore[];
  };
  crossLinks: {
    label: string;
    links: FeatureCrossLink[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}

/** Hub page (features landing). */
export interface FeaturesHubContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  modules: {
    slug: string;
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
    ctaLabel: string;
    shotAlt: string;
  }[];
  crossCutting: {
    eyebrow: string;
    title: string;
    intro: string;
    items: FeatureMore[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
