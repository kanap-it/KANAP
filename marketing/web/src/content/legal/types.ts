export interface LegalDoc {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lastUpdated: string;
  };
  /** HTML body, prose section. */
  body: string;
}

export interface LegalContent {
  privacy: LegalDoc;
  terms: LegalDoc;
  sales: LegalDoc;
  legal: LegalDoc;
}
