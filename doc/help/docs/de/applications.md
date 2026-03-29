# Anwendungen

Anwendungen ist Ihr zentrales Verzeichnis zur Dokumentation der IT-Anwendungslandschaft. Es umfasst Geschäftsanwendungen, Produktivitätswerkzeuge, Infrastrukturdienste und alles dazwischen. Verwenden Sie es, um Verantwortlichkeit, Umgebungen, Integrationen und Compliance-Informationen über Ihr gesamtes Portfolio zu verfolgen.

## Anwendungskategorien

Jede Anwendung oder jeder Dienst gehört zu einer **Kategorie**, die ihren Hauptzweck beschreibt. Diese Klassifizierung hilft verschiedenen Stakeholdern, zu filtern und sich auf das Wesentliche zu konzentrieren.

| Kategorie | Beschreibung | Beispiele |
|----------|-------------|----------|
| **Line-of-Business** | Kern-Geschäftsanwendungen, die spezifische Geschäftsprozesse unterstützen | SAP, Salesforce, Workday, benutzerdefiniertes ERP |
| **Produktivität** | Endanwenderwerkzeuge für die tägliche Arbeit, einschließlich Dienstprogramme und Zusammenarbeit | Office 365, Acrobat Reader, Teams, Slack, Chrome |
| **Sicherheit** | Werkzeuge zum Schutz von Systemen, Daten und Zugriff | CrowdStrike, Okta, SIEM-Plattformen, Firewalls |
| **Analytik** | Berichterstellung, Business Intelligence und Data-Warehouse-Werkzeuge | Power BI, Tableau, Snowflake |
| **Entwicklung** | Werkzeuge für Entwickler und DevOps-Teams | Python, Git, Jenkins, VS Code, Docker |
| **Integration** | Plattformen, die Systeme verbinden und Daten bewegen | MuleSoft, Kafka, API-Gateways, ETL-Werkzeuge |
| **Infrastruktur** | Grundlegende Dienste, von denen andere Systeme abhängen | PostgreSQL, Redis, Kubernetes, Speichersysteme |

**Tipps zur Klassifizierung**:
- Wählen Sie basierend auf dem **Hauptzweck** der Anwendung, nicht wer sie verwaltet
- Im Zweifelsfall fragen Sie: „Wofür wird dieses Werkzeug hauptsächlich verwendet?"
- Kategorien können in **IT-Landschaft > Einstellungen** angepasst werden, um der Terminologie Ihrer Organisation zu entsprechen

### Filterung nach Stakeholder

Verschiedene Teams können Kategorien verwenden, um sich auf ihren Verantwortungsbereich zu konzentrieren:

| Stakeholder | Empfohlener Filter |
|-------------|-----------------|
| Cybersecurity | Kategorie Sicherheit oder hohe Kritikalität über alle Kategorien |
| Service Desk | Produktivität + Line-of-Business (benutzernahe Anwendungen) |
| Infrastruktur | Infrastruktur + Integration |
| Enterprise Architecture | Alle Kategorien |

---

## Erste Schritte

Navigieren Sie zu **IT-Landschaft > Anwendungen**, um Ihre Liste zu sehen. Klicken Sie auf **Neue App / Dienst**, um Ihren ersten Eintrag zu erstellen.

**Pflichtfelder**:
  - **Name**: Ein wiedererkennbarer Name für die Anwendung oder den Dienst
  - **Kategorie**: Der Hauptzweck dieser Anwendung (siehe Kategorien oben)

**Dringend empfohlen**:
  - **Lieferant**: Der Lieferant, der die Software bereitstellt (verknüpft mit Ihren Lieferanten-Stammdaten)
  - **Kritikalität**: Wie wichtig dies für Ihr Unternehmen ist (Geschäftskritisch, Hoch, Mittel, Niedrig)
  - **Lebenszyklus**: Aktueller Status (Aktiv, Vorgeschlagen, Veraltet, Außer Betrieb)

**Optional aber nützlich**:
  - **Herausgeber**: Der Software-Herausgeber (z. B. Microsoft, SAP, Oracle)
  - **Beschreibung**: Was diese Anwendung tut
  - **Version**: Aktuelle Versionsnummer (z. B. „4.2.1", „2023", „Q1 2024")
  - **Go-Live-Datum** / **Support-Ende** / **Außerbetriebnahmedatum**: Versionszyklus-Daten
  - **Lizenzierung**: Lizenzbedingungen und Hinweise
  - **Notizen**: Freitext-interne Notizen

Nach dem Speichern schaltet der Arbeitsbereich alle Reiter für detaillierte Dokumentation frei.

**Tipp**: Beginnen Sie mit der Dokumentation Ihrer kritischsten Anwendungen. Verwenden Sie den Reiter **Instanzen**, um zu erfassen, welche Umgebungen existieren (Prod, QA, Dev), und verknüpfen Sie dann Assets und Schnittstellen nach und nach.

---

## Arbeiten mit der Liste

Das Anwendungsraster bietet eine umfassende Ansicht Ihres Anwendungsportfolios.

**Oberer Bereichsfilter**:
  - **Meine Apps** (Standard): zeigt Apps, bei denen Sie in **Verantwortung & Zielgruppe** als **Business-Verantwortlicher** oder **IT-Verantwortlicher** gelistet sind. Mehrfach-Verantwortliche werden unterstützt.
  - **Apps meines Teams**: zeigt Apps, bei denen ein Mitglied Ihres Portfolio-Teams als Business-Verantwortlicher oder IT-Verantwortlicher gelistet ist.
  - **Alle Apps**: zeigt das vollständige Anwendungsraster.
  - Wenn Sie keinem Portfolio-Team zugeordnet sind, ist **Apps meines Teams** deaktiviert
  - Ihre Auswahl wird sitzungsübergreifend gespeichert

**Standardspalten**:
  - **Name**: Anwendungsname mit Kategorie-Badge und Suite-Mitgliedschaft
  - **Kategorie**: Der Hauptzweck der Anwendung
  - **Umgebungen**: Chips, die aktive Umgebungen zeigen (Prod, Pre-prod, QA, Test, Dev, Sandbox)
  - **Lebenszyklus**: Aktueller Status
  - **Kritikalität**: Stufe der geschäftlichen Bedeutung
  - **Herausgeber**: Software-Herausgeber
  - **Abgeleitete Benutzer (J)**: Berechnete Benutzeranzahl für das aktuelle Jahr
  - **Erstellt**: Wann der Datensatz erstellt wurde

**Filterung**:
  - Kategorie, Umgebungen, Lebenszyklus, Kritikalität, Hosting, Extern erreichbar, SSO aktiviert, MFA aktiviert, Datenklasse und Enthält PII verwenden Kontrollkästchen-Set-Filter
  - Außer Betrieb genommene Anwendungen sind standardmäßig ausgeblendet; verwenden Sie den Lebenszyklus-Filter, um sie einzuschließen

**Aktionen**:
  - **Neue App / Dienst**: Einen neuen Eintrag erstellen (erfordert Manager-Berechtigung)
  - **CSV importieren**: Massenimport aus CSV-Datei (erfordert Admin-Berechtigung)
  - **CSV exportieren**: Liste als CSV exportieren (erfordert Admin-Berechtigung)
  - **Element kopieren**: Eine ausgewählte Anwendung mit allen Verknüpfungen duplizieren (erfordert Manager-Berechtigung)
  - **Ausgewählte löschen**: Ausgewählte Anwendungen entfernen (erfordert Admin-Berechtigung)

---

## Der Anwendungs-Arbeitsbereich

Klicken Sie auf eine Zeile in der Liste, um den Arbeitsbereich zu öffnen. Er hat neun Reiter:

### Übersicht

Der Reiter Übersicht erfasst die Kernidentität Ihrer Anwendung.

**Was Sie bearbeiten können**:
  - **Name**: Der Anzeigename der Anwendung
  - **Beschreibung**: Was diese Anwendung tut
  - **Kategorie**: Der Hauptzweck der Anwendung (konfigurierbar in den IT-Landschaft-Einstellungen)
  - **Lieferant**: Verknüpfung zu einem Lieferanten aus Ihren Stammdaten
  - **Herausgeber**: Der Software-Herausgeber
  - **Kritikalität**: Geschäftskritisch, Hoch, Mittel oder Niedrig
  - **Lebenszyklus**: Aktueller Status (konfigurierbar in den IT-Landschaft-Einstellungen)
  - **Kann Unteranwendungen haben**: Aktivieren, um diese Anwendung als „Suite" zu verwenden, die andere Anwendungen gruppiert
  - **Lizenzierung**: Lizenzbedingungen und Hinweise
  - **Notizen**: Freitext-Notizen

**Versionsinformationen** (in einem separaten Abschnitt angezeigt):
  - **Version**: Aktuelle Versionskennung (Freitext, z. B. „4.2.1", „2023")
  - **Go-Live-Datum**: Wann diese Version live gegangen ist oder gehen wird
  - **Support-Ende**: Wann der Herstellersupport für diese Version endet
  - **Außerbetriebnahmedatum**: Wann diese Version tatsächlich außer Betrieb genommen wurde

**Versionshistorie**: Wenn diese Anwendung aus einer anderen Version erstellt wurde (über die Funktion **Neue Version erstellen**), erscheint oben im Reiter Übersicht eine Versions-Zeitleiste. Klicken Sie auf einen Versions-Chip, um zu dieser Version zu navigieren.

---

### Instanzen

Der Reiter Instanzen dokumentiert, wo Ihre Anwendung in verschiedenen Umgebungen läuft.

**Umgebungen** (in Reihenfolge): Production, Pre-prod, QA, Test, Dev, Sandbox

**Für jede Instanz können Sie erfassen**:
  - **Basis-URL**: Die Zugriffs-URL für diese Umgebung
  - **Region** / **Zone**: Geografische Bereitstellungsinformationen
  - **Lebenszyklus**: Instanzspezifischer Status
  - **SSO aktiviert** / **MFA unterstützt**: Authentifizierungsfähigkeiten
  - **Status**: Aktiviert oder Deaktiviert
  - **Notizen**: Umgebungsspezifische Notizen

**Massenaktionen**:
  - **Von Prod kopieren**: Schnell Instanzen für andere Umgebungen basierend auf Ihrem Produktions-Setup erstellen
  - **Massenanwendung**: Änderungen auf mehrere Umgebungen gleichzeitig anwenden

**Tipp**: Instanzänderungen werden sofort gespeichert -- kein Klick auf die Hauptspeichern-Schaltfläche erforderlich.

---

### Server

Der Reiter Server zeigt, welche Infrastruktur-Assets jede Anwendungsinstanz unterstützen.

**So funktioniert es**:
  - Wählen Sie eine Umgebung, um ihre Asset-Zuweisungen zu sehen
  - Assets mit der Schaltfläche **Server hinzufügen** hinzufügen
  - Jede Zuweisung erfasst das **Asset**, die **Rolle** (z. B. Web, Datenbank, Anwendung) und optionale **Notizen**
  - Klicken Sie auf einen Asset-Namen, um zum Asset-Arbeitsbereich zu navigieren

---

### Schnittstellen

Der Reiter Schnittstellen zeigt alle Integrationen, an denen diese Anwendung beteiligt ist -- als Quelle, Ziel oder Middleware.

**Was Sie sehen werden**:
  - Schnittstellen gruppiert nach Umgebung (Prod, Pre-prod, QA usw.)
  - Für jede Schnittstelle: **Name**, **Quellanwendung**, **Zielanwendung** und **Via Middleware**-Indikator
  - Klicken Sie auf einen Schnittstellen- oder Anwendungsnamen, um zu seinem Arbeitsbereich zu navigieren

**Tipp**: Schnittstellen werden über die Schnittstellen-Seite verwaltet. Dieser Reiter bietet eine bequeme schreibgeschützte Ansicht aller Integrationen, die diese Anwendung betreffen.

---

### Verantwortung & Zielgruppe

Der Reiter Verantwortung & Zielgruppe dokumentiert, wer verantwortlich ist und wer diese Anwendung nutzt.

**Business-Verantwortliche**: Die geschäftlichen Stakeholder, die für diese Anwendung rechenschaftspflichtig sind -- mehrere Verantwortliche hinzufügen; jeweils mit Berufsbezeichnung.

**IT-Verantwortliche**: Die IT-Teammitglieder, die für den technischen Support verantwortlich sind -- mehrere Verantwortliche hinzufügen; jeweils mit Berufsbezeichnung.

**Zielgruppe**: Welche Teile Ihrer Organisation diese Anwendung nutzen
  - Wählen Sie ein **Unternehmen** und optional eine **Abteilung**
  - Das System berechnet die Benutzeranzahl basierend auf Ihren Stammdaten-Metriken (IT-Benutzer oder Mitarbeiterzahl)

**Benutzeranzahl**: Wählen Sie zwischen:
  - **Abgeleitet**: Automatisch aus den Zielgruppenauswahlen berechnet
  - **Manuell**: Mit einer bestimmten Zahl überschreiben

---

### Technik & Support

Der Reiter Technik & Support erfasst technische Details und Supportkontakte.

**Technische Informationen**:
  - **Suites**: Übergeordnete Suites, zu denen diese Anwendung gehört
  - **Zugriffsmethoden**: Wie Benutzer auf diese Anwendung zugreifen (Mehrfachauswahl). Optionen sind in den [IT-Landschaft-Einstellungen](it-ops-settings.md#zugriffsmethoden) konfigurierbar.
  - **Extern erreichbar**: Ob die Anwendung aus dem Internet zugänglich ist
  - **Datenintegration / ETL**: Ob die Anwendung an Datenintegrations-Pipelines teilnimmt

**Supportinformationen**:
  - Supportkontakte mit ihrer **Rolle** hinzufügen (z. B. Account-Manager, Technischer Support)
  - Kontakte werden aus Ihren Kontakte-Stammdaten verknüpft
  - Jeder Kontakt zeigt **E-Mail**, **Telefon** und **Mobil**
  - **Support-Notizen**: Freitext-Notizen zu Supportvereinbarungen

---

### Verknüpfungen

Der Reiter Verknüpfungen verbindet diese Anwendung mit Ihren Finanz-, Vertrags- und Projektdaten.

**Verfügbare Verknüpfungen**:
  - **OPEX-Positionen**: Laufende Kosten, die mit dieser Anwendung verbunden sind
  - **CAPEX-Positionen**: Investitionsausgabenprojekte
  - **Verträge**: Lieferantenverträge
  - **Projekte**: Portfolio-Projekte, die mit dieser Anwendung verknüpft sind
  - **Relevante Websites**: Externe Links und Dokumentation
  - **Anhänge**: Dateien per Drag-and-Drop oder Dateiauswahl hochladen

**Wenn dies eine Suite ist**:
  - Sie sehen auch einen Abschnitt **Komponenten** mit Unteranwendungen

---

### Wissensdatenbank

Der Reiter Wissensdatenbank verbindet diese Anwendung mit der Wissensdatenbank Ihrer Organisation. Sie können bestehende Wissensdatenbank-Dokumente verknüpfen oder neue direkt aus dem Arbeitsbereich erstellen.

---

### Compliance

Der Reiter Compliance erfasst Datenschutz- und regulatorische Informationen.

**Was Sie bearbeiten können**:
  - **Datenklasse**: Sensibilitätsstufe (Öffentlich, Intern, Vertraulich, Eingeschränkt)
  - **Letzter DR-Test**: Datum des letzten Disaster-Recovery-Tests
  - **Enthält PII**: Ob die Anwendung personenbezogene Daten speichert
  - **Datenhaltung**: Länder, in denen Daten gespeichert werden (Mehrfachauswahl)

---

## Versionsverwaltung

KANAP bietet **zwei Wege zur Verwaltung von Anwendungsversionen**, je nachdem, wie Ihre Organisation Upgrades handhabt:

| Ansatz | Am besten für | Was passiert |
|----------|----------|--------------|
| **Einfach** | Die meisten Anwendungen | Versionsfelder direkt aktualisieren -- gleicher Datensatz, neue Versionsnummer |
| **Erweitert** | Große Migrationen | Einen neuen Anwendungsdatensatz mit Versionsnachverfolgung erstellen -- alte und neue Versionen parallel betreiben |

### Einfache Versionsverfolgung (In-Place-Updates)

Für die meisten Anwendungen -- bei denen Sie upgraden und die alte Version einfach verschwindet -- aktualisieren Sie einfach die Versionsfelder im Reiter **Übersicht**:
  - **Version**: Aktuelle Version eingeben
  - **Go-Live-Datum**: Wann diese Version live gegangen ist oder gehen wird
  - **Support-Ende**: Wann der Herstellersupport endet
  - **Außerbetriebnahmedatum**: Wann Sie diese Version tatsächlich außer Betrieb genommen haben

### Neue Version erstellen (Parallelmigration)

Für größere Anwendungsupgrades, bei denen Sie alte und neue Versionen parallel über verschiedene Umgebungen betreiben müssen, verwenden Sie die Funktion **Neue Version erstellen**:

1. Öffnen Sie die Anwendung, die Sie upgraden möchten
2. Speichern Sie ausstehende Änderungen
3. Klicken Sie auf **Neue Version erstellen** in der Kopfzeile
4. Durchlaufen Sie den dreistufigen Assistenten:
   - **Schritt 1 - Versionsdetails**: Neuen Anwendungsnamen, Version und Daten eingeben
   - **Schritt 2 - Kopieroptionen**: Wählen, was von der Quelle kopiert wird
   - **Schritt 3 - Schnittstellen**: Welche Schnittstellen zur neuen Version migriert werden sollen
5. Klicken Sie auf **Version erstellen**

---

## Anwendungen kopieren

### Element kopieren (aus dem Anwendungsraster)

Verwenden Sie dies, wenn Sie ein unabhängiges Duplikat einer Anwendung erstellen möchten -- typischerweise um einen ähnlichen Anwendungseintrag ohne Versionsverkettung zu erstellen.

1. Wählen Sie eine Anwendung im Raster
2. Klicken Sie auf **Element kopieren**
3. Das System erstellt eine Kopie mit „ (Kopie)" angehängt an den Namen
4. Sie werden zur neuen Anwendung navigiert, um Änderungen vorzunehmen

---

## CSV-Import/Export

Pflegen Sie Ihr Anwendungsinventar im großen Maßstab mit CSV-Import und -Export.

### Zugriff auf CSV-Funktionen

Aus der Anwendungsliste:
  - **CSV exportieren**: Anwendungen in eine CSV-Datei herunterladen
  - **CSV importieren**: Eine CSV-Datei hochladen, um Anwendungen zu erstellen oder zu aktualisieren
  - **Vorlage herunterladen**: Eine leere CSV mit korrekten Spaltenköpfen erhalten

**Erforderliche Berechtigungen**: `applications:admin` für Import-/Export-Operationen.

### Import-Workflow

1. **Datei vorbereiten**: Verwenden Sie UTF-8-Kodierung mit Semikolon (`;`) als Trennzeichen.
2. **Importeinstellungen wählen**: Modus (Anreichern/Ersetzen) und Operation (Upsert/Nur aktualisieren/Nur einfügen)
3. **Zuerst validieren**: Klicken Sie auf **Preflight** zur Validierung
4. **Änderungen anwenden**: Klicken Sie auf **Importieren**

### Abgleich und Aktualisierungen

Anwendungen werden nach **Name** (Groß-/Kleinschreibung ignorierend) abgeglichen.

### Fehlerbehebung

**Fehler „Datei ist nicht richtig formatiert"**: Stellen Sie sicher, dass Ihre CSV als **UTF-8** gespeichert ist.

---

## Tipps

  - **Beginnen Sie mit kritischen Apps**: Dokumentieren Sie zuerst Ihre geschäftskritischen Anwendungen, dann arbeiten Sie die Kritikalitätsstufen ab.
  - **Suites zum Gruppieren verwenden**: Markieren Sie eine Anwendung als Suite, um verwandte Komponenten zu gruppieren.
  - **Frühzeitig mit Ausgaben verknüpfen**: Verbinden Sie OPEX- und CAPEX-Positionen im Reiter Verknüpfungen, um das vollständige Kostenbild zu sehen.
  - **Umgebungen aktuell halten**: Der Reiter Instanzen steuert die Umgebungs-Chips in der Liste -- halten Sie ihn für genaue Sichtbarkeit aktuell.
  - **Kategorie-Filterung nutzen**: Verwenden Sie den Kategorie-Spaltenfilter, um sich auf bestimmte Anwendungstypen zu konzentrieren.
  - **Wissensdatenbank frühzeitig anhängen**: Verknüpfen Sie Runbooks und Architekturdokumente im Reiter Wissensdatenbank, damit das Team weiß, wo es bei Vorfällen nachschlagen muss.
