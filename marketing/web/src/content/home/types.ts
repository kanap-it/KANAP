/** Homepage content shape, all locales implement this. */

export interface Pillar {
  title: string;
  body: string;
}

export interface ModuleEntry {
  /** Optional — when omitted, the tile renders without a CTA link. */
  slug?: string;
  title: string;
  blurb: string;
  bullets: string[];
  ctaLabel?: string;
}

export interface CrossCuttingFeature {
  title: string;
  body: string;
}

export interface HomeContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    trialNote: string;
  };
  pillars: {
    eyebrow: string;
    title: string;
    items: Pillar[];
  };
  modules: {
    eyebrow: string;
    title: string;
    intro: string;
    items: ModuleEntry[];
  };
  crossCutting: {
    eyebrow: string;
    title: string;
    intro: string;
    items: CrossCuttingFeature[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
