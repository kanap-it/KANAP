# Plaid-Einstellungen

Verwenden Sie die Plaid-Einstellungsseite, um zu konfigurieren, wie sich der Chat-Assistent für Ihren Mandanten verhält: mit welchem AI-Anbieter er kommuniziert, welche Funktionen aktiviert sind, wie lange Konversationen aufbewahrt werden und welche Schlüssel externe MCP-Clients mit Ihren Daten verbinden können. Die Seite bietet Administratoren auch eine Nutzungsübersicht, damit Sie Verkehr und Kosten im Auge behalten können.

## Wo Sie es finden

- Arbeitsbereich: **Administration**
- Pfad: **Administration → Plaid**
- Route: `/admin/ai`
- Berechtigung: `ai_settings:admin`
- Feature-Flag: erfordert, dass die Oberfläche `ai_settings` aktiviert ist. Wenn die Oberfläche deaktiviert ist, zeigt die Seite einen Hinweis an („AI-Einstellungen sind für diese Instanz deaktiviert") und es sind keine Steuerelemente verfügbar.

## Anbieter

Im Anbieter-Bereich wählen Sie aus, welches Large Language Model Plaid verwenden soll.

### Anbieterquelle

Wenn der integrierte Anbieter auf Ihrer Instanz angeboten wird, können Sie wählen zwischen:

- **Plaid AI - Built-in**: Der gehostete Plaid-AI-Dienst von KANAP. Bequem, mit einem monatlichen Nachrichtenkontingent pro Mandant.
- **Eigener Anbieter**: Verwenden Sie Ihren eigenen API-Schlüssel für **Anthropic**, **OpenAI**, **Ollama** oder einen **benutzerdefinierten** OpenAI-kompatiblen Endpunkt. Kein Kontingent über das hinaus, was Ihr Anbieter durchsetzt.

Wenn die integrierte Option nicht angeboten wird (typisch für On-Prem-Bereitstellungen), wird nur die benutzerdefinierte Anbieterkonfiguration angezeigt.

### Integrierte Nutzung

Wenn Sie den integrierten Anbieter auswählen, erscheint eine Nutzungskarte mit:

- Einem Fortschrittsbalken der in diesem Monat verwendeten Nachrichten gegenüber dem Limit pro Mandant
- Dem Reset-Datum für das Kontingent
- Einer kurzen Erinnerung, dass der Wechsel zu Ihren eigenen Schlüsseln das Limit aufhebt

### Konfiguration des benutzerdefinierten Anbieters

Wählen Sie **Eigener Anbieter** aus, um Folgendes anzuzeigen:

- **Anbieter** – Anthropic, OpenAI, Ollama oder Custom (OpenAI-kompatibel)
- **Modell** – die genaue Modellkennung (z. B. `claude-sonnet-4-20250514`, `gpt-4o`, `llama3`)
- **Endpunkt-URL** – nur für Ollama- und Custom-Anbieter. Für Ollama, das auf dem Host läuft, während KANAP in Docker läuft, verwenden Sie `http://host.docker.internal:<port>/v1`.
- **API-Schlüssel** – erforderlich, wenn der Anbieter einen benötigt. Vorhandene Schlüssel sind maskiert; lassen Sie das Feld leer, um den gespeicherten Wert während eines Speicher- oder Testvorgangs beizubehalten.

Sobald alles eingerichtet ist, klicken Sie auf **Verbindung testen**, um einen kostenlosen Ping gegen den Anbieter auszuführen. Das Ergebnis wird in einem Banner mit dem Anbieter, dem Modell und der Round-Trip-Latenz angezeigt.

### Status-Chips

Der Header der Anbieter-Karte zeigt drei Indikatoren auf einen Blick:

- **Chat aktiviert / deaktiviert** – der Hauptschalter für den Chat des Endbenutzers
- **MCP aktiviert / deaktiviert** – ob externe MCP-Clients eine Verbindung herstellen können
- **Anbieter bereit / unvollständig** – ob die Anbieterkonfiguration gültig ist

Validierungsfehler (fehlender API-Schlüssel, falsche Endpunktform, unbekanntes Modell) erscheinen in einer gelben Warnung über dem Formular, sodass Sie genau wissen, was zu beheben ist.

## Funktionen

Der Funktionsbereich schaltet die optionalen Oberflächen von Plaid um:

- **Chat aktivieren** – schaltet den In-App-Chat-Arbeitsbereich für Endbenutzer ein oder aus
- **MCP aktivieren** – schaltet die MCP-API für externe Clients ein oder aus
- **Websuche** – ermöglicht es dem Plaid-Chat-Assistenten, das Web zu durchsuchen (erfordert, dass der `BRAVE_SEARCH_API_KEY` auf Instanzebene konfiguriert ist; andernfalls ist der Schalter deaktiviert und mit einem Tooltip versehen). Das Aktivieren des Schalters führt automatisch einen Konnektivitätstest durch. Diese Einstellung gilt nur für den Chat-Assistenten – KI-Agenten haben ihre eigene, unabhängige Websuche-Einstellung auf der Registerkarte **Einstellungen** jedes Agenten im Arbeitsbereich KI-Agenten, die auf derselben Websuche-Konfiguration auf Instanzebene beruht.

## Aufbewahrung

Der Aufbewahrungsbereich begrenzt, wie lange Plaid Benutzerinhalte aufbewahrt:

- **Konversationsaufbewahrung (Tage)** – Konversationen und ihre Nachrichten, die älter als dieser Wert sind, sind für die Löschung durch den Bereinigungsjob qualifiziert. Lassen Sie das Feld leer, um sie unbegrenzt aufzubewahren.

## MCP-API-Schlüssel

Im Bereich MCP (Model Context Protocol) können Sie langlebige API-Schlüssel ausstellen, damit externe Assistenten und IDEs mit KANAP unter Verwendung derselben Daten kommunizieren können, die Plaid sieht.

Die Karte zeigt:

- Eine Schaltfläche **Schlüssel erstellen**
- **Maximale Lebensdauer des Schlüssels (Tage)** – die maximale Lebensdauer, mit der ein neuer Schlüssel ausgestellt werden kann. Lassen Sie das Feld leer, wenn es kein Ablauflimit gibt.
- Eine Tabelle vorhandener Schlüssel mit **Bezeichnung**, **Präfix**, **Erstellt**, **Läuft ab**, **Zuletzt verwendet** und **Status** (Aktiv oder Widerrufen)

### Einen Schlüssel erstellen

1. Klicken Sie auf **Schlüssel erstellen**.
2. Geben Sie eine beschreibende **Bezeichnung** ein (zum Beispiel „Desktop-MCP-Client").
3. Klicken Sie auf **Erstellen**. KANAP generiert ein einmaliges Geheimnis.
4. Kopieren Sie das Geheimnis sofort – es wird nur einmal angezeigt und kann später nicht abgerufen werden.

### Einen Schlüssel widerrufen

Klicken Sie auf das Papierkorbsymbol in einer aktiven Zeile, um den Schlüssel zu widerrufen. Widerrufene Schlüssel bleiben aus Audit-Gründen in der Tabelle, können sich aber nicht mehr authentifizieren.

## Nutzungsübersicht

Am Ende der Seite zeigt die Karte **Nutzungsübersicht** mandantenweite Chat-Metriken an:

- **Alle Konversationen** – Gesamtzahl der jemals erstellten Konversationen
- **Aktive Konversationen (7 Tage / 30 Tage)** – Konversationen, die in den letzten 7 oder 30 Tagen aktualisiert wurden
- **Aktive Benutzer (30 Tage)** – eindeutige Benutzer, die in den letzten 30 Tagen gechattet haben

Eine Tabelle **Token-Nutzung** schlüsselt die Zeitfenster **aktueller Monat** und **letzte 30 Tage** nach Eingabe-Token, Ausgabe-Token, Gesamt-Token und Nachrichtenanzahl auf. Token-Summen werden aus Chat-Nachrichten aggregiert (MCP-Verkehr ist nicht enthalten).

## Tipps

- **Vor dem Speichern testen**: Die Schaltfläche **Verbindung testen** validiert die Anmeldedaten, ohne etwas zu schreiben. Verwenden Sie sie, bevor Sie den Chat für Endbenutzer aktivieren.
- **MCP-Schlüssel rotieren**: Bevorzugen Sie kurzlebige Schlüssel für gemeinsam genutzte Arbeitsplätze. Das Feld **Maximale Lebensdauer des Schlüssels** begrenzt, wie lange ein neuer Schlüssel ausgestellt werden kann, unabhängig von der Anfrage.
- **Behalten Sie den Token-Balken im Auge**: Eine Nutzung von über 1 Mio. Token pro Monat auf einem einzelnen Mandanten bedeutet typischerweise, dass einige sehr lange Konversationen das Budget aufzehren – ermutigen Sie Benutzer, pro Thema neue Threads zu starten.
- **Aufbewahrung festlegen**: Konversationen für immer aufzubewahren ist bequem, bis die Datenbank groß wird oder eine Compliance-Prüfung fragt, wie lange Chat-Inhalte aufbewahrt werden. Ein üblicher Ausgangspunkt sind 90 oder 180 Tage.
