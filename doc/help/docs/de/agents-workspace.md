# KI-Agenten — Agent-Arbeitsbereich

Der Agent-Arbeitsbereich ist der Ort, an dem ein einzelner Agent lebt: Sie steuern ihn, beobachten, was er tut, prüfen seine Vorschläge, beurteilen, wie gut er arbeitet, und — wenn Sie Administrator sind — konfigurieren jedes Detail seiner Arbeitsweise. Es ist die tiefste Oberfläche im Bereich KI-Agenten. Alles zu einem einzelnen Agenten, das keine flottenweite Steuerung ist, befindet sich hier: eine Steuerleiste, die Sie auf jeder Registerkarte begleitet, und darunter vier Registerkarten.

Öffnen Sie einen Agenten, indem Sie auf seine Karte unter [KI-Agenten — Übersicht](agents-overview.md) klicken. Der Arbeitsbereich öffnet sich immer auf **Monitor**; Sie können jede Registerkarte per Deep-Link direkt aufrufen, und Links von anderen Stellen im Produkt bringen Sie zur richtigen.

## Wo Sie es finden

- **Arbeitsbereich:** KI-Agenten
- **Pfad:** **KI-Agenten → Übersicht →** Karte eines Agenten öffnen
- **Route:** `/agents/:agentKey`
- **Berechtigung:** Zum Anzeigen ist die Rolle KI-Agenten-Leser (`ai_agents:reader`) erforderlich. Eine Prüfung starten, den Agenten testen und über Vorschläge entscheiden setzt die Stufe Mitwirkender (`ai_agents:contributor`) voraus. Den Betriebsmodus ändern, den Agenten pausieren und die Registerkarte **Einstellungen** erfordern die Stufe KI-Agenten-Administrator (`ai_agents:admin`); der KI-Einstellungen-Administrator (`ai_settings:admin`) schaltet ebenfalls alles davon frei.
- **Verfügbarkeit:** Der gesamte Bereich KI-Agenten setzt voraus, dass KI für die Instanz aktiviert ist. Wenn Sie einen Link zu einem Agenten öffnen, den es für Ihren Mandanten nicht gibt, sehen Sie **Agent nicht gefunden** — „Dieser Agent ist im aktuellen Mandanten nicht verfügbar." — mit einem Weg zurück zur Flotte.

Die Registerkarten sind **Monitor**, **Freigaben**, **Leistung und Autonomie** und **Einstellungen**. Leser sehen die ersten drei; nur Administratoren sehen **Einstellungen**.

---

## Die Steuerleiste

Direkt unter dem Namen des Agenten sitzt eine schmale, rechtsbündige Leiste mit Bedienelementen, die auf **jeder** Registerkarte sichtbar bleibt. Sie enthält ausschließlich Aktionen — die schreibgeschützten Kennzahlen des Agenten stehen im Abschnitt **Status** auf der Registerkarte **Monitor**. Der Sinn dahinter: Sie müssen nie verlassen, woran Sie gerade arbeiten, um den Agenten zu starten, zu stoppen oder zu testen.

### Der Betriebsmodus

Das erste Bedienelement ist der Agent selbst. Geschlossen zeigt es seinen tatsächlichen Zustand als farbigen Punkt mit Beschriftung — **Überwachung — mit Rückfrage**, **Überwachung — teilweise automatisch**, **Test**, **Aus**, **Pausiert**, **Nicht gestartet** oder **Archiviert**. Öffnen Sie es (als Administrator, bei einem Agenten, der weder pausiert noch archiviert ist), bietet es die drei Betriebsmodi an:

| Modus | Was er bedeutet |
| --- | --- |
| **Aus** | Es läuft nichts, auch keine manuelle Prüfung. |
| **Nur manuell** | Läuft nur auf Anfrage — **Jetzt prüfen** und Tests funktionieren, aber der Agent sieht nie von selbst nach. |
| **Beobachtung** | Prüft selbstständig in der von Ihnen festgelegten Frequenz, zusätzlich zu allem, was **Nur manuell** kann. |

Lesen Sie die geschlossene Beschriftung als die Wahrheit und das Menü als die Absicht: Ein Agent, der auf **Beobachtung** steht, aber gerade durch eine Pause angehalten wird, zeigt **Pausiert** an und nicht **Überwachung — mit Rückfrage**. So behauptet das Bedienelement nie, der Agent arbeite, wenn er es nicht tut.

**Nur manuell** ist der Modus, der einen neuen Agenten gefahrlos ausprobierbar macht. Hier sollten Sie bleiben, solange Sie eine Persona und ihre Zielauswahl abstimmen: Sie können den Agenten so oft Sie möchten gegen echte Tickets laufen lassen, aber nichts geschieht, ohne dass Sie es anstoßen. Wechseln Sie erst zu **Beobachtung**, wenn Sie mit seinen Entwürfen zufrieden sind.

### Die übrigen Bedienelemente

- **Jetzt prüfen** (bei einem Überwachungs-Agenten **Auf neue Alarme prüfen**) führt sofort eine Prüfung aus, statt auf die nächste geplante zu warten. Es ist deaktiviert, wenn der Agent **Aus** ist („Schalten Sie den Agenten zuerst ein.") oder pausiert ist („Heben Sie zuerst die Pause auf."); der Grund steht im Tooltip.
- **An einem Ticket testen** (bei einem Überwachungs-Agenten **An einem Alarm testen**) bringt Sie zum Testabschnitt auf der Registerkarte **Monitor**, ganz gleich, auf welcher Registerkarte Sie gerade waren.
- **Agent pausieren** ist die rote Notbremse, und sie ist bewusst nicht dasselbe wie **Aus**. Sie fragt nach einem Grund und hält dann die Prüfungen dieses Agenten *sowie alle ausstehenden Schreibvorgänge* an, bis Sie die Pause aufheben. Andere Agenten laufen weiter. Solange eine Pause aktiv ist, zeigt ein Warnbanner **Notfallpause aktiv: {reason}** an, und das Bedienelement wird zu **Pause aufheben**. Eine für den gesamten Mandanten gesetzte Pause zeigt stattdessen **Für alle Agenten pausiert** an und schickt Sie zur Flottenübersicht — eine mandantenweite Pause können Sie nicht von einem einzelnen Agenten aus aufheben.

Verwenden Sie **Aus**, um einen Agenten für eine Weile stillzulegen; greifen Sie zu **Agent pausieren**, wenn etwas schiefläuft und Sie auch die laufende Arbeit einfrieren wollen.

Ein archivierter Agent hat keine Bedienelemente, sondern nur einen Hinweis — *Archiviert — im Tab Einstellungen wiederherstellen.*

---

## Monitor

Monitor ist die Live-Statustafel für diesen einen Agenten. Sie aktualisiert sich, während Arbeit durchläuft, und ist daher die Registerkarte, die Sie geöffnet lassen sollten, wenn Sie die Dinge im Auge behalten.

### Status

Der Abschnitt **Status** ist schreibgeschützt: Hier steht jetzt jede Tatsache über den aktuellen Zustand des Agenten, in einer Zeile von Kennzahlen.

- Der Zustand des Agenten, in denselben Worten wie in der Steuerleiste.
- **Überwachung** — **Alle Tickets**, **Gefiltert** (wenn Ihre Zielauswahl den Bereich eingrenzt) oder **Aus**. Bei einem Überwachungs-Agenten steht dort **Alle Alarme**, **Gefiltert** oder **Aus**.
- **Letzte Prüfung** — das Ergebnis der jüngsten Prüfung.
- **Nächste Prüfung** — **Alle N Minuten**, entsprechend der Einstellung **Prüfen alle (Minuten)**, solange der Agent überwacht. Andernfalls **Nicht gesetzt**, weil nichts geplant ist.
- **Warteschlange** — *N wartend · N in Arbeit*: Vorschläge, die auf Ihre Entscheidung warten, und Tickets, an denen der Agent gerade arbeitet.
- **N fehlgeschlagen**, in Rot, wenn etwas ins Stocken geraten ist und nicht von selbst erneut versucht wird. Das sind die Einträge, die Sie unter **Aufmerksamkeit erforderlich** in den [Freigaben](agents-approvals.md) wiederfinden.
- **Läufe heute**, **Tokens heute** und **Kosten heute**, jeweils als *verbraucht / Limit*. Das sind die täglichen Sicherheitsgrenzen aus den **Einstellungen**, und hier bemerken Sie einen Agenten, der bald für den Tag verstummt. (Nur bei Desk-Agenten — Überwachungs-Agenten werden nicht auf diese Weise gemessen, daher werden die Werte ausgeblendet statt als irreführende Nullen angezeigt.)

### An einem Ticket testen

**An einem Ticket testen** lässt den Agenten einmal gegen ein einzelnes Ticket laufen, das Sie angeben — der schnellste Weg, um zu sehen, wie er sich verhält, bevor Sie ihn eigenständig überwachen lassen, oder um seine Argumentation an einem konkreten Fall zu prüfen. Geben Sie eine Ticketnummer ein (zum Beispiel `64`) und drücken Sie **Test starten**. Der Agent führt einen vollständigen Durchlauf nur für dieses Ticket aus; was auch immer er vorschlägt, landet wie jede andere Arbeit zur Prüfung auf der Registerkarte **Freigaben**. Ohne Freigabe wird nichts an den Anfragenden gesendet.

Ein Überwachungs-Agent erhält stattdessen **An einem Alarm testen**: Geben Sie ihm eine Alarm-ID, und seine Diagnose erscheint darunter, im selben Dossier-Layout wie eine gespeicherte Diagnose.

Testen funktioniert in **Nur manuell** ebenso wie in **Beobachtung**, und genau darum geht es — es ist der Begleiter eines Agenten, dem Sie noch nicht vertrauen.

### Aktuelle Aktivität

Am unteren Rand von Monitor ist die Live-Zeitachse der Prüfungen, Vorschläge, Entscheidungen, Ausführungen, Pausen und Fehler dieses Agenten eingebettet. Es ist derselbe Feed wie die vollständige Seite [Aktivität](agents-activity.md), bereits auf diesen Agenten gefiltert — dieselben Kategorie-Umschalter, dasselbe **Mehr laden**, derselbe Trace-Dialog.

---

## Freigaben

Die Registerkarte **Freigaben** ist die Prüfwarteschlange — vorgeschlagene Antworten, Notizen und Ticketänderungen, die auf Ihre Entscheidung warten — beschränkt auf genau diesen Agenten. Sie verhält sich genau wie die eigenständige Warteschlange, einschließlich des gesammelten Freigebens, der Bestätigung terminaler Aktionen und der Bedienelemente **Zur Kenntnis nehmen** und **Analyse erneut starten** in den Zeilen unter **Aufmerksamkeit erforderlich**. Unter [Freigaben](agents-approvals.md) finden Sie die vollständige Erklärung; daran ändert sich hier nichts, außer dass Sie nur die Einträge dieses Agenten sehen.

---

## Leistung und Autonomie

Diese Registerkarte beantwortet eine einzige Frage: Verdient sich der Agent mehr Eigenständigkeit? Sie stellt die Belege und den Schalter nebeneinander, damit Sie nie an der einen Stelle urteilen und an einer anderen handeln müssen.

### Die Kennzahlen im Überblick

- **Annahme** — der Anteil seiner Vorschläge, den Sie freigegeben haben. Dies ist die Kennzahl, die am stärksten beeinflusst, ob ein Aktionstyp automatisch werden kann.
- **Verworfen** — der Anteil der geprüften Vorschläge, den Sie beiseitegelegt statt freigegeben oder abgelehnt haben. Ein Verwerfen belastet den Agenten nicht, daher steht diese Zahl neben der Annahme für sich. Lesen Sie einen dauerhaft hohen Wert als Zielauswahl-Problem — der Agent greift Tickets auf, die er nicht bearbeiten sollte — und beheben Sie es unter **Einstellungen → Zielauswahl**, statt es als Frage der Antwortqualität zu behandeln.
- **Freigabelatenz** — die typische Zeit in Minuten zwischen dem Erscheinen eines Vorschlags und einer Entscheidung darüber. Ein steigender Wert bedeutet meist, dass die Warteschlange mehr Aufmerksamkeit der Prüfer braucht, nicht dass der Agent schlechter arbeitet.
- **Wissens-Trefferquote** — wie oft seine Antworten durch Ihre Wissensquellen gestützt wurden.
- **Kosten pro Ticket** — durchschnittliche Ausgaben pro bearbeitetem Ticket, in EUR. (Die Kosten der gesamten Flotte finden Sie auf der [Übersicht](agents-overview.md).)
- **Läufe pro Ticket** — wie viele Prüfungen im Durchschnitt nötig waren, um ein Ticket zu lösen.

### Trends

Zwei Diagramme decken die letzten 14 Tage ab. **Trends** stellt **Vorgeschlagen** gegen **Ausgeführt** pro Tag dar, sodass Sie sehen, wie der Agent in Fahrt kommt, wo eine Spitze liegt oder an welchem Tag er verstummt ist. **Kosten pro Tag** sitzt als kleineres Diagramm darunter auf derselben Tagesachse — Stückzahlen und Euro teilen sich bewusst keine Skala. Solange der Agent noch nichts getan hat, steht in beiden **Noch keine Aktivität erfasst.**

### Die Autonomie-Stufen

Standardmäßig **fragt jeder Aktionstyp zuerst** — der Agent schlägt vor und wartet auf Sie. In diesem Abschnitt stufen Sie einen Aktionstyp auf **Automatisch** hoch, einen nach dem anderen, sobald er es sich verdient hat.

Jede Zeile zeigt den Aktionstyp, seinen aktuellen Modus (**Zuerst fragen** oder **Automatisch**) und eine Fortschrittszeile: erfasste Entscheidungen im Verhältnis zur erforderlichen Anzahl, Annahmequote im Verhältnis zur erforderlichen Quote und Tage der Aktivität im Verhältnis zu den erforderlichen Tagen. Kommt eine Zeile noch nicht infrage, nennt sie den Grund in klaren Worten — *Noch nicht genügend geprüfte Vorschläge.*, *Die Annahmequote liegt unter dem Schwellenwert.*, *Noch nicht genügend Tage Aktivität.*

**Nicht jeder Aktionstyp trägt dasselbe Risiko, und die Stufen sagen das jetzt auch.**

- **Interne Notiz**, **Klassifizierung aktualisieren** und **Status aktualisieren** bilden die risikoärmere Stufe. Nichts verlässt Ihr Team, und nichts wechselt zwischen Personen. Die Belegschwellen sind hier Empfehlungen: Kommt ein Typ infrage, öffnet **Einschalten** eine kurze Bestätigung; kommt er nicht infrage, können Sie ihn mit **Übersteuern** und einer schriftlichen Begründung trotzdem gewähren.
- **Antwort an Anfragende**, **Zuweisung** und **Beteiligte** bilden die risikoreichere Stufe. Ihre Zeilen sind mit einem Warnrahmen und einer einzeiligen Erinnerung daran gekennzeichnet, wozu Sie Ihr Einverständnis geben würden — *Der Agent würde dem Anfragenden antworten, ohne dass jemand vorher mitliest.* Diese Typen lassen sich jetzt automatisieren, was zuvor nicht möglich war. Die Freigabe erfordert jedoch **immer** eine ausdrückliche Bestätigung und eine schriftliche Begründung, selbst wenn alle Schwellen bereits erfüllt sind und die Zeile infrage kommt. Die Begründung wird im Verlauf des Agenten aufbewahrt, damit Ihr Team sieht, wer das akzeptiert hat und warum.

In beiden Fällen erinnert die Bestätigung daran, dass automatische Aktionen weiterhin die Tageslimits und die Notfallpause einhalten und bei sinkender Annahme zur Rückfrage zurückkehren. **Ausschalten** setzt jeden automatischen Aktionstyp sofort auf Zuerst fragen zurück.

Zwei Sperren sind absolut, und keine Begründung hebt sie auf: ein Aktionstyp, den Sie unter **Fähigkeiten** ausgeschaltet haben (*Diese Aktion ist für diesen Agenten nicht aktiviert.*), und ein offener Vorfall (*Ein offener Vorfall blockiert die Automatisierung.*).

Automatisch bedeutet niemals unbeaufsichtigt. Harte Sicherheitsgrenzen, Budgets, Aktualitätsprüfungen und Pausen gelten unabhängig vom Modus eines Aktionstyps auf dieselbe Weise.

---

## Einstellungen

Die Registerkarte **Einstellungen** ist nur für Administratoren und enthält jeden Konfigurationsregler für den Agenten. Sie **speichert automatisch**: Es gibt keine Speicherschaltflächen, und jeder Abschnitt zeigt in seiner Kopfzeile eine kleine Anzeige **Wird gespeichert…** / **Gespeichert**, während Ihre Änderungen geschrieben werden. Wenn Sie die Registerkarte wechseln, während ein Speichervorgang noch läuft, wird dieser zuerst abgeschlossen — und schlägt er fehl, wird der Wechsel abgebrochen, sodass der Fehler und Ihre Änderung auf dem Bildschirm bleiben.

Die vier Abschnitte folgen der Reihenfolge, in der man einen Agenten tatsächlich einrichtet: Entscheiden Sie zuerst, worauf er schaut, dann, was er ist, dann, was er weiß, und schließlich, wie hart er arbeiten darf.

### Zielauswahl

Die Zielauswahl entscheidet, welche Tickets der Agent überwacht. (Ob er überhaupt überwacht, legt der Betriebsmodus in der Steuerleiste fest — die Zielauswahl beschreibt nur den Bereich.)

Schnellvorlagen — **Neue Tickets**, **Alle offenen**, **Von diesem Agenten bearbeitet** — fügen einen anfänglichen Filtersatz ein; wenn Sie bereits Filter haben, werden Sie gefragt, bevor sie ersetzt werden. Mit dem Filter-Baukasten kombinieren Sie Bedingungen: Alle Filter werden zusammen kombiniert, und die verfügbaren Werte stammen direkt aus dem verbundenen Ticketsystem. Wählen Sie eine Kategorie oder eine Entität aus, ist alles darunter eingeschlossen, und der Baukasten sagt das auch.

Eine Zeile unter den Filtern sagt, wie viele Tickets derzeit passen. Wenn ein anderer Agent einige dieser Tickets bereits überwacht, wird diese Zahl ebenfalls genannt — das ist das Signal, dass sich zwei Agenten um dieselbe Arbeit streiten könnten. Steht in der Zeile **mindestens N**, ist die echte Warteschlange größer als die Vorschau (Ihre Limits pro Prüfung begrenzen, wie viele Tickets geprüft werden).

Überwachungs-Agenten haben denselben Abschnitt, filtern darin aber stattdessen nach Alarmzustand, Schweregrad, Quittierung, Gruppe, Gerät und Check-Typ.

### Ziel und Fähigkeiten

**Fähigkeiten** stehen zuerst, denn sie stecken den Rahmen für alles Weitere: Schalter dafür, welche Arten von Änderungen der Agent *überhaupt* vorschlagen darf — **Interne Notizen**, **Antworten an Anfragende**, **Klassifizierung**, **Statusänderungen**, **Zuweisung** und **Beteiligte**. Einen davon auszuschalten entfernt diesen Aktionstyp vollständig: Der Agent kann ihn nicht vorschlagen, ganz gleich, was die Anweisungen sagen, und er kann in den Autonomie-Stufen nicht hochgestuft werden.

Darunter sitzt die Persona — wer der Agent ist und wie er schreibt:

- **Name** — wie der Agent in KANAP heißt. Das hat keine Auswirkung darauf, was er tut.
- **Beschreibung** — eine kurze Zusammenfassung für Ihre Kolleginnen und Kollegen, unter dem Agentennamen angezeigt.
- **Mission** — wofür dieser Agent da ist, in ein bis zwei Sätzen. Er liest sie vor jedem Ticket.
- **Anweisungen** — Hausregeln, eine pro Zeile. Sie können nicht erweitern, was der Agent tun darf.
- **Ausgabestil** — wie er beim Schreiben klingen soll (zum Beispiel *klar und knapp*).
- **Antwortsprache** — **Ticketsprache** (in der Sprache antworten, die der Anfragende verwendet hat), **Französisch**, **Englisch**, **Deutsch** oder **Spanisch**.
- **Eskalationshinweis** — wann der Agent ein Ticket an eine Person übergeben soll, statt selbst etwas vorzuschlagen.

**Agent archivieren** in der Kopfzeile des Abschnitts ist der bewusste Weg, einen Agenten außer Dienst zu stellen: Er beobachtet und läuft nicht mehr, behält aber Konfiguration und Verlauf, und **Agent wiederherstellen** holt ihn an derselben Stelle zurück.

**Gemeinsamen Kontext verwenden** legt wiederverwendbare Hintergrundinformationen zu Ihrer Umgebung auf diesen Agenten. Zu sehen ist zunächst nur der Schalter; sobald Sie ihn einschalten, erscheinen die Profilauswahl, eine Verknüpfung **+ Neues Profil** und eine Vorschau der Zeilen des ausgewählten Profils. Gemeinsamer Kontext prägt, wie der Agent Tickets interpretiert und Antworten verfasst, ist aber niemals eine Berechtigung und **keine** zitierbare Quelle — anders als [Wissensbibliotheken](knowledge.md), deren Ergebnisse in Antworten *zitiert* werden. Profile verwalten Sie auf der Seite [Gemeinsamer Kontext](agents-shared-context.md).

**Effektiven Prompt anzeigen** ist standardmäßig eingeklappt. Klappen Sie ihn auf, um genau zu lesen, was die Laufzeit des Agenten erhält, zusammengestellt aus allem oben Genannten sowie den eigenen Regeln der Plattform. Verwenden Sie die Auswahl, um jede Stufe zu untersuchen — **Aktionsplanung**, **Planung** und **Interpretation** sind die Stufen, in denen der Agent entscheidet, *was zu tun ist*; in der **Synthese** verfasst er die Antwort, gestützt auf Ihre Wissensquellen; ein Überwachungs-Agent hat stattdessen **Diagnose**. Die Vorschau aktualisiert sich nach jedem Speichern. Wie der Hinweis sagt: **Hinweise können Sicherheitsregeln nicht überschreiben** — nichts, was Sie in der Persona schreiben, kann die harten Grenzen der Plattform lockern.

### Wissens- und Webquellen

Woher der Agent seine Fakten bezieht:

- **KANAP-Wissensdatenbank durchsuchen** — wenn aktiviert, greift der Agent auf Ihre [Wissensbibliotheken](knowledge.md) zurück und zitiert sie in Antworten. Wenn deaktiviert, antwortet der Agent aus dem eigenen Wissen des Modells (und aus dem Web, falls das aktiviert ist).
- **Alle verfügbaren Bibliotheken durchsuchen**, oder deaktivieren Sie dies, um bestimmte **Bibliotheken** auszuwählen — der Agent durchsucht dann nur diese, im Rahmen seiner Zugriffsrechte. Bibliotheksnamen stammen aus dem Bereich Wissensdatenbank.
- **Im Web suchen** — lässt den Agenten auch das öffentliche Web heranziehen; das KANAP-Wissen hat immer Vorrang und Web-Ergebnisse werden als Quelle angegeben. Dieser Schalter ist nur verfügbar, wenn die Websuche für die gesamte Plattform aktiviert ist. Wenn nicht, ist der Schalter deaktiviert und ein Hinweis verweist Sie an Ihren Administrator — siehe [Plaid-Einstellungen](ai-settings.md).

Überwachungs-Agenten erhalten hier stattdessen **KANAP-Daten durchsuchen**. Damit kann der Agent Ihr eigenes IT-Inventar nachschlagen — **Anwendungen**, **Assets**, **Schnittstellen**, **Verbindungen**, **Standorte** —, um eine Diagnose mit Geschäftskontext anzureichern.

### Betriebseinstellungen

Die Steuerungen für Tempo und Budget. Jedes Feld trägt einen Informations-Tooltip, der erklärt, was es bewirkt und was geschieht, wenn der Wert erreicht wird — so bleibt die Seite kurz.

- **KI-Modell** — mit welchem Modell dieser Agent arbeitet. **Standard der Organisation** ist der Ausgangswert und meist der richtige: Der Agent folgt dem Modell, das Ihre Organisation als Standard gesetzt hat, und zieht mit ihm mit. Wählen Sie ein bestimmtes Modell namentlich aus, um diesen Agenten daran zu binden — ein Modell, das Bilder versteht, für Warteschlangen mit vielen Screenshots; ein günstiges lokales Modell für die Triage großer Mengen. Es erscheinen nur aktive Modelle; sie werden auf der Seite [KI-Modelle](ai-models.md) definiert. Ein Modell, an das ein Agent gebunden ist, kann ihm nicht unter den Händen weg archiviert werden — der Agent muss zuerst davon abgezogen werden. Beachten Sie, dass das Lesen der Modellliste die Berechtigung KI-Einstellungen-Administrator (`ai_settings:admin`) voraussetzt: Allein mit der Rolle **KI-Agenten-Administrator** bietet die Auswahlliste nur **Standard der Organisation** an — das ist eine Berechtigungslücke und kein leeres Modellverzeichnis.
- **Prüfen alle (Minuten)** — wie oft der Agent nach neuen Tickets sucht, solange er überwacht, zwischen **5** Minuten und 24 Stunden (1440). Das ist der größte einzelne Hebel dafür, wie beschäftigt — und wie teuer — ein überwachender Agent ist. **Jetzt prüfen** läuft immer sofort, unabhängig davon, und dies ist der Wert, den **Nächste Prüfung** auf der Registerkarte Monitor meldet.
- **Max. Tickets pro Prüfung** und **Max. Provider-Anfragen** — die Höchstzahl der Tickets, die der Agent in einer Prüfung aufnimmt (der Rest wartet auf die nächste), und die Höchstzahl der Aufrufe an das Ticketsystem in einer Prüfung, damit es nie überlastet wird.
- **Prüfen alle (Stunden)** — wie bald der Agent dasselbe Ticket erneut ansehen darf, sobald nichts mehr wartet (angewendet, abgelehnt, verworfen oder Fenster abgelaufen). Ein wartender Vorschlag belegt das Ticket: Der Agent schreibt kein weiteres Paar, solange dieser Vorschlag offen ist, außer das Ticket selbst hat sich geändert.
- **Agentenpriorität** und **Ticket-Kollision** — welcher Agent gewinnt, wenn mehrere dasselbe Ticket anvisieren (kleinere Zahl = höhere Priorität), und was dieser Agent tut, wenn bereits ein anderer daran arbeitet: **Zurückstellen** (zurücktreten) oder **Gleiche Priorität ersetzen** (von einem Agenten gleicher Priorität übernehmen).
- **Genehmigungsfenster (Stunden)** — wie lange Sie Zeit zur Genehmigung haben. Alle Vorschläge aus einer Prüfung teilen sich dieses Fenster und laufen gemeinsam ab. Ein offener Vorschlag belegt das Ticket für das gesamte Fenster, daher ist **Prüfen alle (Stunden)** 24 Stunden mit einem Genehmigungsfenster von 168 Stunden ein gültiges Paar: Sie haben eine Woche zum Entscheiden, und der Agent schreibt dazwischen kein weiteres Paar, außer das Ticket ändert sich.
- **Wenn Ticket geändert wurde** — was mit einem wartenden Vorschlag geschieht, wenn sich das Ticket weiterentwickelt, bevor Sie entscheiden: **Neu prüfen**, **Abbrechen** oder **Trotzdem anwenden**.
- **Aktivitätsverlauf aufbewahren (Tage)** — wie lange die Zeitachse dieses Agenten aufbewahrt wird, zwischen **7** und **90** Tagen, standardmäßig **30**. Ältere Einträge, Läufe und abgeschlossene Vorschläge werden jede Nacht automatisch gelöscht. Siehe den Warnhinweis weiter unten.

#### Sicherheitsgrenzen

Die fünf wirtschaftlichen Obergrenzen stehen in einer eigenen Gruppe, unter einem klaren Hinweis: Es handelt sich um **harte Stopps, keine Schätzungen**. Erreicht der Agent eine dieser Grenzen, stoppt er für den Rest des Tages und wartet auf Sie — am nächsten Tag läuft er wieder.

- **Tokens pro Lauf** und **Kosten pro Lauf (EUR)** — das Meiste, was der Agent für *ein Ticket* aufwenden darf. Ist eine der beiden Grenzen erreicht, stoppt dieses Ticket, und es wird nichts dafür vorgeschlagen. Ein *Lauf* ist ein Durchgang an einem Ticket, nicht eine Prüfung: Eine einzelne Prüfung kann das Budget pro Lauf für jedes aufgegriffene Ticket einmal ausgeben — lesen Sie diese Werte deshalb zusammen mit **Max. Tickets pro Prüfung**.
- **Läufe pro Tag**, **Tokens pro Tag** und **Kosten pro Tag (EUR)** — die Tagesobergrenzen. Jede der drei zeigt darunter den tatsächlichen heutigen Verbrauch (**Heute: …**), sodass Sie eine Obergrenze am realen Bedarf des Agenten bemessen können, statt zu raten. Es sind dieselben Werte wie im Abschnitt **Status** im Monitor.

Die beiden Kostenobergrenzen werden mit dem oben zugewiesenen **KI-Modell** berechnet, anhand der Preise, die dafür auf der Seite [KI-Modelle](ai-models.md) hinterlegt sind. Das hat eine Konsequenz, die man kennen sollte: **Ein kostenfreies Modell (0 €) erreicht eine Kostenobergrenze nie**, weil alles, was es tut, nichts kostet. Beim inklusiven KANAP-Modell, bei einem lokalen Modell oder bei jedem Modell, das Sie ohne Preise hinterlegt haben, sind die Kostenobergrenzen wirkungslos, und die Limits für **Tokens** und **Läufe** sind Ihr einziger echter Schutz. Setzen Sie sie entsprechend.

Überwachungs-Agenten haben denselben Abschnitt in kürzerer Form: **KI-Modell**, **Prüfen alle (Minuten)**, **Bearbeitete Alarme pro Prüfung**, **Anfragen an das Überwachungstool pro Prüfung** und **Aktivitätsverlauf aufbewahren (Tage)**.

!!! warning "Behalten Sie mindestens 30 Tage Verlauf, wenn Sie den automatischen Modus nutzen möchten"
    Die Bilanz eines Agenten wird über die letzten **28 Tage** gemessen. Setzen Sie **Aktivitätsverlauf aufbewahren (Tage)** unter 30, löschen Sie genau die Belege, die die Autonomie-Stufen zählen — ein Agent kann dann scheinbar Boden verlieren, den er sich bereits erarbeitet hatte. Der Standardwert von 30 Tagen liegt bewusst sicher über diesem Fenster; verkürzen Sie ihn nur bei einem Agenten, den Sie ohnehin nicht hochstufen wollen. Nichts, worüber Sie noch entscheiden müssen, wird jemals gelöscht: Offene Vorschläge und die Traces dahinter bleiben unabhängig von dieser Einstellung erhalten.

---

## Tipps

- **Bleiben Sie in „Nur manuell", bevor Sie zu „Beobachtung" wechseln.** Das ist der ehrliche Weg, einen Agenten abzustimmen: Lassen Sie ihn von Hand an echten Tickets laufen, lesen Sie, was er entwirft, passen Sie an, wiederholen Sie. Es geschieht nichts, worum Sie nicht gebeten haben.
- **„Aus" und „Pause" sind unterschiedliche Werkzeuge.** **Aus** legt den Agenten still. **Agent pausieren** friert ihn *und* die bereits laufende Arbeit ein und verlangt einen Grund, der in die Aufzeichnung eingeht — greifen Sie dazu, wenn etwas schiefläuft, nicht wenn Sie Feierabend machen.
- **Die Prüffrequenz ist Ihr Kostenregler.** Bevor Sie ein Tageslimit erhöhen, fragen Sie sich, ob der Agent wirklich alle fünf Minuten nachsehen muss. In einer ruhigen Warteschlange ändert eine Prüfung alle 30 oder 60 Minuten nichts an der Reaktionszeit, die Ihre Anfragenden bemerken würden, senkt aber die Rechnung entsprechend.
- **Bemessen Sie die Obergrenzen an den „Heute"-Werten.** Jedes Tageslimit zeigt direkt darunter, was der Agent heute tatsächlich verbraucht hat. Das ist eine weit bessere Grundlage für eine Obergrenze als eine runde Zahl.
- **Der Abschnitt „Status" ist Ihr Frühwarnlicht.** Ein Agent, der plötzlich verstummt, hat meist ein Tageslimit erreicht — prüfen Sie *Läufe / Tokens / Kosten heute* im Monitor, bevor Sie annehmen, dass etwas kaputt ist. Bei einem kostenfreien Modell kommen nur die Token- und Lauf-Limits als Ursache infrage.
- **Bauen Sie Autonomie Aktionstyp für Aktionstyp auf.** Stufen Sie zuerst die risikoärmeren Typen hoch und lassen Sie Antworten an Anfragende so lange zuerst fragen, bis die Annahme durchgängig hoch ist. Die risikoreicheren Typen stehen Ihnen jetzt offen, aber die Bestätigung hat ihren Grund: Lesen Sie, was die Zeile über das Handeln des Agenten sagt, bevor Sie zustimmen.
- **Lesen Sie den effektiven Prompt nach einer Persona-Änderung.** Er ist die verlässliche Grundwahrheit dessen, was der Agent tatsächlich erhält, und macht deutlich, wenn eine Anweisung so angekommen ist, wie Sie es gemeint haben.
- **Bevorzugen Sie gemeinsamen Kontext für Hintergrund, Bibliotheken für Fakten.** Gemeinsamer Kontext färbt das Urteil des Agenten, wird aber nie zitiert; nur Wissensbibliotheken (und, falls aktiviert, das Web) erscheinen als Quellen in einer Antwort.
- **Achten Sie auf die Überlappung in der Zielauswahl-Vorschau.** Eine hohe Überlappungszahl bedeutet, dass zwei Agenten um dieselben Tickets konkurrieren — grenzen Sie die Filter eines Agenten ein oder verwenden Sie **Agentenpriorität** und **Ticket-Kollision**, um zu entscheiden, wer gewinnt.
