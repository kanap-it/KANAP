# Aufgaben

Aufgaben helfen Ihnen, Aktionspunkte, Ergebnisse und Arbeitspakete über Ihre KANAP-Entitäten hinweg zu verfolgen. Sie werden für Verlängerungserinnerungen, Nachverfolgungen, Compliance-Prüfungen, Projektergebnisse und jede andere Arbeit verwendet, die nachverfolgt werden muss.

## Erste Schritte

Navigieren Sie zu **Portfolio > Aufgaben**, um alle Aufgaben Ihrer Organisation zu sehen. Klicken Sie auf **Neu**, um eine Aufgabe zu erstellen.

### Eine neue Aufgabe erstellen

Wenn Sie auf **Neu** klicken, öffnet sich der vollständige Aufgaben-Arbeitsbereich. Um eine Aufgabe zu erstellen:

1. **Titel eingeben** (erforderlich):
   - Geben Sie den Aufgabentitel in das Textfeld oben ein

2. **Kontext wählen**:
   - **Eigenständige Aufgabe** (Standard): Belassen Sie „Bezogen auf" als **Eigenständig**
   - **Verknüpfte Aufgabe**: Wählen Sie **Projekt**, **OPEX**, **Vertrag** oder **CAPEX**, dann wählen Sie das spezifische Element

3. **Optionale Details ausfüllen**:
   - **Aufgabentyp**: Wählen Sie eine Kategorie für die Arbeit (z. B. Aufgabe, Bug, Problem, Incident). Standardmäßig „Aufgabe", falls verfügbar
   - **Beschreibung**: Fügen Sie detaillierte Informationen mit dem Markdown-Editor hinzu (unterstützt Formatierung, Listen, Links, Bilder)
   - **Phase**: Für Projektaufgaben eine Phase wählen oder als „Projektebene" belassen
   - **Klassifizierung** (eigenständige und Projektaufgaben): Quelle, Kategorie, Stream und Unternehmen festlegen. Für Projektaufgaben werden diese vom übergeordneten Projekt übernommen. Für eigenständige Aufgaben werden die Standardklassifizierungswerte Ihrer Organisation automatisch vorbelegt, wenn verfügbar
   - **Status**: Standardmäßig „Offen"
   - **Priorität**: Standardmäßig „Normal"
   - **Termine**: Start- und Fälligkeitsdatum festlegen
   - **Zugewiesen an**: Standardmäßig Sie; bei Bedarf ändern

4. Klicken Sie auf **Erstellen**, wenn Sie bereit sind (aktiviert, sobald der Titel festgelegt ist). Sie können auch **Strg+S** (oder **Cmd+S** auf dem Mac) drücken

**Tipp**: Sie können Bilder direkt in die Beschreibung einfügen. Sie werden automatisch in den Speicher hochgeladen, wenn Sie die Aufgabe erstellen.

**Hinweis**: Aufgaben können auch aus anderen Arbeitsbereichen heraus erstellt werden (OPEX-Positionen, Verträge, CAPEX-Positionen, Portfolio-Projekte), wobei die Verknüpfung vorausgewählt ist.

**Pflichtfelder**:
  - **Titel**: Eine kurze Beschreibung dessen, was zu tun ist

**Dringend empfohlen**:
  - **Beschreibung**: Detaillierte Beschreibung der Aufgabe
  - **Zugewiesen an**: Wer ist verantwortlich
  - **Fälligkeitsdatum**: Wann muss es abgeschlossen sein

---

## Wo Sie es finden

- Pfad: **Portfolio > Aufgaben**
- Berechtigungen:
  - Sie benötigen mindestens `tasks:reader`, um Aufgaben anzuzeigen
  - Sie benötigen `tasks:member`, um Aufgaben zu erstellen und Aufgaben im eigenständigen/OPEX-/Vertrags-/CAPEX-Kontext zu bearbeiten
  - Sie benötigen `portfolio_projects:contributor`, um eine Aufgabe zu speichern, wenn der Zielkontext ein Projekt ist
  - Sie benötigen `tasks:admin` für Massenlöschung, CSV-Import und CSV-Export

Wenn Sie Aufgaben nicht im Menü sehen, bitten Sie Ihren Administrator, Ihnen die entsprechenden Berechtigungen zu erteilen.

---

## Arbeiten mit der Liste

Das Aufgabenraster zeigt alle Aufgaben Ihrer Organisation an.

**Oberer Bereichsfilter**:
  - **Meine Aufgaben** (Standard): zeigt Ihnen zugewiesene Aufgaben
  - **Aufgaben meines Teams**: zeigt Aufgaben, die einem Mitglied Ihres Portfolio-Teams zugewiesen sind (einschließlich Ihrer)
  - **Alle Aufgaben**: zeigt das vollständige Aufgabenraster
  - Wenn Sie keinem Portfolio-Team zugeordnet sind, ist **Aufgaben meines Teams** deaktiviert
  - Ihre Auswahl wird sitzungsübergreifend gespeichert -- beim Zurückkehren zur Seite wird Ihre letzte Auswahl wiederhergestellt

**Standardspalten** (standardmäßig sichtbar):

| Spalte | Was sie zeigt |
|--------|---------------|
| **#** | Elementreferenz (z. B. T-42). Klicken, um den Arbeitsbereich zu öffnen |
| **Aufgabentitel** | Der Aufgabenname. Klicken, um den Arbeitsbereich zu öffnen |
| **Aufgabentyp** | Die Art der Arbeit (z. B. Aufgabe, Bug, Problem, Incident) |
| **Kontext** | Der Entitätstyp (Projekt, OPEX, Vertrag, CAPEX oder „Eigenständig") |
| **Status** | Aktueller Zustand als farbiger Chip |
| **Bewertung** | Berechneter Prioritätswert |
| **Zugewiesen an** | Zugewiesene Person |
| **Klassifizierung** | Portfolio-Klassifizierungskategorie |
| **Stream** | Portfolio-Stream |

**Zusätzliche Spalten** (standardmäßig ausgeblendet, über Spaltenmenü aktivierbar):

| Spalte | Was sie zeigt |
|--------|---------------|
| **Verknüpfter Eintrag** | Der verknüpfte Entitätsname (leer bei eigenständigen Aufgaben) |
| **Phase** | Projektphase (für Projektaufgaben) |
| **Priorität** | Prioritätsstufe als farbiger Chip |
| **Fälligkeitsdatum** | Wann die Aufgabe fällig ist |
| **Erstellt** | Wann die Aufgabe erstellt wurde |
| **Zuletzt geändert** | Wann die Aufgabe zuletzt aktualisiert wurde |
| **Beschreibung** | Aufgabenbeschreibungstext |
| **Quelle** | Portfolio-Quellklassifizierung |
| **Unternehmen** | Unternehmensklassifizierung |

**Statusfarben**:
  - **Offen**: Grau
  - **In Bearbeitung**: Orange
  - **Ausstehend**: Blau
  - **Im Test**: Lila
  - **Erledigt**: Grün
  - **Abgebrochen**: Rot

**Prioritätsfarben**:
  - **Blocker**: Rot
  - **Hoch**: Orange
  - **Normal**: Grau
  - **Niedrig**: Blau
  - **Optional**: Grün

**Standardfilter**: Aktive Aufgaben werden standardmäßig angezeigt (`Offen`, `In Bearbeitung`, `Ausstehend`, `Im Test`). Fügen Sie `Erledigt` und `Abgebrochen` im Statusfilter hinzu, um abgeschlossene Aufgaben zu sehen.

**Aktionen**:
  - **Neu**: Eine eigenständige Aufgabe erstellen (erfordert `tasks:member`)
  - **CSV importieren**: Eine CSV-Datei hochladen, um Aufgaben zu erstellen oder zu aktualisieren (erfordert `tasks:admin`)
  - **CSV exportieren**: Aufgaben in eine CSV-Datei herunterladen (erfordert `tasks:admin`)
  - **Ausgewählte löschen**: Ausgewählte Aufgaben entfernen (erfordert `tasks:admin`)

---

## Der Aufgaben-Arbeitsbereich

Klicken Sie auf eine Zeile, um den Aufgaben-Arbeitsbereich zu öffnen. Der Arbeitsbereich verwendet ein Seitenleisten-Layout mit dem Hauptinhaltsbereich rechts und zusammenklappbaren Seitenleisten-Abschnitten links.

### Kopfzeilen-Werkzeugleiste

Die Arbeitsbereich-Kopfzeile enthält:
  - **Zurück zu Aufgaben** (oder zurück zum ursprünglichen Projekt-Arbeitsbereich)
  - **Positionsanzeige**: Zeigt Ihre Position in der gefilterten Liste (z. B. „3 von 12")
  - **Link senden**: Einen Link zur Aufgabe per E-Mail senden
  - **In Anfrage umwandeln**: Die Aufgabe zu einer Portfolio-Anfrage heraufstufen
  - **Zurück / Weiter**-Pfeile: Zwischen Aufgaben in der aktuellen Listenreihenfolge navigieren
  - **Löschen**: Die Aufgabe entfernen (erfordert `tasks:admin`)
  - **Speichern**: Ausstehende Änderungen speichern (auch über **Strg+S** verfügbar)
  - **Schließen**: Zur Aufgabenliste zurückkehren

Unterhalb der Werkzeugleiste zeigt der Titelbereich:
  - **Prioritätsbewertungs-Badge** (nur Projektaufgaben): Ein kreisförmiges Badge mit dem berechneten Prioritätswert
  - **Elementreferenz-Chip**: Klicken, um die Referenz (z. B. T-42) in die Zwischenablage zu kopieren
  - **Titel**: Klicken, um inline zu bearbeiten (erfordert `tasks:member`)
  - **Status-Chip**, **Projekt-Chip** (für Projektaufgaben, klicken um das Projekt zu öffnen), **Prioritäts-Chip**
  - **Dateien anhängen**-Schaltfläche: Den Datei-Upload-Bereich ein-/ausblenden

### Hauptinhaltsbereich

**Beschreibung**: Der Markdown-Editor unterstützt Formatierung, Listen, Links, Code-Blöcke und Bilder. Sie können Bilder direkt einfügen -- sie werden automatisch hochgeladen. Drücken Sie **Tab** vom Titelfeld, um in den Beschreibungseditor zu springen.

**Import / Export-Schaltflächen** (neben der Beschreibungsüberschrift):
  - **Import**: Eine `.docx`-Datei importieren, um den Beschreibungsinhalt zu ersetzen. Wenn die Beschreibung bereits Inhalt hat, werden Sie vor dem Ersetzen um Bestätigung gebeten. Der Dokumentenimport ist nach dem Speichern der Aufgabe verfügbar (nicht während der Erstellung)
  - **Export**: Die Beschreibung als PDF, DOCX oder ODT exportieren

**Anhänge**: Wenn der Upload-Bereich sichtbar ist, ziehen Sie Dateien per Drag & Drop oder klicken Sie auf **Dateien durchsuchen**. Hochgeladene Dateien erscheinen als Chips unter der Beschreibung. Klicken Sie auf einen Chip zum Herunterladen; klicken Sie auf die x-Schaltfläche zum Löschen (erfordert Bearbeitungsberechtigung). Maximal 20 MB pro Datei.

**Aktivitätsbereich**: Wechseln Sie zwischen drei Ansichten:
  - **Kommentare**: Einheitliches Aktivitätsformular (Kommentar + optionale Statusänderung + optionaler Zeiteintrag in einem Vorgang) plus der Kommentar-Thread
  - **Verlauf**: Alle Änderungen an der Aufgabe mit Zeitstempeln anzeigen
  - **Zeitprotokoll**: Zeiteinträge anzeigen und verwalten (nur für eigenständige und Projektaufgaben verfügbar)

### Seitenleisten-Abschnitte

Die Seitenleiste ist durch Ziehen ihres rechten Randes größenverstellbar. Sie enthält die folgenden zusammenklappbaren Abschnitte:

**Kontext**:
  - Verknüpftes Objekt (Projekt, OPEX-Position, Vertrag, CAPEX-Position oder „Eigenständige Aufgabe")
    - Während der Erstellung: Standard ist **Eigenständig**, oder wählen Sie einen Typ und ein Element
    - Nach der Erstellung (wenn Sie bearbeiten können): Der Kontext bleibt bearbeitbar und wird angewendet, wenn Sie auf **Speichern** klicken
  - Phase (nur für Projektaufgaben; erscheint nach Auswahl eines Projekts)

**Aufgabendetails**:
  - Aufgabentyp-Dropdown (z. B. Aufgabe, Bug, Problem, Incident)
  - Prioritätsstufe
  - Status-Dropdown (kann für Projektaufgaben nicht auf „Erledigt" gesetzt werden, ohne vorher Zeit erfasst zu haben)

**Klassifizierung** (nur für eigenständige und Projektaufgaben):
  - **Quelle**: Woher die Arbeit stammt
  - **Kategorie**: Die Portfolio-Kategorie für die Arbeit
  - **Stream**: Der spezifische Stream innerhalb der Kategorie (gefiltert nach ausgewählter Kategorie; deaktiviert, bis eine Kategorie ausgewählt ist)
  - **Unternehmen**: Das Unternehmen, auf das sich diese Arbeit bezieht
  - Für OPEX-/Vertrags-/CAPEX-Aufgaben ist dieser Abschnitt ausgeblendet, es sei denn, Klassifizierungswerte wurden zuvor gesetzt

**Zeit** (während der Erstellung und für OPEX-/Vertrags-/CAPEX-Aufgaben ausgeblendet):
  - Gesamtaufwand (angezeigt als Tage und Stunden)
  - **Zeit erfassen**-Schaltfläche zum Hinzufügen von Zeiteinträgen

**Personen**:
  - Antragsteller
  - Zugewiesen an
  - Beobachter (Mehrfachauswahl)

**Termine**:
  - Startdatum
  - Fälligkeitsdatum

**Wissensdatenbank** (nur vorhandene Aufgaben):
  - Wissensdatenbank-Artikel mit der Aufgabe verknüpfen oder neue direkt aus der Seitenleiste erstellen
  - Erfordert `knowledge:member` zum Erstellen neuer Artikel

### Aufgabenkontext ändern

Wenn Sie den Kontext einer Aufgabe ändern und speichern, wendet KANAP die Änderung in einem Vorgang an (Kontext + andere bearbeitete Felder zusammen).

- **Projekt zu Eigenständig**: Phase wird gelöscht, Klassifizierung wird beibehalten
- **Projekt zu OPEX/Vertrag/CAPEX**: Phase und Klassifizierung werden gelöscht
- **Beliebig zu Projekt**:
  - Projektberechtigung ist erforderlich (`portfolio_projects:contributor`)
  - Phase wird auf Projektebene zurückgesetzt, es sei denn, Sie wählen eine gültige Phase für dieses Projekt
  - Vorhandene Klassifizierung wird beibehalten; fehlende Werte werden automatisch aus Projektstandards ergänzt

---

## Aufgabenstatus

| Status | Bedeutung | Wann zu verwenden |
|--------|---------|-------------|
| **Offen** | Noch nicht begonnen | Standard für neue Aufgaben |
| **In Bearbeitung** | Arbeit hat begonnen | Wenn jemand anfängt daran zu arbeiten |
| **Ausstehend** | Warten auf jemand anderen | Wenn der Bearbeiter blockiert ist und Input/Entscheidung benötigt |
| **Im Test** | Bereit zur Validierung | Wenn die Implementierung abgeschlossen ist und auf Prüfung/Test wartet |
| **Erledigt** | Erfolgreich abgeschlossen | Wenn die Arbeit beendet ist (erfordert erfasste Zeit für Projektaufgaben) |
| **Abgebrochen** | Nicht mehr benötigt | Wenn die Aufgabe irrelevant wird |

**Wichtig**: Bei Projektaufgaben können Sie eine Aufgabe nicht als „Erledigt" markieren, bevor Sie mindestens etwas Zeit erfasst haben. Dies stellt eine genaue Aufwandsverfolgung sicher.

---

## Prioritätsstufen

| Priorität | Anwendungsfall |
|----------|----------|
| **Blocker** | Blockiert andere Arbeit; sofortige Aufmerksamkeit erforderlich |
| **Hoch** | Wichtig und zeitkritisch |
| **Normal** | Standardpriorität (Standard) |
| **Niedrig** | Kann bei Bedarf aufgeschoben werden |
| **Optional** | Wünschenswert, bei verfügbarer Kapazität bearbeiten |

---

## Zeiterfassung

Eigenständige Aufgaben und Projektaufgaben unterstützen eine detaillierte Zeiterfassung über die Zeitprotokoll-Funktion. Die Zeiterfassung ist für OPEX-, Vertrags- oder CAPEX-Aufgaben nicht verfügbar.

### Zeit erfassen

1. Klicken Sie auf die Schaltfläche **Zeit erfassen** im Seitenleisten-Abschnitt „Zeit"
2. Wählen Sie die **Kategorie**: IT oder Business (bestimmt, wie die Zeit zum Projektaufwand beiträgt)
3. Geben Sie das Datum ein, an dem die Arbeit durchgeführt wurde
4. Geben Sie die Zeit als Tage und/oder Stunden ein
5. Fügen Sie optional Notizen hinzu, die die Arbeit beschreiben
6. Klicken Sie auf **Zeit erfassen**

**Kategorie**: Bei Projektaufgaben bestimmt die Kategorie, ob die Zeit zum IT-Aufwand oder Business-Aufwand des Projekts zählt. Dies entspricht dem eigenen Zeiterfassungssystem des Projekts.

### Zeiteinträge anzeigen

Der Reiter **Zeitprotokoll** im Aktivitätsbereich zeigt alle Zeiteinträge für die Aufgabe:
  - Datum der durchgeführten Arbeit
  - Kategorie (IT oder Business)
  - Person, die die Zeit erfasst hat
  - Erfasste Stunden
  - Notizen

### Einträge bearbeiten oder löschen

Sie können Ihre eigenen Zeiteinträge aus der Zeitprotokoll-Tabelle bearbeiten oder löschen.

---

## Anhänge

Aufgaben unterstützen Dateianhänge für Dokumente, Screenshots und andere unterstützende Dateien.

### Anhänge hinzufügen

1. Klicken Sie auf die Schaltfläche **Dateien anhängen** in der Aufgaben-Kopfzeile
2. Der Upload-Bereich erscheint unter der Beschreibung
3. Entweder:
   - Ziehen Sie Dateien per Drag & Drop auf den Upload-Bereich, oder
   - Klicken Sie auf **Dateien durchsuchen**, um Dateien von Ihrem Computer auszuwählen
4. Dateien erscheinen als Chips unter der Beschreibung, sobald sie hochgeladen sind

**Dateigrößenlimit**: Maximal 20 MB pro Datei.

### Anhänge verwalten

- **Herunterladen**: Klicken Sie auf einen Anhang-Chip, um die Datei herunterzuladen
- **Löschen**: Klicken Sie auf die x-Schaltfläche am Chip, um den Anhang zu entfernen (erfordert Bearbeitungsberechtigung)

Anhänge sind für jeden sichtbar, der die Aufgabe anzeigen kann.

---

## Beschreibung importieren und exportieren

Das Beschreibungsfeld unterstützt das Importieren und Exportieren von Dokumenten, damit Sie mit Inhalten außerhalb von KANAP arbeiten können.

### Ein Dokument importieren

1. Öffnen Sie einen vorhandenen Aufgaben-Arbeitsbereich (Import ist während der Aufgabenerstellung nicht verfügbar)
2. Klicken Sie auf die Schaltfläche **Import** neben der Überschrift **Beschreibung**
3. Wählen Sie eine `.docx`-Datei von Ihrem Computer
4. Wenn die Beschreibung bereits Inhalt hat, bestätigen Sie, dass Sie ihn ersetzen möchten
5. Das Dokument wird in Markdown konvertiert und in den Editor geladen
6. Überprüfen Sie das Ergebnis und klicken Sie auf **Speichern**, um die Änderungen zu behalten

In das Dokument eingebettete Bilder werden automatisch in den Speicher hochgeladen. Wenn Inhalt nicht sauber konvertiert werden kann, erscheint eine Warnung am unteren Bildschirmrand.

### Beschreibung exportieren

1. Klicken Sie auf die Schaltfläche **Export** neben der Überschrift **Beschreibung**
2. Wählen Sie ein Format: **PDF**, **DOCX** oder **ODT**
3. Die Datei wird automatisch heruntergeladen

Die Export-Schaltfläche ist nur aktiviert, wenn die Beschreibung Inhalt hat.

---

## Kommentare und Verlauf

### Kommentare hinzufügen

1. Wählen Sie den Reiter **Kommentare** im Aktivitätsbereich
2. Geben Sie Ihren Kommentar in den Texteditor ein
3. Setzen Sie optional einen neuen Status im Status-Dropdown
4. Erfassen Sie optional Zeit mit dem Schieberegler (`0` bedeutet kein Zeiteintrag)
5. Klicken Sie auf **Absenden** (die Schaltflächenbeschriftung aktualisiert sich basierend auf Ihren ausgewählten Aktionen)

### Verhalten des einheitlichen Aktivitätsformulars

- Sie können jede Kombination einreichen:
  - Nur Kommentar
  - Nur Statusänderung
  - Nur Zeiteintrag
  - Kommentar + Status + Zeit zusammen
- Für Projektaufgaben erfordert das Setzen des Status auf **Erledigt** erfasste Zeit (vorhandene + neu hinzugefügte)
- Das Status-Dropdown in der Seitenleiste funktioniert weiterhin unabhängig, wenn Sie diesen Ablauf bevorzugen

### Verlauf anzeigen

Der Reiter **Verlauf** zeigt alle Änderungen an der Aufgabe:
  - Statusänderungen
  - Feldänderungen
  - Wer jede Änderung wann vorgenommen hat

### E-Mail-Benachrichtigungen und Schnellaktionen

Wenn Aufgabenbenachrichtigungen aktiviert sind, können Status- und Kommentaraktualisierungen E-Mail-Benachrichtigungen auslösen.

- Wenn eine Statusänderung und ein Kommentar zusammen eingereicht werden, können Empfänger eine zusammengefasste E-Mail erhalten (abhängig von ihren Benachrichtigungseinstellungen)
- Status-E-Mails können Schnellaktions-Schaltflächen enthalten:
  - **Ausstehend**: `Antworten & Auf In Bearbeitung setzen`, `Als Erledigt markieren`
  - **Im Test**: `Genehmigen` (setzt `Erledigt`), `Auf In Bearbeitung setzen`
  - **Erledigt**: `Wieder öffnen` (setzt `Offen`)
- Das Klicken einer Aktionsschaltfläche öffnet die Aufgabenseite mit dem vorausgewählten Status im einheitlichen Aktivitätsformular

---

## Aufgaben aus anderen Arbeitsbereichen erstellen

Aufgaben werden am häufigsten aus anderen Arbeitsbereichen heraus erstellt:

### Aus Portfolio-Projekten
Im Projekt-Arbeitsbereich verwenden Sie den Reiter **Aufgaben**, um Projektergebnisse zu verwalten:
- Aufgaben für bestimmte Arbeitspakete erstellen
- Aufgaben Projektphasen zuweisen
- Zeit für jede Aufgabe erfassen

**Tipp**: Im Reiter Zeitplan klicken Sie auf die Schaltfläche **[+]** neben einer Phase, um eine Aufgabe zu erstellen, die bereits mit dieser Phase verknüpft ist.

### Aus OPEX-Positionen
Im OPEX-Arbeitsbereich verwenden Sie den Reiter **Aufgaben**, um Aufgaben zu erstellen wie:
- „Lieferantenpreise für 2026 überprüfen"
- „Mengenrabatt verhandeln"

### Aus Verträgen
Im Vertrags-Arbeitsbereich verwenden Sie den Reiter **Aufgaben** für:
- „Vertrag vor Verlängerungsfrist überprüfen"
- „Aktualisierte Konditionen beim Lieferanten anfordern"

### Aus CAPEX-Positionen
Im CAPEX-Arbeitsbereich verfolgen Aufgaben Projektmeilensteine:
- „Anforderungserhebung abschließen"
- „Budgetgenehmigung einholen"

Diese Aufgaben werden automatisch mit der übergeordneten Entität verknüpft und erscheinen sowohl in der Aufgabenliste als auch im übergeordneten Arbeitsbereich.

---

## Eigenständige Aufgaben

Eigenständige Aufgaben sind unabhängige Arbeitselemente, die nicht mit einem bestimmten Projekt, Vertrag oder Budgetposten verknüpft sind. Sie sind nützlich für:
- Allgemeine IT-Betriebsarbeit
- Ad-hoc-Anfragen
- Bereichsübergreifende Initiativen
- Persönliche Aufgabenverfolgung

### Eigenständige Aufgaben erstellen

1. Klicken Sie auf **Neu** auf der Aufgabenseite
2. Lassen Sie die „Bezogen auf"-Dropdowns leer
3. Die Seitenleiste zeigt „Eigenständige Aufgabe" anstelle einer verknüpften Entität
4. Füllen Sie Titel, Beschreibung und andere Details aus
5. Klicken Sie auf **Erstellen**

### Klassifizierungsfelder

Eigenständige Aufgaben und Projektaufgaben haben bearbeitbare Klassifizierungsfelder, die helfen, Arbeit nach Portfolio-Dimensionen zu organisieren:

- **Quelle**: Woher die Arbeit stammt (z. B. Business-Anfrage, IT-Initiative)
- **Kategorie**: Die Portfolio-Kategorie für die Arbeit
- **Stream**: Der spezifische Stream innerhalb der Kategorie (gefiltert nach ausgewählter Kategorie)
- **Unternehmen**: Das Unternehmen, auf das sich diese Arbeit bezieht

Diese Felder erscheinen im Abschnitt **Klassifizierung** der Seitenleiste und können jederzeit bearbeitet werden. Beim Erstellen einer neuen eigenständigen Aufgabe werden die Standardklassifizierungswerte Ihrer Organisation automatisch vorbelegt, wenn konfiguriert.

Für **Projektaufgaben** werden die Klassifizierungsstandards vom übergeordneten Projekt bei der Aufgabenerstellung übernommen, können aber unabhängig geändert werden. Dies ermöglicht es beispielsweise, dass eine Infrastrukturaufgabe innerhalb eines Business-Projekts existiert, oder eine Compliance-Aufgabe innerhalb eines IT-Projekts. Wenn die Klassifizierung einer Aufgabe nicht explizit gesetzt ist, erbt und zeigt sie die Klassifizierung des Projekts an.

### Prioritätsbewertung

Eigenständige Aufgaben (und alle Nicht-Projektaufgaben) verwenden einen festen Prioritätswert basierend auf ihrer Prioritätsstufe:

| Prioritätsstufe | Bewertung |
|---------------|-------|
| Blocker | 110 |
| Hoch | 90 |
| Normal | 70 |
| Niedrig | 50 |
| Optional | 30 |

Blocker-Aufgaben erhalten 110, um sicherzustellen, dass sie immer über den am höchsten priorisierten Projektaufgaben (max. 100) rangieren.

---

## Projektaufgaben

Projektaufgaben haben zusätzliche Funktionen im Vergleich zu regulären Aufgaben:

**Unabhängige Klassifizierung**: Projektaufgaben haben eigene Felder für Quelle, Kategorie, Stream und Unternehmen. Wenn eine Aufgabe innerhalb eines Projekts erstellt wird, werden diese der Einfachheit halber von der Klassifizierung des Projekts übernommen. Allerdings kann die Klassifizierung jeder Aufgabe unabhängig bearbeitet werden -- zum Beispiel kann eine Infrastrukturaufgabe innerhalb eines Business-Projekts existieren, oder eine Compliance-Aufgabe innerhalb eines IT-Projekts. Wenn ein Klassifizierungsfeld einer Aufgabe nicht explizit gesetzt ist, erbt und zeigt es den Wert des Projekts an.

**Prioritätsbewertung**: Projektaufgaben zeigen einen berechneten Prioritätswert an, der kombiniert:
- Den Prioritätswert des übergeordneten Projekts
- Eine Anpassung basierend auf der Prioritätsstufe der Aufgabe (+10 für Blocker, +5 für Hoch, 0 für Normal, -5 für Niedrig, -10 für Optional)

Der Wert wird als kreisförmiges Badge links vom Aufgabentitel im Arbeitsbereich angezeigt und entspricht dem Bewertungsanzeige-Stil des Projekts. In der Aufgabenliste zeigt die Spalte „Bewertung" diesen berechneten Wert.

**Phasenzuweisung**: Aufgaben können bestimmten Projektphasen zugewiesen oder als „Projektebene" für bereichsübergreifende Arbeit markiert werden.

**Zeitbeitrag**: Für Projektaufgaben erfasste Zeit trägt zu den tatsächlichen Aufwandsberechnungen des Projekts bei:
- IT-Kategoriezeit wird zu `Ist-Aufwand (IT)` addiert
- Business-Kategoriezeit wird zu `Ist-Aufwand (Business)` addiert
- Der Reiter „Fortschritt" des Projekts zeigt eine Aufschlüsselung von Projekt-Overhead vs. Aufgabenzeit
- Das vereinheitlichte Zeitprotokoll zeigt alle Zeiteinträge sowohl aus Projekt-Overhead als auch aus Aufgabenarbeit

**Status-Validierung**: Projektaufgaben können nicht als „Erledigt" markiert werden, ohne vorher Zeit erfasst zu haben. Dies stellt eine genaue Projektaufwandsverfolgung sicher.

**Filterung**: Der Reiter „Aufgaben" des Projekts enthält Filter für:
- Status (Alle, Aktiv, bestimmter Status)
- Phase (Alle Phasen, Projektebene, bestimmte Phase)

---

## CSV-Import/Export

Verwalten Sie Aufgaben im großen Maßstab mit CSV-Import und -Export. Diese Funktion unterstützt Massenoperationen für die anfängliche Datenübernahme, Aufgabenmigrationen und Datenextraktion für Berichte.

### Zugriff auf CSV-Funktionen

Aus der Aufgabenliste:
  - **CSV exportieren**: Aufgaben in eine CSV-Datei herunterladen
  - **CSV importieren**: Eine CSV-Datei hochladen, um Aufgaben zu erstellen oder zu aktualisieren
  - **Vorlage herunterladen**: Eine leere CSV mit korrekten Spaltenköpfen erhalten

**Erforderliche Berechtigungen**: `tasks:admin` für Import-/Export-Operationen.

### Export-Optionen

Drei Exportmodi sind verfügbar:

| Option | Beschreibung |
|--------|-------------|
| **Vollständiger Export** | Alle exportierbaren Felder -- verwenden Sie dies für Berichte und vollständige Datenextraktion |
| **Datenanreicherung** | Alle importierbaren Felder -- entspricht dem Import-Vorlagenformat, ideal für Roundtrip-Bearbeitung (exportieren, ändern, reimportieren) |
| **Benutzerdefinierte Auswahl** | Wählen Sie bestimmte Felder für Ihren Export aus |

**Vorlagen-Download** (aus dem Import-Dialog): Lädt eine leere CSV mit allen importierbaren Feldspaltenköpfen herunter -- verwenden Sie diese, um Importdateien mit der korrekten Struktur vorzubereiten.

### Import-Workflow

1. **Datei vorbereiten**: Verwenden Sie UTF-8-Kodierung mit Semikolon (`;`) als Trennzeichen. Laden Sie eine Vorlage herunter, um korrekte Spaltenköpfe sicherzustellen.

2. **Importeinstellungen wählen**:
   - **Modus**:
     - `Anreichern` (Standard): Leere Zellen behalten vorhandene Werte bei -- aktualisieren Sie nur, was Sie angeben
     - `Ersetzen`: Leere Zellen löschen vorhandene Werte -- vollständiger Ersatz aller Felder
   - **Operation**:
     - `Upsert` (Standard): Neue Aufgaben erstellen oder vorhandene aktualisieren
     - `Nur aktualisieren`: Nur vorhandene Aufgaben ändern, neue überspringen
     - `Nur einfügen`: Nur neue Aufgaben erstellen, vorhandene überspringen

3. **Zuerst validieren**: Klicken Sie auf **Preflight**, um Ihre Datei ohne Änderungen zu validieren. Überprüfen Sie Fehler und Warnungen.

4. **Änderungen anwenden**: Wenn die Validierung erfolgreich ist, klicken Sie auf **Importieren**, um die Änderungen zu übernehmen.

### Feldreferenz

**Grundfelder**:

| CSV-Spalte | Beschreibung | Erforderlich | Hinweise |
|------------|-------------|----------|-------|
| `id` | Aufgaben-UUID | Nein | Für Aktualisierungen; bei neuen Aufgaben leer lassen |
| `title` | Aufgabentitel | Ja | Teil des eindeutigen Identifikators |
| `description` | Aufgabendetails | Nein | Unterstützt Klartext |

**Kontextfelder**:

| CSV-Spalte | Beschreibung | Erforderlich | Hinweise |
|------------|-------------|----------|-------|
| `related_object_type` | Entitätstyp | Nein | Leer für eigenständige Aufgaben; akzeptiert Code oder Bezeichnung |
| `related_object_id` | Entitäts-UUID | Bedingt | Erforderlich bei verknüpfter Aufgabe und wenn `related_object_name` nicht angegeben |
| `related_object_name` | Entitätsname | Bedingt | Erforderlich bei verknüpfter Aufgabe und wenn `related_object_id` nicht angegeben |
| `phase_name` | Projektphase | Nein | Muss einem vorhandenen Phasennamen entsprechen (nur Projektaufgaben) |
| `priority_level` | Aufgabenpriorität | Nein | Akzeptiert Code oder Bezeichnung |
| `source_name` | Quelle | Nein | Portfolio-Quelle (eigenständige und Projektaufgaben) |
| `category_name` | Kategorie | Nein | Portfolio-Kategorie (eigenständige und Projektaufgaben) |
| `stream_name` | Stream | Nein | Portfolio-Stream (eigenständige und Projektaufgaben) |
| `company_name` | Unternehmen | Nein | Unternehmen (eigenständige und Projektaufgaben) |

**Eigenständige Aufgaben**: Lassen Sie `related_object_type`, `related_object_id` und `related_object_name` leer. Sie können Klassifizierungsfelder (`source_name`, `category_name`, `stream_name`, `company_name`) für eigenständige und Projektaufgaben setzen. Für Projektaufgaben werden ausgelassene Klassifizierungsfelder vom übergeordneten Projekt übernommen.

**Tipp**: Verwenden Sie bei neuen verknüpften Aufgabenimporten `related_object_name` anstelle von `related_object_id` -- es ist viel einfacher zu handhaben. Das System löst den Namen basierend auf `related_object_type` in die korrekte ID auf. Für Roundtrip-Importe (exportieren, bearbeiten, reimportieren) sind beide Felder enthalten, damit der Abgleich korrekt funktioniert.

**Status und Termine**:

| CSV-Spalte | Beschreibung | Hinweise |
|------------|-------------|-------|
| `status` | Aufgabenstatus | Akzeptiert Code oder Bezeichnung |
| `start_date` | Startdatum | Datumsformat: JJJJ-MM-TT |
| `due_date` | Fälligkeitsdatum | Datumsformat: JJJJ-MM-TT |

**Personenfelder**:

| CSV-Spalte | Beschreibung | Hinweise |
|------------|-------------|-------|
| `assignee_email` | Verantwortliche Person | Muss einer vorhandenen Benutzer-E-Mail entsprechen |
| `creator_email` | Antragsteller-E-Mail | Nur Export (in Feldmetadaten als **Antragsteller-E-Mail** angezeigt) |
| `viewer_email_1` bis `_4` | Beobachter | Müssen vorhandenen Benutzer-E-Mails entsprechen |
| `owner_email_1` bis `_4` | Verantwortliche | Müssen vorhandenen Benutzer-E-Mails entsprechen |

**Weitere Felder**:

| CSV-Spalte | Beschreibung | Hinweise |
|------------|-------------|-------|
| `labels` | Aufgaben-Labels | Kommagetrennte Liste |

### Bezeichnungs- und Code-Akzeptanz

Für die Felder **status**, **priority_level** und **related_object_type** können Sie entweder den internen Code oder eine gängige Bezeichnung verwenden:

**Statuswerte**:

| Code | Akzeptierte Bezeichnungen |
|------|-----------------|
| `open` | `Open` |
| `in_progress` | `In Progress`, `Active`, `Working` |
| `pending` | `Pending` |
| `in_testing` | `In Testing`, `Testing` |
| `done` | `Done`, `Completed`, `Complete`, `Finished`, `Closed` |
| `cancelled` | `Cancelled`, `Canceled` |

**Prioritätsstufenwerte**:

| Code | Akzeptierte Bezeichnungen |
|------|-----------------|
| `blocker` | `Blocker`, `Critical`, `Urgent` |
| `high` | `High` |
| `normal` | `Normal`, `Medium`, `Default` |
| `low` | `Low` |
| `optional` | `Optional`, `Nice to have` |

**Verknüpfter Objekttyp-Werte**:

| Code | Akzeptierte Bezeichnungen |
|------|-----------------|
| `project` | `Project` |
| `spend_item` | `Spend Item`, `Spend` |
| `contract` | `Contract` |
| `capex_item` | `CAPEX Item`, `CAPEX` |

Das System normalisiert Werte während des Imports automatisch.

### Abgleich und Aktualisierungen

Aufgaben werden nach **Titel + related_object_id** (Groß-/Kleinschreibung ignorierend) abgeglichen. Wenn eine Übereinstimmung gefunden wird:
  - Im Modus `Anreichern`: Nur nicht-leere CSV-Werte aktualisieren die Aufgabe
  - Im Modus `Ersetzen`: Alle Felder werden aktualisiert, leere Werte löschen vorhandene Daten

Wenn Sie die Spalte `id` mit einer gültigen UUID einschließen, verwendet der Abgleich zuerst die ID und fällt dann auf Titel + verknüpftes Objekt zurück.

**Hinweis**: Wenn Sie `related_object_name` anstelle von `related_object_id` angeben, löst das System den Namen vor dem Abgleich in die ID auf. Das bedeutet, dass Sie in Ihrer Importdatei durchgehend menschenlesbare Namen verwenden können.

### Nur-Export-Felder

Einige Felder erscheinen in Exporten, können aber nicht importiert werden. Dies sind systemverwaltete Felder, die die Datenintegrität gewährleisten:

| Feld | Warum es nur für Export ist |
|-------|---------------------|
| `creator_email` (Antragsteller) | Wird automatisch auf den Benutzer gesetzt, der die Aufgabe erstellt. Ein Import würde die Integrität des Audit-Protokolls gefährden -- es sollte nicht möglich sein, zu fälschen, wer eine Aufgabe angefragt/erstellt hat. Für neue Aufgaben setzt das System dies auf den importierenden Benutzer; für vorhandene Aufgaben wird der ursprüngliche Antragsteller beibehalten. |

Diese Felder sind im **Vollständigen Export** für Berichtszwecke enthalten, aber aus **Vorlage** und **Datenanreicherung**-Exporten ausgeschlossen, da sie während des Imports nicht geändert werden können.

### Einschränkungen

  - **Maximal 4 Beobachter/Verantwortliche**: Aufgaben unterstützen bis zu 4 Beobachter-E-Mails und 4 Verantwortlichen-E-Mails per CSV
  - **Klassifizierung nur für eigenständige und Projektaufgaben**: Quelle, Kategorie, Stream und Unternehmen können nur bei eigenständigen und Projektaufgaben gesetzt werden (nicht bei OPEX-, Vertrags- oder CAPEX-Aufgaben)
  - **Phase erfordert Projekt**: Phasenzuweisung funktioniert nur bei Projektaufgaben
  - **Kommentare nicht enthalten**: Aufgabenkommentare und -verlauf müssen im Arbeitsbereich verwaltet werden
  - **Zeitprotokoll nicht enthalten**: Zeiteinträge müssen im Arbeitsbereich erfasst werden
  - **Anhänge nicht enthalten**: Dateianhänge erfordern Verwaltung im Arbeitsbereich

### Fehlerbehebung

**Fehler „Datei ist nicht richtig formatiert"**: Dies deutet normalerweise auf ein Kodierungsproblem hin. Stellen Sie sicher, dass Ihre CSV als **UTF-8** gespeichert ist:

  - **In LibreOffice**: Wenn Sie eine CSV öffnen, wählen Sie `UTF-8` im Dropdown für den Zeichensatz (nicht „Japanese (Macintosh)" oder andere Kodierungen). Beim Speichern aktivieren Sie „Filtereinstellungen bearbeiten" und wählen Sie UTF-8.
  - **In Excel**: Speichern unter > CSV UTF-8 (Trennzeichen-getrennt), dann in einem Texteditor Kommas durch Semikolons ersetzen.
  - **Allgemeiner Tipp**: Wenn Sie verstümmelte Zeichen am Anfang Ihrer Datei sehen, ist die Kodierung falsch.

### Beispiel-CSV

Mit menschenlesbaren Namen (empfohlen für neue Importe):

```csv
title;related_object_type;related_object_name;status;priority_level;due_date;assignee_email;source_name;category_name
Review contract terms;Contract;Acme Software License;Open;High;2026-02-28;john.doe@example.com;;
Update documentation;project;Website Redesign;In Progress;Normal;2026-03-15;jane.smith@example.com;;
Schedule kickoff;spend_item;Cloud Hosting 2026;open;low;2026-04-01;bob.wilson@example.com;;
Audit IT security;;;open;high;2026-03-01;security@example.com;IT Initiative;Security
```

Die letzte Zeile ist eine **eigenständige Aufgabe** (kein verknüpftes Objekt) mit gesetzten Klassifizierungsfeldern.

Mit UUIDs (typischerweise aus Roundtrip-Exporten):

```csv
title;related_object_type;related_object_id;status;priority_level;due_date;assignee_email
Review contract terms;Contract;550e8400-e29b-41d4-a716-446655440000;Open;High;2026-02-28;john.doe@example.com
Update documentation;project;660e8400-e29b-41d4-a716-446655440001;In Progress;Normal;2026-03-15;jane.smith@example.com
Schedule kickoff;spend_item;770e8400-e29b-41d4-a716-446655440002;open;low;2026-04-01;bob.wilson@example.com
```

---

## Eine Aufgabe in eine Anfrage umwandeln

Sie können eine Aufgabe zu einer Portfolio-Anfrage heraufstufen, wenn die Arbeit eine formale Bewertung, Priorisierung oder schließlich ein eigenes Projekt verdient. Die Umwandlung ist über die Kopfzeile des Aufgaben-Arbeitsbereichs verfügbar.

### So funktioniert die Umwandlung

1. Öffnen Sie den Aufgaben-Arbeitsbereich
2. Klicken Sie auf **In Anfrage umwandeln** in der Kopfzeilen-Werkzeugleiste (neben **Link senden**)
3. Im Dialog:
   - **Anfragename**: Standardmäßig der Aufgabentitel -- bei Bedarf bearbeiten
   - **Zweck-Vorschau**: Zeigt die Aufgabenbeschreibung, die zum Zweck der Anfrage wird
   - **Ursprüngliche Aufgabe nach Umwandlung schließen**: Aktivieren Sie diese Option, wenn der Aufgabenstatus automatisch auf „Erledigt" gesetzt werden soll
4. Klicken Sie auf **In Anfrage umwandeln**

Nach der Umwandlung navigiert KANAP Sie zum neu erstellten Anfrage-Arbeitsbereich.

### Was übernommen wird

Die neue Anfrage erbt Folgendes von der ursprünglichen Aufgabe:

| Aufgabenfeld | Anfragefeld |
|------------|--------------|
| Titel | Name |
| Beschreibung | Zweck |
| Fälligkeitsdatum | Ziellieferdatum |
| Quelle, Kategorie, Stream, Unternehmen | Quelle, Kategorie, Stream, Unternehmen |
| Anhänge | Anhänge (kopiert) |

Die Anfrage wird mit dem Status **Prüfung ausstehend** erstellt und ist mit der ursprünglichen Aufgabe verknüpft. Ein Verlaufseintrag wird sowohl bei der Aufgabe („In Anfrage umgewandelt") als auch bei der Anfrage („Aus Aufgabe erstellt" mit einem Link zur ursprünglichen Aufgabe) erfasst.

### Bedingungen

- **Berechtigungen**: Sie benötigen sowohl `tasks:member` als auch `portfolio_requests:member`
- **Einmalige Umwandlung**: Jede Aufgabe kann nur einmal umgewandelt werden. Nach der Umwandlung ist die Schaltfläche **In Anfrage umwandeln** deaktiviert und zeigt die verknüpfte Anfragenreferenz (z. B. „Bereits umgewandelt in REQ-42")
- **Aufgabe bleibt bestehen**: Die ursprüngliche Aufgabe wird nicht gelöscht. Sofern Sie die Schließoption nicht aktivieren, bleibt sie in ihrem aktuellen Status und kann weiterhin unabhängig aktualisiert werden

**Tipp**: Diese Funktion ist nützlich, wenn eine Aufgabe eine größere Initiative aufdeckt, die ihren eigenen Anfragelebenszyklus benötigt -- Kriterienbewertung, Genehmigungs-Workflow und eventuelle Umwandlung in ein Projekt.

---

## Einen Link senden

Sie können schnell einen Link zu einer Aufgabe per E-Mail an Kollegen oder externe Kontakte senden.

1. Öffnen Sie den Aufgaben-Arbeitsbereich
2. Klicken Sie auf **Link senden** in der Kopfzeilen-Werkzeugleiste (links von den Navigationspfeilen)
3. Im Dialog:
   - **Empfänger auswählen**: Suchen Sie nach vorhandenen Plattformbenutzern nach Name oder E-Mail, und/oder geben Sie eine beliebige E-Mail-Adresse ein und drücken Sie Enter
   - **Nachricht hinzufügen** (optional): Fügen Sie eine persönliche Notiz hinzu
   - **Link kopieren**: Klicken Sie auf das Kopiersymbol, um die direkte URL zu übernehmen
4. Klicken Sie auf **Senden**

Empfänger erhalten eine E-Mail mit Ihrem Namen, dem Aufgabentitel, einem direkten Link und Ihrer Nachricht (falls angegeben). Dies ändert keine Berechtigungen -- es benachrichtigt lediglich die Empfänger.

**Tipp**: Sie können Plattformbenutzer und externe E-Mail-Adressen im selben Versand mischen.

---

## Tipps

  - **Fälligkeitsdaten verwenden**: Setzen Sie realistische Fälligkeitsdaten, um Fristen effektiv zu verfolgen.
  - **Verantwortliche zuweisen**: Jede Aufgabe sollte einen Bearbeiter für die Rechenschaftspflicht haben.
  - **Zeit regelmäßig erfassen**: Die Zeiterfassung hilft bei zukünftiger Projektschätzung.
  - **Nach Status filtern**: Der Standardfilter zeigt nur aktive Status (`Offen`, `In Bearbeitung`, `Ausstehend`, `Im Test`) -- fügen Sie `Erledigt` und `Abgebrochen` hinzu, wenn Sie historische Aufgaben überprüfen.
  - **Aus dem Kontext heraus erstellen**: Das Erstellen von Aufgaben aus Arbeitsbereichen heraus verknüpft sie automatisch.
  - **Priorität mit Bedacht verwenden**: Reservieren Sie „Blocker" für tatsächlich blockierende Probleme.
  - **Einheitliche Aktualisierungen nutzen**: Im Reiter „Kommentare" kombinieren Sie Kommentar + Status + Zeit in einer Aktion, um Verlauf und Benachrichtigungen abzustimmen.
  - **Dokumente importieren**: Verwenden Sie die Schaltfläche **Import**, um `.docx`-Dateien als Beschreibungsinhalt einzulesen, anstatt zu kopieren und einzufügen.
  - **Tastenkürzel**: Drücken Sie **Strg+S** (oder **Cmd+S** auf dem Mac), um schnell zu speichern, ohne die Speichern-Schaltfläche zu erreichen.
  - **Wissensartikel verknüpfen**: Verwenden Sie den Abschnitt „Wissensdatenbank" in der Seitenleiste, um relevante Dokumentation mit Ihren Aufgaben zu verbinden.
