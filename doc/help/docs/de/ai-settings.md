# Plaid-Einstellungen

Der Anbieter, den Sie auf dieser Seite konfigurieren, ist das Standard-KI-Modell für Ihren gesamten Mandanten – es treibt sowohl den interaktiven [Plaid-Chat-Assistenten](ai-assistant.md) als auch die automatisierten [KI-Agenten](agents-overview.md) an, die Tickets sichten. Dies ist also keine reine Chat-Seite: Die Wahl eines Anbieters, das Aktivieren der multimodalen Unterstützung oder das Erreichen eines Monatslimits wirkt sich auf die Agenten genauso aus wie auf das Chat-Feld. Die Seite steuert außerdem, welche KI-Oberflächen aktiviert sind, wie lange Gespräche aufbewahrt werden und welche Schlüssel externen MCP-Clients Zugriff auf Ihre Daten gewähren. Zudem bietet sie Administratoren eine mandantenweite Nutzungsübersicht, um Datenverkehr und Kosten im Blick zu behalten.

## Wo Sie es finden

- Arbeitsbereich: **Administration**
- Pfad: **Administration → Plaid**
- Route: `/admin/ai`
- Berechtigung: `ai_settings:admin`
- Feature-Flag: erfordert, dass die Oberfläche für die KI-Einstellungen aktiviert ist. Wenn sie deaktiviert ist, zeigt die Seite einen Hinweis an („KI-Einstellungen sind für diese Instanz deaktiviert") und es sind keine Steuerelemente verfügbar.

---

## Anbieter

Im Bereich **Anbieter** wählen Sie aus, welches Large Language Model Ihr Mandant verwendet. Das hier festgelegte Modell ist dasjenige, mit dem der Plaid-Chat-Assistent kommuniziert *und* das jeder KI-Agent verwendet, um Tickets zu lesen, Arbeit zu planen und Antworten zu entwerfen – es gibt keine separate Modelleinstellung für Agenten.

### Anbieterquelle

Wenn der integrierte Anbieter auf Ihrer Instanz angeboten wird, können Sie wählen zwischen:

- **Plaid AI - Built-in** – KANAPs gehosteter Dienst, mit einem monatlichen Nachrichtenkontingent, das pro Mandant erfasst wird.
- **Your own provider** – bringen Sie Ihren eigenen API-Schlüssel für **Anthropic**, **OpenAI**, **Ollama** oder einen **Custom**-Endpunkt (OpenAI-kompatibel) mit. Kein Kontingent über das hinaus, was Ihr eigener Anbieter durchsetzt.

Wenn die integrierte Option nicht angeboten wird (typisch für On-Prem-Bereitstellungen), wird nur die benutzerdefinierte Anbieterkonfiguration angezeigt.

### Integrierte Nutzung

Wenn Sie den integrierten Anbieter auswählen, erscheint eine Karte **Built-in usage** mit:

- Einem Fortschrittsbalken der in diesem Monat verwendeten Nachrichten im Vergleich zum Limit pro Mandant
- Dem **Reset**-Datum für das Kontingent
- Einem Hinweis, dass der Wechsel zu Ihren eigenen Schlüsseln die Obergrenze aufhebt

Das integrierte Kontingent wird für diesen Mandanten gemeinsam von Chat- und MCP-Anfragen genutzt, und eine „Nachricht" wird genauso gezählt wie in der [Nutzungsübersicht](#nutzungsubersicht) weiter unten – eine Chat-Frage *oder* ein von einem Agenten geprüftes Ticket. Mit anderen Worten: Die Agentenaktivität schöpft aus demselben monatlichen Kontingent wie der Chat, sodass eine ausgelastete Agentenflotte es schneller verbraucht.

### Konfiguration des benutzerdefinierten Anbieters

Wählen Sie **Your own provider** aus, um Folgendes anzuzeigen:

- **Anbieter** – Anthropic, OpenAI, Ollama oder Custom (OpenAI-kompatibel). Belassen Sie es auf **Keine**, um die Einstellung zu löschen.
- **Modell** – die genaue Modellkennung (zum Beispiel `claude-sonnet-4-20250514`, `gpt-4o` oder `llama3`).
- **Endpunkt-URL** – wird nur für Ollama- und Custom-Anbieter angezeigt. Wenn Ollama auf dem Host läuft, während KANAP in Docker läuft, verwenden Sie `http://host.docker.internal:<port>/v1` anstelle von `localhost`.
- **API-Schlüssel** – erforderlich, wenn der Anbieter einen benötigt. Vorhandene Schlüssel sind maskiert; lassen Sie das Feld leer, um den gespeicherten Wert bei einem Speicher- oder Testvorgang beizubehalten. Wenn der Geheimspeicher auf der Instanz nicht konfiguriert ist, wird dies im Feld angezeigt.

Sobald alles eingerichtet ist, klicken Sie auf **Verbindung testen**, um einen kostenlosen Ping gegen den Anbieter auszuführen. Das Ergebnis erscheint in einem Banner mit Anbieter, Modell und Round-Trip-Latenz.

### Multimodales LLM

Der Schalter **Multimodales LLM** steuert, ob das Modell Bilder betrachten darf. Wenn er aktiviert ist, können sowohl der Chat-Assistent als auch die KI-Agenten angehängte Bilder lesen – am nützlichsten die **Ticket-Screenshots**, die Anfragende in ein Ticket einfügen und die die Agenten anschließend als Nachweis beim Entwerfen einer Antwort verwenden. Aktivieren Sie ihn nur, wenn Ihr konfiguriertes Modell tatsächlich Bildverarbeitung (Vision) unterstützt; deaktivieren Sie ihn, wenn das Modell nur Text unterstützt, andernfalls schlagen Bildanfragen fehl. Bei neuen Mandanten ist er standardmäßig aktiviert.

### Status-Chips

Der Header der Anbieter-Karte zeigt drei Indikatoren auf einen Blick:

- **Chat aktiviert / Chat deaktiviert** – der Hauptschalter für den Endbenutzer-Chat
- **MCP aktiviert / MCP deaktiviert** – ob externe MCP-Clients eine Verbindung herstellen können
- **Anbieter bereit / Anbieter unvollständig** – ob die Anbieterkonfiguration gültig und nutzbar ist

Validierungsfehler (fehlender API-Schlüssel, falsche Endpunktform, unbekanntes Modell) erscheinen in einer Warnung über dem Formular unter **Aktuelle Validierungsfehler des Anbieters**, sodass Sie genau wissen, was zu beheben ist.

---

## Funktionen

Der Bereich **Funktionen** schaltet die optionalen KI-Oberflächen um:

- **Chat aktivieren** – schaltet den In-App-Chat-Arbeitsbereich für Endbenutzer ein oder aus.
- **MCP aktivieren** – schaltet die MCP-API für externe Clients ein oder aus.
- **Websuche** – ermöglicht es dem Plaid-Chat-Assistenten, das Web zu durchsuchen. Dafür muss der Websuche-Schlüssel auf Instanzebene konfiguriert sein; ohne ihn ist der Schalter deaktiviert und ein Tooltip erklärt den Grund. Beim Aktivieren wird automatisch ein Konnektivitätstest ausgeführt und das Ergebnis gemeldet. Dieser Schalter gilt **nur für den Chat-Assistenten** – KI-Agenten haben ihre eigene, unabhängige Websuche-Einstellung auf der [Registerkarte Einstellungen](agents-workspace.md) jedes Agenten, die auf derselben Konfiguration auf Instanzebene beruht.

---

## Aufbewahrung

- **Aufbewahrung von Gesprächen (Tage)** – Chat-Gespräche und ihre Nachrichten, die älter als dieser Wert sind, kommen für die automatische Bereinigung infrage. Lassen Sie das Feld leer, um sie unbegrenzt aufzubewahren.

---

## MCP API-Schlüssel

Der Bereich **MCP API-Schlüssel** stellt langlebige Schlüssel aus, damit externe Assistenten und IDEs über das Model Context Protocol mit KANAP kommunizieren können – unter Verwendung derselben Daten, die Plaid sieht.

Die Karte zeigt eine Schaltfläche **Schlüssel erstellen**, die Obergrenze **Max. Lebensdauer des Schlüssels (Tage)** und eine Tabelle vorhandener Schlüssel mit **Bezeichnung**, **Präfix**, **Erstellt**, **Läuft ab**, **Zuletzt verwendet** und **Status** (**Aktiv** oder **Widerrufen**).

### Einen Schlüssel erstellen

1. Klicken Sie auf **Schlüssel erstellen**.
2. Geben Sie eine beschreibende **Bezeichnung** ein (zum Beispiel „Desktop-MCP-Client").
3. Klicken Sie auf **Erstellen**. KANAP generiert ein einmaliges Geheimnis.
4. Kopieren Sie das Geheimnis sofort – es wird nur einmal angezeigt und kann später nicht mehr abgerufen werden.

Das Feld **Max. Lebensdauer des Schlüssels (Tage)** begrenzt, wie lange ein neu ausgestellter Schlüssel gültig sein kann, unabhängig davon, was die Anfrage verlangt. Lassen Sie es leer, wenn es keine Ablaufbegrenzung geben soll.

### Einen Schlüssel widerrufen

Klicken Sie auf das Papierkorbsymbol in einer aktiven Zeile, um den Schlüssel zu widerrufen. Widerrufene Schlüssel bleiben zu Audit-Zwecken in der Tabelle, können sich aber nicht mehr authentifizieren.

---

## Nutzungsübersicht

Am Ende der Seite fasst die Karte **Nutzungsübersicht** die KI-Aktivität für die gesamte Organisation zusammen. Wie die Karte erläutert, ist eine **Nachricht** eine an Plaid gesendete Frage *oder* ein von einem Agenten geprüftes Ticket – dieselbe Einheit, die das enthaltene Monatsvolumen zählt.

Die obere Reihe der Metrikkarten deckt Chat-Gespräche ab:

- **Alle Gespräche** – Gesamtzahl der jemals erstellten Gespräche
- **Aktive Gespräche (7T)** und **Aktive Gespräche (30T)** – Gespräche, die in den letzten 7 oder 30 Tagen aktualisiert wurden
- **Aktive Benutzer (30T)** – eindeutige Benutzer, die in den letzten 30 Tagen gechattet haben

Darunter schlüsselt die Tabelle **Token-Verbrauch** zwei Zeitfenster – **Aktueller Monat** und **Letzte 30 Tage** – nach **Eingabe-Tokens**, **Ausgabe-Tokens**, **Tokens gesamt** und **Benutzernachrichten** (den in jedem Zeitfenster gestellten Chat-Fragen) auf.

Wenn ein Agent Arbeit geleistet hat, erscheint darunter ein Block **Agenten-Nachrichten (diesen Monat)**. **Alle Agenten** zeigt die kombinierte Anzahl der in diesem Monat flottenweit geprüften Tickets, und je eine Karte pro Agent zeigt dessen eigene Anzahl; die Bildunterschrift jeder Karte gibt den Wert der **Letzte 30 Tage** im selben Umfang an. Dies ist das mandantenweite Gegenstück zu den agentenspezifischen Zahlen im [Agent-Arbeitsbereich](agents-workspace.md) – nutzen Sie es, um zu sehen, welche Agenten die meiste Arbeit leisten, und um das Agentenvolumen gegen Ihr Anbieterbudget zu prüfen.

Die Token-Summen fassen die Modelleingabe und -ausgabe für jedes Zeitfenster zusammen; das Agentenvolumen wird separat als Nachrichtenanzahl im Block **Agenten-Nachrichten** erfasst und hier nicht in eine eigene Token-Zeile aufgeschlüsselt.

---

## Tipps

- **Wählen Sie das Modell mit Blick auf die Agenten.** Da die Agenten diesen Anbieter gemeinsam nutzen, spart ein günstigeres, reines Textmodell zwar Geld beim Chat, hindert Ihre Triage-Agenten aber daran, Screenshots zu lesen – entscheiden Sie mit beiden Aufgaben im Blick und kombinieren Sie ein bildfähiges Modell mit dem Schalter **Multimodales LLM**, wenn die Agenten bildlastige Tickets bearbeiten sollen.
- **Testen Sie, bevor Sie den Chat aktivieren.** Die Schaltfläche **Verbindung testen** überprüft die Anmeldedaten, ohne etwas zu schreiben oder Kontingent zu verbrauchen. Führen Sie ihn aus, bevor Sie den Chat für Endbenutzer aktivieren oder einen Agenten starten.
- **Rotieren Sie MCP-Schlüssel.** Bevorzugen Sie kurzlebige Schlüssel für gemeinsam genutzte Arbeitsplätze und verwenden Sie **Max. Lebensdauer des Schlüssels (Tage)**, um eine Obergrenze durchzusetzen, die keine Anfrage überschreiten kann.
- **Behalten Sie Token-Summen und Agentenzahlen gemeinsam im Auge.** Ein einzelner Monat mit sehr hohen Summen lässt sich meist auf einige wenige lange Gespräche oder eine hohe Agentenauslastung zurückführen – der Block **Agenten-Nachrichten** verrät Ihnen, was zutrifft, sodass Sie zu neuen Chat-Threads pro Thema anregen oder den Prüfrhythmus eines Agenten überdenken können.
- **Legen Sie ein Aufbewahrungsfenster fest.** Gespräche für immer aufzubewahren ist bequem, bis die Datenbank groß wird oder eine Compliance-Prüfung fragt, wie lange Chat-Inhalte aufbewahrt werden – 90 oder 180 Tage sind ein üblicher Ausgangspunkt.
- **GLPI wird an anderer Stelle konfiguriert.** Die Ticketing-Verbindung, mit der Ihre Agenten arbeiten, wird unter **Administration → Integrationen** konfiguriert, nicht hier – siehe [Integrationen](integrations.md).
