export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  label: string;
  items: FaqItem[];
}

export interface FaqContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  groups: FaqGroup[];
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
