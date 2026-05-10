# Plaid

Plaid ist der integrierte Chat-Assistent von KANAP. Er ist mit denselben Daten verbunden, mit denen Sie bereits arbeiten – Anwendungen, Assets, Projekte, Anfragen, Aufgaben, Verträge, Wissensdokumente und Stammdaten – sodass Sie Fragen in natürlicher Sprache stellen können, anstatt sich durch mehrere Bildschirme zu klicken, um eine Antwort zu finden.

Plaid ersetzt nicht den Rest der Anwendung. Es ist ein schnellerer Weg, Kontext zusammenzufassen, Datensätze zu lokalisieren, Texte zu verfassen oder Änderungen vorzubereiten. Sensible Operationen werden immer als Vorschauen angezeigt, die Sie genehmigen müssen, bevor etwas in KANAP zurückgeschrieben wird.

## Wo Sie es finden

- Arbeitsbereich: **Plaid** (obere Navigation)
- Route: `/ai`
- Berechtigung: `ai_chat:reader` ermöglicht das Öffnen des Chat-Arbeitsbereichs und das Starten von Konversationen
- Feature-Flag: erfordert, dass die Chat-Oberfläche auf Ihrer Instanz aktiviert ist. Wenn sie deaktiviert ist, zeigt der Arbeitsbereich anstelle der Chat-Oberfläche einen Hinweis an.

Der Arbeitsbereich ist auch für Administratoren mit `ai_chat:admin` verfügbar, die alles sehen und moderieren können, was reguläre Benutzer tun.

## Eine Konversation starten

Wenn Sie Plaid zum ersten Mal öffnen, landen Sie auf einem Begrüßungsbildschirm mit:

- Einem kurzen Slogan („Plaid ist bereit") und einer Beschreibung dessen, was Sie fragen können
- Einem Abschnitt **Versuchen Sie zu fragen** mit Beispiel-Prompts, die Sie zum Senden anklicken können
- Dem Editor unten, bereit, Ihre erste Nachricht entgegenzunehmen

Klicken Sie auf einen Vorschlag, um ihn entweder direkt zu senden, oder – bei Prompts, die einen `@`-Platzhalter enthalten – um den Vorschlag in den Editor einzufügen, damit Sie ihn fertigstellen können.

Geben Sie eine Nachricht ein und drücken Sie **Enter** zum Senden. **Umschalt+Enter** fügt eine neue Zeile ein. Die Senden-Schaltfläche ist deaktiviert, solange nichts zu senden ist, und verwandelt sich in eine rote **Stopp**-Schaltfläche, während Plaid antwortet.

## Die Konversationsliste

Die linke Seitenleiste listet Ihre vergangenen Konversationen auf. Verwenden Sie das Menüsymbol oben links im Chat-Bereich, um sie ein- oder auszuklappen.

Die Liste enthält:

- Eine Schaltfläche **Neue Konversation** oben
- Ein Suchfeld, das erscheint, sobald Sie mindestens eine Konversation haben
- Konversationen gruppiert nach Datum: **Heute**, **Gestern**, **Letzte 7 Tage**, **Älter**

Jede Zeile zeigt den Konversationstitel (oder **Ohne Titel**, wenn noch keiner gesetzt wurde). Bewegen Sie den Mauszeiger über eine Zeile oder fokussieren Sie sie, um Folgendes anzuzeigen:

- Ein Stiftsymbol – **Umbenennen** der Konversation. Doppelklicken Sie auf den Titel, um dasselbe zu tun.
- Ein Papierkorbsymbol – **Archivieren** der Konversation. Archivierte Konversationen verschwinden aus der Liste. Wenn Sie die aktuell geöffnete Konversation archivieren, wechselt Plaid zu einem neuen leeren Chat.

Die Suche filtert die Liste nach Titel während der Eingabe. Umbenennen und Archivieren werden sofort gespeichert.

## Eine Nachricht schreiben

Der Editor ist der zentrale Steuerungspunkt des Arbeitsbereichs. Er unterstützt:

- Mehrzeiligen Text bis zu 10 sichtbaren Zeilen, bevor er scrollt
- Inline-Bildanhänge (PNG, JPG, GIF, WEBP)
- `@`-Erwähnungen von KANAP-Datensätzen
- Eine Tastatur-Erinnerung („Enter zum Senden · Umschalt+Enter für neue Zeile")

### Bilder anhängen

Sie können Bilder auf drei Arten hinzufügen:

- Klicken Sie auf das Büroklammer-Symbol und wählen Sie Dateien von Ihrem Computer
- Ziehen Sie Bilddateien per Drag-and-Drop in den Editor (ein Hinweis-Overlay bestätigt das Ziel)
- Fügen Sie ein Bild direkt aus der Zwischenablage ein

Jedes ausstehende Bild erscheint als Miniaturansicht über dem Text. Klicken Sie auf das kleine **X** an einer Miniaturansicht, um sie zu entfernen. Es gibt ein Anhangslimit pro Nachricht; sobald es erreicht ist, ist die Büroklammer deaktiviert, bis Sie die aktuellen Anhänge entfernen oder senden.

Bilder werden zusammen mit Ihrer Nachricht hochgeladen, sodass Plaid sie beschreiben, vergleichen oder Details extrahieren kann.

### Datensätze mit `@` erwähnen

Die Eingabe von `@` öffnet die **Erwähnungsauswahl** über dem Editor. Sie ermöglicht es Ihnen, jeden KANAP-Datensatz zu referenzieren, auf den Sie Zugriff haben, mit zwei sich ergänzenden Modi:

- **Typ-Token-Präfix**: Kurze Codes, die einer einzelnen Entitätsfamilie zugeordnet sind. Beispiele:
  - `@T-5` – Aufgabe mit der Referenz T-5
  - `@DOC` – aktuelle Wissensdokumente
  - `@APP backup` – Anwendungen, die zu „backup" passen
  - `@PRJ`, `@REQ`, `@AST`, `@CONN`, `@INT`, `@LOC`, `@CTR`, `@CPX`, `@COMP`, `@CONT`, `@DEPT`, `@SUP`, `@BP`
- **Klartext**: Alles andere (`@payroll`, `@server-2`) führt eine typenübergreifende Suche durch, die nach Relevanz sortiert wird.

Verwenden Sie die Pfeiltasten, um durch die Vorschläge zu navigieren, **Enter** oder **Tab** zur Bestätigung, **Escape** zum Schließen der Auswahl. Ergebnisse werden nach Entitätstyp gruppiert (Wissen, Aufgaben, Projekte, Anwendungen, Assets, Verträge usw.), sodass Sie auf einen Blick erkennen können, welche Art von Datensatz Sie einfügen werden.

Wenn Sie einen Vorschlag bestätigen, zeigt der Editor weiterhin eine lesbare Bezeichnung an (`@DOC-152`, `@SAP S/4HANA`). Beim Senden der Nachricht wird jede Erwähnung in einen echten Link erweitert, dem Plaid zum Quelldatensatz folgen kann.

### Eine Nachricht bearbeiten oder neu generieren

Bewegen Sie den Mauszeiger über eine Ihrer vorherigen Nachrichten, um Aktionen auf Nachrichtenebene zu erhalten:

- **Kopieren** – kopiert den Nachrichtentext in die Zwischenablage
- **Bearbeiten** – öffnet die Nachricht erneut in einem Inline-Editor; das Speichern sendet die neue Version und schneidet alles ab, was danach kam (die Konversation läuft ab diesem Punkt erneut)
- **Neu generieren** (bei Assistenten-Antworten) – fordern Sie Plaid auf, eine andere Antwort auf denselben Prompt zu produzieren

Bearbeiten ist das richtige Werkzeug, wenn Sie feststellen, dass Ihre vorherige Frage unklar war. Neu generieren ist das richtige Werkzeug, wenn die Frage in Ordnung war, aber die Antwort nicht.

## Wie Plaid antwortet

Plaid streamt seine Antwort Zeichen für Zeichen. Während des Streamings:

- Bleibt der Editor nutzbar, sodass Sie eine Folgefrage vorbereiten können
- Zeigt die Senden-Schaltfläche ein rotes **Stopp**-Symbol – ein Klick darauf bricht die laufende Antwort ab
- Erscheint ein kleiner „Werkzeuge werden verwendet…"-Indikator, wenn Plaid KANAP durchsucht, ein Dokument abruft oder einen anderen Werkzeugaufruf ausführt
- Werden die Anzahl und Art der verwendeten Werkzeuge unter der Antwort zusammengefasst, sobald sie abgeschlossen ist

Wenn der Stream endet, springt der Fokus zurück zum Editor, sodass Sie die Konversation fortsetzen können, ohne zur Maus greifen zu müssen.

### Werkzeugaufrufe

Plaid verwendet eine kleine Reihe interner Werkzeuge zur Beantwortung von Fragen: `Search all`, `Search knowledge`, `Get document`, `Get entity context` und einige andere. Jeder Werkzeugaufruf erscheint als kompakte Zeile unter der Nachricht („used Search all · 8 results"). Sie müssen die Werkzeugdetails normalerweise nicht lesen, aber sie sind verfügbar, wenn Sie genau sehen möchten, auf welchen Datensätzen die Antwort basiert.

## Artefakte und Vorschauen

Einige Antworten werden mit zusätzlichem Material geliefert, das nicht natürlich in den Chat-Verlauf passt. KANAP nennt diese **Artefakte**.

Häufige Fälle:

- Ein langer Text- oder Markdown-Block, den Plaid für Sie vorbereitet hat
- Ein nebeneinander angezeigter **Vorher / Nachher**-Vergleich eines Datensatzes, den Plaid aktualisieren möchte
- Ein Entwurf eines Imports oder Änderungssatzes, der Ihre Freigabe erfordert

Artefakte werden in einem Seitenpanel rechts vom Arbeitsbereich geöffnet. Das Panel kann durch Klicken auf die Schaltfläche **Artefakte** am rechten Bildschirmrand umgeschaltet werden.

Das Panel öffnet sich automatisch, wenn:

- Eine lange Vorschau während einer Streaming-Antwort eintrifft
- Eine ausstehende Vorschau Ihre Entscheidung benötigt (diese öffnen das Panel immer, da Sie darauf reagieren müssen)

Bei ausstehenden Änderungsvorschauen bietet das Panel zwei Schaltflächen:

- **Genehmigen** – bestätigt die Änderung und lässt Plaid sie anwenden
- **Ablehnen** – bricht die Änderung ab. Plaid bestätigt die Ablehnung und setzt die Konversation fort.

Nichts, was KANAP-Daten verändert, wird stillschweigend angewendet. Die Vorschau ist das Tor.

## Nutzungsindikatoren

Über dem Editor helfen Ihnen zwei kleine Indikatoren, sich der Kosten und Limits bewusst zu bleiben:

- **Integrierte Nutzung**: Wenn Ihr Mandant den integrierten Plaid-AI-Anbieter verwendet (anstelle Ihres eigenen API-Schlüssels), zeigt dies an, wie viele Nachrichten im aktuellen Monat noch verbleiben und das Datum, an dem das Kontingent zurückgesetzt wird. Wenn das Limit erreicht ist, wird der Editor deaktiviert und ein Hilfetext lädt Administratoren ein, zu einem benutzerdefinierten Anbieter zu wechseln.
- **Token-Nutzung**: Ein dünner Balken mit Eingabe-/Ausgabe-Token-Zählern für die aktuelle Konversation sowie der Größe der letzten Anfrage. Lange Konversationen werden mit der Zeit teurer; der Balken macht diese Kosten sichtbar, sodass Sie entscheiden können, wann ein neuer Thread gestartet werden soll.

Der Token-Nutzungsbalken erscheint erst, sobald die Konversation mindestens einen Austausch hat.

## Tipps

- **Verwenden Sie Präfixe für Präzision**: `@T-`, `@DOC-`, `@PRJ-`, `@REQ-` werden direkt nativen KANAP-Referenzen zugeordnet. Sie sind der schnellste Weg, Plaid auf einen bestimmten Datensatz zu verweisen, und sie überleben Kopieren-Einfügen, weil sie identisch mit dem aussehen, was Sie an anderer Stelle in der Anwendung sehen.
- **Starten Sie pro Thema eine neue Konversation**: Wenn Sie unzusammenhängende Fragen in separaten Konversationen halten, wird das Kontextfenster kleiner, die Antworten schneller und die Token-Rechnung niedriger. Die Konversationsliste ist nach Datum gruppiert, sodass Sie sie leicht wiederfinden.
- **Genehmigen und ablehnen Sie bewusst**: Vorschauen sind das einzige, was zwischen Plaid und Ihren Live-Daten steht. Nehmen Sie sich die zusätzliche Sekunde, um den Unterschied zu lesen, bevor Sie auf **Genehmigen** klicken.
- **Stoppen statt warten**: Wenn Plaid mitten im Stream den falschen Weg einschlägt, drücken Sie die **Stopp**-Schaltfläche, anstatt darauf zu warten, dass es fertig wird. Sie sparen Token, und Ihre Folgenachricht kann den Kurs korrigieren.
- **Bilder direkt einfügen**: Das Ziehen eines Screenshots in den Editor ist schneller als die Dateiauswahl, und das Einfügen aus der Zwischenablage funktioniert auch. Verwenden Sie es, um ein UI-Problem zu beschreiben oder Plaid zu bitten, ein Diagramm zu lesen.
