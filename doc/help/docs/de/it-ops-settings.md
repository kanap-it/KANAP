# IT-Landschaft-Einstellungen

Die Seite **IT-Landschaft-Einstellungen** ermöglicht es Ihnen, die Dropdown-Werte anzupassen, die in der gesamten IT-Landschaft verwendet werden. Diese Listen steuern, welche Optionen erscheinen, wenn Benutzer Anwendungen, Schnittstellen, Assets, Verbindungen und Standorte erstellen oder bearbeiten. Änderungen hier gelten für alle Benutzer in Ihrem Arbeitsbereich.

Für die Kartenlesbarkeit enthalten **Entitäten** und **Serverrollen** auch ein Feld **Graph-Ebene**, das von der rollenbasierten Platzierung der Verbindungskarte verwendet wird.

## Wo Sie es finden

- Arbeitsbereich: **IT-Landschaft**
- Pfad: **IT-Landschaft > Einstellungen**
- Berechtigungen:
  - Sie benötigen mindestens `settings:reader`, um die Seite anzuzeigen.
  - Sie benötigen `settings:admin`, um Werte zu ändern.

## Wie die Seite organisiert ist

Einstellungen sind in drei zusammenklappbare Abschnitte gruppiert:

1. **Standorte** - Listen für das Erstellen oder Bearbeiten von Standorten.
2. **Server & Verbindungen** - Listen für Server, Verbindungen und verwandte Infrastrukturdaten.
3. **Apps, Dienste & Schnittstellen** - Listen für Anwendungen, App-Instanzen, Schnittstellen und Bindungen.

### Editor-Steuerungen

Jede Liste hat eigene Steuerungen oben:

- **Element hinzufügen** - Fügt eine neue Zeile oben in die Liste ein, fokussiert und bereit zum Tippen.
- **Änderungen speichern** - Speichert Ihre Bearbeitungen auf dem Server. Aktiviert bei ungespeicherten Änderungen.
- **Zurücksetzen** - Setzt die Liste auf den letzten gespeicherten Zustand zurück (nicht Werkseinstellungen).

---

## Standorte

### Cloud-Anbieter

Cloud-Anbieter, die für Assets und Cloud-Typ-Standorte verfügbar sind (z. B. AWS, Azure, GCP).

### Hosting-Typen

Standort-Hosting-Modelle (z. B. On-prem, Colocation, Public Cloud, Private Cloud, SaaS).

Die Kategorie bestimmt, welche Felder beim Bearbeiten eines Standorts erscheinen:
- **On-prem / Colocation** zeigt Betreiberunternehmen und Rechenzentrumsfelder
- **Cloud / SaaS** zeigt Cloud-Anbieter, Region und zusätzliche Informationsfelder

---

## Server & Verbindungen

### Verbindungstypen

Ein zweistufiger Katalog von Verbindungsprotokollen, organisiert nach Kategorie, mit typischen Ports.

### Domänen

Active Directory- oder DNS-Domänen, denen Assets angehören können. Verwendet zur Berechnung des vollständig qualifizierten Domänennamens (FQDN) für jedes Asset.

### Entitäten

Quell- und Zielentitäten für Datenflüsse und Zugriffsmuster (z. B. Interne Benutzer, Internet, Partner-Netzwerke, Externe Systeme).

### Graph-Ebene-Werte

Die Graph-Ebene steuert das bevorzugte vertikale Band in der Verbindungskarte:
- **Oben**: Benutzernahe oder externe Endpunkte
- **Oberer**: Obere Anwendungs-/Dienstschicht
- **Mitte**: Neutrale/Standard-Mittelschicht
- **Unterer**: Unterstützende Infrastruktur
- **Unten**: Daten-/Speicher-intensive Endpunkte

### IP-Adresstypen

Typen von IP-Adressen, die Assets zugewiesen werden können. Standardwerte: Host, IPMI, Management, iSCSI.

### Netzwerkzonen

Netzwerkzonen zur Kategorisierung von Subnetzen und zur Beschreibung der Asset-Konnektivität.

### Subnetze

Netzwerk-Subnetze mit CIDR-Notation, optionalen VLAN-Zuweisungen und Netzwerkzonen-Klassifizierung definieren. Jedes Subnetz gehört zu einem bestimmten Standort.

### Betriebssysteme

Katalog von Betriebssystemen für Assets, einschließlich Support-Lebenszyklus-Daten.

### Serverrollen

Rollen, die Assets zugewiesen werden, wenn sie mit Anwendungsinstanzen verknüpft werden (z. B. Webserver, Datenbankserver, Worker).

### Asset-Typen

Logische Typen für Infrastruktur-Assets (z. B. Physischer Server, Virtuelle Maschine, Container, Serverless, Appliance).

---

## Apps, Dienste & Schnittstellen

### Zugriffsmethoden

Methoden, mit denen Benutzer auf Anwendungen zugreifen. Standardwerte: Web, Lokal installierte Anwendung, Mobile Anwendung, Proprietäre HMI, Terminal / CLI, VDI / Remote Desktop, Kiosk.

### Anwendungskategorien

Kategorien, die den Hauptzweck jeder Anwendung oder jedes Dienstes beschreiben. Standardwerte: Line-of-Business, Produktivität, Sicherheit, Analytik, Entwicklung, Integration, Infrastruktur.

### Datenklassen

Datenklassifizierungsstufen für Anwendungen und Schnittstellen. Gesperrte Codes: Öffentlich, Intern, Vertraulich, Eingeschränkt.

### Integrationsmuster

Integrationsmuster für Schnittstellenabschnitte (z. B. REST API, Datei-Batch, Queue, DB-Staging).

### Schnittstellen-Authentifizierungsmodi

Authentifizierungsmodi für Schnittstellenbindungen (z. B. Dienstkonto, OAuth2, API-Schlüssel, Zertifikat).

### Schnittstellen-Datenkategorien

Geschäftsdatenkategorien für Schnittstellen (z. B. Stammdaten, Transaktional, Berichterstellung, Steuerung).

### Schnittstellen-Datenformate

Nutzdatenformate für Schnittstellenabschnitte (z. B. CSV, JSON, XML, IDoc, Binär).

### Schnittstellen-Protokolle

Technische Protokolle für Schnittstellenbindungen (z. B. HTTP/REST, gRPC, SFTP, Kafka, Datenbank).

### Schnittstellen-Auslösertypen

Auslösemechanismen für Schnittstellenabschnitte (z. B. Ereignisbasiert, Geplant, Echtzeit, Manuell).

### Lebenszyklus-Status

Gemeinsame Lebenszyklus-Zustände für Anwendungen, App-Instanzen, Schnittstellen, Schnittstellenbindungen und Assets. Gesperrte Codes: Vorgeschlagen, Aktiv, Veraltet, Außer Betrieb.

---

## Wie Änderungen bestehende Daten beeinflussen

- **Bestehende Datensätze behalten ihre gespeicherten Codes** - Eine Änderung einer Bezeichnung ändert nur die Anzeige, nicht die zugrundeliegenden Daten.
- **Veraltete Werte**: Bleiben für Datensätze gültig, die sie bereits verwenden. Werden in Dropdowns beim Erstellen neuer Datensätze ausgeblendet.
- **Neue Werte** werden sofort in den relevanten Dropdowns verfügbar und serverseitig validiert.

---

## Tipps

- **Bezeichnungen an Ihre Terminologie anpassen** - Überprüfen Sie die Standards und benennen Sie Bezeichnungen um, damit sie der Sprache Ihrer Organisation entsprechen.
- **Schrittweise veralten** - Markieren Sie Werte als veraltet statt sie zu löschen, wenn Sie davon abrücken. Dies hält historische Daten intakt.
- **Datenklassen mit der Sicherheitsabteilung abstimmen** - Änderungen an Datenklassen sollten mit Ihren Informationssicherheitsrichtlinien übereinstimmen.
- **Typische Ports als Dokumentation verwenden** - Das Feld „Typische Ports" bei Verbindungstypen ist informativ. Füllen Sie es aus, damit Benutzer verstehen, welche Ports jeder Verbindungstyp üblicherweise verwendet.
- **Kartenlesbarkeit mit Ebenen optimieren** - Halten Sie die Graph-Ebenen von Entitäten und Serverrollen an Ihren Architekturschichten ausgerichtet.
