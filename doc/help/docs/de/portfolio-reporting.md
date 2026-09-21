# Portfolio-Berichte

Portfolio-Berichte bieten Analysen mit Fokus auf Arbeitslast, Kapazität und Umsetzungssignale.

## Erste Schritte

Navigieren Sie zu **Portfolio > Berichte**, um den Berichtshub zu öffnen.

**Berechtigungen**:
- Sie benötigen mindestens `portfolio_reports:reader`, um auf Portfolio-Berichte zuzugreifen.

Wenn Sie Berichte nicht im Menü sehen, bitten Sie Ihren Administrator, Ihnen Zugriff zu gewähren.

---

## Berichts-Startseite

Die Startseite der Portfolio-Berichte listet verfügbare Portfolio-Berichte als Karten auf. Klicken Sie auf eine Karte, um den Bericht zu öffnen.

Derzeit verfügbar:
- **Statusänderungsbericht**
- **Kapazitäts-Heatmap**
- **Wochenbericht**

---

## Steuerung

Der erste Streifen über den Berichtskarten ist die tägliche Steuerungsansicht. Er beantwortet zwei Fragen: Was hat sich zuletzt bewegt, und was wartet auf jemanden.

### Der Zeitraum

Die Kopfzeile zeigt den verwendeten Zeitraum und erlaubt den Wechsel zwischen den letzten 7, 30 und 90 Tagen. Der Zeitraum endet immer heute und wird in Ihrer eigenen Zeitzone gelesen. Ihre Wahl wird in diesem Browser gemerkt.

### Fluss

Eine Zeile je Entität liest sich so: **14 erstellt · 9 abgeschlossen · 52 offen (+5)**.

- **Erstellt**: Elemente, die im Zeitraum angelegt wurden und heute noch vorhanden sind.
- **Abgeschlossen**: Elemente, die im Zeitraum von einem offenen in einen geschlossenen Status gewechselt sind. Geschlossen heißt Erledigt oder Abgebrochen bei Aufgaben und Projekten, Abgelehnt oder Umgewandelt bei Anfragen.
- **Offen**: Elemente, die gerade offen sind, unabhängig davon, was im Zeitraum geschah. Diese Zahl ist ein Link auf die passende Liste.
- **(+5)**: die Nettoveränderung, nur sichtbar, wenn sie nicht null ist. Sie ist erstellt, plus wieder geöffnet, minus abgeschlossen. Wieder geöffnet sind Elemente, die aus einem geschlossenen Status zurück in einen offenen gewechselt sind. Fahren Sie über die Zahl, um die Formel zu sehen.

Erstellt und abgeschlossen stammen aus der Änderungshistorie. Sie erfassen damit jeden Schreibweg: die Anwendung, einen CSV-Import und die Agenten. Kein Listenfilter bildet diese Historie nach, deshalb sind diese beiden Zahlen keine Links.

### Welche Aufgaben zählen

Jede Aufgabenzahl zählt nur eigenständige Aufgaben und Projektaufgaben. Aufgaben an einem Vertrag, einer Ausgabenposition, einer CAPEX-Position oder einem Vorfall gehören zu jenen Abläufen und bleiben in diesem Streifen überall außen vor.

### Handlungsbedarf

Die letzte Zeile erscheint nur, wenn etwas eine Entscheidung braucht:
- **Überfällige Aufgaben**: offene Aufgaben, deren Fälligkeitsdatum vor heute liegt. Die Zahl öffnet die Aufgabenliste, gefiltert auf dieselben Elemente.
- **Aufgaben ohne zuständige Person**: offene Aufgaben, die niemand trägt. Die Aufgabenliste kennt keinen Filter auf eine leere Zuständigkeit, deshalb ist diese Zahl kein Link.
- **Projekte seit 30 Tagen ohne Aktivität**: Projekte in Arbeit oder im Test, bei denen seit einem Monat nichts geschehen ist. Ein Klick öffnet eine kurze Liste dieser Projekte mit dem Datum ihrer letzten Aktivität, und jeder Name öffnet das Projekt.

Aktivität wird weit gefasst. Ein Projekt gilt als aktiv, sobald sich etwas an ihm oder an einer seiner Aufgaben geändert hat, sobald jemand in sein Journal geschrieben hat, oder sobald Zeit auf das Projekt oder auf eine seiner Aufgaben gebucht wurde. Ein Projekt erscheint hier nur, wenn all das älter als 30 Tage ist.

---

## Zu klassifizieren

Über den Berichtskarten zeigt ein kompakter Streifen, wie viel Ihrer offenen Arbeit noch keinen Klassifizierungswert hat. Nutzen Sie ihn als tägliche Steuerungshilfe: Lücke sehen, anklicken, schließen.

### Was gezählt wird

Eine Zeile je Entität, nur für offene Elemente:
- **Aufgaben**: Status außer Erledigt und Abgebrochen.
- **Anfragen**: Status außer Abgelehnt und Umgewandelt.
- **Projekte**: Status außer Erledigt und Abgebrochen.

Jede Zeile nennt, wie viele dieser Elemente keine Quelle, keine Kategorie und keinen Stream haben. Bei Aufgaben kommt hinzu, wie viele keinen Aufgabentyp haben.

### Welche Aufgaben ausgeschlossen sind

Gezählt werden nur eigenständige Aufgaben und Projektaufgaben. Aufgaben an einem Vertrag, einer Ausgabenposition, einer CAPEX-Position oder einem Vorfall tragen nie eine Klassifizierung. Sie zu zählen würde eine Lücke melden, die niemand schließen kann.

Eine Projektaufgabe ohne eigene Klassifizierung erbt die ihres Projekts, und die Aufgabenliste zeigt diesen geerbten Wert. Die Zähler folgen derselben Regel. Eine Zahl führt Sie daher nie zu einer Liste, in der die Spalte bereits gefüllt ist.

### Streams

Ein fehlender Stream wird nur gezählt, wenn das Element bereits eine Kategorie hat und diese Kategorie mindestens einen aktiven Stream anbietet. Viele Kategorien bieten gar keinen Stream. Ein Element ganz ohne Kategorie ist bereits unter Kategorie gezählt.

### Die Liste öffnen

Jede Zahl über null ist ein Link. Ein Klick öffnet die passende Liste, bereits auf genau die Elemente hinter der Zahl gefiltert, über den gesamten Mandanten. Die Gesamtzahl der Liste entspricht der angeklickten Zahl. Nullen werden zur Einordnung angezeigt, sind aber nicht anklickbar.

Fehlt nichts, zeigt der Streifen eine einzige Zeile, die bestätigt, dass alles Offene klassifiziert ist.

---

## Statusänderungsbericht

Verwenden Sie diesen Bericht, um Elemente zu verfolgen, die in einem ausgewählten Zeitraum erstellt wurden oder deren Status sich in diesem Zeitraum geändert hat.

### Was er zeigt
- **Eine Zeile pro Element** (eigenständige Aufgabe, Anfrage oder Projekt).
- **Nur das letzte Ereignis im Zeitraum** für jedes Element, ob dieses Ereignis die Erstellung oder eine Statusänderung ist.
- **Status, den dieses Ereignis trägt**. Bei einer Erstellung ist das der Status, mit dem das Element erstellt wurde.
- **Erstellt**-Datum, ausgefüllt wenn das Element innerhalb des Zeitraums erstellt wurde, sonst leer.
- **Zuletzt geändert**-Datum für das beibehaltene Ereignis.

### Filter
- **Startdatum** und **Enddatum** (erforderlicher Zeitraum)
- **Status** (Mehrfachauswahl)
- **Elementtyp** (Mehrfachauswahl: Aufgaben, Anfragen, Projekte)
- **Quelle** (Mehrfachauswahl)
- **Kategorie** (Mehrfachauswahl)
- **Stream** (Mehrfachauswahl; verfügbar wenn mindestens eine Kategorie ausgewählt ist)

### Einschlussregeln
- Das Element wird eingeschlossen, wenn es während des ausgewählten Zeitraums erstellt wurde oder sich sein Status in diesem Zeitraum geändert hat.
- Ein Element, das im selben Zeitraum erstellt und danach in einen anderen Status versetzt wurde, erscheint einmal, mit dem Status seines letzten Ereignisses.
- Bei Aufgaben werden nur **eigenständige Aufgaben** eingeschlossen (projektverknüpfte Aufgaben sind ausgeschlossen).
- Die Statusfilterung gilt für den Status, den das beibehaltene Ereignis trägt.
- Der Zeitraum, das Datum **Erstellt** und das Datum **Zuletzt geändert** richten sich nach der Zeitzone Ihres Browsers.

### Tabellenspalten
- **Name** (klickbar; öffnet das Element)
- **Elementtyp**
- **Priorität**
- **Status**
- **Quelle**
- **Kategorie**
- **Stream**
- **Unternehmen**
- **Erstellt**
- **Zuletzt geändert**

Standardsortierung ist nach **Priorität** (höchste zuerst). Sie können nach jeder Spalte sortieren.

### Exporte
- **CSV**-Export
- **XLSX**-Export mit klickbaren Elementnamen

---

## Kapazitäts-Heatmap-Bericht

Verwenden Sie diesen Bericht, um aktuelle Arbeitslast, Kapazitätsdruck und nicht zugewiesene Arbeit zu verstehen.

### Was er zeigt
- **Verbleibender Aufwand** (IT + Business), angepasst nach Ausführungsfortschritt.
- **Kapazität** pro Mitwirkendem (historisch oder theoretisch).
- **Arbeitsmonate** (verbleibende Tage / Kapazitätstage pro Monat).
- **Nicht zugewiesene Arbeit**, wenn Aufwand nicht vollständig zugeordnet ist.
- **Personen ohne Mitwirkendenprofil**, die in einem Projekt eingeplant sind. Sie erscheinen am Ende der Liste mit ihren verbleibenden Tagen und ohne Kapazität, damit ihre Last sichtbar bleibt. Legen Sie ihr Mitwirkendenprofil an, um ihnen eine Kapazität zu geben.

### Filter
- **Teams** (Mehrfachauswahl, einschließlich **Kein Team**)
- **Status** (Standard: Warteliste, Geplant, In Bearbeitung, Im Test, Zurückgestellt)
- **Kapazitätsmodus**: Historisch (Standard) oder Theoretisch
- **Gruppieren nach**: Mitwirkende (Standard) oder Teams

### Farbskala
Zellen in der Spalte **Arbeitsmonate** sind farbcodiert:

| Bereich | Farbe |
|-------|-------|
| <= 1 Monat | Grün |
| 1-3 Monate | Gelb |
| 3-6 Monate | Orange |
| 6-12 Monate | Rot |
| > 12 Monate | Violett |
| Keine Daten | Grau (k. A.) |

### Zusammenfassungskarten
Die Zusammenfassungszeile umfasst:
- **Gesamtanzahl Mitwirkende**
- **Durchschnittliche Arbeitsmonate** (nur Mitwirkende mit Kapazität)
- **Nicht zugewiesene Arbeit** (gesamte nicht zugeordnete Tage und Projektanzahl)

Klicken Sie auf **Nicht zugewiesene Arbeit**, um Details aufzuklappen.

### Detailansicht
Klicken Sie auf eine Mitwirkenden-Zeile, um eine Projektaufschlüsselung zu öffnen:
- Jede Zeile zeigt verbleibenden Aufwand, Zuordnung % und Ihre Tage.
- Projektnamen sind klickbar und öffnen den Reiter **Fortschritt** des Projekts.

### Exporte
- **CSV**: Die Heatmap-Tabelle exportieren
- **PNG**: Momentaufnahme des Berichts
- **Drucken**: Drucken oder als PDF speichern

---

## Wochenbericht

Verwenden Sie diesen Bericht, um eine wöchentliche Stakeholder-Zusammenfassung mit Projektaktualisierungen, Aufgabenaktivität und Anfrageänderungen über einen ausgewählten Zeitraum zu erstellen.

### Was er zeigt

Der Bericht ist in drei Tabellen aufgeteilt:

- **Projektaktualisierungen** -- Projekte, die während des Zeitraums erstellt wurden oder deren Status sich in diesem Zeitraum geändert hat.
- **Aufgabenaktivität** -- Aufgaben, die während des Zeitraums erstellt oder abgeschlossen (erledigt oder abgebrochen) wurden.
- **Anfrageaktualisierungen** -- Anfragen, die während des Zeitraums erstellt wurden oder deren Status sich in diesem Zeitraum geändert hat.

Jede Tabelle hat eine Spalte **Erstellt**. Sie trägt den Erstellungstag, wenn das Element innerhalb des Zeitraums erstellt wurde, und bleibt leer für Elemente, die nur ihren Status geändert haben.

Eine Zusammenfassungszeile über den Tabellen zeigt die Anzahlen: Projektaktualisierungen, erstellte Aufgaben, abgeschlossene Aufgaben und Anfrageaktualisierungen.

### Filter

- **Startdatum** und **Enddatum** (Standard: letzte 7 Tage)
- **Quelle** (Mehrfachauswahl)
- **Kategorie** (Mehrfachauswahl)
- **Stream** (Mehrfachauswahl; auf ausgewählte Kategorien beschränkt)
- **Aufgabentypen** (Mehrfachauswahl; gilt für die Tabelle Aufgabenaktivität)

### Tabellenspalten

**Projektaktualisierungen**: Projektname (klickbar), Priorität, Quelle, Kategorie, Stream, Fortschritt, Status, Erstellt

**Aufgabenaktivität**: Aufgabenname (klickbar), Aufgabentyp, Priorität, Quelle, Kategorie, Stream, Status, Erstellt

**Anfrageaktualisierungen**: Anfragename (klickbar), Quelle, Kategorie, Stream, Status, Erstellt

Die CSV- und XLSX-Exporte enthalten dieselben Spalten sowie eine Spalte **Zuletzt geändert** nach **Erstellt**.

Standardsortierung ist nach **Priorität** (höchste zuerst). Das Klicken eines Namens öffnet das Element.

### Exporte

- **CSV**-Export
- **XLSX**-Export

---

## Tipps
- **Mitwirkenden-Profile aktuell halten**: Die Kapazität basiert auf der Verfügbarkeit und den historischen Zeitstatistiken der Mitwirkenden.
- **Teamfilter verwenden**: Den Bericht auf eine Abteilung oder Funktion eingrenzen.
- **Nicht zugewiesene Arbeit überprüfen**: Hilft, Projekte mit fehlenden Zuordnungen oder fehlenden Leitern aufzudecken.
- **Wochenbericht für Stand-ups**: Den Wochenbericht als XLSX exportieren und mit Stakeholdern für Statusmeetings teilen.
