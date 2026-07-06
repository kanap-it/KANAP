# KI-Agenten — Aktivität

Die Aktivität ist der schreibgeschützte Verlauf all dessen, was Ihre Agenten getan haben, und all dessen, was Sie über ihre Arbeit entschieden haben: Vorschläge, die sie entworfen haben, Ihre Freigaben und Ablehnungen, die Änderungen, die tatsächlich an ein Ticket gesendet wurden, ausgelöste Sicherheitslimits, Pausen, Konfigurationsänderungen und Fehler. Nichts auf dieser Seite ändert ein Ticket oder einen Agenten – sie existiert, damit Sie im Nachhinein beantworten können, „was passiert ist, wann und warum", und damit Sie einen Nachweis zur Hand haben, wenn ein Anfragender oder ein Techniker nachfragt. Dieselbe Zeitachse erscheint als Ausschnitt der aktuellen Aktivität im [Monitor-Tab](agents-workspace.md) eines Agenten; diese Seite ist die vollständige, filterbare Version über alle Agenten hinweg.

## Wo Sie es finden

- Arbeitsbereich: **KI-Agenten**
- Pfad: **KI-Agenten → Aktivität**
- Route: `/agents/activity`
- Berechtigung: `ai_agents:reader` (nur Ansicht – jeder, der KI-Agenten öffnen kann, kann die Zeitachse lesen)
- Setzt voraus, dass die KI für die Instanz aktiviert ist. Diese Seite ist schreibgeschützt: Hier wird nichts freigegeben, abgelehnt oder gesendet. Um auf einen Vorschlag zu reagieren, verwenden Sie [Freigaben](agents-approvals.md).

---

## Filter

Die Zeitachse zeigt die neuesten Ereignisse zuerst. Zwei Steuerelemente grenzen sie ein:

- **Ticketnummer** – geben Sie eine Ticketnummer ein und drücken Sie **Suchen** (oder die Eingabetaste), um nur die Ereignisse zu sehen, die mit diesem einen Ticket verknüpft sind. Das ist der schnellste Weg, die vollständige Geschichte eines einzelnen Tickets nachzuvollziehen: jede Prüfung, jeder Entwurf, jede Entscheidung und jede Änderung, der Reihe nach. Leeren Sie das Feld und suchen Sie erneut, um zum vollständigen Feed zurückzukehren.
- **Typ-Chips** – sechs Umschalter am oberen Rand: **Vorschlag**, **Entscheidung**, **Ausführung**, **Konfiguration**, **Pause** und **Fehler**. Klicken Sie auf einen, um nur diese Art von Ereignis anzuzeigen; klicken Sie erneut, um ihn aufzuheben. Das ist eine schnelle Möglichkeit, Fragen zu beantworten wie „Was hat der Agent tatsächlich gesendet?" (Ausführung) oder „Was haben wir abgelehnt?" (Entscheidung).

Die Ticketsuche und der Typ-Chip lassen sich kombinieren, sodass Sie sich zum Beispiel nur die Fehler zu Ticket #482 ansehen können.

---

## Einen Eintrag der Zeitachse lesen

Jeder Eintrag steht für ein einzelnes Ereignis und enthält genug Kontext, um es auf einen Blick zu verstehen:

- Einen **Typ-Chip** – zu welcher der sechs oben genannten Kategorien das Ereignis gehört.
- Einen **Aktionstyp-Chip** (wenn das Ereignis eine bestimmte Art von Ticketarbeit betrifft): **Interne Notiz**, **Antwort an Anfragende**, **Klassifizierung aktualisieren**, **Status aktualisieren**, **Zuweisung** oder **Beteiligte**.
- Einen **Statuspunkt** mit einer verständlichen Beschriftung (zum Beispiel „Wartet auf Freigabe", „Fertig", „Abgelehnt", „Verworfen", „Aufmerksamkeit erforderlich"), die beschreibt, wo dieses Element steht.
- Den **Agentennamen** und das betroffene **Ticket** (angezeigt als `#N`).
- Einen **Ereignistitel** (zum Beispiel „Vorschlag erstellt" oder „Ticket-Prüfung abgeschlossen").
- Eine **einzeilige Vorschau** des Inhalts – die erste Zeile einer entworfenen Nachricht, eine Feldänderung oder den Grund –, sodass Sie oft nichts erweitern müssen.
- Einen **Zeitstempel** sowie **Details anzeigen** und, wenn eine Prüfung hinter dem Ereignis steht, **Trace**.

### Was die Ereignisse bedeuten

Der Katalog deckt den gesamten Lebenszyklus der Agentenarbeit ab. Gruppiert nach dem Typ-Chip, unter den sie fallen:

- **Vorschlag** – der Agent hat etwas zur Prüfung entworfen: eine Antwort, Notiz oder Ticketaktualisierung wurde erstellt und wartet auf eine Entscheidung.
- **Entscheidung** – ein Vorschlag wurde **freigegeben**, **abgelehnt** oder **verworfen** (beiseitegelegt, ohne den Agenten zu belasten). Freigaben und Ablehnungen können auch automatisch erfolgen, sobald dieser Aktionstyp eigenständig läuft; ein Verwerfen ist stets die bewusste Entscheidung einer Person.
- **Ausführung** – eine Änderung wurde tatsächlich an das Ticket gesendet, oder eine Ausführung ist **fehlgeschlagen**. Automatische Ausführungen und ihre Fehler erscheinen ebenfalls hier.
- **Konfiguration** – jemand hat geändert, wie ein Agent läuft: seine **Überwachungseinstellungen** oder die allgemeine **Konfiguration** wurden aktualisiert, ein Aktionstyp wurde auf **automatisch** umgestellt oder **ausgeschaltet** (oder wieder auf Zuerst fragen **zurückgestuft**), oder ein **Agent wurde gelöscht**.
- **Pause** – eine **Notfallpause wurde aktiviert** oder **aufgehoben**, oder eine **Ticketüberwachung wurde pausiert**, weil eine Pause in Kraft war.
- **Fehler** – etwas ist schiefgelaufen, das Sie wissen sollten: eine **Prüfung ist fehlgeschlagen**, ein einzelnes **Ticket konnte nicht verarbeitet werden**, oder eine automatische Ausführung ist fehlgeschlagen. Fehler treten auch auf, wenn ein Sicherheitslimit erreicht wird – ein **tägliches Sicherheitslimit** oder ein **Sicherheitslimit pro Ausführung** –, was keine Fehlfunktion ist, sondern ein bewusster Stopp. Routinemäßige Abschlüsse wie **Ticket-Prüfung abgeschlossen** erscheinen ebenfalls hier, sodass Sie bestätigen können, dass der Agent auch an einem ruhigen Tag überwacht.

Sie müssen sich diese nicht merken – die Ereignistitel sind in verständlicher Sprache verfasst, und mit den Typ-Chips können Sie auf die für Sie relevanten Einträge filtern.

---

## Details anzeigen

**Details anzeigen** erweitert einen Eintrag um alle zugrunde liegenden Belege. Je nach Ereignis sehen Sie möglicherweise:

- Die vollständige **Vorgeschlagene Nachricht** – der gesamte vom Agenten entworfene Text, nicht nur die einzeilige Vorschau.
- **Feldänderungen**, geschrieben als „Feld: von → nach" (zum Beispiel „Status: Zugewiesen → Ausstehend"), sodass eine Änderung an Klassifizierung, Status, Zuweisung oder Beteiligten lesbar ist, ohne das Ticket zu öffnen.
- Den **Grund** – die kurze Begründung des Agenten für den Vorschlag.
- Die **Anmerkung des Prüfers** – die Notiz, die erfasst wurde, als über den Vorschlag entschieden wurde.
- Eine Zeile **„{n} Quellen zitiert"** – wie viele Ergebnisse aus Ihrer [Wissensbibliothek](knowledge.md) die entworfene Antwort gestützt haben. Das ist das ehrliche Signal dafür, ob die Antwort auf Ihren eigenen Quellen beruht; eine Antwort mit zitierten Quellen ist eine, hinter der der Agent stehen kann. Ihr Fehlen bei einer administrativen oder verfahrenstechnischen Antwort ist normal und bedeutet nicht, dass etwas fehlgeschlagen ist – wie sich das bei der Prüfung auswirkt, erfahren Sie unter [Freigaben](agents-approvals.md).

---

## Technischer Trace

Die Schaltfläche **Trace** öffnet den Dialog **Technischer Trace**. Das ist eine optionale Diagnoseansicht für Administratoren, die eine bestimmte Prüfung untersuchen – für die tägliche Durchsicht benötigen Sie sie nie, und alles, was ein Anfragender oder Techniker wissen möchte, steht bereits unter **Details anzeigen**.

Sie rekonstruiert, wie eine einzelne Prüfung abgelaufen ist:

- Die nummerierten **Schritte**, die der Agent durchlaufen hat, jeweils mit eigenem Status.
- Die **Tool-Aufrufe**, die er gemacht hat, mit der jeweiligen Dauer – nützlich, wenn eine Prüfung langsam war oder das Zeitlimit überschritten hat.
- Die **Quellen**, die er gesammelt hat, angezeigt als kurze Zusammenfassung plus die Art der Quelle, aus der sie stammen.

Ein Umschalter **Rohdaten-Trace anzeigen** zeigt den zugrunde liegenden maschinenlesbaren Datensatz für die seltenen Fälle, in denen Sie das genaue Detail benötigen; lassen Sie ihn ansonsten eingeklappt.

Dieselbe Schaltfläche **Trace** erscheint auch unter [Freigaben](agents-approvals.md) – wenn Sie ihr dort folgen, gelangen Sie direkt in diesen Dialog für die Prüfung hinter einem Vorschlag, was der übliche Weg ist, während der Durchsicht hierher zu gelangen.

---

## Tipps

- Die Suche nach **Ticketnummer** ist der schnellste Weg, jemandem die vollständige, geordnete Geschichte eines Tickets zu übergeben – Vorschlag, Entscheidung und was gesendet wurde –, ohne sich durch das Ticket selbst klicken zu müssen.
- Greifen Sie zum Filter **Ausführung**, um nur das zu sehen, was das System tatsächlich verlassen hat. Vorschläge und Entscheidungen sind Absichten; Ausführungen sind die Änderungen, die ein Anfragender oder Techniker sehen kann.
- Ein Eintrag **Sicherheitslimit erreicht** unter Fehler ist das System, das wie vorgesehen arbeitet, kein Fehler. Wenn ein Agent für den Rest eines Tages verstummt, ist das meist der Grund – erhöhen Sie seine Tageslimits in den [Einstellungen](agents-workspace.md) des Agenten, wenn das Limit für Ihr Volumen zu eng ist.
- Verwenden Sie **Trace** nur, wenn Sie einer langsamen oder fehlgeschlagenen Prüfung nachgehen; für „Was hat er gesagt und warum haben wir freigegeben?" hat **Details anzeigen** die Antwort bereits.
- Kurzweg, um zu bestätigen, dass ein Agent an einem ruhigen Tag aktiv ist: filtern Sie auf **Fehler** und suchen Sie nach Einträgen **Ticket-Prüfung abgeschlossen** – der Agent überwacht, auch wenn er nichts vorschlägt.
- Diese Seite ändert nie etwas, daher ist es unbedenklich, schreibgeschützten Zugriff (`ai_agents:reader`) an alle zu vergeben, die das Agentenverhalten prüfen müssen, ohne darauf reagieren zu können.
