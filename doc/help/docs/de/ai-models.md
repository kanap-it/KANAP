# KI-Modelle

Diese Seite ist die Liste der KI-Modelle, die Ihre Organisation verwenden darf. Sie legen ein Modell einmal an — Anbieter, Adresse, Schlüssel, Preise — und *weisen* es von da an nur noch zu: dem [Plaid-Chat-Assistenten](ai-settings.md), einem einzelnen [KI-Agenten](agents-workspace.md) oder als organisationsweiten Standard, auf den alles andere zurückfällt. Von hier stammen auch die Kostenzahlen auf der Seite [Nutzung & Kosten](ai-usage.md): Die Preise, die Sie hier eintragen, sind die Preise, mit denen KANAP den tatsächlichen Token-Verbrauch bewertet.

## Wo Sie es finden

- Arbeitsbereich: **Administration**
- Pfad: **Administration → Künstliche Intelligenz → KI-Modelle**
- Route: `/admin/ai-models`
- Berechtigung: `ai_settings:admin`

---

## Wie ein Modell ausgewählt wird

In KANAP ist nichts fest auf ein Modell verdrahtet. Jeder Verbraucher — Plaid und jeder Agent — zeigt entweder auf ein bestimmtes Modell oder sagt „nimm das, was die Organisation nutzt“. Die Regel ist kurz:

1. **Das diesem Verbraucher zugewiesene Modell**, sofern es eines gibt.
2. Andernfalls das **Standardmodell der Organisation** — dasjenige, das auf dieser Seite mit dem Stern markiert ist.
3. Andernfalls das **Inklusive KANAP-Modell**.

Es gibt also genau einen Standard pro Organisation, und alles, was Sie nie anfassen, folgt ihm. Ändern Sie den Standard, und jeder nicht zugewiesene Verbraucher zieht mit — genau dafür ist er da.

Der dritte Schritt existiert nur im gehosteten Dienst von KANAP. In einer On-Premise-Installation gibt es kein inklusives Modell: Ist nichts zugewiesen und kein Standard gesetzt, läuft die Kette schlicht aus. Die Plaid-Einstellungsseite meldet dann, dass kein Modell konfiguriert ist, und der Chat antwortet nicht; die Agenten laufen zwar weiter, überspringen aber die Schritte, die ein Modell benötigen — sie fallen auf ihr Verhalten ohne KI zurück, statt komplett zu scheitern. Ein registriertes Modell behebt das: Markieren Sie es mit dem Stern als Standard, damit alles auf einen Schlag darauf zugreift, oder weisen Sie es Verbraucher für Verbraucher zu.

Durch Aufräumen der Liste können Sie diese Kette nicht zerreißen: Ein Modell, auf das noch etwas zeigt, lässt sich gar nicht erst archivieren; und sollte eine Zuweisung doch einmal auf ein archiviertes Modell zeigen, fällt der Verbraucher auf den Standard zurück, statt zu scheitern.

---

## Arbeiten mit der Liste

Die Tabelle zeigt jedes Modell, das Ihre Organisation registriert hat — aktive zuerst, archivierte darunter, innerhalb jeder Gruppe alphabetisch.

**Spalten**:

- **Name** — der Name, den Sie dem Modell gegeben haben, dazu der Chip **Standard**, wenn es der Organisationsstandard ist, und **Archiviert**, wenn es ausgemustert wurde. Ein Hinweis **Konfiguration unvollständig** erscheint hier, wenn etwas Erforderliches fehlt — meist ein Modell, das einen API-Schlüssel braucht und keinen hat. Beheben Sie das: Ein unvollständiges Modell fällt nicht still auf ein anderes zurück, es funktioniert einfach nicht.
- **Modell** — der Anbieter in der ersten Zeile, darunter die genaue Modellkennung.
- **Fähigkeiten** — **Bilder ✓**, wenn das Modell Bilder lesen kann, **Nur Text**, wenn nicht. Das ergibt sich aus dem Schalter **Versteht Bilder** im Editor.
- **Eingabepreis / M Tokens** und **Ausgabepreis / M Tokens** — was Sie pro Million Tokens zahlen, in Euro. Ein Gedankenstrich (**—**) bedeutet, dass kein Preis hinterlegt ist, was KANAP als kostenlos behandelt.
- **Verwendet von** — alles, was derzeit auf dieses Modell zeigt: **Plaid**, die Namen der zugewiesenen Agenten oder **Nicht zugewiesen**, wenn es niemand verwendet. Das ist die Spalte, die Sie lesen, bevor Sie etwas archivieren.

**Zeilenaktionen** (nur bei aktiven Modellen):

- **Als Standardmodell verwenden** / **Nicht mehr als Standardmodell verwenden** — der Stern. Ein Klick, kein Dialog. Es kann nur ein Standardmodell geben, das Markieren eines neuen hebt die Markierung des alten also auf.
- **Bearbeiten** — öffnet den Editor-Dialog.
- **Archivieren** — mustert das Modell aus. Die Schaltfläche ist deaktiviert, solange noch etwas es verwendet, und der Tooltip sagt es auch: *Dieses Modell ist noch zugewiesen und kann nicht archiviert werden*.

Archivierte Zeilen erscheinen ausgegraut mit einer einzigen Aktion **Wiederherstellen**. Archivieren ist bewusst kein Löschen: Die bisherige Nutzung bleibt dem Modell auf der Seite [Nutzung & Kosten](ai-usage.md) zugerechnet, und ein wiederhergestelltes Modell kommt mit Anbieter, Schlüssel, Preisen und Fähigkeiten unverändert zurück — aber nicht mehr als Standard und keinem Verbraucher mehr zugewiesen, sodass Sie es bewusst neu zuweisen. Ein archiviertes Modell lässt sich weder bearbeiten noch als Standard setzen oder zuweisen, solange Sie es nicht wiederherstellen.

### Das Inklusive KANAP-Modell

Im gehosteten Dienst ist die erste Zeile der Tabelle immer **Inklusives KANAP-Modell** — *Von KANAP betrieben, in Ihrem Abonnement enthalten*. Es verhält sich mit Absicht anders als die Modelle, die Sie selbst anlegen:

- Es kostet in beiden Preisspalten `0,00 €`. Es ist Teil Ihres Abonnements und wird Ihnen nicht pro Token berechnet.
- Es ist **multimodal** — es liest Ticket-Screenshots — und daran können Sie nichts ändern.
- Statt einer Liste **Verwendet von** zeigt es Ihre **inklusiven Nachrichten in diesem Monat** mit einem Fortschrittsbalken, sodass Sie sehen, wie viel des Monatskontingents noch übrig ist. Eine Nachricht ist eine an Plaid gestellte Frage, eine Anfrage eines externen Assistenten über MCP oder ein von einem Agenten geprüftes Ticket — alle drei schöpfen aus demselben Kontingent.
- Es trägt den Chip **Standard**, solange keines Ihrer eigenen aktiven Modelle mit dem Stern markiert ist — der Rückfall „nichts konfiguriert“ in sichtbarer Form.
- Es hat keine Aktionen: Sie können es weder bearbeiten noch archivieren oder mit dem Stern markieren. Es ist einfach immer da.

In einer On-Premise-Installation erscheint diese Zeile überhaupt nicht.

---

## Ein Modell hinzufügen oder bearbeiten

**Neues Modell** öffnet den Editor; das Stiftsymbol in einer aktiven Zeile öffnet ihn für einen vorhandenen Eintrag erneut. Die Felder:

- **Name** — wie das Modell überall dort erscheint, wo Sie es zuweisen: in der Plaid-Auswahl und in der Liste **KI-Modell** jedes Agenten. Nehmen Sie etwas, das Sie in sechs Monaten in einer Auswahlliste wiedererkennen (*Claude Produktion*, *Mistral lokal*), nicht die rohe Modellkennung. Beachten Sie: Die Tabelle **Kosten pro Modell** auf [Nutzung & Kosten](ai-usage.md) verwendet diesen Namen *nicht* — sie listet die Kennung auf, die tatsächlich aufgerufen wurde, etwa `anthropic:claude-sonnet-5`.
- **Anbieter** — wer das Modell bereitstellt. Die Auswahl bestimmt, welche der folgenden Felder gelten.
- **Modell** — die genaue Modellkennung in der Schreibweise des Anbieters (zum Beispiel `claude-sonnet-5`). Das ist kein Anzeigename; ein Tippfehler zeigt sich hier als fehlgeschlagener Aufruf, nicht als Validierungsfehler.
- **Serveradresse** — nur für Anbieter, die Sie selbst betreiben oder gezielt adressieren. Wenn KANAP in Docker läuft und das Modell auf derselben Host-Maschine, adressieren Sie den Host statt `localhost`.
- **API-Schlüssel** — die Zugangsdaten Ihres Anbieters. Er wird verschlüsselt gespeichert und nie wieder angezeigt: Wenn Sie ein vorhandenes Modell erneut öffnen, ist das Feld leer und trägt den Hinweis *Leer lassen, um den aktuellen Schlüssel zu behalten*, Sie tippen also nur hinein, um den Schlüssel zu ersetzen. Ist auf der Instanz kein Verschlüsselungsgeheimnis konfiguriert, erklärt eine Warnung am Seitenanfang, dass Schlüssel überhaupt nicht gespeichert werden können.

**Fähigkeiten**:

- **Versteht Bilder** — für ein reines Textmodell deaktivieren. Wie der Hinweis sagt, werden an Tickets angehängte Screenshots dann *übersprungen* statt gesendet, und genau das wollen Sie: Ein reines Textmodell, das ein Bild erhält, lässt den Aufruf fehlschlagen, statt nützliche Arbeit zu leisten. Bei einem bildfähigen Modell lassen Sie den Schalter an, dann nutzen Ihre Triage-Agenten Ticket-Screenshots als Nachweis.

**Kosten** — *Preis pro Million Tokens, wie auf der Preisseite Ihres Anbieters angegeben*:

- **Eingabe (€ / M Tokens)** und **Ausgabe (€ / M Tokens)** — übernehmen Sie die beiden Zahlen direkt von der Preisseite Ihres Anbieters. Sie unterscheiden sich in der Regel, und KANAP bewertet sie getrennt.
- **Lassen Sie beide leer oder setzen Sie sie auf 0, wenn das Modell lokal oder selbst gehostet läuft.** Ein Modell ohne Preise kostet nichts — was für ein Modell auf Ihrer eigenen Hardware der Wahrheit entspricht. Die Wahl des Anbieters Ollama füllt genau deshalb beide Preise mit 0 vor.
- Agentenkosten werden bewertet, während die Arbeit läuft, und dann festgehalten. Eine Preisänderung ändert also, was Agenten **ab jetzt** kosten, und lässt vergangene Zahlen unberührt. Plaids Kosten werden anders ermittelt — siehe [Nutzung & Kosten](ai-usage.md) — und dort verschiebt eine Preisänderung auch die historischen Werte.

**Erweiterte Einstellungen**:

- **Maximale Antwortzeit (Sekunden)** — wie lange auf dieses Modell gewartet wird, bevor abgebrochen wird. Leer lassen für das Standardlimit. Lokale Modelle brauchen oft mehr Zeit — deshalb sitzt die Einstellung am Modell und nicht an der Installation.
- **Als Standardmodell verwenden** — derselbe Stern wie in der Tabelle, schon während Sie das Modell anlegen.

**Verbindung testen** erscheint, sobald das Modell gespeichert ist. Die Schaltfläche macht einen winzigen Aufruf mit den Einstellungen, wie sie gespeichert sind, und meldet entweder *Verbindung erfolgreich* mit der Round-Trip-Zeit oder die Fehlermeldung des Anbieters selbst. Sie belegt, dass Anbieter, Modellkennung, Adresse und Schlüssel zusammenspielen — sie prüft weder Ihre Preise noch den Bilder-Schalter oder die Antwortzeit. Führen Sie sie nach dem Anlegen eines Modells und nach jedem Schlüsselwechsel aus: Ein falscher Schlüssel bleibt sonst unsichtbar, bis echte Arbeit fehlschlägt — und sie schlägt leise fehl (eine Chat-Antwort, die mit einem Fehler endet, oder ein Agent, der einen Schritt überspringt und weitermacht).

**Erstellen** / **Speichern** bleiben deaktiviert, bis Name und Modellkennung ausgefüllt sind und Preise sowie Antwortzeit gültige Zahlen ergeben. Namen müssen innerhalb Ihrer Organisation eindeutig sein.

---

## Tipps

- **Setzen Sie einen Standard, bevor Sie irgendetwas zuweisen.** Mit einem markierten Modell funktionieren jeder neue Agent und Plaid selbst sofort, und Sie haben eine einzige Stelle, um das Modell später zu wechseln.
- **Benennen Sie Modelle nach ihrer Rolle, nicht nach ihrer Version.** *Triage-Modell* überlebt den Wechsel von einer Modellversion zur nächsten; *Claude Sonnet 4.5* wird an dem Tag zur Lüge, an dem Sie es bearbeiten.
- **Registrieren Sie denselben Anbieter zweimal, wenn die Aufgaben verschieden sind.** Ein günstiges reines Textmodell für die Triage großer Mengen und ein bildfähiges Modell für screenshotlastige Tickets ist ein ganz normales Setup — genau dafür gibt es die Zuweisung pro Agent.
- **Tragen Sie die Preise korrekt ein oder lassen Sie sie leer.** Sie sind keine Dekoration: Sie treiben die Kostenzahlen auf [Nutzung & Kosten](ai-usage.md) und die Obergrenze **Kosten pro Lauf (EUR)** jedes Agenten. Ein mit 0 bepreistes Modell erreicht nie eine Kostenobergrenze — bei einem kostenfreien Modell sind die Token-Limits Ihr einziger Schutz.
- **Prüfen Sie Verwendet von, bevor Sie archivieren.** Die Schaltfläche sagt Ihnen zwar, wenn ein Modell noch in Gebrauch ist, aber es geht schneller, die Spalte zu lesen und die Verbraucher vorher umzuhängen.
- **Testen Sie nach jedem Schlüsselwechsel.** Der Verbindungstest ist kostenlos und sofort erledigt; ein veralteter Schlüssel, den Sie erst durch einen fehlgeschlagenen Agentenlauf entdecken, ist beides nicht.
