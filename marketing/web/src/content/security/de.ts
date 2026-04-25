import type { SecurityContent } from './types';

const content: SecurityContent = {
  meta: {
    title: 'Sicherheit',
    description:
      'Wie KANAP Ihre Daten schützt: Row-Level Security, Verschlüsselung, RBAC, Audit-Trail, SSO und Open-Source-Transparenz. Self-Hosting oder Cloud.',
  },
  header: {
    eyebrow: 'Sicherheit',
    title: 'Sicherheit, die Ihre Daten respektiert.',
    lead:
      'Governance-taugliche Kontrollen vom ersten Tag an. Dieselbe Plattform läuft in unserer Cloud und auf Ihren eigenen Servern, mit derselben Isolation, Verschlüsselung und Auditierbarkeit.',
  },
  overview: {
    title: 'Prinzipien',
    intro:
      'KANAP ist für IT-Abteilungen konzipiert, die mit sensiblen Daten arbeiten. Wir behandeln Ihre Daten so, wie wir es uns von unseren IT-Anbietern wünschen, transparent, isoliert und bei Bedarf greifbar.',
    pillars: [
      {
        title: 'Transparent by default',
        body: 'Der komplette Quellcode liegt auf GitHub unter AGPL v3. Ihr Security-Team liest ihn, prüft ihn oder forkt ihn. Nichts versteckt sich hinter proprietären Binaries.',
      },
      {
        title: 'Isoliert by design',
        body: 'Row-Level Security auf Datenbankebene erzwingt Tenant-Isolation bei jeder Abfrage. Es gibt keinen Cross-Tenant-Shortcut zu umgehen, weil es überhaupt keinen gibt.',
      },
      {
        title: 'Immer exportierbar',
        body: 'Ihre Daten gehören Ihnen. CSV-Export auf jedem Grid, Dokumentexport nach PDF, DOCX, ODT, vollständiger Tenant-Export auf Anfrage. Keine Extraktions-Gebühr.',
      },
    ],
  },
  tenancy: {
    title: 'Tenant-Isolation',
    body:
      'KANAP ist auf Datenbankebene multi-tenant. Jede Zeile in jeder geteilten Tabelle trägt eine `tenant_id`, und PostgreSQL Row-Level-Security-Policies erzwingen den Filter bei jedem Lese- und Schreibzugriff. Die Policy ist Teil des Schemas, nicht der Anwendung, eine bösartige Abfrage kann sie nicht umgehen.',
    bullets: [
      'PostgreSQL-RLS-Policies auf jeder geteilten Tabelle',
      '`tenant_id`-Filter auf Datenbankebene erzwungen, nicht nur in der App',
      'Verbindungspools pro Tenant mit Session-Variablen, die den aktuellen Tenant setzen',
      'Batch-Operationen mit `tenant_id = ANY($1)`, kein N+1-Leck',
      'Multi-Tenant-Regressionstests bei jedem CI-Lauf',
    ],
  },
  dataProtection: {
    title: 'Datenschutz',
    body:
      'Standardpraktiken, konsequent angewandt. Verschlüsselung in Transit und im Ruhezustand, gehashte Passwörter, Minimierung sensibler Daten.',
    bullets: [
      'TLS überall, kein Klartext zwischen Komponenten',
      'Argon2-Passwort-Hashing mit Salts pro Nutzer',
      'Secrets über Environment, nicht im Code',
      'Cloud-Deployments mit verschlüsselten persistenten Volumes',
      'API-Keys (Plaid BYOK, MCP-Tokens) im Ruhezustand verschlüsselt',
      'Keine Klartext-Zugangsdaten in Logs; strukturierte Logs mit Redaktionsregeln',
    ],
  },
  access: {
    title: 'Zugriffskontrolle',
    body:
      'Feinkörnige Berechtigungen pro Modul, pro Rolle. Jedes Feature-Gate und jede Entity-Abfrage respektiert dieselbe RBAC-Matrix, auch Plaid und MCP.',
    bullets: [
      'Reader-/Manager-/Admin-Stufen pro Modul',
      'Workspace-Admin-Rolle getrennt von Modul-Admins',
      'SSO über Microsoft Entra ID (OIDC) in Cloud und Self-Hosting',
      'Lokale Passwort-Authentifizierung mit Argon2 + optionale Passwort-Reset-Flows',
      'Plaid und MCP erzwingen dasselbe RBAC wie das UI, keine Privilegienerweiterung',
      'API-Tokens pro Nutzer gebunden, jederzeit widerrufbar',
    ],
  },
  audit: {
    title: 'Audit-Trail',
    body:
      'Jede relevante Änderung wird protokolliert. Wer hat was geändert, wann, mit vollständigen Vorher-/Nachher-Snapshots. Aktivität in der App sichtbar und per Export abfragbar.',
    bullets: [
      'Zeitleiste pro Entity (Aufgaben, Projekte, Dokumente usw.)',
      'Nutzeraktionen mit Zeitstempeln und IP-Metadaten geloggt',
      'Login- und Admin-Aktionen in einem separaten Audit-Feed',
      'CSV-Export für die SIEM-Ingestion',
      'Immutable Append-only-Struktur, Zeilen werden hinzugefügt, nie umgeschrieben',
    ],
  },
  deployment: {
    title: 'Deployment & Betrieb',
    body:
      'Cloud-Deployments laufen auf gehärteten Linux-Hosts innerhalb der EU. Self-Hosted-Deployments laufen dort, wo Sie wollen. Beide haben dasselbe Sicherheitsmodell.',
    bullets: [
      'Ausschließlich EU-Infrastruktur für Cloud-Kunden (OVH, Frankreich)',
      'Regelmäßige Updates von Abhängigkeiten und Container-Images',
      'Self-Hosting-Tarballs oder Container-Images, deterministisch, auditierbar',
      'Standard-Logs auf stdout zur Integration in Ihren Observability-Stack',
      'Backups: Standard-pg_dump, verschlüsselt über Ihre eigene Pipeline',
    ],
  },
  disclosure: {
    title: 'Responsible Disclosure',
    body:
      'Wenn Sie ein Sicherheitsproblem finden, wollen wir davon erfahren. Schreiben Sie uns zuerst, geben Sie uns ein angemessenes Zeitfenster zur Behebung, und wir nennen Sie im Advisory, es sei denn, Sie bleiben lieber anonym.',
    emailLabel: 'security@kanap.net',
    email: 'security@kanap.net',
  },
  cta: {
    title: 'Fragen zur Sicherheit?',
    body: 'Wir teilen gerne Architektur-Details, besprechen ein Threat Model oder verbinden Ihr Security-Team mit unserem.',
    primary: 'Sprechen Sie mit uns',
    secondary: 'Selbst hosten und den Code prüfen',
  },
};

export default content;
