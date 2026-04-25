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

/** Hub page (features landing) — role-based scenarios. */

export interface PersonaModuleRef {
  /** Feature slug (`budget` | `it-landscape` | `portfolio` | `knowledge` | `ai`). */
  slug: string;
  label: string;
}

export interface Persona {
  /** Short role label rendered as eyebrow above the headline. */
  role: string;
  /** The H2 — concrete pain or task framed in the role's voice. */
  headline: string;
  /** 3–5 sentence narrative of how the persona uses KANAP. */
  body: string;
  /** One-line punchline rendered with a teal accent (the "win"). */
  outcome: string;
  /** Modules combined in the scenario; chips link to the deep-dive pages. */
  modules: PersonaModuleRef[];
  /** Alt text for the placeholder screenshot. */
  shotAlt: string;
}

export interface FeaturesHubContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  /** Label rendered above the modules chip list, e.g. "Modules combined". */
  modulesUsedLabel: string;
  personas: Persona[];
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
