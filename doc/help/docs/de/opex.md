# OPEX

OPEX-Positionen (Operating Expenditure / Betriebsausgaben) sind Ihre wiederkehrenden IT-Kosten: Softwarelizenzen, Cloud-Abonnements, Wartungsverträge und Dienstleistungen. Hier planen Sie Budgets, verfolgen Ist-Werte und ordnen Kosten Ihrer Organisation zu.

Der OPEX-Arbeitsbereich unterstützt Sie bei der Verwaltung jeder Ausgabenposition von der ersten Budgetierung über die Durchführung bis zur Berichterstattung -- alles an einem Ort mit jahresbezogenen Budgetspalten, flexiblen Zuordnungsmethoden und direkten Verknüpfungen zu Lieferanten, Verträgen, Anwendungen und Projekten.

## Erste Schritte

Navigieren Sie zu **Budgetverwaltung > OPEX**, um Ihre Liste zu sehen. Klicken Sie auf **Neu**, um Ihre erste Position zu erstellen.

**Pflichtfelder**:
  - **Produktname**: Was Sie ausgeben (z. B. „Salesforce Lizenzen", „AWS Compute")
  - **Lieferant**: Wen Sie bezahlen. Verknüpft mit Ihren Stammdaten-Lieferanten
  - **Währung**: ISO-Code (z. B. USD, EUR). Standardmäßig Ihre Arbeitsbereich-Währung; kann pro Position überschrieben werden
  - **Zahlendes Unternehmen**: Welches Unternehmen den Lieferanten bezahlt (erforderlich für die Buchhaltung)
  - **Konto**: Das Sachkonto für diese Ausgabe. Es erscheinen nur Konten aus dem Kontenplan des zahlenden Unternehmens
  - **Gültig ab**: Wann diese Ausgabe beginnt (TT/MM/JJJJ)

**Optional aber nützlich**:
  - **Beschreibung**: Zusätzlicher Kontext oder Notizen zur Ausgabe
  - **Gültig bis**: Wann diese Ausgabe endet (leer lassen für laufende Positionen)
  - **IT-Verantwortlicher** / **Fachbereichsverantwortlicher**: Wer verantwortlich ist
  - **Analysekategorie**: Benutzerdefinierte Gruppierung für Berichte (z. B. „Infrastruktur", „Business Apps"). Neue Kategorien können spontan erstellt werden
  - **Notizen**: Freitext-Notizen

Nach dem Speichern werden alle Tabs freigeschaltet: **Übersicht**, **Budget**, **Zuordnungen**, **Aufgaben** und **Verknüpfungen**.

**Tipp**: Sie können Positionen schnell erstellen und Budgets und Zuordnungen später ergänzen. Beginnen Sie mit dem Wesentlichen und verfeinern Sie iterativ.

---

## Mit der OPEX-Liste arbeiten

Die OPEX-Liste (unter **Budgetverwaltung > OPEX**) ist Ihre Hauptansicht zum Durchsuchen, Filtern und Navigieren von Ausgabenpositionen.

**Standardspalten**:
  - **Produktname**: Der Positionsname (verlinkt zum Übersichts-Tab)
  - **Lieferant**: Der Lieferantenname
  - **Zahlendes Unternehmen**: Welches Unternehmen diese Position bezahlt
  - **Vertrag**: Der neueste verknüpfte Vertragsname (verlinkt zum Vertrags-Arbeitsbereich)
  - **Konto**: Die Sachkonto-Nummer und -Bezeichnung
  - **Zuordnung**: Die Zuordnungsmethoden-Bezeichnung für das aktuelle Jahr (verlinkt zum Zuordnungen-Tab)
  - **J Budget**: Budget des aktuellen Jahres (verlinkt zum Budget-Tab für dieses Jahr)
  - **J Endwert**: Endwert des aktuellen Jahres (verlinkt zum Budget-Tab für dieses Jahr)
  - **Aufgabe**: Der neueste Aufgabentitel (verlinkt zum Aufgaben-Tab)

**Zusätzliche Spalten** (standardmäßig ausgeblendet, über Spaltenauswahl umschaltbar):
  - **J-1 Budget / J-1 Endwert**: Vorjahreswerte
  - **J Revision / J Prognose**: Revision und Prognose des aktuellen Jahres
  - **J+1 Budget / J+1 Revision**: Werte des nächsten Jahres
  - **J+2 Budget**: Budget in zwei Jahren
  - **Aktiviert**: Positionsstatus (aktiviert oder deaktiviert)
  - **Beschreibung**: Positionsbeschreibung
  - **Währung**: ISO-Währungscode
  - **Gültig ab / Gültig bis**: Start- und Enddatum
  - **IT-Verantwortlicher / Fachbereichsverantwortlicher**: Zuständige Benutzer
  - **Analysedimension**: Name der Analysekategorie
  - **Projekt-ID**: Verknüpfte Projektkennung
  - **Notizen**: Interne Notizen
  - **Erstellt / Aktualisiert**: Zeitstempel

**Filtern**:
  - **Schnellsuche**: Durchsucht Produktname, Lieferant, Beschreibung und andere Textfelder. Filtert die Liste in Echtzeit während der Eingabe
  - **Spaltenfilter**: Klicken Sie auf das Filtersymbol in einer Spaltenüberschrift. **Zahlendes Unternehmen**, **Konto**, **Zuordnung**, **Währung**, **IT-Verantwortlicher**, **Fachbereichsverantwortlicher** und **Analysedimension** verwenden Kontrollkästchen-Set-Filter (Mehrfachauswahl). Andere Spalten verwenden Text- oder Zahlenfilter
  - **Statusbereich**: Verwenden Sie den Umschalter **Anzeigen: Aktiviert / Deaktiviert / Alle** über dem Grid (Standard ist **Aktiviert**)

**Sortierung**:
  - Klicken Sie auf eine Spaltenüberschrift, um aufsteigend/absteigend zu sortieren
  - Standardsortierung ist nach **J Budget** absteigend
  - Die Liste merkt sich Ihre letzte Sortierung, Suche und Filter bei der Rückkehr

**Summenzeile**:
  - Die angeheftete Zeile unten zeigt Summen für alle Budgetspalten
  - Summen berücksichtigen Ihre aktuellen Filter und Suche

**Deep Linking**:
  - Das Anklicken einer beliebigen Zelle öffnet den Arbeitsbereich auf dem relevantesten Tab:
    - **Produktname**, **Lieferant**, **Zahlendes Unternehmen**, **Konto** und andere allgemeine Spalten: Öffnet den **Übersichts**-Tab
    - **Budgetspalten** (J Budget, J Endwert, J-1 Budget usw.): Öffnet den **Budget**-Tab voreingestellt auf dieses Jahr
    - **Zuordnung**: Öffnet den **Zuordnungen**-Tab für das aktuelle Jahr
    - **Aufgabe**: Öffnet den **Aufgaben**-Tab
    - **Vertrag**: Öffnet den verknüpften Vertrags-Arbeitsbereich direkt (nicht den OPEX-Arbeitsbereich)

**Aktionen**:
  - **Neu**: Neue OPEX-Position erstellen (erfordert `opex:manager`)
  - **CSV importieren**: Massenladen von Positionen aus CSV (erfordert `opex:admin`)
  - **CSV exportieren**: Positionen als CSV exportieren (erfordert `opex:admin`)
  - **Ausgewählte löschen**: Massenlöschung ausgewählter Positionen (erfordert `opex:admin`; Zeilen über Kontrollkästchen auswählen)

**Zurück/Weiter-Navigation**:
  - Wenn Sie eine Position öffnen, zeigt der Arbeitsbereich **Zurück** und **Weiter**-Schaltflächen
  - Diese navigieren durch die Liste in der aktuellen Sortierreihenfolge unter Berücksichtigung von Filtern und Suche
  - Ihr Listenkontext (Sortierung, Filter, Suche) bleibt erhalten, wenn Sie den Arbeitsbereich schließen

**Tipp**: Verwenden Sie Spaltenfilter + Schnellsuche, um fokussierte Ansichten zu erstellen (z. B. „Alle Cloud-Ausgaben über 10k"), und navigieren Sie dann mit Zurück/Weiter von Position zu Position, um Budgets zu überprüfen.

---

## Der OPEX-Arbeitsbereich

Klicken Sie auf eine beliebige Zeile in der Liste, um den Arbeitsbereich zu öffnen. Er hat fünf Tabs, vertikal links angeordnet, jeweils fokussiert auf einen bestimmten Aspekt der Ausgabenposition.

### Übersicht

Dieser Tab zeigt alle allgemeinen Informationen zur Ausgabenposition.

**Was Sie bearbeiten können**:
  - **Produktname** (Pflicht)
  - **Beschreibung**
  - **Lieferant** (Autovervollständigung aus Ihren Stammdaten-Lieferanten; Pflicht)
  - **Währung** (Standard ist Arbeitsbereich-Währung; zeigt nur zugelassene Währungen)
  - **Zahlendes Unternehmen** (Autovervollständigung aus Ihren Unternehmen; Pflicht)
  - **Konto** (gefiltert nach dem Kontenplan des zahlenden Unternehmens; Pflicht)
  - **Gültig ab** und **Gültig bis** (Datumsfelder)
  - **IT-Verantwortlicher** und **Fachbereichsverantwortlicher** (Autovervollständigung aus aktivierten Benutzern)
  - **Analysekategorie** (Autovervollständigung; erstellt neue Kategorien spontan)
  - **Notizen**

**Status und Lebenszyklus**:
  - Verwenden Sie den **Aktiviert**-Umschalter oder setzen Sie ein **Deaktivierungsdatum**, um zu steuern, wann die Position in Berichten und Auswahllisten erscheint
  - Deaktivierte Positionen werden aus Berichten für Jahre ausgeschlossen, die strikt nach dem Deaktivierungsdatum liegen
  - Historische Daten bleiben erhalten; Sie sehen deaktivierte Positionen weiterhin in Berichten, die Jahre abdecken, in denen sie aktiv waren

**Speichern und Zurücksetzen**:
  - Änderungen werden **nicht** automatisch gespeichert
  - Klicken Sie auf **Speichern**, um Ihre Bearbeitungen zu sichern, oder **Zurücksetzen**, um sie zu verwerfen
  - Wenn Sie mit nicht gespeicherten Änderungen navigieren oder Tabs wechseln, werden Sie aufgefordert, zu speichern oder zu verwerfen

**Tipp**: Wenn Sie eine Warnung „Veraltetes Konto" sehen, bedeutet dies, dass das ausgewählte Konto nicht zum Kontenplan des zahlenden Unternehmens gehört. Wählen Sie ein anderes Konto, um die Warnung zu beheben.

---

### Budget

Der Budget-Tab ist der Ort, an dem Sie Finanzdaten pro Jahr eingeben. Er unterstützt mehrere Budgetspalten und zwei Eingabemodi: **Pauschal** (Jahressummen) und **Manuell** (monatliche Aufschlüsselung).

**Jahrauswahl**:
  - Verwenden Sie die Jahrreiter oben, um zwischen J-2, J-1, J (aktuelles Jahr), J+1 und J+2 zu wechseln
  - Jedes Jahr hat seine eigene Version, seinen Modus und seine Beträge
  - Jahreswechsel mit nicht gespeicherten Änderungen löst einen Speichern/Verwerfen-Dialog aus

**Budgetspalten**:
  - **Budget (geplant)**: Genehmigtes Jahresbudget zu Jahresbeginn
  - **Revision (festgelegt)**: Halbjahres-Budgetaktualisierung (z. B. nach einer Neuprognose)
  - **Prognose (tatsächlich)**: Erwartete tatsächliche Ausgaben (Ihre beste Schätzung im Jahresverlauf)
  - **Endwert (erwarteter Endwert)**: Tatsächliche Ausgaben nach dem Jahresabschluss

**Pauschal vs. Manueller Modus**:
  - **Pauschal**: Geben Sie eine Summe pro Spalte ein; Beträge werden gleichmäßig auf 12 Monate verteilt
  - **Manuell**: Geben Sie Beträge pro Monat (Jan-Dez) für jede Spalte ein, plus eine **Prognose**-Spalte für zusätzliche Planung
  - Wechseln Sie zwischen den Modi mit den Optionsfeldern oben im Tab

**Einfrierverhalten**:
  - Wenn Budgetspalten eines Jahres eingefroren sind (über Budget-Administration), werden die entsprechenden Eingaben schreibgeschützt
  - Sie können eingefrorene Daten weiterhin einsehen; Administratoren können über **Budgetverwaltung > Administration > Einfrieren/Freigeben** entsperren
  - Jede Spalte kann unabhängig eingefroren werden (Budget, Revision, Prognose, Endwert)

**Notizfeld**:
  - Jede Jahresbudget-Version hat ein **Notizen**-Feld für jahresspezifische Kommentare (z. B. „Enthält 10 % Preiserhöhung in Q3")

**Vorgehensweise**:
  1. Wählen Sie das Jahr, für das Sie planen
  2. Wählen Sie den Pauschalen oder Manuellen Modus
  3. Füllen Sie die relevanten Spalten aus (Budget für die Erstplanung, Prognose für die Nachverfolgung, Endwert für Ist-Werte)
  4. Klicken Sie auf **Speichern**, um Ihre Änderungen zu sichern

**Tipp**: Für die meisten Positionen ist der Pauschalmodus schneller. Verwenden Sie den Manuellen Modus, wenn die Ausgaben monatlich stark variieren (z. B. saisonale Lizenzierung, einmalige Einrichtungsgebühren).

---

### Zuordnungen

Der Zuordnungen-Tab verteilt die Ausgaben auf Ihre Unternehmen und Abteilungen. Dies steuert Leistungsverrechnungsberichte und Kosten-pro-Benutzer-KPIs.

**Jahrauswahl**:
  - Funktioniert wie beim Budget: verwenden Sie Jahrreiter zum Wechseln zwischen J-2, J-1, J, J+1, J+2
  - Jedes Jahr kann eine andere Zuordnungsmethode haben

**Zuordnungsmethoden**:

| Methode | Funktionsweise |
|---------|----------------|
| **Mitarbeiterzahl (Standard)** | Teilt Ausgaben proportional nach der Mitarbeiterzahl jedes Unternehmens für das ausgewählte Jahr. Dies ist die Standardmethode. Keine manuelle Auswahl erforderlich -- Prozentsätze werden automatisch aus Unternehmenskennzahlen berechnet. |
| **IT-Benutzer** | Teilt Ausgaben proportional nach der IT-Benutzerzahl jedes Unternehmens für das ausgewählte Jahr. |
| **Umsatz** | Teilt Ausgaben proportional nach dem Umsatz jedes Unternehmens für das ausgewählte Jahr. |
| **Manuell nach Unternehmen** | Sie wählen aus, welche Unternehmen diese Ausgabe erhalten, und wählen einen Treiber (Mitarbeiterzahl, IT-Benutzer oder Umsatz), um Prozentsätze nur unter den ausgewählten Unternehmen zu berechnen. |
| **Manuell nach Abteilung** | Sie wählen bestimmte Unternehmen/Abteilungs-Paare aus. Prozentsätze werden aus der Mitarbeiterzahl jeder Abteilung berechnet. Nützlich, wenn eine Ausgabenposition nur bestimmten Abteilungen zugutekommt (z. B. ein CRM, das vom Vertrieb genutzt wird). |

**Wie Prozentsätze funktionieren**:
  - Für **automatische Methoden** (Mitarbeiterzahl, IT-Benutzer, Umsatz): Prozentsätze werden bei jedem Laden der Seite aus den aktuellen Unternehmenskennzahlen berechnet. Sie bearbeiten sie nicht direkt
  - Für **manuelle Methoden**: Sie wählen die Unternehmen oder Abteilungen aus, und das System berechnet Prozentsätze basierend auf Ihrem gewählten Treiber und den aktuellen Kennzahlen
  - Prozentsätze spiegeln Live-Daten wider. Wenn Sie die Mitarbeiterzahl eines Unternehmens aktualisieren, werden Zuordnungen sofort neu berechnet
  - Der Gesamtprozentsatz-Indikator zeigt eine laufende Summe. Für automatische Methoden wird der Rest automatisch verteilt; für manuelle Methoden verwendet die Vorschau Live-Kennzahlen

**Vorgehensweise**:
  1. Wählen Sie das Jahr
  2. Wählen Sie eine Zuordnungsmethode aus dem Dropdown
  3. Bei Manuell nach Unternehmen wählen Sie einen Zuordnungstreiber (Mitarbeiterzahl, IT-Benutzer oder Umsatz) und wählen Unternehmen aus
  4. Bei Manuell nach Abteilung wählen Sie Unternehmen/Abteilungs-Paare aus
  5. Klicken Sie auf **Speichern**, um Methode und Auswahl zu sichern

**Häufige Probleme**:
  - **Fehler „Fehlende Kennzahlen"**: Ein oder mehrere Unternehmen haben für das ausgewählte Jahr keine oder eine Mitarbeiterzahl/IT-Benutzer/Umsatz von Null. Füllen Sie die Kennzahlen unter **Stammdaten > Unternehmen** (Details-Tab) aus
  - **„Summe ist nicht 100 %"**: Meist durch fehlende Kennzahlen verursacht. Korrigieren Sie die Unternehmensdaten und laden Sie die Zuordnungen neu

**Tipp**: Verwenden Sie Mitarbeiterzahl (Standard) für die meisten Positionen -- es ist am einfachsten und aktualisiert sich automatisch. Reservieren Sie manuelle Methoden für Ausgaben, die nur bestimmten Unternehmen oder Abteilungen zugutekommen.

---

### Aufgaben

Der Aufgaben-Tab hilft Ihnen, Aufgaben und Nachverfolgungen im Zusammenhang mit dieser OPEX-Position zu verfolgen (z. B. „Lizenz bis Q3 verlängern", „Nutzungskennzahlen überprüfen").

**Aufgabenliste**:
  - Zeigt alle mit dieser OPEX-Position verknüpften Aufgaben
  - Spalten: **Titel**, **Status**, **Priorität**, **Fälligkeitsdatum**, **Aktionen**
  - Klicken Sie auf einen Aufgabentitel, um den vollständigen Aufgaben-Arbeitsbereich zu öffnen
  - Standardfilter zeigt aktive Aufgaben (blendet erledigte und abgebrochene aus)

**Filtern**:
  - Klicken Sie auf das Filtersymbol, um Filtersteuerungen ein-/auszublenden
  - **Statusfilter**: Alle, Aktiv (blendet erledigte/abgebrochene aus), Offen, In Bearbeitung, Ausstehend, Im Test, Erledigt oder Abgebrochen
  - Klicken Sie auf die Löschen-Schaltfläche, um Filter zurückzusetzen

**Aufgabe erstellen**:
  - Klicken Sie auf **Aufgabe hinzufügen**, um den Aufgaben-Erstellungsarbeitsbereich zu öffnen
  - Die Aufgabe wird automatisch mit dieser OPEX-Position verknüpft
  - Füllen Sie im Aufgaben-Arbeitsbereich Titel, Beschreibung, Priorität, Beauftragten und Fälligkeitsdatum aus

**Aufgabe löschen**:
  - Klicken Sie auf das Löschsymbol in der Aktionen-Spalte
  - Bestätigen Sie die Löschung im Dialog

**Hinweise**:
  - Aufgaben sind eigenständige Objekte mit eigenen Berechtigungen (`tasks:member` zum Erstellen/Bearbeiten)
  - OPEX-Manager-Zugriff gewährt nicht automatisch Aufgabenbearbeitungsrechte; prüfen Sie mit Ihrem Admin, wenn Sie keine Aufgaben erstellen können
  - Aufgaben können auch unter **Portfolio > Aufgaben** angezeigt und verwaltet werden, wo alle Aufgaben Ihrer gesamten Organisation dargestellt werden

**Tipp**: Verwenden Sie Aufgaben, um Handlungspunkte während Budget-Reviews oder Vertragsverlängerungen festzuhalten. Setzen Sie Fälligkeitsdaten, um anstehende Fristen zu verfolgen.

---

### Verknüpfungen

Der Verknüpfungen-Tab verbindet diese OPEX-Position mit verwandten Objekten: Projekten, Anwendungen, Verträgen, Kontakten, relevanten Websites und Anhängen.

**Projekte**:
  - Verwenden Sie die Autovervollständigung, um ein oder mehrere Projekte aus Ihrem Portfolio zu verknüpfen
  - Dies hilft, Ausgaben nach Projekt in Berichten zu gruppieren und ermöglicht Projektbuchhaltung
  - Entfernen Sie Projekte durch Klicken auf das X am Chip, dann speichern

**Anwendungen**:
  - Verwenden Sie die Autovervollständigung, um eine oder mehrere Anwendungen aus Ihrem IT-Katalog zu verknüpfen
  - Verknüpfte Anwendungsnamen erscheinen als anklickbare Chips, die den Anwendungs-Arbeitsbereich öffnen
  - Dies hilft, nachzuverfolgen, welche OPEX-Positionen welche Anwendungen oder Dienste finanzieren

**Verträge**:
  - Verwenden Sie die Autovervollständigung, um einen oder mehrere Verträge zu verknüpfen
  - Bei Verknüpfung erscheint der Vertragsname in der OPEX-Listen-Spalte **Vertrag** zur schnellen Referenz
  - Verträge können mit mehreren OPEX-Positionen verknüpft werden (n:m-Beziehung)
  - Entfernen Sie Verträge durch Klicken auf das X am Chip, dann speichern

**Kontakte**:
  - Fügen Sie Lieferantenkontakte im Zusammenhang mit dieser Ausgabenposition hinzu
  - Jeder Kontakt hat eine **Rolle** (Kommerziell, Technisch, Support oder Sonstige)
  - Kontakte können aus der Kontaktliste des Lieferanten stammen oder manuell hinzugefügt werden
  - Nützlich, um nachzuverfolgen, wen Sie bei Verlängerungen, Supportfragen oder Verhandlungen kontaktieren

**Relevante Websites**:
  - Fügen Sie URLs hinzu, die sich auf diese Ausgabenposition beziehen (z. B. Lieferantenportale, Dokumentation, Admin-Konsolen, interne Wikis)
  - Jeder Link hat ein optionales **Beschreibung**-Feld für Kontext
  - Klicken Sie auf **URL hinzufügen**, um weitere Links hinzuzufügen

**Anhänge**:
  - Laden Sie Dateien hoch, die sich auf diese Ausgabenposition beziehen (z. B. Verträge, Rechnungen, Angebote, SOWs, technische Spezifikationen)
  - Ziehen Sie Dateien per Drag-and-Drop in den Anhangbereich oder klicken Sie auf **Dateien auswählen**
  - Alle Dateien werden sicher gespeichert und können durch Klicken auf den Dateinamen heruntergeladen werden
  - Löschen Sie Anhänge durch Klicken auf das X am Datei-Chip (erfordert `opex:manager`)
  - Anhänge werden sofort beim Hochladen gespeichert (kein Klick auf **Speichern** nötig)

**Speicherverhalten**:
  - **Projekte**, **Anwendungen**, **Verträge**, **Relevante Websites**: Werden gespeichert, wenn Sie auf **Speichern** oben im Arbeitsbereich klicken
  - **Kontakte**: Werden inline verwaltet (Hinzufügen/Entfernen-Aktionen speichern sofort)
  - **Anhänge**: Werden sofort beim Hochladen gespeichert

**Tipp**: Verknüpfen Sie Verträge, um Verlängerungen über mehrere OPEX-Positionen zu verfolgen. Fügen Sie Lieferantenportal-URLs für schnellen Zugriff hinzu. Laden Sie Angebote und Rechnungen als Anhänge hoch, um alle ausgabenbezogenen Dokumente zu zentralisieren.

---

## CSV-Import/Export

Sie können OPEX-Positionen per CSV massenimportieren, um die Ersteinrichtung zu beschleunigen oder mit externen Systemen zu synchronisieren.

**Export**:
  1. Klicken Sie in der OPEX-Liste auf **CSV exportieren**
  2. Wählen Sie:
     - **Vorlage**: Nur Kopfzeilen (verwenden Sie dies, um eine leere CSV zum Ausfüllen zu erstellen)
     - **Daten**: Alle aktuellen OPEX-Positionen mit Budgets für J-1, J und J+1

**CSV-Struktur**:
  - Trennzeichen: Semikolon `;` (kein Komma)
  - Kodierung: UTF-8 (in Excel als „CSV UTF-8" speichern)
  - Kopfzeilen: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Import**:
  1. Klicken Sie in der OPEX-Liste auf **CSV importieren**
  2. Laden Sie Ihre CSV-Datei hoch (Drag-and-Drop oder Dateiauswahl)
  3. Klicken Sie auf **Vorprüfung** zur Validierung:
     - Kopfzeilen stimmen exakt überein
     - Lieferanten, Konten und Benutzer existieren in Ihrem Arbeitsbereich
     - Pflichtfelder (product_name, currency, effective_start, paying_company) sind vorhanden
     - Keine doppelten product_name + supplier-Kombinationen
  4. Überprüfen Sie den Vorprüfungsbericht (zeigt Zählungen und bis zu 5 Beispielfehler)
  5. Wenn OK, klicken Sie auf **Laden** zum Importieren

**Wichtige Hinweise**:
  - **Eindeutiger Schlüssel**: OPEX-Positionen werden über `(product_name, supplier_name)` identifiziert. Existiert eine Kombination bereits, wird sie **übersprungen** (keine Aktualisierungen)
  - **Nur Neuanlage**: Der Importer erstellt nur neue Positionen; er aktualisiert keine bestehenden. Verwenden Sie die Benutzeroberfläche zum Bearbeiten bestehender Positionen
  - **Referenzen**: `supplier_name` muss einem Lieferanten namentlich entsprechen (Groß-/Kleinschreibung wird ignoriert). `account_number` muss einem Konto entsprechen. `owner_it_email` und `owner_business_email` müssen aktivierten Benutzern per E-Mail entsprechen
  - **Analysekategorie**: Existiert die Kategorie nicht, wird sie beim Import automatisch erstellt
  - **Budgets**: Budgetspalten füllen J-1, J und J+1 Versionen. Beträge werden gleichmäßig auf 12 Monate verteilt (Pauschalmodus)

**Häufige Fehler**:
  - **„Lieferant nicht gefunden"**: Erstellen Sie den Lieferanten zuerst unter **Stammdaten > Lieferanten**, dann importieren Sie erneut
  - **„Konto nicht gefunden"**: Fügen Sie das Konto unter **Stammdaten > Kontenpläne** hinzu, dann importieren Sie erneut
  - **„Ungültige Währung"**: Verwenden Sie 3-stellige ISO-Codes (USD, EUR, GBP), die in Ihren Arbeitsbereich-Währungseinstellungen zugelassen sind
  - **„Kopfzeilen stimmen nicht überein"**: Laden Sie eine frische Vorlage herunter; Kopfzeilen müssen exakt übereinstimmen (einschließlich Reihenfolge)

**Tipp**: Beginnen Sie mit dem Vorlagenexport, füllen Sie einige Zeilen aus und führen Sie eine Vorprüfung durch, um Probleme frühzeitig zu erkennen. Beheben Sie Fehler in der CSV und laden Sie sie erneut hoch, bis die Vorprüfung besteht, dann laden Sie.

---

## Status und Lebenszyklus

Jede OPEX-Position hat einen **Status** (Aktiviert oder Deaktiviert) und ein optionales **Deaktivierungsdatum**, das steuert, wann sie in Berichten und Auswahllisten erscheint.

**Funktionsweise**:
  - **Aktiviert**: Die Position ist aktiv und erscheint überall (Listen, Berichte, Zuordnungen)
  - **Deaktivierungsdatum**: Wenn gesetzt, wird die Position am Ende dieses Tages deaktiviert
  - Nach dem Deaktivierungsdatum:
    - Die Position erscheint nicht mehr in Auswahllisten für neue Verträge oder Zuordnungen
    - Sie wird aus Berichten für Jahre ausgeschlossen, die strikt nach dem Deaktivierungsdatum liegen
    - Historische Daten bleiben erhalten; die Position erscheint weiterhin in Berichten, die Jahre abdecken, in denen sie aktiv war

**Status setzen**:
  - Im **Übersichts**-Tab verwenden Sie den **Aktiviert**-Umschalter oder setzen ein **Deaktivierungsdatum**
  - Sie können ein zukünftiges Deaktivierungsdatum planen (nützlich für geplante Vertragsenden)

**Deaktivierte Positionen anzeigen**:
  - Standardmäßig zeigt die OPEX-Liste nur **aktivierte** Positionen
  - Verwenden Sie den Umschalter **Anzeigen: Deaktiviert** oder **Anzeigen: Alle**, um deaktivierte Positionen zu sehen

**Wann deaktivieren vs. löschen**:
  - **Bevorzugen Sie das Deaktivieren**: Bewahrt die Historie, stellt konsistente Berichte sicher und unterstützt Audit-Trails
  - **Nur löschen, wenn**: Die Position versehentlich erstellt wurde und keine Budgets, Zuordnungen oder Aufgaben hat
  - Das Löschen ist geschützt: Sie können keine Position löschen, die von Verträgen, Aufgaben referenziert wird oder Budgetdaten hat

**Tipp**: Verwenden Sie das Deaktivierungsdatum, um OPEX-Positionen auslaufen zu lassen, wenn Verträge enden oder Dienste eingestellt werden. Löschen Sie nur bei echten Fehlern.

---

## Tipps und Best Practices

1. **Einfach anfangen**: Erstellen Sie Positionen nur mit dem Wesentlichen (Produktname, Lieferant, zahlendes Unternehmen, Konto), dann ergänzen Sie Budgets und Zuordnungen bei der Planung.

2. **Die Standard-Zuordnungsmethode verwenden**: Für die meisten Positionen reicht Mitarbeiterzahl (Standard) aus. Reservieren Sie manuelle Zuordnungen für Ausgaben, die nur bestimmten Unternehmen oder Abteilungen zugutekommen.

3. **Verträge verknüpfen**: Wenn Sie Ausgaben über Verträge verwalten, verknüpfen Sie sie im Verknüpfungen-Tab. Das erleichtert die Nachverfolgung von Verlängerungen.

4. **Anwendungen verknüpfen**: Ordnen Sie OPEX-Positionen den Anwendungen oder Diensten zu, die sie finanzieren. Dies bietet eine klare Kosten-zu-Anwendungs-Zuordnung.

5. **Dokumentation hochladen**: Verwenden Sie die Anhangfunktion, um Lieferantenverträge, Angebote, Rechnungen und SOWs zu speichern.

6. **Lieferantenportal-Links hinzufügen**: Verwenden Sie relevante Websites, um zu Lieferanten-Admin-Konsolen, Support-Portalen und Dokumentation für schnellen Zugriff zu verlinken.

7. **Kontakte verfolgen**: Fügen Sie Lieferantenkontakte mit Rollen (Kommerziell, Technisch, Support) hinzu, damit Ihr Team weiß, wen es für jede Ausgabenposition kontaktieren soll.

8. **Analysekategorien nutzen**: Taggen Sie Positionen mit Kategorien (Infrastruktur, Business Apps, Sicherheit), um Ausgaben in Berichten zu gruppieren.

9. **Unternehmenskennzahlen aktuell halten**: Zuordnungen hängen von Mitarbeiterzahl, IT-Benutzern und Umsatz der Unternehmen ab. Veraltete Kennzahlen verursachen Zuordnungsfehler.

10. **CSV für Masseneinrichtung verwenden**: Wenn Sie von einem anderen System migrieren oder Hunderte von Positionen haben, beginnen Sie mit dem CSV-Import. Exportieren Sie eine Vorlage, füllen Sie sie aus und prüfen Sie sie vor dem Laden.

11. **Deaktivieren statt löschen**: Bewahren Sie die Historie, indem Sie Positionen deaktivieren, wenn sie nicht mehr aktiv sind. Löschen Sie nur bei Fehlern.

12. **Summenzeile überprüfen**: Bevor Sie Budgets finalisieren, prüfen Sie die angeheftete Summenzeile in der Liste, um sicherzustellen, dass Ihre Ausgaben wie erwartet aufgehen.

13. **Deep Linking nutzen**: Klicken Sie direkt auf eine Budgetspalte in der Liste, um zum Budget-Tab für dieses Jahr zu springen. Klicken Sie auf die Aufgaben-Spalte, um zu Aufgaben zu springen. Das spart Navigationszeit.

14. **Budgets nach Jahresabschluss einfrieren**: Verwenden Sie die Budget-Administration, um Vorjahresbudgets einzufrieren, sobald die Ist-Werte finalisiert sind, um versehentliche Bearbeitungen zu verhindern.

---

## Berechtigungen

Der OPEX-Zugriff wird durch drei Stufen gesteuert:

- `opex:reader` -- OPEX-Liste anzeigen, Positionen öffnen, Budgets und Zuordnungen einsehen (schreibgeschützt), Anhänge herunterladen
- `opex:manager` -- OPEX-Positionen erstellen und bearbeiten, Budgets und Zuordnungen aktualisieren, Anhänge hochladen und löschen, Verknüpfungen verwalten
- `opex:admin` -- Alle Manager-Rechte plus CSV-Import/Export, Budget-Operationen (Einfrieren, Kopieren, Zurücksetzen) und Massenlöschung

Zusätzlich:
- Aufgaben haben separate Berechtigungen (`tasks:member` zum Erstellen/Bearbeiten von Aufgaben an OPEX-Positionen)
- Benutzer mit `tasks:reader` können Aufgaben anzeigen, aber nicht erstellen oder bearbeiten

Wenn Sie eine Aktion nicht ausführen können (z. B. die Schaltfläche **CSV importieren** fehlt, Anhänge nicht hochladen können), prüfen Sie mit Ihrem Arbeitsbereich-Administrator Ihre Rollenberechtigungen.

---

## Hilfe benötigt?

- **CSV-Probleme**: Laden Sie eine frische Vorlage herunter, stellen Sie UTF-8-Kodierung sicher und führen Sie eine Vorprüfung durch, um detaillierte Fehler zu sehen
- **Zuordnungsfehler**: Prüfen Sie, ob alle Unternehmen die erforderlichen Kennzahlen (Mitarbeiterzahl, IT-Benutzer, Umsatz) für das ausgewählte Jahr haben
- **Warnung „Veraltetes Konto"**: Das Konto gehört nicht zum Kontenplan des zahlenden Unternehmens; wählen Sie ein anderes Konto
- **Fehlende Schaltflächen oder Tabs**: Ihre Rolle hat möglicherweise nicht die erforderliche Berechtigungsstufe (Manager oder Admin). Kontaktieren Sie Ihren Arbeitsbereich-Administrator
