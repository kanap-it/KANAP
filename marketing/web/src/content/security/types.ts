export interface SecurityPillar {
  title: string;
  body: string;
}

export interface SecurityContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  overview: {
    title: string;
    intro: string;
    pillars: SecurityPillar[];
  };
  tenancy: {
    title: string;
    body: string;
    bullets: string[];
  };
  dataProtection: {
    title: string;
    body: string;
    bullets: string[];
  };
  access: {
    title: string;
    body: string;
    bullets: string[];
  };
  audit: {
    title: string;
    body: string;
    bullets: string[];
  };
  deployment: {
    title: string;
    body: string;
    bullets: string[];
  };
  disclosure: {
    title: string;
    body: string;
    emailLabel: string;
    email: string;
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
}
