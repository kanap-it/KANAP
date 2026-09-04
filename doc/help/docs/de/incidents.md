# Vorfallsregister

Das Vorfallsregister ist das Logbuch der bemerkenswerten Ereignisse, die Ihre IT betroffen haben: der Ausfall, der die Fakturierung drei Stunden lang lahmgelegt hat, der vom Mailfilter abgefangene Ransomware-Versuch, der Speicherausfall, der einen Tag an Sicherungen gekostet hat. Jeder Vorfall erhält eine dauerhafte Nummer, ein mit Zeitstempeln versehenes Journal, das niemand nachträglich umschreiben kann, und Verknüpfungen zu den betroffenen Assets, Anwendungen, Aufgaben und Dokumenten.

Es ist kein Service-Desk. Das Tagesgeschäft bleibt in Ihrem Ticketsystem; das Register bewahrt die Ereignisse auf, nach denen Ihre Geschäftsleitung, Ihre Prüfer und Ihr Versicherer in einem Jahr fragen werden.

## Was ins Register gehört

Erfassen Sie einen Vorfall, wenn das Ereignis es wert ist, festgehalten zu werden:

- Dienstunterbrechungen, die Benutzer, Kunden oder einen Geschäftsprozess betroffen haben
- Sicherheitsereignisse: Eindringversuche, Schadsoftware, Datenabflüsse, verlorene Geräte
- Datenverlust oder Datenbeschädigung, fehlgeschlagene Wiederherstellungen, Lücken in den Sicherungen
- Schwerwiegende Ausfälle bei Lieferanten oder Hostern, verletzte Service-Level
- Alles, was Sie später erklären oder einer Behörde melden müssen

Erfassen Sie keine Routinearbeit: Passwortzurücksetzungen, Probleme einzelner Benutzer, Standard-Änderungsanträge oder ein Ticket, das in zehn Minuten ohne Auswirkung gelöst war. Ein gutes Register enthält eine Handvoll Einträge pro Monat, nicht Tausende.

**Tipp**: Halten Sie die Ticketnummer im Feld **Externe Referenz** fest, damit jeder zur operativen Spur in Ihrem Ticketsystem zurückfindet.

---

## Erste Schritte

Gehen Sie zu **IT-Landschaft > Vorfälle**, um das Register zu sehen. Klicken Sie auf **Neuer Vorfall**, um einen zu erfassen.

**Pflichtfelder**:

- **Titel**: eine kurze, sachliche Zusammenfassung, z. B. „Mail-Dienst am Standort Lyon nicht verfügbar"
- **Schweregrad**: Kritisch, Schwerwiegend, Geringfügig oder Niedrig
- **Erkannt**: wann der Vorfall bemerkt wurde (standardmäßig jetzt)

**Auf demselben Bildschirm empfohlen**:

- **Beschreibung**: was passiert ist, wie beobachtet
- **Kategorie**: Infrastruktur, Sicherheit, Anwendung, Daten, Lieferant, Sonstiges (konfigurierbar, siehe [Kategorien](#kategorien))
- **Begonnen**: wann der Vorfall tatsächlich begann, falls das vom Zeitpunkt der Entdeckung abweicht
- **Verantwortlicher**: wer die Bearbeitung übernimmt

Der **Melder** sind standardmäßig Sie. Beide Daten akzeptieren Werte in der Vergangenheit: Ein am Montagmorgen entdeckter Vorfall kann als am Samstagabend begonnen erfasst werden.

**Berechtigungen**:

- Ansicht: `incidents:reader`
- Anlegen, bearbeiten, Journal, Verknüpfungen, Anhänge: `incidents:contributor`
- Wieder öffnen und abbrechen: `incidents:admin`

---

## Arbeiten mit der Liste

Die Liste ist das Register selbst: alle Vorfälle, die zuletzt erkannten zuerst.

**Standardspalten**:

| Spalte | Was sie zeigt |
|--------|---------------|
| **Ref** | Vorfallsreferenz (z. B. `INC-14`), in Monospace |
| **Titel** | Kurze Zusammenfassung (zum Öffnen des Vorfalls anklicken) |
| **Kategorie** | Klassifizierung aus den Einstellungen der IT-Landschaft |
| **Schweregrad** | Kritisch, Schwerwiegend, Geringfügig, Niedrig, mit einem farbigen Punkt |
| **Status** | Offen, In Bearbeitung, Behoben, Geschlossen, Abgebrochen, mit einem farbigen Punkt |
| **Erkannt** | Wann der Vorfall bemerkt wurde |
| **Behoben** | Wann der Dienst wiederhergestellt war |
| **Verantwortlicher** | Zuständige Person |
| **Assets** | Anzahl der verknüpften Assets |
| **Aufgaben** | Anzahl der Folgeaufgaben |

**Standardsortierung**: **Erkannt** absteigend (neueste zuerst).

**Zusätzliche Spalten** (standardmäßig ausgeblendet, über die Spaltenauswahl verfügbar): **Geschlossen**, **Anwendungen**, **Erstellt**.

**Filtern**: Kategorie, Schweregrad, Status und Verantwortlicher bieten Kontrollkästchenfilter, deren Optionen aus den aktuell angezeigten Vorfällen berechnet werden, Sie sehen also nur Werte, die in der Ergebnismenge vorkommen. Datumsspalten bieten Datumsfilter, auch als Bereich: Filtern Sie **Erkannt** zwischen zwei Daten, um einen Quartals- oder Jahresauszug zu erzeugen. Die Suche erfasst Titel, Beschreibung, Referenz (`INC-14`) sowie Namen und Referenzen verknüpfter Assets und Anwendungen: Eine Suche nach einem Hostnamen wie `PAR-ESX-01` listet die Vorfälle zu diesem Asset.

**Tipp**: Kombinieren Sie Schweregrad = Kritisch, Schwerwiegend mit einem Bereich für **Erkannt**, um die Auswahlliste zu erstellen, die die meisten Steuerungsgremien und Prüfungen verlangen.

Was Sie filtern, wird in den geöffneten Vorfall übernommen: **Zurück / Weiter** im Arbeitsbereich durchläuft genau diese Auswahlliste.

---

## Der Vorfalls-Arbeitsbereich

Klicken Sie auf eine beliebige Zeile, um den Vorfall zu öffnen. Der Arbeitsbereich hat einen **Kopfbereich** mit der Referenz und kurzen Metadaten, eine **Eigenschaftenleiste** rechts und einen **Inhaltsbereich** in der Mitte, der mit jedem Tab wechselt.

### Kopfbereich und Metadaten

Der Kopfbereich zeigt den Titel (direkt bearbeitbar), die Referenz `INC-N` (zum Kopieren anklicken), die Lebenszyklus-Aktionen und **Zurück / Weiter**, um die gefilterte Liste zu durchlaufen.

Die Metadatenzeile darunter zeigt **Status**, **Schweregrad**, **Verantwortlicher**, **Erkannt** und, sobald der Vorfall behoben ist, die **Dauer** zwischen Erkennung und Behebung. Schweregrad, Verantwortlicher und Erkannt lassen sich direkt in dieser Zeile ändern.

### Eigenschaftenleiste

Die Leiste bleibt auf jedem Tab sichtbar und speichert während der Bearbeitung.

**Klassifizierung**:

- **Kategorie**: aus der in den Einstellungen der IT-Landschaft konfigurierten Liste
- **Schweregrad**: Kritisch, Schwerwiegend, Geringfügig, Niedrig. Wählen Sie die Stufe, die die geschäftliche Auswirkung zum jeweiligen Zeitpunkt widerspiegelt; jede Änderung wird im Journal festgehalten, ein späteres Anheben oder Absenken ist also normal und nachvollziehbar
- **Status**: Offen, In Bearbeitung, Behoben, Geschlossen. Der Status bewegt sich nur vorwärts. Der Weg zurück führt über **Wieder öffnen**, damit das Register nicht unbemerkt zurückgedreht werden kann

**Daten**:

- **Begonnen**: wann der Vorfall tatsächlich begann
- **Erkannt**: wann er bemerkt wurde (Pflichtfeld)
- **Behoben**: wird automatisch gesetzt, wenn Sie den Status auf Behoben ändern, und bleibt bearbeitbar, solange der Vorfall offen ist, damit Sie den tatsächlichen Zeitpunkt der Wiederherstellung eintragen können
- **Geschlossen**: schreibgeschützt, wird beim Schließen des Vorfalls gesetzt

**Personen**: **Melder** (wer ihn erfasst hat) und **Verantwortlicher** (wer ihn bearbeitet).

**Quelle**: **Externe Referenz** für die Ticketnummer, die Alarm-ID oder die Mail-Referenz, über die der Vorfall zuerst gemeldet wurde.

**Compliance**: **Personenbezogene Daten betroffen**, **Meldung an Behörde erforderlich**, **Gemeldet am** (erscheint, sobald eine Meldung erforderlich ist) und **Informierte Parteien**.

**Datensatz**: Zeitstempel **Erstellt** und **Aktualisiert**, schreibgeschützt.

---

### Übersicht

Fünf Abschnitte erzählen den Vorfall, in der Reihenfolge, in der ein Vorfallsbericht üblicherweise gelesen wird. Jeder speichert automatisch während der Eingabe.

- **Beschreibung**: was passiert ist, wie beobachtet
- **Auswirkung**: betroffene Dienste, Standorte und Benutzer
- **Ursache**: warum es passiert ist
- **Korrekturmaßnahmen**: was zur Behebung und zur Vorbeugung getan wurde. Die eigentliche Folgearbeit verfolgen Sie als verknüpfte Aufgaben
- **Erkenntnisse**: was aus diesem Vorfall mitzunehmen ist

Bei einem geringfügigen Vorfall genügt die Beschreibung. Bei einem schwerwiegenden bilden die fünf Abschnitte den Post-Mortem-Bericht.

---

### Journal

Das Journal macht daraus ein Register statt eines Formulars. Es listet alles auf, was mit dem Vorfall geschehen ist, das Neueste zuerst, und **nichts darin lässt sich bearbeiten oder löschen**, von niemandem, zu keinem Zeitpunkt.

**Eine Notiz hinzufügen**: Schreiben Sie sie in das Eingabefeld oben und klicken Sie auf **Hinzufügen** (oder drücken Sie Strg+Eingabe). Datum und Uhrzeit neben der Schaltfläche legen den Zeitpunkt fest, auf den sich die Notiz bezieht. Voreingestellt ist jetzt, und Sie können ihn in die Vergangenheit legen: Eine am Dienstag hinzugefügte Notiz kann als am Samstag um 23:40 Uhr geschehen erfasst werden und wird an dieser Stelle der Chronologie einsortiert. KANAP speichert getrennt davon den Moment, in dem die Notiz tatsächlich gesichert wurde, und dieser Zeitstempel ist niemals änderbar: Rückdatierung bleibt damit ehrlich.

**Automatische Einträge** erscheinen neben Ihren Notizen:

| Eintrag | Wann er geschrieben wird |
|---------|--------------------------|
| **System** | Beim Anlegen: „Vorfall erfasst" |
| **Statusänderung** | Bei jeder Statusänderung, dargestellt als „Status: In Bearbeitung → Behoben" |
| **Änderung des Schweregrads** | Bei jeder Änderung des Schweregrads, gleiches Format |
| **Wieder geöffnet** | Beim Wiederöffnen, mit dem angegebenen Grund |
| **Verknüpfungen aktualisiert** | Wenn Assets oder Anwendungen verknüpft oder gelöst werden, mit deren Namen |

Jede Zeile zeigt den Autor, die Zeit, auf die sie sich bezieht (für „vor 3 Tagen" darüberfahren), und die Art des Eintrags für alles, was keine einfache Notiz ist.

Das Eingabefeld verschwindet, sobald der Vorfall geschlossen oder abgebrochen ist. Feldänderungen außerhalb des Journals, etwa die Korrektur des Auswirkungstexts, werden im Audit-Protokoll der Plattform festgehalten, nicht im Journal.

---

### Beziehungen

- **Assets**: die betroffenen Server, VMs oder Geräte. Suchen und auswählen; Verknüpfen und Lösen wird im Journal festgehalten
- **Anwendungen**: die betroffenen Anwendungen und Dienste, gleiches Verhalten
- **Aufgaben**: die Folgearbeit. Legen Sie eine Aufgabe direkt aus dem Vorfall heraus an, sie bleibt daran gebunden. Die Aufgabe zeigt „Vorfall · INC-14" in ihrer eigenen Seitenleiste, und die Spalte Aufgaben des Vorfalls zählt sie mit

Verknüpft wird ausschließlich von der Vorfallsseite aus. Ein verknüpftes Asset oder eine verknüpfte Anwendung zeigt den Vorfall in einem schreibgeschützten Abschnitt **Vorfälle** auf dem eigenen Tab Beziehungen: Wer einen Server ansieht, sieht dessen Störungsgeschichte.

---

### Dokumente

Mit diesem Vorfall verknüpfte Dokumente der Wissensdatenbank: der Post-Mortem-Bericht, der Bericht des Lieferanten, die befolgte Prozedur. Mit `knowledge:member` können Sie ein Dokument direkt aus diesem Tab heraus anlegen.

---

### Anhänge

Ziehen Sie Dateien per Drag-and-drop hierher oder klicken Sie, um sie auszuwählen: Screenshots, Log-Auszüge, Mail-Exporte, der Vorfallsbericht des Lieferanten. Klicken Sie auf einen Anhang, um ihn herunterzuladen. Uploads und Löschungen enden, sobald der Vorfall geschlossen ist.

---

## Schließen, wieder öffnen und abbrechen

**Behoben** bedeutet, dass der Dienst wiederhergestellt ist. **Geschlossen** bedeutet, dass der Datensatz endgültig ist.

Das Schließen sperrt den Vorfall. Felder, Journalnotizen, Verknüpfungen, Anhänge und das Anlegen von Aufgaben werden abgewiesen, in der Oberfläche wie über die API. Die Übersicht zeigt einen einzeiligen Hinweis: „Geschlossen am 12. März 2026. Öffnen Sie ihn wieder, um Änderungen vorzunehmen."

**Wieder öffnen** (`incidents:admin`) setzt einen behobenen, geschlossenen oder abgebrochenen Vorfall zurück auf In Bearbeitung und löscht die Behebungs- und Schließdaten. Ein Grund ist erforderlich und wird ins Journal geschrieben, der Datensatz zeigt also, warum er erneut angefasst wurde.

**Vorfall abbrechen** (`incidents:admin`) ist für einen Datensatz gedacht, den es nie hätte geben dürfen: ein Duplikat oder ein irrtümlich erfasstes Ereignis. Ein Grund ist erforderlich, der Status wird Abgebrochen, und der Vorfall wird wie ein geschlossener gesperrt. Nichts wird gelöscht und die Nummer bleibt erhalten: `INC-13` verschwindet nie zwischen `INC-12` und `INC-14`. Eine Lücke in der Nummerierung wäre das Erste, wonach ein Prüfer fragt.

Löschen gibt es nicht.

---

## Compliance und Prüfnachweise

Zwei Schalter in der Eigenschaftenleiste tragen den regulatorischen Teil des Datensatzes:

- **Personenbezogene Daten betroffen**: Schalten Sie ihn ein, sobald personenbezogene Daten offengelegt, verändert oder verloren wurden. Es ist das Merkmal, nach dem Ihr Datenschutzbeauftragter filtert
- **Meldung an Behörde erforderlich**: Schalten Sie ihn ein, wenn das Ereignis gemeldet werden muss, etwa an eine Datenschutzbehörde, eine nationale Cybersicherheitsbehörde oder einen Branchenregulierer. **Gemeldet am** hält dann fest, wann Sie gemeldet haben, und **Informierte Parteien** listet auf, wer benachrichtigt wurde: Regulierer, Versicherer, betroffene Kunden, Konzernsicherheit

Fristen und Schwellenwerte hängen von Ihrer Rechtsordnung und Ihrer Branche ab. KANAP hält die Fakten und die Daten fest; es entscheidet nicht, ob Sie melden müssen.

**Was das Register einem Prüfer bietet**:

- Eine durchgehende, nummerierte Folge ohne Löschungen und ohne Lücken
- Für jeden Vorfall: wann er begann, wann er bemerkt wurde, wann er behoben und geschlossen wurde und wer verantwortlich war
- Ein Journal, das nicht umgeschrieben werden kann, mit jeder Status- und Schweregradänderung datiert und einer Person zugeordnet
- Die Nachweise selbst, als Anhänge und verknüpfte Dokumente
- Die Korrekturmaßnahmen und die Folgeaufgaben, die deren Umsetzung belegen
- Gefilterte Sichten nach Zeitraum, Schweregrad, Kategorie oder Compliance-Merkmal, direkt aus der Liste
- Ein CSV-Export des gesamten Registers (**CSV exportieren** in der Liste), für Prüfer und für Ihr eigenes Archiv

**Ein bestehendes Register importieren**: **CSV importieren** in der Liste nimmt eine CSV-Datei entgegen. Lassen Sie die Referenzspalte leer, um Vorfälle anzulegen (KANAP vergibt die nächsten INC-Nummern), oder behalten Sie die Referenz INC-N bei, um die passenden Datensätze zu aktualisieren. Jeder importierte Vorfall erhält einen Journaleintrag, der auf die Herkunft aus einer Datei hinweist. Exportieren Sie zuerst, wenn Sie das exakte Spaltenlayout möchten.

---

## Kategorien

Die Vorfallskategorien gehören Ihnen: Legen Sie sie in **IT-Landschaft > Einstellungen** unter **Vorfälle > Vorfallskategorien** fest. KANAP liefert Infrastruktur, Sicherheit, Anwendung, Daten, Lieferant und Sonstiges mit.

Halten Sie die Liste kurz. Kategorien sind das, wonach Sie ein Jahr an Vorfällen gruppieren werden, und eine Liste mit dreißig Einträgen nutzt niemand einheitlich. Statt eine bereits verwendete Kategorie zu löschen, markieren Sie sie als veraltet: Sie verschwindet aus der Auswahl für neue Vorfälle, während die bestehenden ihre Historie behalten.

---

## Den Assistenten fragen

Plaid kann das Register im Chat abfragen, mit denselben Berechtigungen wie im Rest der Anwendung. Bitten Sie um eine Zählung („Wie viele kritische Vorfälle in diesem Quartal?“), eine gefilterte Liste („Offene Vorfälle auf PAR-ESX-01“) oder einen vollständigen Datensatz („Zusammenfassung von INC-2“) — Letzteres enthält das Journal. Vorfallsreferenzen wie `INC-12` in der Antwort sind Links zum Arbeitsbereich.

---

## Tipps

- **Früh erfassen, später vervollständigen**: Legen Sie den Vorfall an, während er läuft, mit Titel und Schweregrad. Das Journal ist dafür gebaut, Fakten nach und nach aufzunehmen
- **Notizen als Fakten schreiben, mit Uhrzeit**: „13:05 Umschaltung auf den Zweitstandort, Mail für 40 Benutzer wieder verfügbar". Setzen Sie Datum und Uhrzeit, damit die Chronologie den Vorfall abbildet und nicht Ihr Tipptempo
- **Ehrlich rückdatieren**: Begonnen und Erkannt sollen die tatsächlichen Zeiten tragen. Der Erfassungszeitpunkt jedes Journaleintrags wird getrennt gespeichert und lässt sich nicht ändern
- **Ein Vorfall, nicht einer pro Ticket**: Ein einzelner Ausfall, der vierzig Tickets erzeugt hat, ist ein Vorfall, verknüpft mit den betroffenen Assets
- **Maßnahmen in Aufgaben überführen**: Text unter Korrekturmaßnahmen beschreibt die Absicht; eine Aufgabe mit zuständiger Person und Fälligkeitsdatum ist das, was tatsächlich erledigt wird
- **Bewusst schließen**: Mit dem Schließen wird der Datensatz zum Nachweis. Tragen Sie Ursache und Erkenntnisse ein, bevor Sie schließen, denn danach braucht es einen Administrator zum Wiederöffnen
- **Das Register quartalsweise durchsehen**: Filtern Sie nach Zeitraum und Schweregrad, achten Sie auf wiederkehrende Kategorien und auf Assets, die mehr als einmal auftauchen. Von dort kommt die nächste Budgetanforderung
