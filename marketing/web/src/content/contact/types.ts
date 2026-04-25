export interface ContactContent {
  meta: { title: string; description: string };
  header: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  highlights: string[];
  form: {
    nameLabel: string;
    emailLabel: string;
    companyLabel: string;
    messageLabel: string;
    submitLabel: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    errorGeneric: string;
  };
  alternate: {
    label: string;
    email: string;
  };
}
