# Berichte

Der Berichtsbereich bietet Ihnen vorgefertigte, interaktive Berichte zur Analyse von Budgetdaten, Kostenzuordnungen und Ausgabentrends. Jeder Bericht kombiniert eine Zusammenfassungstabelle mit einem Diagramm, und alle unterstützen CSV- und Bildexporte.

## Wo Sie es finden

Navigieren Sie im Hauptmenü zu **Berichte**, um den Berichts-Hub zu öffnen.

- Pfad: **Berichte**
- Berechtigungen: `reporting:reader` (Minimum)

---

## Berichts-Hub

Die Startseite zeigt eine Karte für jeden verfügbaren Bericht mit einer kurzen Beschreibung. Klicken Sie auf eine beliebige Karte, um den Bericht zu öffnen.

| Bericht | Was er abdeckt |
|---------|----------------|
| **Globale Leistungsverrechnung** | Unternehmensebene: Zuordnungssummen, KPIs und konzerninterne Flüsse |
| **Unternehmens-Leistungsverrechnung** | Einzelunternehmen-Detailansicht mit Abteilungen, Positionen und KPIs |
| **Top OPEX** | Größte OPEX-Positionen für ein ausgewähltes Jahr (anpassbare Top-N-Anzahl) |
| **Top OPEX Steigerung/Rückgang** | Größte Jahresveränderungen bei OPEX (anpassbare Top-N-Anzahl) |
| **Budgettrend (OPEX)** | OPEX-Kennzahlen über einen Jahresbereich vergleichen |
| **Budgettrend (CAPEX)** | CAPEX-Kennzahlen über einen Jahresbereich vergleichen |
| **Budgetspalten-Vergleich** | Bis zu 10 Jahr+Spalten-Kombinationen für OPEX oder CAPEX auswählen |
| **Konsolidierungskonten** | Budget gruppiert nach Konsolidierungskonto |
| **Analysekategorien** | Budget gruppiert nach Analysekategorie |

---

## Globale Leistungsverrechnung

Zeigen Sie Kostenzuordnungen über alle Unternehmen hinweg mit Zusammenfassungs-KPIs und konzerninternen Flüssen.

### Steuerungen

- **Jahr**: Vorheriges, aktuelles oder nächstes Geschäftsjahr
- **Spalte**: Budget, Endwert, Prognose oder Revision
- **Unternehmens-Summen** (Kontrollkästchen): Unternehmens-Summentabelle und Balkendiagramm ein-/ausblenden
- **Detaillierte Zuordnungen** (Kontrollkästchen): Aufschlüsselung nach Unternehmen/Abteilung ein-/ausblenden
- **KPIs einbeziehen** (Kontrollkästchen): KPI-Tabelle ein-/ausblenden
- **Konzerninterne Flüsse** (Kontrollkästchen): Verrechnete Zahler/Nutznießer-Flüsse ein-/ausblenden
- **Ausführen**-Schaltfläche: Bericht manuell aktualisieren

### Was Sie sehen

**Gesamtsummen-Karte**: Die Gesamtsumme für die ausgewählte Kennzahl und das Jahr, plus Anzahl der Unternehmen, Detailzeilen und KPI-Abdeckung.

**Unternehmens-Summentabelle** (wenn aktiviert):

- Unternehmensname
- Betrag für die ausgewählte Kennzahl
- Bezahlt (gebuchter) Betrag
- Netto (verbraucht minus bezahlt)
- Anteil an der Gesamtsumme

**Diagramm**: Horizontales Balkendiagramm der Zuordnungen nach Unternehmen.

**Detaillierte Zuordnungstabelle** (wenn aktiviert):

- Unternehmens- und Abteilungsspalten (gruppiert mit fetten Zwischensummenzeilen pro Unternehmen)
- Betrag, Anteil an Gesamtsumme, Mitarbeiterzahl und Kosten pro Benutzer
- Zeilen mit „Gemeinkosten" repräsentieren Kosten ohne Abteilungszuordnung

**Konzerninterne Flüsse-Tabelle** (wenn aktiviert):

- Verrechnete Zahler-zu-Nutznießer-Flüsse pro Unternehmenspaar (Eigenverbrauch ausgeschlossen)
- Spalten: Zahler, Nutznießer, Betrag
- Separate Schaltfläche **Verrechnete Flüsse als CSV exportieren**

**KPI-Tabelle** (wenn aktiviert):

| Spalte | Beschreibung |
|--------|--------------|
| Unternehmen | Unternehmensname |
| Betrag | Summe der ausgewählten Kennzahl |
| Mitarbeiterzahl | Gesamte Mitarbeiterzahl |
| IT-Benutzer | Anzahl IT-Benutzer |
| Umsatz | Jahresumsatz |
| IT-Kosten vs. Umsatz | Prozentsatz |
| IT-Kosten pro Benutzer | Betrag geteilt durch Mitarbeiterzahl |
| IT-Kosten pro IT-Benutzer | Betrag geteilt durch IT-Benutzer |

Eine Summenzeile ist unten angeheftet.

### Export

- **Tabelle als CSV exportieren** (Download-Symbol): Exportiert das detaillierte Zuordnungs-Grid
- **Diagramm als PNG exportieren** (Bild-Symbol): Exportiert das Balkendiagramm
- **Drucken / Als PDF speichern** (Druck-Symbol)

---

## Unternehmens-Leistungsverrechnung

Detailansicht der Leistungsverrechnungs-Zuordnungen eines einzelnen Unternehmens über Abteilungen, Budgetpositionen, konzerninterne Flüsse und KPIs.

### Steuerungen

- **Unternehmen**: Welches Unternehmen analysiert werden soll
- **Jahr**: Vorheriges, aktuelles oder nächstes Geschäftsjahr
- **Spalte**: Budget, Endwert, Prognose oder Revision
- **Abteilungs-Summen** (Kontrollkästchen): Abteilungsaufschlüsselung ein-/ausblenden
- **Verrechnungspositionen** (Kontrollkästchen): Einzelzuordnungen ein-/ausblenden
- **Verrechnungs-KPIs** (Kontrollkästchen): KPI-Vergleichstabelle ein-/ausblenden
- **Konzerninterne Flüsse** (Kontrollkästchen): Partnerunternehmens-Flüsse ein-/ausblenden
- **Ausführen**-Schaltfläche: Bericht manuell aktualisieren (deaktiviert, bis ein Unternehmen ausgewählt ist)

### Was Sie sehen

**Unternehmens-Zusammenfassungskarte**: Unternehmensname, Gesamtbetrag, Berichtswährung, Mitarbeiterzahl, IT-Benutzer, Kosten pro Benutzer, Kosten pro IT-Benutzer und IT-Kosten vs. Umsatz.

**Abteilungs-Summen** (wenn aktiviert):

- Abteilungsname, Betrag, Anteil an Gesamtsumme, Mitarbeiterzahl, Kosten pro Benutzer
- „Gemeinkosten" aggregiert Zuordnungen ohne bestimmte Abteilung
- Horizontales Balkendiagramm neben der Tabelle

**Verrechnungspositionen** (wenn aktiviert):

- Positionsname, Zuordnungsmethode, Betrag, Anteil an Gesamtsumme
- Angeheftete Summenzeile unten

**Konzerninterne Flüsse** (wenn aktiviert):

- Partnerunternehmen, Forderungen, Verbindlichkeiten, Netto
- Angeheftete Summenzeile
- Separate Schaltfläche **Flüsse als CSV exportieren**

**KPI-Tabelle** (wenn aktiviert): Gleiche Spalten wie die KPI-Tabelle der Globalen Leistungsverrechnung, mit einer „Globale Summen"-Zeile unten zum Vergleich.

### Export

- **Tabelle als CSV exportieren**: Exportiert das Abteilungs-Summen-Grid
- **Diagramm als PNG exportieren**: Exportiert das Abteilungs-Balkendiagramm
- **Drucken / Als PDF speichern**

---

## Top OPEX

Identifizieren Sie Ihre größten wiederkehrenden OPEX-Kosten für ein bestimmtes Jahr.

### Steuerungen

- **Jahr**: Vorheriges, aktuelles oder nächstes Jahr
- **Kennzahl**: Budget, Revision, Prognose oder Endwert
- **Top-Anzahl**: Wie viele Positionen angezeigt werden (Standard: 10, Minimum: 1)
- **Diagrammtyp**: Kreisdiagramm oder horizontales Balkendiagramm
- **Positionen ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen bestimmter Produkte
- **Konten ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen nach Kontokategorie

### Was Sie sehen

**Diagramm**: Kreis- oder horizontales Balkendiagramm der Top-Positionen.

**Tabellenspalten**:

- Produktname
- Wert für die ausgewählte Kennzahl und das Jahr
- Anteil an Gesamtsumme (Prozentsatz)

**Zusammenfassungskarten unter der Tabelle**:

- Top-N-Summe (mit Prozentsatz der gefilterten Kennzahl)
- Gesamtwert für die ausgewählte Kennzahl über alle Positionen

### Anwendungsfall

Verwenden Sie diesen Bericht, um schnell zu erkennen, wohin der Großteil Ihres IT-Budgets fließt, und Kandidaten für Kostenoptimierung zu identifizieren.

---

## Top OPEX Steigerung / Rückgang

Identifizieren Sie die größten Veränderungen zwischen zwei Budgetspalten (jede Kombination aus Jahr und Kennzahl).

### Steuerungen

- **Quelljahr** und **Quellkennzahl**: Die Basisspalte zum Vergleich
- **Zieljahr** und **Zielkennzahl**: Die Zielspalte zum Vergleich
- **Top-Anzahl**: Wie viele Positionen pro Richtung angezeigt werden (Standard: 10)
- **Diagrammtyp**: Kreisdiagramm (nur eine Richtung) oder horizontales Balkendiagramm
- **Positionen ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen bestimmter Produkte
- **Konten ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen nach Kontokategorie
- **Richtungs-Umschalter**: Steigerung, Rückgang oder beide (Umschaltflächen)

Wenn beide Richtungen ausgewählt sind, wird die Kreisdiagramm-Option deaktiviert und der Bericht wechselt automatisch zum Balkendiagramm.

### Was Sie sehen

**Diagramm**: Visualisierung der Top-Veränderungen.

**Tabellenspalten**:

- Produktname
- Quellwert (vorher)
- Zielwert (aktuell)
- Delta (absolute Änderung)
- Prozentuale Steigerung

**Zusammenfassungskarten unter der Tabelle**:

- Auswahlsummen (Steigerungs- und/oder Rückgangsbeträge, mit Quell-/Zielsummen)
- Brutto-Veränderungen über alle Positionen (mit Abdeckungsprozentsatz)
- Netto-Steigerung oder -Rückgang über alle Positionen

### Anwendungsfall

Verwenden Sie diesen Bericht zur Identifizierung von Kostenüberschreitungen, zum Aufspüren von Einsparmöglichkeiten und zur Erklärung der Jahresvergleichsabweichung in Budget-Reviews.

---

## Budgettrend (OPEX)

Vergleichen Sie OPEX-Kennzahlen über mehrere Jahre in einem einzelnen Liniendiagramm.

### Steuerungen

- **Startjahr**: Beginn des Bereichs (aktuelles Jahr minus 2 bis plus 2)
- **Endjahr**: Ende des Bereichs
- **Kennzahlen**: Mehrfachauswahl aus Budget, Prognose, Endwert, Revision (mindestens eine erforderlich)

### Was Sie sehen

**Diagramm**: Liniendiagramm mit einer Serie pro ausgewählter Kennzahl, aufgetragen über den Jahresbereich.

**Tabelle**: Eine Zeile pro ausgewählter Kennzahl mit Jahresspalten, die Summen zeigen.

### Export

- **Tabelle als CSV exportieren**
- **Diagramm als PNG exportieren**
- **Drucken / Als PDF speichern**

---

## Budgettrend (CAPEX)

Identisches Layout wie der OPEX-Trendbericht, aber mit CAPEX-Budgetdaten.

### Steuerungen

- **Startjahr**, **Endjahr**, **Kennzahlen**: Gleich wie beim OPEX-Trendbericht

### Was Sie sehen

- Liniendiagramm der CAPEX-Summen nach Kennzahl über Jahre
- Zusammenfassungstabelle mit Jahresspalten

---

## Budgetspalten-Vergleich

Vergleichen Sie flexibel bis zu 10 Jahr+Spalten-Kombinationen für entweder OPEX oder CAPEX.

### Steuerungen

- **Positionstyp**: OPEX- oder CAPEX-Umschalter
- **Auswahlen**: Jede Auswahl hat eine Jahrauswahl und eine Spaltenauswahl (Budget, Revision, Prognose, Endwert). Auswahlen mit der **Hinzufügen**-Schaltfläche hinzufügen und mit dem Löschsymbol entfernen. Maximum von 10 Auswahlen; Minimum von 1.
- **Jahresgruppierung** (Kontrollkästchen): Wenn aktiviert und mindestens zwei Jahre eine Kennzahl teilen, wechselt zu einem gruppierten Liniendiagramm mit einer Serie pro Kennzahl und Jahren auf der X-Achse. Wenn deaktiviert, zeigt ein flaches Liniendiagramm mit jeder Auswahl als Datenpunkt.

### Was Sie sehen

**Diagramm**:

- Standardmodus: Liniendiagramm mit jeder Auswahl auf der X-Achse und ihrer Summe auf der Y-Achse
- Jahresgruppierungsmodus: Liniendiagramm mit Jahren auf der X-Achse und einer Linie pro Kennzahl

**Tabelle**:

- Standardmodus: Auswahlbezeichnung, Jahr, Spaltenname, Summe
- Jahresgruppierungsmodus: Jahresspalte, dann eine Spalte pro Kennzahl mit Summen

### Export

- **Tabelle als CSV exportieren**
- **Diagramm als PNG exportieren**
- **Drucken / Als PDF speichern**

---

## Konsolidierungskonten

Zeigen Sie OPEX-Budgetdaten gruppiert nach Konsolidierungskonto, wobei sich der Diagrammtyp an den Jahresbereich anpasst.

### Steuerungen

- **Startjahr** und **Endjahr**: Vorheriges, aktuelles oder nächstes Jahr
- **Kennzahl**: Budget, Prognose, Endwert oder Revision
- **Diagrammtyp**: Kreisdiagramm oder horizontales Balkendiagramm (nur verfügbar bei Auswahl eines einzelnen Jahres)
- **Konten ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen bestimmter Konten

### Was Sie sehen

**Einzeljahr-Modus**:

- Kreis- oder horizontales Balkendiagramm der Summen nach Konsolidierungskonto
- Fußnote mit der Summe der ausgewählten Kennzahl

**Mehrjahr-Modus**:

- Liniendiagramm mit einer Serie pro Konsolidierungskonto über Jahre

**Tabelle**: Eine Zeile pro Konsolidierungskonto mit Jahresspalten. Eine angeheftete Summenzeile unten summiert alle Gruppen.

Positionen ohne Konsolidierungskonto erscheinen als „Nicht zugewiesen".

---

## Analysekategorien

Zeigen Sie OPEX-Budgetdaten gruppiert nach Analysekategorie. Das Layout entspricht dem Konsolidierungskonten-Bericht.

### Steuerungen

- **Startjahr** und **Endjahr**: Vorheriges, aktuelles oder nächstes Jahr
- **Kennzahl**: Budget, Prognose, Endwert oder Revision
- **Diagrammtyp**: Kreisdiagramm oder horizontales Balkendiagramm (nur Einzeljahr)
- **Analysekategorien ausschließen**: Mehrfachauswahl mit Autovervollständigung zum Ausschließen bestimmter Kategorien

### Was Sie sehen

**Einzeljahr-Modus**:

- Kreis- oder Balkendiagramm der Summen nach Analysekategorie
- Fußnote mit der Kennzahl-Summe

**Mehrjahr-Modus**:

- Liniendiagramm mit einer Serie pro Kategorie

**Tabelle**: Eine Zeile pro Kategorie mit Jahresspalten. Eine angeheftete Summenzeile unten. Positionen ohne Kategorie erscheinen als „Nicht zugewiesen".

---

## Gemeinsame Funktionen

Jeder Bericht bietet diese Funktionen über die gemeinsame Symbolleiste:

### Exportoptionen

- **Tabelle als CSV exportieren** (Download-Symbol): Lädt die Primärtabellendaten herunter
- **Diagramm als PNG exportieren** (Bild-Symbol): Lädt das Diagramm als PNG-Bild herunter
- **Drucken / Als PDF speichern** (Druck-Symbol): Öffnet den Browser-Druckdialog. Sie können auch `?print=1` an jede Bericht-URL anhängen, um den Druck beim Laden automatisch auszulösen.

### Verfügbare Kennzahlen

Alle Berichte, die eine Kennzahlauswahl bieten, verwenden die gleichen vier Spalten:

| Schlüssel | Bezeichnung |
|-----------|-------------|
| `budget` | Budget |
| `revision` | Revision |
| `follow_up` | Prognose |
| `landing` | Endwert |

### Navigation

Jeder Bericht zeigt eine Breadcrumb-Navigation zurück zum **Berichte**-Hub, sodass Sie schnell zwischen Berichten wechseln können.

---

## Tipps

- **Mit der Globalen Leistungsverrechnung beginnen**: Verschaffen Sie sich den Gesamtüberblick über Zuordnungen, bevor Sie in ein einzelnes Unternehmen eintauchen.
- **Top OPEX für schnelle Erfolge nutzen**: Die größten Kostenpositionen sind Ihre ersten Kandidaten für Optimierung.
- **Budget vs. Endwert vergleichen**: Verwenden Sie den Spaltenvergleichsbericht, um die Prognosegenauigkeit über Jahre zu messen.
- **Abschnitte in Leistungsverrechnungsberichten umschalten**: Die Kontrollkästchen ermöglichen es, sich nur auf die benötigten Daten zu konzentrieren -- Abteilungen, Positionen, KPIs oder Flüsse -- ohne visuelle Unordnung.
- **Jahresgruppierung im Spaltenvergleich**: Wenn Sie die gleiche Kennzahl über mehrere Jahre vergleichen, aktivieren Sie die Jahresgruppierung für ein übersichtlicheres Liniendiagramm.
- **Für Präsentationen exportieren**: Diagramme exportieren als PNG und Tabellen als CSV, beides bereit für Folien oder Tabellenkalkulationen.
