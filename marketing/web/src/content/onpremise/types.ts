export interface OnPremPillar {
  title: string;
  body: string;
}

export interface OnPremStep {
  title: string;
  body: string;
  code?: string;
}

export interface OnPremRequirement {
  label: string;
  value: string;
}

export interface OnPremContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta: string;
    secondaryHref: string;
  };
  why: {
    eyebrow: string;
    title: string;
    intro: string;
    pillars: OnPremPillar[];
  };
  license: {
    title: string;
    body: string;
    bullets: string[];
    linkLabel: string;
    linkHref: string;
  };
  deploy: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: OnPremStep[];
    docsCtaLabel: string;
    docsHref: string;
    manualOption: {
      label: string;
      title: string;
      body: string;
      ctaLabel: string;
      ctaHref: string;
    };
  };
  requirements: {
    title: string;
    intro: string;
    items: OnPremRequirement[];
  };
  operations: {
    title: string;
    intro: string;
    items: OnPremPillar[];
  };
  support: {
    title: string;
    body: string;
    bullets: string[];
    ctaLabel: string;
    ctaHref: string;
  };
  cta: { title: string; body: string; primary: string; secondary: string };
}
