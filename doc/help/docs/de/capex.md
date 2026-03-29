# CAPEX

CAPEX-Positionen (Capital Expenditure / Investitionsausgaben) sind Ihre Investitionen in langfristige Vermögenswerte: Hardwarekäufe, Softwarelizenzen mit mehrjährigem Wert, Infrastrukturprojekte und Ausrüstung. Hier planen Sie Investitionsbudgets, verfolgen Projektausgaben und ordnen Kosten Ihrer Organisation zu.

Der CAPEX-Arbeitsbereich unterstützt Sie bei der Verwaltung jeder Investitionsposition von der ersten Budgetierung über die Durchführung bis zur Berichterstattung -- alles an einem Ort mit jahresbezogenen Budgetspalten, flexiblen Zuordnungsmethoden und direkten Verknüpfungen zu Projekten, Verträgen und Kontakten.

## Erste Schritte

Navigieren Sie zu **Budgetverwaltung > CAPEX**, um Ihre Liste zu sehen. Klicken Sie auf **Neu**, um Ihre erste Position zu erstellen.

**Pflichtfelder**:

- **Beschreibung**: Was Sie investieren (z. B. „Neue Server-Infrastruktur", „ERP-Softwarelizenz")
- **Anlagentyp**: Sachanlagen-Klassifizierung -- Hardware oder Software
- **Investitionsart**: Zweck der Investition (siehe Optionen unten)
- **Priorität**: Geschäftliche Prioritätsstufe (siehe Optionen unten)
- **Währung**: ISO-Code (z. B. USD, EUR). Standardmäßig Ihre Arbeitsbereich-CAPEX-Währung; kann pro Position überschrieben werden
- **Gültig ab**: Wann diese Investition beginnt (TT/MM/JJJJ)
- **Zahlendes Unternehmen**: Welches Unternehmen die Investition tätigt (erforderlich für die Buchhaltung)

**Dringend empfohlen**:

- **Konto**: Das Sachkonto für diese Investitionsausgabe. Es erscheinen nur Konten aus dem Kontenplan des zahlenden Unternehmens
- **Lieferant**: Der Anbieter oder Lieferant für diese Investition. Auswahl aus Ihren Stammdaten-Lieferanten

**Optional aber nützlich**:

- **Gültig bis**: Wann die Nutzungsdauer dieses Vermögenswerts endet oder das Projekt abgeschlossen ist (leer lassen für laufende Vermögenswerte)
- **Notizen**: Freitext-Notizen zur Investition

Nach dem Speichern werden alle Tabs freigeschaltet: **Übersicht**, **Budget**, **Zuordnungen**, **Aufgaben** und **Verknüpfungen**.

**Tipp**: Sie können Positionen schnell erstellen und Budgets und Zuordnungen später ergänzen. Beginnen Sie mit dem Wesentlichen und verfeinern Sie iterativ.

---

## Investitionsarten

CAPEX-Positionen müssen nach Investitionsart klassifiziert werden. Dies hilft bei der Analyse von Investitionsmustern:

- **Ersatz**: Ersetzen bestehender Vermögenswerte, die veraltet sind oder das Lebensende erreicht haben
- **Kapazität**: Kapazitätserweiterung zur Unterstützung von Geschäftswachstum oder erhöhter Nachfrage
- **Produktivität**: Verbesserung der Effizienz oder Senkung der Betriebskosten
- **Sicherheit**: Stärkung der Sicherheitsposition, Compliance oder Risikominderung
- **Konformität**: Erfüllung regulatorischer oder Compliance-Anforderungen
- **Geschäftswachstum**: Ermöglichung neuer Produkte, Märkte oder Geschäftsfähigkeiten
- **Sonstige**: Investitionen, die nicht in die obigen Kategorien passen

**Prioritätsstufen**:

- **Obligatorisch**: Muss umgesetzt werden (regulatorisch, kritische Infrastruktur, Sicherheit)
- **Hoch**: Starker Business Case, hoher ROI oder strategische Bedeutung
- **Mittel**: Wertvoll, kann aber bei Bedarf aufgeschoben werden
- **Niedrig**: Nice-to-have, kann verschoben werden

---

## Mit der CAPEX-Liste arbeiten

Die CAPEX-Liste (unter **Budgetverwaltung > CAPEX**) ist Ihre Hauptansicht zum Durchsuchen, Filtern und Navigieren von Investitionspositionen.

### Standardspalten

| Spalte | Was sie zeigt |
|--------|---------------|
| **Beschreibung** | Name der Investition |
| **Unternehmen** | Zahlendes Unternehmen |
| **Anlagentyp** | Hardware oder Software |
| **Investitionsart** | Zweck der Investition |
| **Priorität** | Geschäftliche Prioritätsstufe |
| **J Zuordnung** | Zuordnungsmethoden-Bezeichnung des aktuellen Jahres |
| **J Budget** | Geplantes Investitionsbudget des aktuellen Jahres (Berichtswährung) |
| **J Endwert** | Tatsächliche Investitionsausgaben des aktuellen Jahres (Berichtswährung) |
| **J+1 Budget** | Geplantes Investitionsbudget des nächsten Jahres (Berichtswährung) |

### Zusätzliche Spalten

Diese Spalten sind standardmäßig ausgeblendet. Zeigen Sie sie über die Spaltenauswahl an (Hamburger-Menü im Grid-Header):

| Spalte | Was sie zeigt |
|--------|---------------|
| **J+1 Zuordnung** | Zuordnungsmethoden-Bezeichnung des nächsten Jahres |
| **J-1 Endwert** | Tatsächliche Investitionsausgaben des Vorjahres |
| **Währung** | Währungscode der Position |
| **Start** | Gültig-ab-Datum |
| **Ende** | Gültig-bis-Datum |
| **Notizen** | Freitext-Notizen |
| **Aufgabe** | Titel der neuesten mit dieser Position verknüpften Aufgabe |
| **Aktiviert** | Status (aktiviert oder deaktiviert) |

### Schnellsuche

Das Suchfeld oben durchsucht Beschreibung, Notizen, Anlagentyp, Investitionsart, Priorität, Währung und Status. Ergebnisse aktualisieren sich in Echtzeit während der Eingabe.

### Spaltenfilter

Jede filterbare Spaltenüberschrift hat ein Filtersymbol. **Unternehmen**, **Anlagentyp**, **Investitionsart**, **Priorität** und **Währung** verwenden Kontrollkästchen-Set-Filter mit **Alle**, **Keine** und einer Löschen-Schaltfläche. Mehrere Filter werden mit UND-Logik kombiniert.

### Sortierung

Klicken Sie auf eine Spaltenüberschrift, um aufsteigend oder absteigend zu sortieren. Die Liste merkt sich Ihre letzte Sortierung bei der Rückkehr.

### Summenzeile

Die angeheftete Zeile unten zeigt Summen für alle Budgetspalten. Summen berücksichtigen Ihre aktuellen Filter und Suche. Alle Beträge werden in Ihre Berichtswährung umgerechnet, die im Seitentitel angezeigt wird (z. B. „CAPEX (EUR)").

### Deep Linking

Klicken Sie auf eine beliebige Zelle in einer Zeile, um den Arbeitsbereich auf dem für diese Spalte relevantesten Tab zu öffnen:

- **Beschreibung**, **Unternehmen**, **Anlagentyp**, **Investitionsart**, **Priorität**: Öffnet die **Übersicht**
- **J Budget**, **J Endwert**: Öffnet den **Budget**-Tab für das aktuelle Jahr
- **J-1 Endwert**: Öffnet den **Budget**-Tab für das Vorjahr
- **J+1 Budget**: Öffnet den **Budget**-Tab für das nächste Jahr
- **J Zuordnung**: Öffnet den **Zuordnungen**-Tab für das aktuelle Jahr
- **J+1 Zuordnung**: Öffnet den **Zuordnungen**-Tab für das nächste Jahr
- **Aufgabe**: Öffnet den **Aufgaben**-Tab

### Statusfilter

Verwenden Sie den Umschalter **Anzeigen: Aktiviert / Deaktiviert / Alle** über dem Grid, um den Lebenszyklusbereich zu steuern (Standard ist **Aktiviert**). Wählen Sie **Deaktiviert**, um archivierte Investitionen zu überprüfen, oder **Alle**, um beide Zustände einzuschließen. Summen aktualisieren sich sofort.

### Suchkontext-Erhaltung

Ihr Listenkontext -- Sortierreihenfolge, Suchtext und aktive Filter -- wird beibehalten, wenn Sie eine Position öffnen, und wiederhergestellt, wenn Sie zur Liste zurückkehren. Sie können also mehrere Positionen nacheinander aufrufen, ohne Ihren Platz zu verlieren.

### Zurück/Weiter-Navigation

Wenn Sie eine Position öffnen, zeigt der Arbeitsbereich die Schaltflächen **Zurück** und **Weiter**. Diese navigieren durch die Liste in der aktuellen Sortierreihenfolge unter Berücksichtigung von Filtern und Suche. Der Zähler (z. B. „Position 3 von 47") zeigt Ihre Position in der gefilterten Liste.

**Tipp**: Verwenden Sie Spaltenfilter und Schnellsuche, um fokussierte Ansichten zu erstellen (z. B. „Alle Hardware-Investitionen mit hoher Priorität"), und navigieren Sie dann mit **Zurück**/**Weiter** von Position zu Position, um Budgets zu überprüfen.

---

## Der CAPEX-Arbeitsbereich

Klicken Sie auf eine beliebige Zeile in der Liste, um den Arbeitsbereich zu öffnen. Er hat fünf Tabs, die jeweils auf einen bestimmten Aspekt der Investitionsposition fokussiert sind.

### Übersicht

Dieser Tab zeigt alle allgemeinen Informationen zur CAPEX-Position.

**Was Sie bearbeiten können**:

- **Beschreibung**: Was Sie investieren (mehrzeiliger Text)
- **Zahlendes Unternehmen**: Autovervollständigung aus Ihren Unternehmen
- **Konto**: Gefiltert nach dem Kontenplan des zahlenden Unternehmens
- **Lieferant**: Autovervollständigung aus Ihren Stammdaten-Lieferanten
- **Anlagentyp**: Hardware oder Software
- **Investitionsart**: Ersatz, Kapazität, Produktivität, Sicherheit, Konformität, Geschäftswachstum oder Sonstige
- **Priorität**: Obligatorisch, Hoch, Mittel oder Niedrig
- **Währung**: Standard ist die Arbeitsbereich-CAPEX-Währung; zeigt nur zugelassene Währungen
- **Gültig ab** und **Gültig bis**: Datumsfelder im Format TT/MM/JJJJ
- **Notizen**: Freitext-Notizen

**Status und Lebenszyklus**:

- Verwenden Sie den **Aktiviert**-Umschalter oder setzen Sie ein **Deaktivierungsdatum**, um zu steuern, wann die Position in Berichten und Auswahllisten erscheint
- Deaktivierte Positionen werden aus Berichten für Jahre ausgeschlossen, die strikt nach dem Deaktivierungsdatum liegen
- Historische Daten bleiben erhalten; Sie sehen deaktivierte Positionen weiterhin in Berichten, die Jahre abdecken, in denen sie aktiv waren

**Speichern und Zurücksetzen**:

- Änderungen werden **nicht** automatisch gespeichert
- Klicken Sie auf **Speichern**, um Ihre Bearbeitungen zu sichern, oder **Zurücksetzen**, um sie zu verwerfen
- Wenn Sie mit nicht gespeicherten Änderungen navigieren, werden Sie aufgefordert, zu speichern oder zu verwerfen

**Tipp**: Wenn Sie eine Warnung „Veraltetes Konto" sehen, bedeutet dies, dass das ausgewählte Konto nicht zum Kontenplan des zahlenden Unternehmens gehört. Wählen Sie ein anderes Konto, um die Warnung zu beheben.

---

### Budget

Der Budget-Tab ist der Ort, an dem Sie Finanzdaten pro Jahr eingeben. Er unterstützt mehrere Budgetspalten und zwei Eingabemodi: **Pauschal** (Jahressumme) und **Manuell pro Monat** (12-Monats-Aufschlüsselung).

**Jahrauswahl**:

- Verwenden Sie die Jahrreiter oben, um zwischen J-2, J-1, J (aktuelles Jahr), J+1 und J+2 zu wechseln
- Jedes Jahr hat seine eigene Version, Zuordnungsmethode und Beträge
- Jahreswechsel mit nicht gespeicherten Änderungen löst einen Speichern/Verwerfen-Dialog aus

**Budgetspalten** (alle Jahre):

- **Budget**: Geplantes Investitionsbudget
- **Revision**: Halbjahres-Budgetaktualisierung (z. B. nach Umfangsänderungen oder Neuprognosen)
- **Prognose**: Erwartete tatsächliche Ausgaben (Ihre beste Schätzung im Jahresverlauf)
- **Endwert**: Tatsächliche Investitionsausgaben nach dem Jahresabschluss

**Pauschal vs. Manuell pro Monat**:

- **Pauschal**: Geben Sie eine Summe pro Spalte ein; Beträge werden gleichmäßig auf 12 Monate verteilt
- **Manuell pro Monat**: Geben Sie Beträge pro Monat (Jan bis Dez) für granulare Projektverfolgung ein
- Wechseln Sie zwischen den Modi mit den Optionsfeldern oben im Tab
- Beim Moduswechsel berechnet das System Monatswerte aus der Pauschalsumme (Gleichverteilung) oder summiert Monatswerte zurück zu einer Pauschalsumme

**Einfrierverhalten**:

- Wenn das Budget eines Jahres eingefroren ist (über Budget-Administration), sind die Eingaben deaktiviert und zeigen ein „Eingefroren"-Label
- Sie können eingefrorene Daten weiterhin einsehen; Administratoren können über **Budgetverwaltung > Administration > Einfrieren/Freigeben** entsperren

**Löschen und umverteilen** (nur im Modus Manuell pro Monat):

- Klicken Sie auf das Löschsymbol neben einem Monat, um diesen auf Null zu setzen und seinen Wert auf andere nicht gesperrte Monate umzuverteilen
- Nützlich zum Entfernen von Platzhaltermonaten oder zum Anpassen von Projektzeitplänen
- Gesperrte Monate (in dieser Sitzung zuvor gelöscht) sind von der Umverteilung ausgeschlossen

**Notizfeld**:

- Jede Jahresbudget-Version hat ein **Notizen**-Feld für jahresspezifische Kommentare (z. B. „Auf Q2 verschoben wegen Lieferantenverzögerungen")

**Vorgehensweise**:

1. Wählen Sie das Jahr, für das Sie planen
2. Wählen Sie den Modus Pauschal oder Manuell pro Monat
3. Füllen Sie die relevanten Spalten aus (Budget für die Erstplanung, Prognose für die Nachverfolgung, Endwert für Ist-Werte)
4. Klicken Sie auf **Speichern**, um Ihre Änderungen zu sichern

**Tipp**: Für die meisten Positionen ist der Pauschalmodus schneller. Verwenden Sie den Modus Manuell pro Monat, wenn Sie die zeitliche Verteilung der Projektausgaben oder phasenweise Einführungen verfolgen müssen.

---

### Zuordnungen

Der Zuordnungen-Tab verteilt die Investitionsausgaben auf Ihre Unternehmen und Abteilungen. Dies steuert Leistungsverrechnungsberichte und hilft bei der Zuordnung von Vermögenskosten.

**Jahrauswahl**:

- Funktioniert wie beim Budget: verwenden Sie Jahrreiter zum Wechseln zwischen J-2, J-1, J, J+1, J+2
- Jedes Jahr kann eine andere Zuordnungsmethode haben

**Zuordnungsmethoden**:

1. **Mitarbeiterzahl (Standard)**: Teilt Investitionsausgaben proportional nach der Mitarbeiterzahl jedes Unternehmens für das ausgewählte Jahr. Erfordert, dass alle aktiven Unternehmen eine Mitarbeiterzahl > 0 haben. Prozentsätze aktualisieren sich automatisch, wenn Sie Unternehmenskennzahlen bearbeiten.

2. **IT-Benutzer**: Teilt Ausgaben proportional nach der IT-Benutzerzahl jedes Unternehmens für das ausgewählte Jahr. Nützlich für IT-Infrastrukturinvestitionen, die mit dem IT-Personal skalieren.

3. **Umsatz**: Teilt Ausgaben proportional nach dem Umsatz jedes Unternehmens für das ausgewählte Jahr. Nützlich für unternehmensweite Plattformen oder Infrastruktur.

4. **Manuell nach Unternehmen**: Sie wählen aus, welche Unternehmen diese Investition erhalten. Wählen Sie einen Treiber (Mitarbeiterzahl, IT-Benutzer oder Umsatz), um die Prozentsätze unter den ausgewählten Unternehmen zu berechnen. Nur die ausgewählten Unternehmen sind in der Aufteilung enthalten. Das System füllt bei der ersten Verwendung automatisch alle aktivierten Unternehmen vor; entfernen Sie Unternehmen, die nicht von dieser Investition profitieren.

5. **Manuell nach Abteilung**: Sie wählen bestimmte Unternehmen/Abteilungs-Paare aus. Prozentsätze werden aus der Mitarbeiterzahl jeder Abteilung berechnet. Nützlich, wenn eine Investition nur bestimmten Abteilungen zugutekommt (z. B. Fertigungsausrüstung).

**Wie Prozentsätze funktionieren**:

- Für **automatische Methoden** (Mitarbeiterzahl, IT-Benutzer, Umsatz): Prozentsätze werden bei jedem Laden der Seite aus den aktuellen Unternehmenskennzahlen berechnet. Sie bearbeiten sie nicht direkt.
- Für **manuelle Methoden**: Sie wählen die Unternehmen oder Abteilungen aus, und das System berechnet Prozentsätze basierend auf Ihrem gewählten Treiber und den aktuellen Kennzahlen.
- Prozentsätze spiegeln Live-Daten wider. Wenn Sie die Mitarbeiterzahl eines Unternehmens aktualisieren, werden die Zuordnungen sofort neu berechnet.

**Zuordnungen anzeigen**:

- Das Grid zeigt: Unternehmen, Abteilung (falls zutreffend), Prozentsatz
- Der Gesamtprozentsatz sollte 100 % ergeben; Warnungen erscheinen, wenn Kennzahlen fehlen oder die Summe Null ergibt

**Vorgehensweise**:

1. Wählen Sie das Jahr
2. Wählen Sie eine Zuordnungsmethode aus dem Dropdown
3. Bei manueller Methode wählen Sie die Unternehmen oder Abteilungen aus (entfernen Sie alle, die nicht von dieser Investition profitieren)
4. Klicken Sie auf **Speichern**, um Methode und Auswahl zu sichern

**Häufige Probleme**:

- **Fehler „Fehlende Kennzahlen"**: Ein oder mehrere Unternehmen haben für das ausgewählte Jahr keine oder eine Mitarbeiterzahl/IT-Benutzer/Umsatz von Null. Füllen Sie die Kennzahlen unter **Stammdaten > Unternehmen** (Details-Tab) aus.
- **„Summe ist nicht 100 %"**: Meist durch fehlende Kennzahlen verursacht. Korrigieren Sie die Unternehmensdaten und laden Sie die Zuordnungen neu.

**Tipp**: Verwenden Sie Mitarbeiterzahl für die meisten Positionen (es ist am einfachsten und aktualisiert sich automatisch). Reservieren Sie Manuell nach Unternehmen für Investitionen, die nur bestimmten Einheiten zugutekommen (z. B. regionales Rechenzentrum). Verwenden Sie Manuell nach Abteilung für sehr gezielte Investitionen.

---

### Aufgaben

Der Aufgaben-Tab hilft Ihnen, Aufgaben und Nachverfolgungen im Zusammenhang mit dieser CAPEX-Position zu verfolgen (z. B. „Lieferantenauswahl bis Q2", „Installation bis Juni abschließen", „Vorstandsgenehmigung einholen").

**Aufgabenliste**:

- Zeigt alle mit dieser CAPEX-Position verknüpften Aufgaben
- Spalten: Titel, Status, Priorität, Fälligkeitsdatum, Aktionen
- Klicken Sie auf einen Aufgabentitel, um den vollständigen Aufgaben-Arbeitsbereich zu öffnen
- Standardfilter zeigt aktive Aufgaben (blendet erledigte und abgebrochene aus)

**Filtern**:

- Klicken Sie auf das Filtersymbol, um Filtersteuerungen ein-/auszublenden
- **Statusfilter**: Alle, Aktiv (blendet erledigte/abgebrochene aus) oder ein bestimmter Status
- Klicken Sie auf die Löschen-Schaltfläche, um Filter zurückzusetzen

**Aufgabe erstellen**:

- Klicken Sie auf **Aufgabe hinzufügen**, um den Aufgaben-Erstellungsarbeitsbereich zu öffnen
- Die Aufgabe wird automatisch mit dieser CAPEX-Position verknüpft
- Füllen Sie im Aufgaben-Arbeitsbereich Titel, Beschreibung, Priorität, Beauftragten und Fälligkeitsdatum aus

**Aufgabe löschen**:

- Klicken Sie auf das Löschsymbol in der Aktionen-Spalte
- Bestätigen Sie die Löschung im Dialog

**Hinweise**:

- Aufgaben sind eigenständige Objekte mit eigenen Berechtigungen (`tasks:member` zum Erstellen/Bearbeiten)
- CAPEX-Manager-Zugriff gewährt nicht automatisch Aufgabenbearbeitungsrechte; prüfen Sie mit Ihrem Admin, wenn Sie keine Aufgaben erstellen können
- Aufgaben können auch unter **Portfolio > Aufgaben** angezeigt und verwaltet werden, wo alle Aufgaben Ihrer gesamten Organisation dargestellt werden
- Der neueste Aufgabentitel wird auch in der **Aufgabe**-Spalte der Listenansicht angezeigt (standardmäßig ausgeblendet)

**Tipp**: Verwenden Sie Aufgaben, um Handlungspunkte während der Investitionsplanung oder Genehmigungszyklen festzuhalten. Setzen Sie Fälligkeitsdaten, um Beschaffungsmeilensteine und Implementierungsfristen zu verfolgen.

---

### Verknüpfungen

Der Verknüpfungen-Tab verbindet diese CAPEX-Position mit verwandten Objekten: Projekten, Verträgen, Kontakten, relevanten Websites und Anhängen.

**Projekte**:

- Verwenden Sie die Autovervollständigung, um ein oder mehrere Projekte zu verknüpfen
- Dies hilft, Investitionsausgaben nach Projekt in Berichten zu gruppieren und ermöglicht Projektbuchhaltung
- Entfernen Sie ein Projekt durch Klicken auf das X an seinem Chip, dann speichern

**Verträge**:

- Verwenden Sie die Autovervollständigung, um einen oder mehrere Verträge zu verknüpfen
- Bei Verknüpfung erscheint der Vertragsname zur schnellen Referenz
- Verträge können auch mit mehreren CAPEX-Positionen verknüpft werden (n:m-Beziehung)
- Entfernen Sie Verträge durch Klicken auf das X am Chip, dann speichern

**Kontakte**:

- Verknüpfen Sie Kontakte mit dieser CAPEX-Position mit einer Rolle: **Kommerziell**, **Technisch**, **Support** oder **Sonstige**
- Klicken Sie auf **Hinzufügen**, um einen Kontakt aus Ihren Stammdaten auszuwählen und eine Rolle zuzuweisen
- Vom Lieferanten übernommene Kontakte werden mit einem ausgefüllten Chip angezeigt; manuell hinzugefügte Kontakte zeigen einen umrandeten Chip
- Klicken Sie auf eine Kontaktzeile, um den Kontakt-Arbeitsbereich zu öffnen
- Entfernen Sie einen Kontakt durch Klicken auf das Löschsymbol in der Aktionen-Spalte

**Relevante Websites**:

- Fügen Sie URLs hinzu, die sich auf diese Investition beziehen (z. B. Lieferanten-Produktseiten, technische Dokumentation, interne Wikis)
- Jeder Link hat ein optionales **Beschreibung**-Feld für Kontext
- Klicken Sie auf **URL hinzufügen**, um weitere Links hinzuzufügen
- Links werden gespeichert, wenn Sie auf **Speichern** oben im Arbeitsbereich klicken

**Anhänge**:

- Laden Sie Dateien hoch, die sich auf diese Investitionsposition beziehen (z. B. Angebote, Lieferantenvorschläge, technische Spezifikationen, Genehmigungsvermerke)
- Ziehen Sie Dateien per Drag-and-Drop in den Anhangbereich oder klicken Sie auf **Dateien auswählen**
- Alle Dateien werden sicher gespeichert und können durch Klicken auf den Dateinamen heruntergeladen werden
- Löschen Sie Anhänge durch Klicken auf das X am Datei-Chip (erfordert `capex:manager`-Berechtigung)
- Anhänge werden sofort beim Hochladen gespeichert (kein Klick auf Speichern nötig)

**Warum verknüpfen?**:

- **Projekte**: Investitionsausgaben nach Projekt für Projektbuchhaltung und Berichte zusammenführen
- **Verträge**: Nachverfolgen, welche Investitionspositionen durch Kaufverträge oder Serviceverträge abgedeckt sind
- **Kontakte**: Lieferanten- und Stakeholder-Kontaktdetails mit der Investition verknüpfen
- **Websites & Anhänge**: Alle investitionsbezogenen Dokumentationen und Referenzen an einem Ort zentralisieren

**Tipp**: Laden Sie Lieferantenangebote, Genehmigungsvermerke und technische Spezifikationen als Anhänge hoch. Verknüpfen Sie Verträge für die Beschaffungsverfolgung. Verwenden Sie Kontakte, um Lieferantenvertreter jeder Investitionsposition zuzuordnen.

---

## CSV-Import/Export

Sie können CAPEX-Positionen per CSV massenimportieren, um die Ersteinrichtung zu beschleunigen oder mit externen Systemen zu synchronisieren.

**Export**:

1. Klicken Sie in der CAPEX-Liste auf **CSV exportieren**
2. Wählen Sie:
   - **Vorlage**: Nur Kopfzeilen (verwenden Sie dies, um eine leere CSV zum Ausfüllen zu erstellen)
   - **Daten**: Alle aktuellen CAPEX-Positionen mit Budgets für J-1, J und J+1

**CSV-Struktur**:

- Trennzeichen: Semikolon `;` (kein Komma)
- Kodierung: UTF-8 (in Excel als „CSV UTF-8" speichern)
- Kopfzeilen: `description;ppe_type;investment_type;priority;currency;effective_start;effective_end;status;disabled_at;notes;company_name;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Import**:

1. Klicken Sie in der CAPEX-Liste auf **CSV importieren**
2. Laden Sie Ihre CSV-Datei hoch (Drag-and-Drop oder Dateiauswahl)
3. Klicken Sie auf **Vorprüfung** zur Validierung:
   - Kopfzeilen stimmen exakt überein
   - Unternehmen existieren in Ihrem Arbeitsbereich
   - Pflichtfelder (description, ppe_type, investment_type, priority, currency, effective_start, company_name) sind vorhanden
   - Keine doppelten Beschreibungen
4. Überprüfen Sie den Vorprüfungsbericht (zeigt Zählungen und bis zu 5 Beispielfehler)
5. Wenn OK, klicken Sie auf **Laden** zum Importieren

**Wichtige Hinweise**:

- **Eindeutiger Schlüssel**: CAPEX-Positionen werden über `description` identifiziert. Existiert eine Beschreibung bereits, wird sie **übersprungen** (keine Aktualisierungen).
- **Nur Neuanlage**: Der Importer erstellt nur neue Positionen; er aktualisiert keine bestehenden. Verwenden Sie die Benutzeroberfläche zum Bearbeiten bestehender Positionen.
- **Referenzen**: `company_name` muss einem Unternehmen namentlich entsprechen (Groß-/Kleinschreibung wird ignoriert).
- **Anlagentyp**: Muss `hardware` oder `software` sein (Groß-/Kleinschreibung wird ignoriert).
- **Investitionsart**: Muss eine von: `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` sein (Groß-/Kleinschreibung wird ignoriert).
- **Priorität**: Muss `mandatory`, `high`, `medium` oder `low` sein (Groß-/Kleinschreibung wird ignoriert).
- **Budgets**: Budgetspalten füllen J-1, J und J+1 Versionen. Beträge werden gleichmäßig auf 12 Monate verteilt (Pauschalmodus).

**Häufige Fehler**:

- **„Unternehmen nicht gefunden"**: Erstellen Sie das Unternehmen zuerst unter **Stammdaten > Unternehmen**, dann importieren Sie erneut.
- **„Ungültiger ppe_type"**: Verwenden Sie exakt `hardware` oder `software`.
- **„Ungültiger investment_type"**: Verwenden Sie eine der 7 gültigen Investitionsarten (siehe Liste oben).
- **„Ungültige Priorität"**: Verwenden Sie `mandatory`, `high`, `medium` oder `low`.
- **„Ungültige Währung"**: Verwenden Sie 3-stellige ISO-Codes (USD, EUR, GBP), die in Ihren Arbeitsbereich-Währungseinstellungen zugelassen sind.
- **„Kopfzeilen stimmen nicht überein"**: Laden Sie eine frische Vorlage herunter; Kopfzeilen müssen exakt übereinstimmen (einschließlich Reihenfolge).

**Tipp**: Beginnen Sie mit dem Vorlagenexport, füllen Sie einige Zeilen aus und führen Sie eine Vorprüfung durch, um Probleme frühzeitig zu erkennen. Beheben Sie Fehler in der CSV und laden Sie sie erneut hoch, bis die Vorprüfung besteht, dann laden Sie.

---

## Status und Lebenszyklus

Jede CAPEX-Position hat einen **Status** (Aktiviert oder Deaktiviert) und ein optionales **Deaktivierungsdatum**, das steuert, wann sie in Berichten und Auswahllisten erscheint.

**Funktionsweise**:

- **Aktiviert**: Die Position ist aktiv und erscheint überall (Listen, Berichte, Zuordnungen)
- **Deaktivierungsdatum**: Wenn gesetzt, wird die Position am Ende dieses Tages deaktiviert
- Nach dem Deaktivierungsdatum:
  - Die Position erscheint nicht mehr in Auswahllisten für neue Verträge oder Zuordnungen
  - Sie wird aus Berichten für Jahre ausgeschlossen, die strikt nach dem Deaktivierungsdatum liegen
  - Historische Daten bleiben erhalten; die Position erscheint weiterhin in Berichten, die Jahre abdecken, in denen sie aktiv war

**Status setzen**:

- Im **Übersichts**-Tab verwenden Sie den **Aktiviert**-Umschalter oder setzen ein **Deaktivierungsdatum**
- Sie können ein zukünftiges Deaktivierungsdatum planen (nützlich für geplante Anlagenveräußerungen oder End-of-Life-Termine)

**Deaktivierte Positionen anzeigen**:

- Standardmäßig zeigt die CAPEX-Liste nur **aktivierte** Positionen
- Verwenden Sie den Umschalter **Anzeigen: Aktiviert / Deaktiviert / Alle**, um den Bereich zu ändern

**Wann deaktivieren vs. löschen**:

- **Bevorzugen Sie das Deaktivieren**: Bewahrt die Historie, stellt konsistente Berichte sicher und unterstützt Audit-Trails
- **Nur löschen, wenn**: Die Position versehentlich erstellt wurde und keine Budgets, Zuordnungen oder Aufgaben hat
- Das Löschen ist geschützt: Sie können keine Position löschen, die Budgetdaten, Zuordnungen, Aufgaben hat oder von Verträgen referenziert wird

**Tipp**: Verwenden Sie das Deaktivierungsdatum, um vollständig abgeschriebene, veräußerte Vermögenswerte oder abgeschlossene Projekte zu kennzeichnen. Löschen Sie nur bei echten Fehlern.

---

## Berechtigungen

Der CAPEX-Zugriff wird durch drei Stufen gesteuert:

- `capex:reader` -- CAPEX-Liste anzeigen, Positionen öffnen, Budgets und Zuordnungen einsehen (schreibgeschützt)
- `capex:manager` -- CAPEX-Positionen erstellen und bearbeiten, Budgets und Zuordnungen aktualisieren, Anhänge hochladen, Verknüpfungen und Kontakte verwalten
- `capex:admin` -- Alle Manager-Rechte plus CSV-Import, Budget-Operationen (Einfrieren, Kopieren, Zurücksetzen) und Massenlöschung

Zusätzlich:

- Aufgaben haben separate Berechtigungen (`tasks:member` zum Erstellen/Bearbeiten von Aufgaben an CAPEX-Positionen)
- Benutzer mit `tasks:reader` können Aufgaben anzeigen, aber nicht erstellen oder bearbeiten

Wenn Sie eine Aktion nicht ausführen können (z. B. die Schaltfläche **CSV importieren** fehlt), prüfen Sie mit Ihrem Arbeitsbereich-Administrator Ihre Rollenberechtigungen.

---

## Tipps

- **Einfach anfangen**: Erstellen Sie Positionen nur mit dem Wesentlichen (Beschreibung, Anlagentyp, Investitionsart, Unternehmen), dann ergänzen Sie Budgets und Zuordnungen bei der Planung.
- **Mitarbeiterzahl-Zuordnung verwenden**: Für die meisten Investitionen reicht Mitarbeiterzahl aus. Reservieren Sie manuelle Zuordnungen für Investitionen, die nur bestimmten Unternehmen oder Abteilungen zugutekommen.
- **Verträge verknüpfen**: Wenn Sie Investitionen über Verträge verwalten, verknüpfen Sie sie im Verknüpfungen-Tab für die Beschaffungsverfolgung.
- **Dokumentation hochladen**: Verwenden Sie die Anhangfunktion, um Lieferantenangebote, Genehmigungsvermerke und technische Spezifikationen neben der Position zu speichern.
- **Genau klassifizieren**: Verwenden Sie Investitionsart und Priorität konsistent, um aussagekräftige Analysen und Priorisierung der Investitionsausgaben zu ermöglichen.
- **Unternehmenskennzahlen aktuell halten**: Zuordnungen hängen von Mitarbeiterzahl, IT-Benutzern und Umsatz der Unternehmen ab. Veraltete Kennzahlen verursachen Zuordnungsfehler.
- **CSV für Masseneinrichtung verwenden**: Wenn Sie von einem anderen System migrieren oder viele Investitionspositionen haben, beginnen Sie mit dem CSV-Import.
- **Deaktivieren statt löschen**: Bewahren Sie die Historie, indem Sie Positionen deaktivieren, wenn Vermögenswerte veräußert oder Projekte abgeschlossen werden.
- **Summenzeile überprüfen**: Bevor Sie Investitionsbudgets finalisieren, prüfen Sie die angeheftete Summenzeile, um sicherzustellen, dass Ihre Investitionsausgaben wie erwartet aufgehen.
- **Deep Linking nutzen**: Klicken Sie direkt auf eine Budget- oder Zuordnungsspalte in der Liste, um direkt zum entsprechenden Tab und Jahr zu springen.
- **Ausgaben zeitlich verfolgen**: Für große Projekte mit phasenweisen Ausgaben verwenden Sie den Modus Manuell pro Monat, um Ausgaben gegen Projektmeilensteine zu verfolgen.
- **Nach Jahresende einfrieren**: Verwenden Sie die Budget-Administration, um Vorjahresbudgets einzufrieren, sobald die Ist-Werte finalisiert sind, um versehentliche Bearbeitungen zu verhindern.
