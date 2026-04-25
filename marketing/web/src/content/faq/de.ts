import type { FaqContent } from './types';

const content: FaqContent = {
  meta: {
    title: 'FAQ',
    description:
      'Häufige Fragen zu KANAP: Preise, Lizenz, Self-Hosting, Cloud-Pläne, Plaid, Support und Abrechnung.',
  },
  header: {
    eyebrow: 'FAQ',
    title: 'Häufige Fragen.',
    lead:
      'Alles, was Sie über KANAP wissen müssen, Lizenz, Preise, Hosting und Plaid. Wenn Sie Ihre Antwort nicht finden, schreiben Sie uns.',
  },
  groups: [
    {
      label: 'Lizenz & Open Source',
      items: [
        {
          q: 'Unter welcher Lizenz steht KANAP?',
          a: 'KANAP steht unter der <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener" target="_blank">AGPL v3</a>, einer weithin anerkannten Open-Source-Lizenz, die von der OSI genehmigt ist. Sie können die Software frei nutzen, ändern und weitergeben. Die Copyleft-Klausel der AGPL stellt sicher, dass jeder, der eine modifizierte Version als Service betreibt, seine Änderungen teilen muss. Das schützt die Community und hält KANAP wirklich offen.',
        },
        {
          q: 'Darf ich KANAP kommerziell nutzen?',
          a: 'Ja. Interne Nutzung, kommerzielle Nutzung, externes SaaS, alles erlaubt. Die Copyleft-Regelung verpflichtet Sie nur dann zum Teilen Ihrer Änderungen, wenn Sie eine modifizierte Version als Netzwerk-Service betreiben. Rein interne Nutzung löst keine Verpflichtung aus.',
        },
        {
          q: 'Kann ich zu KANAP beitragen?',
          a: 'Ja, gerne. Der vollständige Quellcode liegt auf <a href="https://github.com/kanap-it/kanap" rel="noopener" target="_blank">GitHub</a>. Issues, Pull Requests und Diskussionen sind willkommen. Siehe CONTRIBUTING.md für die Richtlinien.',
        },
      ],
    },
    {
      label: 'Cloud & Testversion',
      items: [
        {
          q: 'Wie funktioniert die kostenlose Testversion?',
          a: 'Jeder kostenpflichtige Cloud-Plan beginnt mit einem 14-tägigen kostenlosen Test. Keine Kreditkarte erforderlich. Voller Zugriff auf alle Funktionen, plus eine kostenlose 60-minütige Aktivierungssitzung pro Unternehmen, wenn sie während der Testphase gebucht wird.',
        },
        {
          q: 'Was passiert nach meiner Testphase?',
          a: 'Nach Ihrem 14-tägigen Test müssen Sie einen kostenpflichtigen Plan wählen, um fortzufahren. Ihr Tenant bleibt weitere 30 Tage mit eingeschränktem Zugriff verfügbar. Nach Ablauf dieser 30 Tage wird Ihr Tenant gelöscht.',
        },
        {
          q: 'Was ist die kostenlose Aktivierungssitzung?',
          a: 'Jeder Test enthält eine kostenlose 60-minütige Aktivierungssitzung pro Unternehmen. Nach der Buchung schreiben wir Ihnen per E-Mail, um den Call zu vereinbaren. Die Sitzung ist ein Videocall, der sich auf die ersten Werte-Meilensteine entlang Ihrer Hauptziele konzentriert.',
        },
        {
          q: 'Was ist der Unterschied zwischen Cloud und Self-Hosting?',
          a: 'Cloud-Hosting heißt, wir betreiben alles für Sie, Updates, Backups, Infrastruktur. Self-Hosting heißt, Sie betreiben KANAP auf eigenen Servern. Kostenpflichtige Cloud-Pläne (Starter, Standard, Max) enthalten Cloud-Hosting; der kostenlose Tarif ist nur Self-Hosting. Für selbstgehostete Installationen können Sie Self-Hosted Support hinzubuchen.',
        },
      ],
    },
    {
      label: 'Self-Hosting & Support',
      items: [
        {
          q: 'Was ist Self-Hosted Support?',
          a: 'Self-Hosted Support ist ein professionelles Support-Add-on für selbstgehostete Installationen. Es enthält prioritären E-Mail-Support, Installations- und Upgrade-Troubleshooting sowie 20 % Rabatt auf Beratungsleistungen. Preis: 2.490 €/Jahr.',
        },
        {
          q: 'Wie funktioniert der prioritäre Support?',
          a: 'Für zahlende Abonnenten: Schreiben Sie uns eine E-Mail bei operativen Problemen. Wir streben eine Reaktion innerhalb von 24 Stunden an und lösen Ihr Problem. Best-Effort, kein SLA, aber echte Menschen, die jede Nachricht lesen und beantworten.',
        },
      ],
    },
    {
      label: 'Abrechnung',
      items: [
        {
          q: 'Kann ich per Rechnung zahlen?',
          a: 'Rechnungszahlung (Überweisung) ist für Abonnements über 1.000 € verfügbar, nur für EUR-Kunden. Heute heißt das: Standard jährlich, Max jährlich und Self-Hosted Support. Abonnements bis einschließlich 1.000 € werden per Karte bezahlt. Rechnungen sind NET30.',
        },
        {
          q: 'Kann ich upgraden oder downgraden?',
          a: 'Ja. Wechseln Sie jederzeit zwischen Starter, Standard und Max aus den Workspace-Einstellungen. Bei einem Upgrade mitten im Zyklus wird die anteilige Differenz berechnet. Ein Downgrade greift am Ende Ihrer Abrechnungsperiode.',
        },
        {
          q: 'Kann ich mein Abonnement kündigen?',
          a: 'Selbstverständlich. Kündigen Sie jederzeit im Billing Center, Ihr Abonnement bleibt bis zum Ende der aktuellen Abrechnungsperiode aktiv, keine Nachfragen.',
        },
      ],
    },
    {
      label: 'Plaid (KI-Assistent)',
      items: [
        {
          q: 'Was ist der Unterschied zwischen den inkludierten Plaid-Nachrichten und Bring Your Own Key?',
          a: 'Jeder Cloud-Plan enthält eine großzügige Zahl an Plaid-Nachrichten, betrieben mit einem Mid-Range-Modell, das wir sorgfältig ausgewählt und mit KANAP getestet haben. Für noch leistungsfähigere Antworten können Sie über Bring Your Own Key State-of-the-Art-Modelle von OpenAI, Anthropic oder jedem kompatiblen Anbieter anbinden. BYOK gibt Ihnen zudem die volle Kontrolle über die Datenverarbeitung, und entfernt jede Nachrichten-Grenze.',
        },
        {
          q: 'Wie kann ich Plaid steuern?',
          a: 'Auf Plattformebene kann Plaid vollständig deaktiviert, im Lesemodus oder im Lese-Schreib-Modus (mit Vorschau und Bestätigung für alle Änderungen) aktiviert werden. Websuche und MCP lassen sich separat aktivieren oder deaktivieren. Auf Benutzerebene steuern Sie über rollenbasierte Berechtigungen, wer welche Plaid-Funktion nutzt. RBAC wird immer durchgesetzt, Plaid sieht nie mehr, als der Nutzer sehen darf.',
        },
      ],
    },
  ],
  cta: {
    title: 'Noch Fragen?',
    body: 'Schreiben Sie uns, wir lesen jede Nachricht.',
    primary: 'Kontakt aufnehmen',
    secondary: 'Testversion starten',
  },
};

export default content;
