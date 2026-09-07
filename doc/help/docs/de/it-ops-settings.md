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
- Bearbeitungen werden etwa eineinhalb Sekunden nach Ihrer letzten Änderung automatisch gespeichert, sobald alle Zeilen gültig sind. Neben der Liste erscheint eine Speicheranzeige.

### Namen sind die Identität eines Werts

Sie sehen und tippen ausschließlich **Namen**. KANAP erzeugt beim ersten Speichern eines Werts einen stabilen internen Code aus dem Namen und behält ihn dauerhaft bei, sodass das Umbenennen eines Werts nie die Datensätze beschädigt, die ihn verwenden. Der Code ist für Integratoren in der API sichtbar und kann in CSV-Dateien verwendet werden; der CSV-Export schreibt jedoch Namen, und der Import akzeptiert beides.

Weil Namen die Werte identifizieren, gelten innerhalb einer Liste einige Regeln:

- jeder Wert braucht einen Namen, und zwei Werte dürfen nicht denselben Namen tragen (Groß- und Kleinschreibung spielt keine Rolle);
- ein Name darf nicht mit dem internen Code eines anderen Werts derselben Liste identisch sein;
- Namen von **Zugriffsmethoden** dürfen weder Komma noch Semikolon enthalten, da der CSV-Export sie in einer einzigen, durch Kommas getrennten Zelle auflistet.

Eine Liste, die gegen eine dieser Regeln verstößt, wird erst gespeichert, wenn Sie den Fehler behoben haben; die Zeile zeigt an, was nicht stimmt.

### Einen Wert entfernen

**Entfernen** löscht einen Wert, den nichts verwendet. Wenn noch Datensätze auf den Wert verweisen, zeigt KANAP an, wie viele (Anwendungen, Assets, Schnittstellen, Verbindungen, Standorte, Vorfälle, Subnetze…), mit einem Link zur gefilterten Liste, sofern sich eine Liste nach diesem Feld filtern lässt, und bietet stattdessen **Nicht mehr anbieten** an: Der Wert bleibt bei den Datensätzen sichtbar, die ihn bereits verwenden, und wird für neue nicht mehr vorgeschlagen. Ein verwendeter Wert wird nie entfernt, auch nicht über die API.

Integrierte Werte, die KANAP selbst verwaltet (die vier Lebenszyklus-Status, die Domänen Workgroup und N/A), können weder bearbeitet noch entfernt werden. Standard-Netzwerkzonen und -Asset-Typen können bearbeitet und zurückgezogen, aber nicht entfernt werden: Der Server würde sie wieder hinzufügen.

### Ihre Werte übersetzen

Die Werte, die Sie eingeben, werden in allen Sprachen unverändert angezeigt. Um sie in der Sprache des jeweiligen Benutzers anzuzeigen, verwenden Sie die Aktion **Übersetzen** in einer Zeile: Der Dialog zeigt den Basisnamen (und bei Klassifizierungsstufen die Beschreibung) sowie ein Feld pro Sprache. Ein leer gelassenes Feld verwendet die automatische Übersetzung, solange der Wert noch ein KANAP-Standardwert ist, andernfalls den Basistext. Das Speichern von Übersetzungen ändert den Basistext nie, und ein übersetzter Name kann in CSV-Dateien und in der API wie der Name selbst verwendet werden; deshalb darf er keinen anderen Wert der Liste duplizieren.

Editoren zeigen und bearbeiten immer den Basistext; wenn der angezeigte Name in Ihrer Sprache abweicht, weist die Zeile darauf hin („Angezeigt: …“).

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

### Klassifizierungen und Kontinuität

Dieser Editor konfiguriert die Stufen, mit denen Anwendungen klassifiziert werden. Er steht Benutzern mit `settings:admin` im Bereich **Apps, Services & Schnittstellen** zur Verfügung und öffnet sich als einzelner Dialog mit einer Liste pro Katalog:

- **Geschäftskritikalität**: die Stufen, die einer Anwendung zugewiesen werden können. Jede Stufe hat einen Namen, eine Beschreibung, die bei der Auswahl unter dem Namen angezeigt wird, eine optionale **maximal tolerierbare Ausfallzeit (MTD)** in Minuten und die Markierung **Nicht mehr anbieten**. Die Ausfallzeit dokumentiert die Stufe und löst bei einer Anwendung, deren RTO sie erreicht, einen Hinweis aus; sie ist ein Attribut der Stufe, kein Wert, der auf Anwendungen eingegeben wird.
- **Cyberkritikalität**: unabhängige Folgenstufen.
- **Datenvertraulichkeit**: der Datenklassenkatalog, mit Beschreibungen.
- **Wiederherstellungswellen**: geordnete Wiederherstellungsstufen; die Reihenfolge ist weder Schweregrad noch Zeitangabe.

**Die Reihenfolge ist die Position in der Liste.** Schweregrad-Kataloge sind von der kritischsten Stufe oben bis zur am wenigsten kritischen unten sortiert; Wiederanlaufwellen in Wiederherstellungsreihenfolge. Verschieben Sie eine Stufe mit den Pfeilen; die Position bestimmt die Sortierung der Listen, die Regel „höchste Stufe“ für Schnittstellen und Verbindungen sowie die Reihenfolge in den Auswahlmenüs. **Stufe hinzufügen** fügt unten an.

**Änderungen am Katalog ändern nie Anwendungen.** Eine Anwendung speichert den Code ihrer Stufe. Das Umbenennen einer Stufe, das Bearbeiten ihrer Beschreibung oder Ausfallzeit und das Umsortieren des Katalogs lassen jede Anwendung auf derselben Stufe und machen Reviews nicht ungültig. Eine Stufe, die noch von einer Anwendung, Schnittstelle oder Verbindung verwendet wird, kann nicht entfernt werden; markieren Sie sie stattdessen mit **Nicht mehr anbieten**: Sie bleibt bei bestehenden Datensätzen sichtbar und wird für neue nicht mehr vorgeschlagen.

Codes werden aus den Namen erzeugt und nie angezeigt; es gelten die oben beschriebenen Namensregeln.

Die Business-Stufen liefern auch die operative Kritikalität für Schnittstellen und Verbindungen. Unvollständige Ableitungen werden als unvollständig gekennzeichnet; sie werden nicht als niedrigste Stufe behandelt.

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

- **Bestehende Datensätze behalten ihren Wert** - Ein Umbenennen ändert nur die Anzeige, nicht die zugrundeliegenden Daten.
- **Veraltete Werte**: Bleiben für Datensätze gültig, die sie bereits verwenden. Werden in Dropdowns beim Erstellen neuer Datensätze ausgeblendet.
- **Neue Werte** werden sofort in den relevanten Dropdowns verfügbar und serverseitig validiert.

---

## Schnellreferenz: Welche Liste speist welches Feld?

| Liste | Verwendung |
|------|------------|
| **Zugriffsmethoden** | Anwendungen (Reiter Technik und Support → Zugriffsmethoden) |
| **Anwendungskategorien** | Anwendungen (Kategorie) |
| **Cloud-Anbieter** | Assets (Anbieter), Standorte (Cloud-Anbieter) |
| **Verbindungstypen** | Verbindungen (Verbindungstyp) |
| **Datenklassen** | Anwendungen (Compliance), Schnittstellen (Übersicht), Anwendungsliste |
| **Domänen** | Assets (Technik → Domäne, FQDN) |
| **Entitäten** | Verbindungen (Quell-/Zielentität), Verbindungsübersicht (Graph-Ebene) |
| **Hosting-Typen** | Standorte (Übersicht) |
| **Integrationsmuster** | Schnittstellenabschnitte (Muster) |
| **Schnittstellen-Authentifizierungsmodi** | Schnittstellenbindungen (Authentifizierungsmodus) |
| **Schnittstellen-Datenkategorien** | Schnittstellen (Datenkategorie) |
| **Schnittstellen-Datenformate** | Schnittstellenabschnitte (Format) |
| **Schnittstellen-Protokolle** | Schnittstellenbindungen (Protokoll) |
| **Schnittstellen-Auslösertypen** | Schnittstellenabschnitte (Auslöser) |
| **IP-Adresstypen** | Assets (Technik → IP-Adressen → Typ) |
| **Lebenszyklus-Status** | Anwendungen, App-Instanzen, Schnittstellen, Bindungen, Assets |
| **Netzwerkzonen** | Subnetze (Netzwerkzone), Assets (automatisch aus Subnetz) |
| **Betriebssysteme** | Assets (Technik) |
| **Subnetze** | Assets (Technik → IP-Adressen → Subnetzauswahl) |
| **Serverrollen** | Anwendungen → Reiter Server (Rolle beim Verknüpfen), Verbindungsübersicht (Graph-Ebene) |
| **Asset-Typen** | Assets (Übersicht → Typ) |

## Tipps

- **Namen an Ihre Terminologie anpassen** - Überprüfen Sie die Standards und benennen Sie Werte um, damit sie der Sprache Ihrer Organisation entsprechen. Datensätze behalten ihre Verknüpfung mit dem Wert; nur der Name ändert sich.
- **Schrittweise veralten** - Markieren Sie Werte als veraltet statt sie zu löschen, wenn Sie davon abrücken. Dies hält historische Daten intakt.
- **Datenklassen mit der Sicherheitsabteilung abstimmen** - Änderungen an Datenklassen sollten mit Ihren Informationssicherheitsrichtlinien übereinstimmen.
- **Typische Ports als Dokumentation verwenden** - Das Feld „Typische Ports" bei Verbindungstypen ist informativ. Füllen Sie es aus, damit Benutzer verstehen, welche Ports jeder Verbindungstyp üblicherweise verwendet.
- **Kartenlesbarkeit mit Ebenen optimieren** - Halten Sie die Graph-Ebenen von Entitäten und Serverrollen an Ihren Architekturschichten ausgerichtet.
