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

## Statusänderungsbericht

Verwenden Sie diesen Bericht, um Elemente zu verfolgen, deren Status sich während eines ausgewählten Zeitraums geändert hat.

### Was er zeigt
- **Eine Zeile pro Element** (eigenständige Aufgabe, Anfrage oder Projekt).
- **Nur die letzte Statusänderung im Zeitraum** für jedes Element.
- **Endgültiger Status, der im ausgewählten Zeitraum erreicht wurde** (wenn mehrere Änderungen im Zeitraum stattfanden).
- **Zuletzt geändert**-Datum für das beibehaltene Statusänderungsereignis.

### Filter
- **Startdatum** und **Enddatum** (erforderlicher Zeitraum)
- **Status** (Mehrfachauswahl)
- **Elementtyp** (Mehrfachauswahl: Aufgaben, Anfragen, Projekte)
- **Quelle** (Mehrfachauswahl)
- **Kategorie** (Mehrfachauswahl)
- **Stream** (Mehrfachauswahl; verfügbar wenn mindestens eine Kategorie ausgewählt ist)

### Einschlussregeln
- Das Element wird nur eingeschlossen, wenn sich sein Status während des ausgewählten Zeitraums geändert hat.
- Bei Aufgaben werden nur **eigenständige Aufgaben** eingeschlossen (projektverknüpfte Aufgaben sind ausgeschlossen).
- Die Statusfilterung gilt für den Status, der nach der Änderung erreicht wurde.

### Tabellenspalten
- **Name** (klickbar; öffnet das Element)
- **Elementtyp**
- **Priorität**
- **Status**
- **Quelle**
- **Kategorie**
- **Stream**
- **Unternehmen**
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

Verwenden Sie diesen Bericht, um eine wöchentliche Stakeholder-Zusammenfassung mit Projektaktualisierungen, abgeschlossenen Aufgaben und Anfrageänderungen über einen ausgewählten Zeitraum zu erstellen.

### Was er zeigt

Der Bericht ist in drei Tabellen aufgeteilt:

- **Projektaktualisierungen** -- Projekte, deren Status sich während des Zeitraums geändert hat.
- **Abgeschlossene Aufgaben** -- Eigenständige Aufgaben, die während des Zeitraums abgeschlossen wurden.
- **Anfrageaktualisierungen** -- Anfragen, deren Status sich während des Zeitraums geändert hat.

Eine Zusammenfassungszeile über den Tabellen zeigt die Anzahl für jeden Abschnitt.

### Filter

- **Startdatum** und **Enddatum** (Standard: letzte 7 Tage)
- **Quelle** (Mehrfachauswahl)
- **Kategorie** (Mehrfachauswahl)
- **Stream** (Mehrfachauswahl; auf ausgewählte Kategorien beschränkt)
- **Aufgabentypen** (Mehrfachauswahl; gilt für die Tabelle Abgeschlossene Aufgaben)

### Tabellenspalten

**Projektaktualisierungen**: Projektname (klickbar), Priorität, Quelle, Kategorie, Stream, Fortschritt, Status

**Abgeschlossene Aufgaben**: Aufgabenname (klickbar), Aufgabentyp, Priorität, Quelle, Kategorie, Stream, Status

**Anfrageaktualisierungen**: Anfragename (klickbar), Quelle, Kategorie, Stream, Status

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
