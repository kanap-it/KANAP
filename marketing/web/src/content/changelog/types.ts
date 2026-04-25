export interface ChangelogEntry {
  date: string; // ISO date YYYY-MM-DD
  version?: string;
  title: string;
  summary: string;
  sections?: {
    label: string;
    items: string[];
  }[];
}

export interface ChangelogContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  subscribe: {
    label: string;
    body: string;
    githubCta: string;
    githubHref: string;
  };
  entries: ChangelogEntry[];
}
