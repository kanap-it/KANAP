# Budget-Administration

Die Budget-Administration bietet Ihnen eine Reihe von Werkzeugen zur Verwaltung und Transformation von Budgetdaten über Jahre und Spalten hinweg. Dies sind die Operationen, die Sie während der Budgetplanungszyklen benötigen -- die Vorbereitung der Zahlen für das nächste Jahr, das Einfrieren genehmigter Budgets und die Verwaltung von Jahresübergängen.

## Wo Sie es finden

- Pfad: **Budgetverwaltung > Administration**
- Berechtigungen: Die meisten Operationen erfordern `budget_ops:admin`

Die Startseite zeigt vier Karten, die jeweils zu einem dedizierten Werkzeug führen:

| Werkzeug | Zweck |
|----------|-------|
| **Daten einfrieren / freigeben** | Budgetspalten sperren, um Änderungen zu verhindern |
| **Budgetspalten kopieren** | Daten zwischen Jahren und Spalten mit Anpassungen kopieren |
| **Zuordnungen kopieren** | Zuordnungsmethoden von einem Jahr in ein anderes kopieren |
| **Budgetspalte zurücksetzen** | Alle Daten einer bestimmten Spalte löschen |

---

## Daten einfrieren / freigeben

Sperren Sie Budgetspalten, sodass sie nicht bearbeitet, importiert oder auf andere Weise geändert werden können. Das Einfrieren schützt genehmigte Zahlen vor versehentlichen Änderungen.

### Wann verwenden

- Nach der Genehmigung des Jahresbudgets
- Beim Abschluss einer Geschäftsperiode
- Zum Schutz von Ist-Werten vor Änderungen

### Funktionsweise

1. **Wählen Sie ein Jahr** aus dem Dropdown (Bereich: aktuelles Jahr minus eins bis aktuelles Jahr plus vier)
2. **Wählen Sie Geltungsbereiche**: Aktivieren Sie **OPEX**, **CAPEX** oder beides
3. **Wählen Sie Spalten** für jeden Bereich: Budget, Revision, Ist-Werte, Endwert (alle vier sind standardmäßig ausgewählt)
4. Klicken Sie auf **Daten einfrieren** zum Sperren oder **Daten freigeben** zum Entsperren

### Was das Einfrieren bewirkt

- Verhindert Bearbeitungen an eingefrorenen Spalten in OPEX- und CAPEX-Arbeitsbereichen
- Blockiert CSV-Importe in eingefrorene Spalten
- Blockiert Kopier- und Zurücksetzungsoperationen für eingefrorene Spalten
- Beeinflusst **nicht** den Lesezugriff -- Daten bleiben sichtbar

### Aktueller Status

Unterhalb der Steuerelemente zeigen zwei Karten den Echtzeit-Einfrierstatus für jede Spalte in OPEX und CAPEX. Jede Spalte zeigt entweder **Eingefroren** (in Rot) oder **Bearbeitbar** an.

### Berechtigungen

Ohne `budget_ops:admin` können Sie den Einfrierstatus weiterhin einsehen, aber die Steuerelemente sind deaktiviert. Ein Hinweisbanner erklärt, was benötigt wird.

---

## Budgetspalten kopieren

Kopieren Sie Budgetdaten von einem Jahr und einer Spalte in eine andere, mit einer optionalen prozentualen Anpassung. Dies ist das primäre Werkzeug zur Vorbereitung des nächsten Jahresbudgets aus dem aktuellen.

### Wann verwenden

- Vorbereitung des nächsten Jahresbudgets aus dem aktuellen Jahr
- Erstellen einer Revision aus dem genehmigten Budget
- Fortschreibung von Prognosen mit einem Inflationsfaktor

### Felder

| Feld | Beschreibung |
|------|--------------|
| **Quelljahr** | Jahr, aus dem kopiert wird (Bereich: aktuelles Jahr minus eins bis aktuelles Jahr plus fünf) |
| **Quellspalte** | Budget, Revision, Prognose oder Endwert |
| **Zieljahr** | Jahr, in das kopiert wird (gleicher Bereich) |
| **Zielspalte** | Budget, Revision, Prognose oder Endwert |
| **Prozentuale Erhöhung** | Anpassung der kopierten Werte (z. B. `3` = +3 %). Standard ist 0. Dezimalwerte möglich. |
| **Vorhandene Daten überschreiben** | Umschalter. Wenn aus, werden Elemente die bereits einen Wert im Ziel haben, übersprungen. Wenn ein, werden alle Zielwerte ersetzt. |

### Zwei-Schritt-Prozess: Testlauf, dann Kopieren

1. Klicken Sie auf **Testlauf**, um eine Vorschau zu erstellen, ohne Daten zu ändern
2. Überprüfen Sie das Vorschau-Grid, das zeigt:
   - **Produkt**name (Elemente mit `[SKIP]` werden nicht geändert)
   - **Quellwert** (aus dem Quelljahr/der Quellspalte)
   - **Aktueller Zielwert**
   - **Vorschauwert** (was das Ziel nach dem Kopieren wird)
3. Wenn Sie zufrieden sind, klicken Sie auf **Daten kopieren** zum Anwenden

Die Schaltfläche **Daten kopieren** ist erst nach einem erfolgreichen Testlauf aktiviert.

### Zusammenfassungsstatistiken

Unterhalb des Grids zeigt eine Statistikleiste:

- **Gesamtelemente** im Datensatz
- **Zu verarbeitende Elemente** (nicht übersprungene)
- **Quellsumme** (Summe der Quellwerte)
- **Aktuelle Zielsumme**
- **Vorschausumme** (nach Testlauf angezeigt)

### Überschreibungsverhalten

| Überschreiben | Ziel hat Daten | Ergebnis |
|---------------|----------------|----------|
| Aus | Ja | Übersprungen |
| Aus | Nein (Null) | Kopiert |
| Ein | Ja | Ersetzt |
| Ein | Nein (Null) | Kopiert |

### Schutz eingefrorener Spalten

Wenn die Zielspalte eingefroren ist, sind sowohl **Testlauf** als auch **Daten kopieren** deaktiviert. Ein Fehlerbanner weist Sie an, zuerst die Sperrung aufzuheben.

---

## Zuordnungen kopieren

Kopieren Sie Zuordnungsmethoden und Prozentsätze von einem Jahr in ein anderes für alle OPEX-Positionen. Dies erspart Ihnen die Neueingabe der Leistungsverrechnungs-Konfigurationen beim Einrichten eines neuen Geschäftsjahres.

### Wann verwenden

- Vorbereitung des nächsten Jahresbudgets mit denselben Kostenzuordnungen
- Fortschreibung der Leistungsverrechnungs-Konfigurationen
- Einrichtung eines neuen Geschäftsjahres

### Felder

| Feld | Beschreibung |
|------|--------------|
| **Quelljahr** | Jahr, aus dem die Zuordnungen kopiert werden (Bereich: aktuelles Jahr minus eins bis aktuelles Jahr plus fünf) |
| **Zieljahr** | Jahr, in das die Zuordnungen kopiert werden (gleicher Bereich). Muss sich vom Quelljahr unterscheiden. |
| **Vorhandene Daten überschreiben** | Umschalter. Wenn aus, werden Elemente übersprungen, die im Ziel bereits Zuordnungen haben. |

### Zwei-Schritt-Prozess: Testlauf, dann Kopieren

1. Klicken Sie auf **Testlauf**, um eine Vorschau zu sehen
2. Das Vorschau-Grid zeigt jede OPEX-Position mit:
   - **Produkt**name
   - **Aktion** -- was geschehen wird (Wird kopiert, Übersprungen -- kein Quelljahr, Übersprungen -- keine Zuordnungen in der Quelle, Übersprungen -- Ziel hat Daten, Fehler)
   - **Quell**methode und -bezeichnung
   - **Ziel** aktuelle Methode und Bezeichnung
   - **Ergebnis nach Kopieren** -- wie das Ziel aussehen wird
3. Klicken Sie auf **Daten kopieren** zum Anwenden

### Validierung

- Quell- und Zieljahr müssen unterschiedlich sein. Bei Übereinstimmung erscheint ein Warnbanner und beide Schaltflächen werden deaktiviert.
- Jede Filteränderung löscht die Vorschau und erfordert einen neuen Testlauf.

### Zusammenfassung

Nach einem Testlauf zeigt ein Banner die Anzahl der kopierberiten, übersprungenen und fehlerhaften Elemente. Wenn Elemente übersprungen wurden, weil das Ziel bereits Zuordnungen hat, erscheint eine separate Warnung mit dem Vorschlag, die Überschreibung zu aktivieren.

---

## Budgetspalte zurücksetzen

Löschen Sie alle Daten einer bestimmten Budgetspalte für ein gegebenes Jahr. Dies ist eine destruktive Operation -- verwenden Sie sie, wenn Sie neu beginnen müssen.

### Wann verwenden

- Neustart der Budgetplanung
- Korrektur von Massendateneingabefehlern
- Löschen von Testdaten

### Felder

| Feld | Beschreibung |
|------|--------------|
| **Jahr** | Das zu löschende Geschäftsjahr (Bereich: aktuelles Jahr minus eins bis aktuelles Jahr plus fünf) |
| **Budgetspalte** | Budget, Revision, Prognose oder Endwert |

### Vorschau

Die Seite lädt ein Grid mit jeder OPEX-Position und ihrem aktuellen Wert in der ausgewählten Spalte. Elemente mit Daten sind rot hervorgehoben. Unterhalb des Grids erscheinen drei Statistiken:

- **Gesamtelemente**
- **Elemente mit Daten** (werden gelöscht)
- **Aktueller Gesamtwert**

### Bestätigung

Klicken auf **Spalte löschen** öffnet einen Bestätigungsdialog, der zeigt:

- Die zu löschende Spalte und das Jahr
- Die Anzahl der betroffenen Elemente
- Den Gesamtwert, der gelöscht wird
- Eine deutliche Warnung, dass diese Aktion nicht rückgängig gemacht werden kann

Sie müssen im Dialog auf **Spalte löschen** klicken, um fortzufahren, oder **Abbrechen** zum Abbrechen.

### Sicherheitsfunktionen

- Die Schaltfläche **Spalte löschen** ist deaktiviert, wenn keine Daten vorhanden sind
- Eingefrorene Spalten können nicht zurückgesetzt werden -- heben Sie zuerst die Sperrung auf
- Der Bestätigungsdialog erfordert eine explizite Bestätigung

---

## Workflow-Beispiel: Jährlicher Budgetzyklus

Hier ist eine typische Abfolge mit diesen Werkzeugen:

### 1. Ende des Jahres N

1. Ist-Werte des Jahres N einfrieren (historische Daten schützen)
2. N Budget nach N+1 Budget kopieren (mit prozentualer Erhöhung für Inflation)
3. N Zuordnungen nach N+1 kopieren

### 2. Während der Budgetplanung (N+1)

1. Teams bearbeiten die Budgetspalte N+1
2. CFO prüft und genehmigt

### 3. Budgetgenehmigung

1. N+1 Budget einfrieren (genehmigtes Budget sperren)
2. N+1 Budget nach N+1 Revision kopieren (Ausgangspunkt für unterjährige Nachverfolgung)

### 4. Halbjahresrevision

1. Teams aktualisieren die N+1 Revision mit Prognoseänderungen
2. Nach Finalisierung N+1 Revision einfrieren

---

## Tipps

- **Immer zuerst einen Testlauf durchführen**: Sowohl Budgetspalten kopieren als auch Zuordnungen kopieren unterstützen einen Testlauf. Verwenden Sie ihn jedes Mal, um das Ergebnis vor dem Festschreiben zu überprüfen.
- **Nach Genehmigung einfrieren**: Das Sperren von Spalten nach der Genehmigung bewahrt Ihren Audit-Trail und verhindert versehentliche Bearbeitungen.
- **Prozentuale Anpassungen verwenden**: Beim Kopieren zwischen Jahren wenden Sie einen Inflations- oder Wachstumsfaktor an, damit Sie nicht jede Zeile manuell anpassen müssen.
- **Einfrierstatus vor Massenoperationen prüfen**: Eingefrorene Spalten blockieren Kopier- und Zurücksetzungsoperationen. Wenn eine Schaltfläche ausgegraut ist, prüfen Sie zuerst die Einfrierseite.
- **Mit Vorsicht zurücksetzen**: Das Zurücksetzen von Spalten ist irreversibel. Überprüfen Sie Jahr und Spalte doppelt, bevor Sie bestätigen.
