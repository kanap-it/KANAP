# KI-Agenten — Freigaben

Freigaben ist die tägliche Prüf-Warteschlange für alles, was Ihre KI-Agenten vorhaben. Bevor ein Agent eine Antwort veröffentlicht, eine Notiz hinzufügt, ein Ticket neu klassifiziert, dessen Status ändert, es neu zuweist oder schließt, legt er Ihnen diese Arbeit hier als **Vorschlag** vor. Auf Seiten des Anfragenden ist auf dieser Seite noch nichts geschehen: Ein Vorschlag ist die Empfehlung des Agenten, und er erreicht Ihr verbundenes Ticketsystem erst, sobald Sie ihn freigeben. Hier verbringt ein Operator die meiste Zeit mit der Beaufsichtigung eines Helpdesk-Agenten — indem er jeden Entwurf liest und entscheidet, was damit geschehen soll: die guten anwenden, die falschen ablehnen und die zutreffenden, aber nicht zu versendenden beiseitelegen.

## Wo Sie es finden

- Arbeitsbereich: **KI-Agenten**
- Pfad: **KI-Agenten → Freigaben**
- Route: `/agents/approvals`
- Berechtigung: Erfordert, dass KI für die Instanz aktiviert ist, sowie die Rolle „AI Agents Reader“ (`ai_agents:reader`)
- Dieselbe Warteschlange erscheint, auf einen einzelnen Agenten beschränkt, auf dem Tab **Freigaben** im [Arbeitsbereich](agents-workspace.md) dieses Agenten. Die Seite unter `/agents/approvals` ist die kombinierte Ansicht über alle Agenten hinweg; der Tab im Arbeitsbereich zeigt nur die Vorschläge des Agenten, den Sie gerade betrachten. Layout und Bedienelemente sind identisch.

---

## Was ein Vorschlag ist

Jeder Vorschlag ist eine konkrete Aktion, die ein Agent an einem Ticket ausführen möchte. Es gibt acht Aktionstypen, jeder mit eigenem Label und Symbol:

| Aktion | Was sie bewirkt |
| --- | --- |
| **Antwort an Anfragende** | Eine Nachricht, die der Agent an die Person senden möchte, die das Ticket eröffnet hat. |
| **Interne Notiz** | Eine Notiz, die der Agent für Ihr Team hinzufügen möchte, für den Anfragenden nicht sichtbar. |
| **Klassifizierung** | Eine Änderung an Kategorie, Typ, Dringlichkeit oder ähnlichen Attributen des Tickets. |
| **Status** | Ein Wechsel zu einem anderen Ticketstatus (zum Beispiel von **Neu** zu **Ausstehend**). |
| **Ticket schließen** | Eine terminale Statusänderung, die das Ticket schließt — siehe [Terminale Aktionen](#terminale-aktionen). |
| **Ticket lösen** | Eine terminale Statusänderung, die das Ticket als gelöst markiert — siehe [Terminale Aktionen](#terminale-aktionen). |
| **Zuweisung** | Eine Änderung daran, wem das Ticket zugewiesen ist. |
| **Beteiligte** | Eine Änderung an den Beobachtern oder Anfragenden des Tickets. |

Bei einer **Antwort an Anfragende** oder einer **Interne Notiz** ist der angezeigte Textkörper die vollständige entworfene Nachricht, genau so, wie sie veröffentlicht würde. Lesen Sie sie so, wie der Anfragende (oder Ihr Team) sie lesen würde. Bei den anderen fünf Typen ist der Textkörper eine kurze Änderungszusammenfassung statt Freitext — zum Beispiel `Status: New -> Pending`, `Assignee: Unassigned -> Jane` oder ein feldweiser Klassifizierungs-Diff — oft gefolgt von einer **Grund**-Zeile, die erläutert, warum der Agent sie vorschlägt.

Vorschläge sind nach Ticket gruppiert. Jede Gruppe wird angeführt vom Ticket (**Ticket #N**), seinem aktuellen Status, einer Anzahl wie **3 Vorschläge** und dem Zeitpunkt der letzten Aktualisierung. Ein Ticket kann mehrere Vorschläge gleichzeitig enthalten — etwa eine Antwort, eine Neuklassifizierung und eine Statusänderung — und Sie können sie einzeln oder alle zusammen entscheiden.

---

## Die vier Abschnitte

Die Warteschlange ist in vier Abschnitte gegliedert, je nachdem, wo sich ein Element in seinem Lebenszyklus befindet. Jeder hat seine eigene Meldung für den leeren Zustand, damit Sie „nichts vorhanden“ von „wird noch geladen“ unterscheiden können.

### Benötigt Ihre Entscheidung

Die Vorschläge, die auf Sie warten, nach Ticket gruppiert. Dies ist der einzige Abschnitt, in dem Sie aktiv werden; die anderen drei sind rein informativ. Wenn er leer ist, steht dort *Nichts benötigt Ihre Entscheidung.* Sobald Sie einen Vorschlag entscheiden, wird er innerhalb seiner Ticketgruppe auf eine einzelne Statuszeile reduziert, während die übrigen Vorschläge des Tickets für Sie offen bleiben.

### In Bearbeitung

Arbeit, die bereits läuft und nichts von Ihnen benötigt: Vorschläge, die Sie freigegeben haben und die nun auf das verbundene Ticketsystem angewendet werden, sowie Tickets, die ein Agent gerade prüft. Zeilen zeigen hier einen Live-Status wie **Wartet auf Start**, **Läuft**, **Wird ausgeführt…** oder **Agent arbeitet…**. Wenn nichts läuft, steht dort *Keine Agentenarbeit ist in Bearbeitung.*

### Aufmerksamkeit erforderlich

Alles, was fehlgeschlagen ist oder blockiert wird — ein Vorschlag, der nicht an das verbundene Ticketsystem gesendet werden konnte, oder eine Prüfung, die mit einem Fehler abgebrochen ist. Jede Zeile trägt eine rote Bildunterschrift, die erklärt, was schiefgelaufen ist, sowie einen **Trace**-Link in die Zeitachse der [Aktivität](agents-activity.md), damit Sie den vollständigen Verlauf sehen können. Wenn er leer ist, steht dort *Keine Agentenarbeit benötigt Aufmerksamkeit.* Dies ist der Abschnitt, den Sie im Auge behalten sollten: Elemente landen hier, wenn eine Änderung freigegeben wurde, das Ticketsystem sie jedoch abgelehnt hat oder nicht abschließen konnte.

### Kürzlich abgeschlossen

Ein einklappbarer Verlauf der zuletzt abgeschlossenen Elemente — angewendet, abgelehnt, verworfen, übersprungen oder fertig. Er bleibt eingeklappt, bis Sie ihn öffnen, merkt sich diese Wahl und zeigt bis zu etwa 30 Zeilen mit einer Zeile **+N weitere**, falls es mehr sind. Nutzen Sie ihn, um zu bestätigen, dass eine Freigabe tatsächlich durchgelaufen ist, oder um zu prüfen, was ein Agent getan hat, während Sie abwesend waren.

---

## Eine Entscheidung treffen: Freigeben, Ablehnen und Verwerfen

Jeder offene Vorschlag bietet drei Aktionen.

- **Freigeben** ist die primäre Schaltfläche. Sie zeigt **Freigeben** bei einem Vorschlag, den Sie noch nicht entschieden haben, und **Ausführen** bei einem, den Sie bereits freigegeben haben, der aber noch nicht ausgeführt wurde. In beiden Fällen bewirkt sie dasselbe: Sie sendet die Aktion an Ihr verbundenes Ticketsystem, wo der Agent die Antwort oder Notiz veröffentlicht oder die Änderung anwendet. Die Freigabe ist der Moment, in dem der Anfragende (oder Ihr Team) betroffen sein kann — bis dahin hat nichts KANAP verlassen.
- **Ablehnen** wendet die Aktion nicht an. Der Vorschlag wird fallengelassen, bleibt aber im Audit-Trail erhalten, sodass es stets einen Nachweis darüber gibt, was der Agent vorgeschlagen und dass Sie es abgelehnt haben. Das Ablehnen eines einzelnen Vorschlags wird sofort wirksam. Ablehnen ist ein Qualitätssignal: Es belastet die Bewertung des Agenten und seine Annahmequote, weil es dem Agenten mitteilt, dass der Vorschlag falsch war.
- **Verwerfen** legt den Vorschlag ebenfalls beiseite, ohne etwas zu senden — belastet aber, anders als das Ablehnen, den Agenten **nicht**. Die Annahmequote und die Autonomie-Bilanz des Agenten bleiben unberührt. Verwenden Sie es, wenn der Vorschlag zutreffend ist, aber schlicht nicht hinausgehen soll: ein sensibles Ticket, ein Kollege, der bereits geantwortet hat, ein Duplikat. Es ist ein einziger Klick ohne Grundabfrage, und sein Tooltip lautet *Beiseitelegen, ohne die Bewertung des Agenten zu belasten*. Ein verworfener Vorschlag kann nicht mehr freigegeben werden.

Wenn ein Vorschlag derzeit **blockiert** ist — etwa weil eine Aktualitäts- oder Sicherheitsprüfung nicht mehr zutrifft oder das Ticketsystem die Änderung im Moment nicht akzeptiert —, ist seine primäre Schaltfläche deaktiviert und der Grund erscheint im Tooltip der Schaltfläche. Der Vorschlag bleibt sichtbar, damit Sie sehen können, warum er nicht fortgesetzt werden kann.

**Alle freigeben**, **Alle ablehnen** und **Alle verwerfen** erscheinen bei einer Ticketgruppe, wenn mehr als ein Element zu bearbeiten ist, sodass Sie ein ganzes Ticket in einem Schritt erledigen können. **Alle ablehnen** öffnet einen kurzen Dialog, der bestätigt, wie viele Vorschläge abgelehnt werden, und eine optionale Notiz für den Audit-Trail anbietet; **Alle verwerfen** öffnet einen kurzen Bestätigungsdialog, der angibt, dass nichts gesendet wird und die Bewertung des Agenten unberührt bleibt. Automatische Freigaben pro Aktionstyp erfolgen erst, nachdem genügend Ihrer Entscheidungen erfasst wurden, um diesen Aktionstyp in den [Einstellungen](agents-workspace.md) des Agenten von **Zuerst fragen** auf **Automatisch** hochzustufen; bis dahin — und bei sensibler Arbeit stets — durchläuft jeder Vorschlag diese Warteschlange.

### Verwerfen oder ablehnen

Sowohl Ablehnen als auch Verwerfen halten einen Vorschlag davon ab, das Ticket zu erreichen, aber sie teilen dem Agenten ganz Unterschiedliches mit — die Wahl ist also wichtig.

- **Lehnen Sie ab**, wenn der Vorschlag falsch oder schlecht ist: ein schlechter Entwurf, eine falsche Klassifizierung, eine unpassende Statusänderung. Ablehnung ist negatives Trainings- und Bewertungssignal — sie senkt die Annahmequote des Agenten und verlangsamt seinen Weg zum eigenständigen Handeln, was genau dann erwünscht ist, wenn er Fehler macht.
- **Verwerfen Sie**, wenn der Vorschlag *richtig* ist, aber nicht gesendet werden soll: das Ticket ist sensibel, ein Kollege hat bereits geantwortet, es dupliziert etwas bereits Laufendes. Da das Verwerfen neutral ist, belohnt oder bestraft es den Agenten nicht — seine Annahmequote und seine Autonomie-Bilanz bleiben unangetastet.

Zum Verwerfen zu greifen, wenn Sie eigentlich „das war falsch" meinen, verschleiert ein echtes Qualitätsproblem, und einen richtigen, aber nicht versendbaren Vorschlag abzulehnen belastet einen Agenten zu Unrecht, der nichts falsch gemacht hat. Ein verworfener Vorschlag zeigt einen grauen Status **Verworfen** und wandert in **Kürzlich abgeschlossen**; der Agent kann in einem späteren Zyklus weiterhin erneut zum selben Ticket vorschlagen, genau wie nach einer Ablehnung. **Verworfen** ist nicht dasselbe wie **Abgelaufen**: Ein abgelaufener Vorschlag ist einer, über den niemand entschieden hat, bevor sein Genehmigungsfenster verstrichen ist, während ein verworfener Vorschlag eine bewusste Entscheidung ist, die Sie getroffen haben.

---

## Terminale Aktionen

Vorschläge vom Typ **Ticket schließen** und **Ticket lösen** sind in Rot als **Terminal** gekennzeichnet, weil sie das Ticket beenden und der Anfragende die Änderung sofort sieht. Für sie gibt es eine zusätzliche Schutzvorkehrung.

Das Freigeben eines terminalen Vorschlags — einzeln oder als Teil einer Aktion **Alle freigeben**, bei der ein Element terminal ist — öffnet eine Bestätigung **Terminale Aktion anwenden**. Sie benennt die genaue Aktion und das Ticket, warnt, dass der Anfragende die Änderung sofort sehen wird, listet bei einer Sammelfreigabe jedes terminale Element auf und bietet Ihnen ein Grund-Feld für die Aufzeichnung. Sie bestätigen mit **Trotzdem anwenden**. Dies ist eine bewusste Reibung: Routineantworten und -notizen werden mit einem Klick angewendet, aber das Schließen oder Lösen eines Tickets erfordert von Ihnen stets ein kurzes Innehalten und Bestätigen.

---

## Entworfene Antworten lesen: der Fallback-Hinweis

Wenn ein Agent eine **Antwort an Anfragende** oder eine **Interne Notiz** entwirft, stützt er diesen Entwurf normalerweise auf die Bibliotheken Ihrer [Wissensdatenbank](knowledge.md) und nennt die Quellen, die er herangezogen hat. Gelegentlich sehen Sie bei einem solchen Vorschlag eine kleine Bildunterschrift **Synthesis-Fallback**. Sie bedeutet, dass der Agent diesen bestimmten Entwurf nicht mit zitierten Quellen belegen konnte — behandeln Sie ihn daher als bloße Empfehlung und lesen Sie ihn vor dem Freigeben genau, statt ihm als quellengeprüft zu vertrauen.

Die Bildunterschrift benennt den Grund in einfachen Worten, zum Beispiel:

- **Synthesis-Fehler** — beim Verfassen der belegten Antwort ist etwas schiefgelaufen.
- **Synthesis deaktiviert** — das belegte Entwerfen ist für diese Instanz ausgeschaltet.
- **Projektion über dem Lauf-Limit** — das Verfassen der belegten Antwort hätte das Budget für diese Prüfung überschritten.
- **Betriebskontext-Leak blockiert** — der Entwurf wurde zurückgehalten, weil er interne Hinweise gegenüber dem Anfragenden preiszugeben drohte.
- **Ungültige oder nicht belegte Synthesis** — der Entwurf konnte nicht anhand Ihrer Quellen verifiziert werden.

Wichtig zu wissen ist: **Das Fehlen dieses Hinweises ist der normale, gesunde Fall.** Die meisten Entwürfe sind belegt und tragen überhaupt keine Bildunterschrift. Und eine Antwort kann berechtigterweise keine zitierten Quellen haben — eine administrative Bestätigung oder eine rein interne Eskalation soll nicht aus Ihrer Wissensdatenbank entworfen werden —, ohne diese Warnung auszulösen. Lesen Sie einen fehlenden Fallback-Hinweis daher nicht als Problem; er bedeutet, dass der Entwurf entweder ordnungsgemäß belegt ist oder nie belegt sein sollte. Der Hinweis erscheint nur, wenn der Agent versucht hat, eine Antwort zu belegen, und dies nicht konnte.

---

## Einen Vorschlag zu seiner Prüfung zurückverfolgen

Jede Ticketgruppe und jede Zeile im Abschnitt „Aufmerksamkeit erforderlich“ trägt einen **Trace**-Link. Er verweist direkt auf den passenden Eintrag in der Zeitachse der [Aktivität](agents-activity.md), wo Sie die vollständige Prüfung nachvollziehen können, die den Vorschlag erzeugt hat — was der Agent geprüft, was er entschieden hat und warum. Nutzen Sie ihn immer dann, wenn ein Entwurf oder eine Aktualisierung überraschend ist und Sie die dahinterstehende Begründung sehen möchten. Für Administratoren, die die Details auf niedriger Ebene benötigen, bietet die Aktivität zudem eine optionale Diagnoseansicht der rohen Verarbeitungsschritte.

---

## Tipps

- Arbeiten Sie von oben nach unten: Erledigen Sie **Benötigt Ihre Entscheidung** und werfen Sie dann einen Blick auf **Aufmerksamkeit erforderlich**, um zu sehen, ob etwas das Ticketsystem nicht erreicht hat. Die beiden mittleren Abschnitte erfordern kein Handeln von Ihnen.
- Nichts hier hat den Anfragenden erreicht, bevor Sie es freigeben. Einen Entwurf zu lesen, ihn zurückzuverfolgen oder ihn in der Warteschlange zu belassen, ändert nichts am Ticket.
- Lehnen Sie ab, statt zu ignorieren. Ein abgelehnter Vorschlag bleibt mit Ihrer optionalen Notiz im Audit-Trail, was später weit nützlicher ist als ein Vorschlag, der einfach unbeachtet abgelaufen ist.
- Verwerfen Sie einen Vorschlag, den Sie schlicht nicht senden werden, statt ihn abzulehnen. Ist ein Entwurf zutreffend, soll aber nicht hinausgehen — ein sensibles Ticket, ein Kollege hat bereits geantwortet —, legt **Verwerfen** ihn beiseite, ohne den Agenten zu belasten. **Ablehnen** bleibt Vorschlägen vorbehalten, die wirklich falsch waren.
- Ein fehlender **Synthesis-Fallback**-Hinweis ist eine gute Nachricht, keine fehlende Information. Widmen Sie Ihre gründlichste Lektüre den Entwürfen, die ihn *tatsächlich* tragen.
- Wenn eine freigegebene Änderung in **Aufmerksamkeit erforderlich** landet, verraten Ihnen die rote Bildunterschrift und der **Trace**-Link, ob der Agent, eine Sicherheitsprüfung oder das verbundene Ticketsystem sie gestoppt hat — beheben Sie die zugrunde liegende Ursache, statt blind erneut freizugeben.
- Die kombinierte Warteschlange unter `/agents/approvals` ist am schnellsten, wenn Sie mehrere Agenten betreiben; wechseln Sie zum eigenen Tab **Freigaben** eines Agenten, wenn Sie sich nur auf diesen konzentrieren möchten.
