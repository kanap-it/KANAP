# KI-Agenten — Agent-Arbeitsbereich

Der Agent-Arbeitsbereich ist der Ort, an dem ein einzelner Agent lebt: Sie beobachten, was er tut, prüfen seine Vorschläge, beurteilen, wie gut er arbeitet, und — wenn Sie Administrator sind — konfigurieren jedes Detail seiner Arbeitsweise. Es ist die tiefste Oberfläche im Bereich KI-Agenten. Alles zu einem einzelnen Agenten, das keine flottenweite Steuerung ist, befindet sich hier, aufgeteilt auf vier Registerkarten.

Öffnen Sie einen Agenten, indem Sie auf seine Karte unter [KI-Agenten — Übersicht](agents-overview.md) klicken. Der Arbeitsbereich öffnet sich immer auf **Monitor**; Sie können jede Registerkarte per Deep-Link direkt aufrufen, und Links von anderen Stellen im Produkt (zum Beispiel die Schaltfläche **Prüfen** auf **Leistung**) bringen Sie zur richtigen.

## Wo Sie es finden

- **Arbeitsbereich:** KI-Agenten
- **Pfad:** **KI-Agenten → Übersicht →** Karte eines Agenten öffnen
- **Route:** `/agents/:agentKey`
- **Berechtigung:** Zum Anzeigen ist die Rolle KI-Agenten-Leser (`ai_agents:reader`) erforderlich. Die Registerkarte **Einstellungen** erscheint nur für die Stufe KI-Agenten-Administrator (`ai_agents:admin`); auch der KI-Einstellungen-Administrator (`ai_settings:admin`) schaltet sie frei, zusammen mit den Steuerungen **Agent starten**, **Deaktivieren** und **Agent pausieren** auf **Monitor**.
- **Verfügbarkeit:** Der gesamte Bereich KI-Agenten setzt voraus, dass KI für die Instanz aktiviert ist. Wenn Sie einen Link zu einem Agenten öffnen, den es für Ihren Mandanten nicht gibt, sehen Sie **Agent nicht gefunden** — „Dieser Agent ist im aktuellen Mandanten nicht verfügbar." — mit einem Weg zurück zur Flotte.

Die Registerkarten sind **Monitor**, **Freigaben**, **Leistung** und **Einstellungen**. Leser sehen die ersten drei; nur Administratoren sehen **Einstellungen**.

---

## Monitor

Monitor ist die Live-Statustafel für diesen einen Agenten. Sie aktualisiert sich, während Arbeit durchläuft, und ist daher die Registerkarte, die Sie geöffnet lassen sollten, wenn Sie die Dinge im Auge behalten.

### Status

Die Karte **Status** fasst den aktuellen Modus des Agenten zusammen und enthält seine Ausführungssteuerungen (nur für Administratoren):

- **Agent starten** schaltet einen nicht gestarteten oder ausgeschalteten Agenten auf aktiviert, sodass er mit der Überwachung beginnt.
- **Deaktivieren** hält einen aktivierten Agenten von der Überwachung ab. Er behält seine Konfiguration und seinen Verlauf; Sie können ihn später erneut starten.
- **Agent pausieren** ist die Notbremse. Es fragt nach einem Grund und hält dann die Prüfungen dieses Agenten sowie alle ausstehenden Schreibvorgänge an, bis Sie die Pause aufheben. Andere Agenten laufen weiter. Solange eine Pause aktiv ist, sehen Sie hier **Pause aufheben**. Eine Pause, die für den gesamten Mandanten gesetzt wurde, zeigt stattdessen **Für alle Agenten pausiert** an und leitet Sie zur Flottenübersicht, um sie zu verwalten — eine mandantenweite Pause können Sie nicht von einem einzelnen Agenten aus aufheben.
- **Jetzt prüfen** führt sofort eine Prüfung aus, anstatt auf die nächste geplante zu warten. Es ist deaktiviert, während bereits eine Prüfung läuft oder während der Agent pausiert ist.

Unter den Steuerungen zeigen Ihnen vier schreibgeschützte Kacheln, wie die Dinge stehen:

- **Lebenszyklus** — der Gesamtzustand des Agenten in einfachen Worten: **Nicht gestartet**, **Aus**, **Test**, **Pausiert**, **Archiviert** oder, wenn er aktiv ist, **Überwachung — mit Rückfrage** / **Überwachung — teilweise automatisch** (letzteres, sobald mindestens ein Aktionstyp auf automatisch hochgestuft wurde).
- **Überwachung** — **Alle Tickets**, **Gefiltert** (wenn eine Kategorie oder Entität den Bereich eingrenzt) oder **Aus**.
- **Letzte Prüfung** — das Ergebnis der jüngsten Prüfung.
- **Nächste Prüfung** — **Alle 5 Minuten**, während der Agent überwacht; andernfalls **Nicht gesetzt**.

### Warteschlange

Die Karte **Warteschlange** zählt die Arbeit, die der Agent derzeit hält:

- **Wartet** — Tickets, deren Vorschläge auf Ihre Freigabe warten.
- **In Arbeit** — Tickets, an denen der Agent aktiv arbeitet. Jedes Ticket in Arbeit wird zudem darunter mit einem Ladeindikator und seinem Status aufgelistet, sodass Sie genau sehen, was sich bewegt.
- **Fehlgeschlagen** — Tickets, bei denen ein Fehler auftrat oder die im Status **Aufmerksamkeit erforderlich** gelandet sind und nicht von selbst erneut versucht werden.
- **Offene Freigaben** — die Gesamtzahl der einzelnen Vorschläge über alle wartenden Tickets hinweg (ein einzelnes Ticket kann mehrere enthalten).

### Limits

Die Karte **Limits** zeigt den heutigen Verbrauch gegenüber den auf der Registerkarte **Einstellungen** festgelegten Sicherheitsobergrenzen: **Läufe heute**, **Tokens heute** und **Kosten heute** (in EUR), jeweils als *verbraucht / Limit*. Dies sind harte Obergrenzen — wenn ein Limit erreicht ist, stoppt der Agent für den Tag, unabhängig von allem anderen. An dieser Karte bemerken Sie also einen Agenten, der bald verstummt.

### An einem Ticket testen

**An einem Ticket testen** lässt den Agenten einmal gegen ein einzelnes Ticket laufen, das Sie angeben — der schnellste Weg, um zu sehen, wie er sich verhält, bevor Sie ihn eigenständig überwachen lassen, oder um seine Argumentation an einem konkreten Fall zu prüfen. Geben Sie eine Ticketnummer ein (zum Beispiel `64`) und drücken Sie **Test starten**. Der Agent führt einen vollständigen Durchlauf nur für dieses Ticket aus; was auch immer er vorschlägt, landet wie jede andere Arbeit zur Prüfung in der Registerkarte **Freigaben**. Ohne Freigabe wird nichts an den Anfragenden gesendet. Das funktioniert sogar, während der Agent nicht gestartet ist, was es zum natürlichen Begleiter der Phase **Nicht gestartet** eines neuen Agenten macht.

### Aktuelle Aktivität

Am unteren Rand von Monitor ist eine Live-Zeitachse (schreibgeschützt) der Vorschläge, Entscheidungen, Ausführungen, Pausen und Fehler dieses Agenten eingebettet. Es ist derselbe Feed wie die vollständige Seite [Aktivität](agents-activity.md), bereits auf diesen Agenten gefiltert. Jeder Eintrag kann eine optionale Diagnoseansicht **Technischer Trace** öffnen — für Administratoren, die das Schritt-für-Schritt-Detail hinter einer Prüfung sehen möchten.

---

## Freigaben

Die Registerkarte **Freigaben** ist die Prüfwarteschlange — vorgeschlagene Antworten, Notizen und Ticketänderungen, die auf Ihre Entscheidung warten — beschränkt auf genau diesen Agenten. Sie verhält sich genau wie die eigenständige Warteschlange, einschließlich des gesammelten Freigebens oder Ablehnens und der Bestätigung terminaler Aktionen. Unter [Freigaben](agents-approvals.md) finden Sie die vollständige Erklärung, wie die Warteschlange funktioniert; daran ändert sich hier nichts, außer dass Sie nur die Einträge dieses Agenten sehen.

---

## Leistung

Leistung sagt Ihnen, ob sich der Agent mehr Autonomie verdient. Die Reihe der Kennzahlen umfasst für diesen Agenten:

- **Annahme** — der Anteil seiner Vorschläge, den Sie freigegeben haben. Dies ist die Kennzahl, die am stärksten beeinflusst, ob ein Aktionstyp automatisch werden kann.
- **Verworfen** — der Anteil der geprüften Vorschläge dieses Agenten, den Sie beiseitegelegt statt freigegeben oder abgelehnt haben. Ein Verwerfen belastet den Agenten nicht, daher steht diese Zahl neben der Annahme für sich. Lesen Sie einen dauerhaft hohen Wert als Zielauswahl-Problem — der Agent greift Tickets auf, die er nicht bearbeiten sollte — und beheben Sie es unter **Einstellungen → Zielauswahl**, statt es als Frage der Antwortqualität zu behandeln.
- **Freigabelatenz** — die typische Zeit in Minuten zwischen dem Erscheinen eines Vorschlags und einer Entscheidung darüber. Ein steigender Wert bedeutet meist, dass die Warteschlange mehr Aufmerksamkeit der Prüfer braucht, nicht dass der Agent schlechter arbeitet.
- **Wissens-Trefferquote** — wie oft seine Antworten durch Ihre Wissensquellen gestützt wurden.
- **Kosten pro Ticket** — durchschnittliche Ausgaben pro bearbeitetem Ticket, in EUR.
- **Läufe pro Ticket** — wie viele Prüfungen im Durchschnitt nötig waren, um ein Ticket zu lösen.

Darunter zeigt ein 14-tägiger **Trends**-Streifen das Volumen von vorgeschlagen gegenüber ausgeführt pro Tag, sodass Sie auf einen Blick sehen, wie der Agent in Fahrt kommt (oder eine Spitze).

Die **Autonomie-Stufen** listen jeden Aktionstyp auf, für den der Agent Daten hat, mit der Anzahl der erfassten geprüften Entscheidungen im Verhältnis zur Anzahl, die erforderlich ist, bevor der Modus **Automatisch** geprüft werden kann. Wenn ein Aktionstyp genügend Belege hat, springen Sie mit **Prüfen** zum Abschnitt **Autonomie** unter **Einstellungen**, wo die Hochstufung tatsächlich vorgenommen wird.

---

## Einstellungen

Die Registerkarte **Einstellungen** ist nur für Administratoren und enthält jeden Konfigurationsregler für den Agenten. Sie **speichert automatisch**: Es gibt keine Speicherschaltflächen, und jeder Abschnitt zeigt in seiner Kopfzeile eine kleine Anzeige **Wird gespeichert…** / **Gespeichert**, während Ihre Änderungen geschrieben werden. Änderungen werden direkt übernommen, sodass die Seite während der Arbeit nicht neu lädt oder Ihre Position verliert.

### Ziel und Fähigkeiten

Dies ist die Persona des Agenten — wer er ist und wie er schreibt:

- **Name** und **Status**. Der Status steuert die Verfügbarkeit: **Nicht gestartet**, **Aktiviert**, **Aus** oder **Archiviert**. (Das Archivieren ist der bewusste Weg, einen Agenten außer Betrieb zu nehmen.)
- **Beschreibung** — Freitext für Ihr eigenes Team.
- **Mission** — die Aufgabe des Agenten in ein bis zwei Sätzen.
- **Anweisungen** — eine Anweisung pro Zeile; jede Zeile wird als eigene Regel behandelt.
- **Ausgabestil** — der Ton, in dem der Agent schreibt (zum Beispiel *klar und knapp*).
- **Antwortsprache** — die Sprache der an den Anfragenden gerichteten Antworten: **Ticketsprache** (passt sich der Sprache an, in der das Ticket verfasst ist), **Französisch**, **Englisch**, **Deutsch** oder **Spanisch**.
- **Eskalationshinweis** — wann und wie der Agent ein Ticket an einen Menschen übergeben soll, anstatt es selbst zu lösen.
- **Gemeinsamer Kontext** — aktivieren Sie **Gemeinsamen Kontext verwenden** und wählen Sie ein Profil, um wiederverwendbare Hintergrundinformationen zu Ihrer Umgebung auf diesen Agenten zu legen, oder erstellen Sie mit **+ Neues Profil** direkt eines. Darunter wird eine Vorschau der Zeilen des ausgewählten Profils angezeigt. Gemeinsamer Kontext prägt, wie der Agent Tickets interpretiert und Antworten verfasst, ist aber niemals eine Berechtigung und **keine** zitierbare Quelle — anders als [Wissensbibliotheken](knowledge.md), deren Ergebnisse in Antworten *zitiert* werden. Profile verwalten Sie vollständig auf der Seite [Gemeinsamer Kontext](agents-shared-context.md).

Neben dem Persona-Editor befindet sich die schreibgeschützte Vorschau **Effektiver Prompt**: genau das, was die Laufzeit des Agenten erhält, zusammengestellt aus allem oben Genannten sowie den eigenen Regeln der Plattform. Verwenden Sie die Auswahl, um jede Stufe zu untersuchen — **Aktionsplanung**, **Planung** und **Interpretation** sind die Stufen, in denen der Agent entscheidet, *was zu tun ist*; in der **Synthese** verfasst er die Antwort, gestützt auf Ihre Wissensquellen. Die Vorschau aktualisiert sich nach jedem Speichern. Wie der Hinweis sagt: **Hinweise können Sicherheitsregeln nicht überschreiben** — nichts, was Sie in der Persona schreiben, kann die harten Grenzen der Plattform lockern.

### Fähigkeiten

Schalter dafür, welche Arten von Änderungen der Agent überhaupt vorschlagen darf: **Interne Notizen**, **Antworten an Anfragende**, **Klassifizierung**, **Statusänderungen**, **Zuweisung** und **Beteiligte**. Einen davon auszuschalten, entfernt diesen Aktionstyp vollständig — der Agent kann ihn nicht vorschlagen und er kann nicht in den Autonomie-Stufen erscheinen. Dies ist die äußere Grenze; der Abschnitt **Autonomie** weiter unten entscheidet, welche der aktivierten Typen weiterhin zuerst fragen.

### Zielauswahl

Die Zielauswahl entscheidet, welche Tickets der Agent überwacht. Der Hauptschalter — **Neue Tickets überwachen** (oder **Tickets automatisch überwachen** bei einem benutzerdefinierten Agenten) — schaltet die Überwachung ein oder aus. Schnellvorlagen (**Neue Tickets**, **Alle offenen**, **Von diesem Agenten bearbeitet**) fügen einen anfänglichen Filtersatz ein; wenn Sie bereits Filter haben, werden Sie gefragt, bevor sie ersetzt werden.

Mit dem Filter-Baukasten können Sie Bedingungen kombinieren — alle Filter werden zusammen kombiniert, und die verfügbaren Werte stammen direkt aus dem verbundenen Ticketsystem. Eine Live-Vorschau zeigt die praktische Wirkung:

- **Treffer** — wie viele Tickets derzeit passen.
- **Stichprobe** — wie viele tatsächlich untersucht wurden, um die Schätzung zu erstellen.
- **Überlappung** — Tickets, die auch andere Agenten treffen, sodass Sie erkennen können, wenn sich zwei Agenten um dieselbe Arbeit streiten.
- **Läufe/Tag** — die erwartete Anzahl an Prüfungen pro Tag in diesem Bereich.

Ein Hinweis erscheint, wenn die Vorschau durch Ihre Limits pro Prüfung begrenzt ist — die tatsächliche Trefferzahl kann größer sein, als die Vorschau zeigt.

### Betriebseinstellungen

Die Steuerungen für Tempo und Budget:

- **KI-Modell** — mit welchem Modell dieser Agent arbeitet. **Standard der Organisation** ist der Ausgangswert und meist der richtige: Der Agent folgt dem Modell, das Ihre Organisation als Standard gesetzt hat, und zieht mit ihm mit. Wählen Sie ein bestimmtes Modell namentlich aus, um diesen Agenten daran zu binden — ein Modell, das Bilder versteht, für Warteschlangen mit vielen Screenshots; ein günstiges lokales Modell für die Triage großer Mengen. Es erscheinen nur aktive Modelle, sie werden auf der Seite [KI-Modelle](ai-models.md) definiert, und die Auswahl wird in dem Moment gespeichert, in dem Sie sie treffen (dieses eine Feld wartet nicht auf das automatische Speichern des Abschnitts); wirksam wird sie beim nächsten Lauf des Agenten. Ein Modell, an das ein Agent gebunden ist, kann ihm nicht unter den Händen weg archiviert werden — der Agent muss zuerst davon abgezogen werden. Beachten Sie, dass das Lesen der Modellliste die Berechtigung KI-Einstellungen-Administrator (`ai_settings:admin`) voraussetzt, dieselbe, die auch die Seite KI-Modelle öffnet: Allein mit der Rolle **KI-Agenten-Administrator** bietet die Auswahlliste nur **Standard der Organisation** an — das ist eine Berechtigungslücke und kein leeres Modellverzeichnis.
- **Agentenpriorität** — wird zusammen mit **Ticket-Kollision** verwendet, um zu entscheiden, wer ein Ticket bearbeitet, das zwei Agenten beide wollen.
- **Prüfen alle (Stunden)** — wie lange der Agent wartet, bevor er ein bereits bearbeitetes Ticket erneut ansieht.
- **Ticket-Kollision** — was zu tun ist, wenn bereits ein anderer Agent an einem Ticket arbeitet: **Zurückstellen** (in Ruhe lassen) oder **Gleiche Priorität ersetzen** (von einem Agenten mit gleicher Priorität übernehmen).
- **Max. Tickets pro Prüfung** und **Max. Provider-Anfragen** — wie viel Arbeit eine einzelne Prüfung übernehmen darf.
- **Genehmigungsfenster (Stunden)** — wie lange jeder Vorschlag für ein Ticket offen bleibt, bevor er abläuft. Alle Vorschläge aus einer Prüfung teilen sich dieses Fenster und laufen daher gemeinsam ab, statt einzeln.
- **Wenn Ticket geändert wurde** — was zu tun ist, wenn sich das Ticket zwischen dem Vorschlag und Ihrer Freigabe weiterentwickelt hat: **Neu prüfen**, **Abbrechen** oder **Trotzdem anwenden**.
- **Tokens pro Lauf** / **Kosten pro Lauf (EUR)** und **Läufe pro Tag** / **Tokens pro Tag** / **Kosten pro Tag (EUR)** — die Ausgabenobergrenzen pro Lauf und pro Tag. Die Tageswerte sind dieselben Obergrenzen, die Sie auf der Karte **Limits** im Monitor beobachten. Ein *Lauf* ist ein Durchgang an einem Ticket, nicht eine Prüfung: Eine einzelne Prüfung kann das Budget pro Lauf für jedes aufgegriffene Ticket einmal ausgeben — lesen Sie diese Werte deshalb zusammen mit **Max. Tickets pro Prüfung**.

Die beiden Kostenobergrenzen werden mit dem oben zugewiesenen **KI-Modell** berechnet, anhand der Preise, die dafür auf der Seite [KI-Modelle](ai-models.md) hinterlegt sind — der Hinweis unter jedem Feld sagt das auch. Das hat eine Konsequenz, die man kennen sollte: **Ein kostenfreies Modell (0 €) erreicht eine Kostenobergrenze nie**, weil alles, was es tut, nichts kostet. Beim inklusiven KANAP-Modell, bei einem lokalen Modell oder bei jedem Modell, das Sie ohne Preise hinterlegt haben, sind die Kostenobergrenzen wirkungslos, und die **Token**-Limits sind Ihr einziger echter Schutz. Setzen Sie sie entsprechend.

Überwachungs-Agenten, die Alarme statt Tickets beobachten, haben in ihrem eigenen, kürzeren Abschnitt **Betriebseinstellungen** dieselbe Auswahl **KI-Modell** — neben **Bearbeitete Alarme pro Prüfung** und **Anfragen an das Überwachungstool pro Prüfung** —, und sie funktioniert genau wie oben beschrieben.

### Wissens- und Webquellen

Woher der Agent seine Fakten bezieht:

- **KANAP-Wissensdatenbank durchsuchen** — wenn aktiviert, greift der Agent auf Ihre [Wissensbibliotheken](knowledge.md) zurück und zitiert sie in Antworten. Wenn deaktiviert, antwortet der Agent aus dem eigenen Wissen des Modells (und aus dem Web, falls das aktiviert ist).
- **Alle verfügbaren Bibliotheken durchsuchen**, oder deaktivieren Sie dies, um bestimmte **Bibliotheken** auszuwählen — der Agent durchsucht dann nur diese, im Rahmen seiner Zugriffsrechte. Bibliotheksnamen stammen aus dem Bereich Wissensdatenbank.
- **Im Web suchen** — lässt den Agenten auch das öffentliche Web heranziehen; das KANAP-Wissen hat immer Vorrang und Web-Ergebnisse werden als Quelle angegeben. Dieser Schalter ist nur verfügbar, wenn die Websuche für die gesamte Plattform aktiviert ist. Wenn nicht, ist der Schalter deaktiviert und ein Hinweis verweist Sie an Ihren Administrator — siehe [Plaid-Einstellungen](ai-settings.md).

### Autonomie

Standardmäßig **fragt jeder Aktionstyp zuerst** — der Agent schlägt vor und wartet auf Sie. In diesem Abschnitt stufen Sie einen Aktionstyp von **Zuerst fragen** auf **Automatisch** hoch, pro Typ, sobald er es sich verdient hat. Jede Zeile zeigt den aktuellen Modus und eine Eignungszeile: erfasste Entscheidungen, Annahmequote und Tage der Aktivität, jeweils im Verhältnis zu dem, was erforderlich ist. Wenn ein Aktionstyp noch nicht infrage kommt, erklärt die Zeile, warum (zum Beispiel nicht genügend geprüfte Vorschläge oder eine Annahme unter dem Schwellenwert).

- **Einschalten** erscheint, sobald ein Aktionstyp infrage kommt. Es öffnet eine Bestätigung, die die Belege zusammenfasst und Sie daran erinnert, dass automatische Aktionen weiterhin die Tageslimits und die Notfall-Pause einhalten und bei sinkender Annahme zur Rückfrage zurückkehren.
- **Übersteuern** erscheint, wenn ein Aktionstyp nicht infrage kommt, eine Übersteuerung aber erlaubt ist. Es erfordert einen schriftlichen Grund und warnt deutlich, dass eine Übersteuerung *nur* die Empfehlungsschwellen umgeht — harte Sicherheitslimits, Aktualitätsprüfungen, Provider-Unterstützung, Budgets, Pausen und Einschränkungen für Antworten an Anfragende gelten weiterhin alle.
- **Ausschalten** setzt jeden automatischen Aktionstyp auf Zuerst fragen zurück.

Unabhängig vom Modus eines Aktionstyps gelten die harten Sicherheitslimits, Budgets, Aktualitätsprüfungen und Pausen der Plattform immer — automatisch bedeutet niemals unbeaufsichtigt.

---

## Tipps

- **Nutzen Sie „An einem Ticket testen", bevor Sie aktivieren.** Ein Testlauf gibt Ihnen echte Vorschläge zum Beurteilen, ohne dass der Agent irgendetwas anderes anrührt. Es ist der ehrliche Weg, eine Persona abzustimmen: anpassen, erneut testen, wiederholen.
- **Die Karte „Limits" ist Ihr Frühwarnlicht.** Ein Agent, der plötzlich verstummt, hat meist ein Tageslimit erreicht — prüfen Sie *Läufe / Tokens / Kosten heute* im Monitor, bevor Sie annehmen, dass etwas kaputt ist. Bei einem kostenfreien Modell kommen nur die Token- und Lauf-Limits als Ursache infrage.
- **Passen Sie das Modell an die Warteschlange an, nicht an die Flotte.** Die Zuweisung erfolgt genau deshalb pro Agent, damit eine Warteschlange mit vielen Screenshots auf einem Modell laufen kann, das Bilder versteht, während eine reine Textwarteschlange mit hohem Volumen auf etwas Günstigerem läuft. Was jede Wahl tatsächlich kostet, sehen Sie unter [Nutzung & Kosten](ai-usage.md).
- **Lesen Sie den „Effektiven Prompt" nach einer Persona-Änderung.** Er ist die verlässliche Grundwahrheit dessen, was der Agent tatsächlich erhält, und macht deutlich, wenn eine Anweisung so angekommen ist, wie Sie es gemeint haben.
- **Bauen Sie Autonomie Aktionstyp für Aktionstyp auf.** Stufen Sie zuerst risikoarme Typen (interne Notizen) hoch und lassen Sie Antworten an Anfragende so lange zuerst fragen, bis die Annahme durchgängig hoch ist — die Stufen lassen Sie ohne die Belege nicht auf automatisch gehen, aber Sie bestimmen die Risikobereitschaft.
- **Bevorzugen Sie gemeinsamen Kontext für Hintergrund, Bibliotheken für Fakten.** Gemeinsamer Kontext färbt das Urteil des Agenten, wird aber nie zitiert; nur Wissensbibliotheken (und, falls aktiviert, das Web) erscheinen als Quellen in einer Antwort.
- **Achten Sie auf die Überlappung in der Zielauswahl-Vorschau.** Eine hohe Überlappungszahl bedeutet, dass zwei Agenten um dieselben Tickets konkurrieren — grenzen Sie die Filter eines Agenten ein oder verwenden Sie **Agentenpriorität** und **Ticket-Kollision**, um zu entscheiden, wer gewinnt.
