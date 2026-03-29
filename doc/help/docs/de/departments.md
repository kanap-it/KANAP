# Abteilungen

Abteilungen repräsentieren organisatorische Einheiten innerhalb Ihrer Unternehmen. Verwenden Sie sie, um die Mitarbeiterzahl nach Jahr zu verfolgen, Kosten zuzuordnen und Zielgruppen für Anwendungen zu definieren. Jede Abteilung gehört zu einem Unternehmen und enthält jahresbezogene Mitarbeiterzahldaten, die in Leistungsverrechnungs- und Zuordnungsberechnungen einfließen.

## Erste Schritte

Navigieren Sie zu **Stammdaten > Abteilungen**, um Ihre Abteilungsliste zu sehen. Klicken Sie auf **Neu**, um Ihren ersten Eintrag zu erstellen.

**Pflichtfelder**:
- **Name**: Der Abteilungsname
- **Unternehmen**: Zu welchem Unternehmen diese Abteilung gehört

**Optional aber nützlich**:
- **Beschreibung**: Freitext-Beschreibung des Zwecks oder Umfangs der Abteilung
- **Mitarbeiterzahl**: Anzahl der Mitarbeiter, jahresweise erfasst (wird nach der Erstellung im Details-Tab gesetzt)

**Tipp**: Importieren Sie Abteilungen aus Ihrem HR-System, um Ihre Organisationsstruktur abzugleichen.

---

## Mit der Liste arbeiten

Das Abteilungs-Grid gibt Ihnen einen Überblick über alle Abteilungen mit ihrer Mitarbeiterzahl für ein bestimmtes Jahr.

**Standardspalten**:
- **Name**: Abteilungsname -- zum Öffnen des Arbeitsbereichs Übersichts-Tab anklicken
- **Unternehmen**: Übergeordnetes Unternehmen -- zum Öffnen des Arbeitsbereichs Übersichts-Tab anklicken
- **Mitarbeiterzahl (Jahr)**: Mitarbeiterzahl für das ausgewählte Jahr -- zum direkten Wechsel zum Details-Tab anklicken

**Zusätzliche Spalten** (über Spaltenauswahl):
- **Status**: Aktiviert oder Deaktiviert
- **Erstellt**: Wann die Abteilung erstellt wurde

**Jahrauswahl**: Verwenden Sie das Feld **Jahr** in der Symbolleiste, um zu wechseln, welche Jahresmitarbeiterzahl angezeigt wird. Das Grid aktualisiert sich automatisch bei Jahreswechsel.

**Statusbereich**: Verwenden Sie den Umschalter **Aktiviert / Deaktiviert / Alle**, um nach Abteilungsstatus zu filtern. Die Liste zeigt standardmäßig nur aktivierte Abteilungen.

**Schnellsuche**: Die Suchleiste filtert über Abteilungsnamen.

**Deep-Linking**: Jede Zelle im Grid ist ein anklickbarer Link. Name und Unternehmen öffnen den Übersichts-Tab; Mitarbeiterzahl öffnet den Details-Tab. Wenn Sie zu einem Arbeitsbereich navigieren und zurückkehren, bleiben Sortierreihenfolge, Suchabfrage und Filter erhalten.

**Aktionen**:
- **Neu**: Neue Abteilung erstellen (erfordert `departments:manager`)
- **CSV importieren**: Massenimport von Abteilungen (erfordert `departments:admin`)
- **CSV exportieren**: Als CSV exportieren (erfordert `departments:admin`)
- **Ausgewählte löschen**: Ausgewählte Abteilungen entfernen (erfordert `departments:admin`)

---

## Der Abteilungs-Arbeitsbereich

Klicken Sie auf eine beliebige Zeile, um den Arbeitsbereich zu öffnen. Er hat zwei Tabs, vertikal links angeordnet: **Übersicht** und **Details**.

Die Arbeitsbereich-Symbolleiste enthält **Zurück** / **Weiter**-Schaltflächen zum Wechseln zwischen Abteilungen ohne Rückkehr zur Liste sowie **Zurücksetzen** und **Speichern**-Schaltflächen. Bei nicht gespeicherten Änderungen beim Navigieren werden Sie aufgefordert, zu speichern oder zu verwerfen.

### Übersicht

Der Übersichts-Tab erfasst die Identität und den Status der Abteilung.

**Was Sie bearbeiten können**:
- **Name**: Abteilungsname (Pflicht)
- **Unternehmen**: Übergeordnetes Unternehmen -- verknüpft mit Unternehmen-Stammdaten (Pflicht). Unternehmen, die bereits eine Abteilung mit gleichem Namen haben, werden automatisch aus dem Dropdown ausgeschlossen, um Duplikate zu vermeiden.
- **Beschreibung**: Freitext-Beschreibung
- **Status**: Aktiviert oder Deaktiviert, mit optionalem geplanten Deaktivierungsdatum

**Tipp**: Beim Erstellen einer neuen Abteilung wird der Details-Tab erst nach dem Speichern des initialen Datensatzes verfügbar.

---

### Details

Der Details-Tab verwaltet jahresbezogene Mitarbeiterzahl-Kennzahlen.

**Jahrauswahl**: Wählen Sie über die Jahrreiter oben im Panel, welches Jahr angezeigt oder bearbeitet werden soll. Fünf Jahre stehen zur Verfügung: zwei Jahre vor dem aktuellen Jahr bis zwei Jahre danach.

**Kennzahlen pro Jahr**:
- **Mitarbeiterzahl**: Gesamtzahl der Mitarbeiter in dieser Abteilung für das ausgewählte Jahr

**Funktionsweise**:
- Die Mitarbeiterzahl fließt in Zielgruppenberechnungen für Anwendungen ein
- Werte werden pro Jahr gespeichert -- ein Jahreswechsel lädt die Daten dieses Jahres unabhängig
- Wenn die Kennzahlen für das ausgewählte Jahr von einem Administrator **eingefroren** wurden, ist das Feld gesperrt und ein Hinweis erklärt, wie die Sperre aufgehoben werden kann

**Tipp**: Aktualisieren Sie die Mitarbeiterzahl jährlich während Ihres Budgetplanungszyklus. Verwenden Sie die Jahrreiter, um zukünftige Jahre zu überprüfen oder vorzufüllen.

---

## CSV-Import/Export

Halten Sie Abteilungen mit Ihrem HR-System per CSV synchron.

**Export**:
- Lädt alle Abteilungen mit Kennzahlen des aktuellen Jahres herunter

**Import**:
- Verwenden Sie die **Vorprüfung** zum Validieren vor dem Anwenden
- Zuordnung über Abteilungsname + Unternehmensname
- Kann neue Abteilungen erstellen oder bestehende aktualisieren

**Pflichtfelder**: Name, Unternehmen

**Optionale Felder**: Mitarbeiterzahl, Status

**Hinweise**:
- Verwenden Sie **UTF-8-Kodierung** und **Semikolons** als Trennzeichen
- Mitarbeiterzahl-Werte sind jahresspezifisch -- importierte Werte gelten für das aktuelle Jahr

---

## Tipps

- **Organisationsstruktur abgleichen**: Spiegeln Sie die Abteilungshierarchie Ihres HR-Systems für Konsistenz wider.
- **Mitarbeiterzahl jährlich aktualisieren**: Setzen Sie sich eine Erinnerung, die Abteilungskennzahlen während der Budgetplanung zu aktualisieren.
- **Für Zuordnungen verwenden**: Die Abteilungs-Mitarbeiterzahl treibt Kostenzuordnungsberechnungen -- halten Sie sie aktuell.
- **Deaktivieren statt löschen**: Wenn Abteilungen umstrukturiert werden, deaktivieren Sie alte statt sie zu löschen, um historische Daten zu bewahren.
- **Deep-Links nutzen**: Klicken Sie direkt auf die Mitarbeiterzahl in der Liste, um zum Details-Tab zu springen und Kennzahlen ohne zusätzlichen Klick zu bearbeiten.
