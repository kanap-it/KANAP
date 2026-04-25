/** /offer page content shape. */

export interface OfferPlan {
  name: string;
  badge?: string;
  target: string;
  price: string;
  period?: string;
  subPrice?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: 'primary' | 'ghost';
  note?: string;
  featured?: boolean;
}

export interface ChoiceEntry {
  title: string;
  body: string;
}

export interface ServiceCard {
  title: string;
  subtitle: string;
  body: string;
  items: string[];
}

export interface ConsultingRow {
  duration: string;
  useCases: string;
  rate: string;
  subscriber: string;
}

export interface OfferContent {
  meta: {
    title: string;
    description: string;
  };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  selfHosted: {
    eyebrow: string;
    title: string;
    intro: string;
    plans: OfferPlan[];
  };
  openSourceBanner: {
    title: string;
    body: string;
    linkLabel: string;
    linkHref: string;
  };
  cloud: {
    eyebrow: string;
    title: string;
    intro: string;
    plans: OfferPlan[];
  };
  howToChoose: {
    title: string;
    intro: string;
    items: ChoiceEntry[];
  };
  services: {
    title: string;
    intro: string;
    support: ServiceCard;
    consulting: ServiceCard;
  };
  rates: {
    title: string;
    intro: string;
    headings: {
      duration: string;
      useCases: string;
      rate: string;
      subscriber: string;
    };
    rows: ConsultingRow[];
    note: string;
  };
  faqTeaser: {
    title: string;
    body: string;
    ctaLabel: string;
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
