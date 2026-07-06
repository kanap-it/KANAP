# KI-Agenten — Übersicht

KI-Agenten sind automatisierte Helfer, die Ihren verbundenen Service-Desk überwachen und den ersten Durchgang bei Tickets für Sie übernehmen: Sie entwerfen eine Antwort an den Anfragenden, fügen eine interne Notiz hinzu oder schlagen eine Aktualisierung der Klassifizierung, des Status, der Zuweisung, der Beteiligten oder ein Schließen/Lösen eines Tickets vor. Diese Seite ist das Flotten-Dashboard – der eine Ort, an dem Sie jeden Agenten auf einen Blick sehen: wie viel Arbeit auf Ihre Entscheidung wartet, wie die Flotte abschneidet und wo Sie die Notbremse ziehen, wenn etwas nicht stimmt.

Der wichtigste Gedanke, den Sie sich merken sollten: Ein Agent schlägt vor, Sie entscheiden. Alles, was ein Agent an einen Anfragenden senden oder in ein Ticket zurückschreiben möchte, wird zunächst zu Ihrer Freigabe vorgeschlagen, und feste Sicherheitslimits, Budgets, Aktualitätsprüfungen und Pausen gelten immer – selbst nachdem Sie einem Agenten erlaubt haben, eigenständig zu handeln. Die alltägliche Konfiguration eines einzelnen Agenten befindet sich in seinem [Agent-Arbeitsbereich](agents-workspace.md); auf dieser Seite überwachen Sie die gesamte Flotte.

## Wo Sie es finden

- Arbeitsbereich: **KI-Agenten**
- Pfad: **KI-Agenten → Übersicht**
- Route: `/agents`
- Berechtigung: `ai_agents:reader`, um den Bereich anzuzeigen. Die unten beschriebenen Bedienelemente zum Erstellen, für die Notfallpause und zum Löschen erfordern die Administratorstufe für KI-Agenten (`ai_agents:admin`); der Administrator für KI-Einstellungen (`ai_settings:admin`) schaltet sie ebenfalls frei.
- Feature-Flag: Der gesamte Bereich KI-Agenten setzt voraus, dass KI auf der Instanz aktiviert ist. Wenn KI deaktiviert ist, ist der Bereich nicht verfügbar.

---

## Konzepte in einer Minute

Einige Konzepte tauchen auf jeder Seite in diesem Bereich wieder auf. Lernen Sie sie hier einmal kennen.

- **Was ein Agent überwacht.** Jeder Agent ist auf Ihr verbundenes Ticketsystem ausgerichtet (heute ist das GLPI, eingerichtet unter **Administration → Integrationen** – siehe [die GLPI-Verbindung](integrations.md)). In den Agentenbildschirmen wird es allgemein als das verbundene Ticketsystem oder die Verbindung bezeichnet.
- **Worauf ein Agent einwirkt.** Tickets. Die Arbeit, die ein Agent vorschlagen kann, umfasst eine Antwort an den Anfragenden, eine interne Notiz, eine Änderung der Klassifizierung, eine Statusänderung (einschließlich Schließen/Lösen), eine Änderung der Zuweisung sowie das Hinzufügen oder Entfernen von Beteiligten.
- **Zuerst fragen vs. automatisch.** Jeder Aktionstyp beginnt mit **Zuerst fragen** – der Agent entwirft die Änderung, und sie verbleibt in Ihrer Freigabe-Warteschlange, bis Sie sie freigeben oder ablehnen. Sobald ein Agent bei einem bestimmten Aktionstyp genügend Erfahrung gesammelt hat, kann ein Administrator genau diesen Aktionstyp auf **Automatisch** hochstufen, sodass er ohne Wartezeit angewendet wird. Die Hochstufung erfolgt pro Aktionstyp, und die untenstehenden Sicherheitslimits gelten immer weiter.
- **Überwachung vs. nur Test.** Ein **überwachender** Agent prüft das verbundene Ticketsystem eigenständig auf passende Tickets, etwa alle fünf Minuten. Ein Agent, der nicht überwacht, läuft nur dann, wenn Sie ihn manuell an einem einzelnen Ticket aus seinem [Arbeitsbereich](agents-workspace.md) testen – nichts geschieht automatisch. Neue Agenten starten immer im Nur-Test-Modus.
- **Sicherheit gilt immer.** Limits pro Prüfung, Budgets pro Lauf und pro Tag, Aktualitätsprüfungen (was zu tun ist, wenn sich das Ticket geändert hat, nachdem der Agent seine Arbeit entworfen hat) und Pausen gelten unabhängig davon, ob ein Aktionstyp auf „Zuerst fragen" oder „Automatisch" steht. Sie können jederzeit alles stoppen – siehe [Notfallpause](#notfallpause) unten.

Nur der Agententyp **Helpdesk** ist heute durchgängig einsatzbereit. Andere Typen erscheinen möglicherweise in der Liste der Agententypen, sind aber nicht startbereit – bleiben Sie bei Helpdesk.

Zwei weitere KI-Oberflächen lassen sich leicht mit Agenten verwechseln, sind aber eigenständige Dinge: [Plaid](ai-assistant.md) ist der interaktive Chat-Assistent, den Sie selbst steuern, und in den [Plaid-Einstellungen](ai-settings.md) wird der gemeinsame KI-Anbieter konfiguriert.

---

## Das Flotten-Dashboard

Fünf gebündelte Kennzahlen stehen ganz oben, aggregiert über alle Helpdesk-Agenten im Mandanten – nicht die Werte eines einzelnen Agenten:

- **Offene Freigaben** – wie viele Vorschläge in der gesamten Flotte gerade auf eine menschliche Entscheidung warten. Dies ist dieselbe Zahl, die das Abzeichen in der Seitenleiste steuert.
- **Aktionen heute** – wie viele Vorschläge heute tatsächlich ausgeführt wurden (freigegeben und angewendet oder automatisch angewendet).
- **Annahme** – der Anteil der entschiedenen Vorschläge, die freigegeben statt abgelehnt wurden. Zeigt **Nicht genug Daten** an, bis genügend Entscheidungsverlauf vorliegt, um aussagekräftig zu sein.
- **Verworfen** – der Anteil der von einem Menschen geprüften Vorschläge, die beiseitegelegt statt freigegeben oder abgelehnt wurden. Ein Verwerfen belastet den Agenten nicht; ein dauerhaft hoher Wert deutet daher meist auf ein Zielauswahl-Problem hin – der Agent greift Tickets auf, die er nicht bearbeiten sollte – und nicht auf schlechte Antwortqualität; beheben Sie es in den Einstellungen des Agenten. Zeigt ebenfalls **Nicht genug Daten** an, bis genügend Prüfverlauf vorliegt.
- **Kosten pro Ticket** – die geschätzten KI-Kosten pro bearbeitetem Ticket, in EUR. Zeigt ebenfalls **Nicht genug Daten** an, bis Verlaufsdaten vorliegen.

Betrachten Sie diese als Gesundheitszustand der Flotte, nicht als Abrechnung pro Agent. Für die Zahlen eines einzelnen Agenten öffnen Sie dessen Arbeitsbereich und verwenden die Registerkarte **Leistung**.

---

## Die Flottenkarten

Unterhalb des Dashboards zeigt der Bereich **Agentenflotte** eine Karte pro Agent. Jede Karte enthält den **Namen** und die **Beschreibung** des Agenten (oder **Keine Beschreibung.**, wenn keine festgelegt wurde), einen Status in verständlicher Sprache, eine Reihe von Chips und – bei einem überwachenden Agenten – einen Streifen mit Live-Kennzahlen.

**Der Status** (oben rechts auf der Karte) zeigt Ihnen, was der Agent gerade tut:

- **Nicht gestartet** – erstellt, aber noch nie ausgeführt. Hier beginnt jeder neue Agent.
- **Aus** – deaktiviert; er überwacht nicht und handelt nicht.
- **Archiviert** – aus dem aktiven Einsatz genommen.
- **Test** – aktiviert, aber nicht überwachend. Er läuft nur, wenn Sie ihn manuell an einem einzelnen Ticket testen.
- **Überwachung — mit Rückfrage** – überwacht eigenständig, aber jeder Aktionstyp wird weiterhin zu Ihrer Freigabe geleitet.
- **Überwachung — teilweise automatisch** – überwacht, wobei mindestens ein Aktionstyp so hochgestuft wurde, dass er ohne Freigabe läuft. Der Rest fragt weiterhin zuerst.
- **Pausiert** – durch eine Notfallpause angehalten (mandantenweit oder nur für diesen Agenten). Prüfungen und ausstehende Schreibvorgänge sind eingefroren, bis die Pause aufgehoben wird.

**Die Chips** fassen den Agenten auf einen Blick zusammen:

- **Typ** – der Agententyp, z. B. **Helpdesk**.
- **Umgebung** – auf welche Verbindungsumgebung er zeigt: **Produktion**, **Staging**, **Sandbox**, **Labor** oder **Mock**. Dies ist Ihr Hinweis darauf, ob der Agent echte Tickets berührt.
- **N offen** – Vorschläge dieses Agenten, die auf Ihre Entscheidung warten (hervorgehoben, wenn größer als null).
- **N fehlgeschlagen** – Tickets dieses Agenten, die ins Stocken geraten sind und geprüft werden müssen (hervorgehoben, wenn größer als null). Diese erscheinen als **Aufmerksamkeit erforderlich** in der täglichen Warteschlange.
- **N automatisch** oder **Zuerst fragen** – entweder die Anzahl der auf automatisch hochgestuften Aktionstypen oder **Zuerst fragen**, wenn nichts hochgestuft wurde.

**Wenn ein Agent überwacht**, erscheinen vier Kennzahlen auf der Karte:

- **Letzte Prüfung** – das Ergebnis der jüngsten automatischen Prüfung.
- **Bereich** – **Alle Tickets** oder **Gefilterte Tickets**, je nachdem, ob der Agent auf eine bestimmte Entität oder Kategorie eingegrenzt ist.
- **Läufe heute** – wie oft er heute bisher gelaufen ist, gemessen an seinem Tageslimit für Läufe.
- **Aktualisiert** – der Zeitpunkt seiner letzten Prüfung.

Ein Klick an eine beliebige Stelle auf einer Karte öffnet den [Arbeitsbereich](agents-workspace.md) des Agenten, wo Sie ihn überwachen, seine Freigaben prüfen, seine Leistung einsehen und seine Einstellungen ändern.

Administratoren sehen außerdem ein kleines Papierkorbsymbol auf den Karten benutzerdefinierter Agenten, die sie erstellt haben – es löscht den Agenten samt seiner Warteschlange und seinem Überwachungsverlauf (die Tickets in Ihrem Ticketsystem werden dabei nie berührt, und dies kann nicht rückgängig gemacht werden). Der integrierte Helpdesk-Agent hat kein Bedienelement zum Löschen.

---

## Einen Agenten erstellen

Administratoren erhalten am Ende des Flottenrasters eine Karte **Neuer Agent**. Sie öffnet einen fünfstufigen Assistenten, der stets einen Helpdesk-Agenten aus einer sicheren Ausgangsvorlage erzeugt:

1. **Typ** – geben Sie dem Agenten einen **Namen** und eine **Beschreibung**. Der **Agententyp** ist fest auf **Helpdesk** eingestellt.
2. **Verbindung** – wählen Sie das Ticketsystem, mit dem er arbeitet (**GLPI**). Ein Link **Integrationen verwalten** springt zu **Administration → Integrationen**, falls die Verbindung noch nicht eingerichtet ist.
3. **Überwachung** – entscheiden Sie mit dem Schalter **Neue Tickets überwachen**, ob er eigenständig überwachen soll, und wählen Sie dann, welche Tickets er anvisiert. Voreinstellungen (**Neue Tickets**, **Alle offenen**, **Von diesem Agenten bearbeitet**) geben Ihnen einen Ausgangspunkt; der Filtereditor grenzt sie weiter ein, wobei alle Filter kombiniert werden und ihre Werte aus dem verbundenen Ticketsystem stammen.
4. **Limits** – der Sicherheitsrahmen. Dies umfasst **Agentenpriorität** und **Prüfen alle (Stunden)** (wie oft er dasselbe Ticket erneut aufgreift), die Behandlung von **Ticket-Kollision**, wenn bereits ein anderer Agent an einem Ticket arbeitet, **Max. Tickets pro Prüfung** und **Max. Provider-Anfragen** pro Prüfung, das **Genehmigungsfenster (Stunden)** (wie lange die Vorschläge jeder Prüfung offen bleiben, bevor sie ablaufen – sie laufen alle gemeinsam ab), das Verhalten **Wenn Ticket geändert wurde** (neu prüfen, abbrechen oder trotzdem anwenden) sowie die Limits pro Lauf und pro Tag für **Tokens**, **Kosten** und **Läufe**. Die Vorlage liefert sinnvolle Standardwerte; die vollständige Bedeutung jedes Felds ist auf der Registerkarte **Einstellungen** im [Agent-Arbeitsbereich](agents-workspace.md) dokumentiert.
5. **Prüfen** – eine Zusammenfassung all dessen, was oben steht.

Neue Agenten werden immer als **Nicht gestartet** erstellt, und Sie landen auf ihrer Registerkarte **Einstellungen**. Der empfohlene Weg ist, den Agenten zuerst an einem echten Ticket zu testen und die Überwachung erst dann einzuschalten, wenn Sie seiner Ausgabe vertrauen.

---

## Notfallpause

Wenn auf breiter Front etwas nicht stimmt – unerwartete Antworten gehen hinaus, eine Fehlkonfiguration, ein Vorfall –, können Administratoren mit **Alle Agenten pausieren** alles auf einmal einfrieren. Sie werden nach einem Grund gefragt (der Teil des Audit-Protokolls wird), und ein dauerhaftes Banner zeigt daraufhin im gesamten Bereich **Notfallpause aktiv: {reason}** an. Solange sie aktiv ist, werden die Prüfungen jedes Agenten und alle ausstehenden Schreibvorgänge für den gesamten Mandanten angehalten. Klicken Sie im Banner auf **Pause aufheben**, um fortzufahren.

Diese mandantenweite Bremse ist bewusst grob. Um einen einzelnen Agenten, der sich falsch verhält, einzufrieren, ohne den Rest der Flotte anzutasten, verwenden Sie stattdessen die Pause pro Agent auf der Registerkarte **Monitor** dieses Agenten – siehe den [Agent-Arbeitsbereich](agents-workspace.md).

---

## Die Flotte im Alltag betreuen

Auf der Übersicht führen Sie die Aufsicht; die eigentliche tägliche Arbeit findet auf zwei dedizierten Seiten statt:

- [Freigaben](agents-approvals.md) ist die Prüf-Warteschlange – vorgeschlagene Antworten, Notizen und Ticketänderungen, die auf Ihre Entscheidung warten, gruppiert nach Ticket.
- [Aktivität](agents-activity.md) ist die schreibgeschützte Audit-Zeitachse jedes Vorschlags, jeder Entscheidung, Ausführung, Pause und jedes Fehlers.

Wiederverwendbare Hintergrundhinweise, die mehrere Agenten gemeinsam nutzen sollen, befinden sich auf der Seite [Gemeinsamer Kontext](agents-shared-context.md). Beachten Sie, dass der gemeinsame Kontext beeinflusst, wie Agenten Tickets interpretieren, aber niemals in einer Antwort als Quelle angegeben wird – die Quellen, die ein Agent tatsächlich zitiert, stammen aus Ihren [Wissensbibliotheken](knowledge.md).

---

## Tipps

- **Lesen Sie den Umgebungs-Chip, bevor Sie einer Zahl vertrauen.** Ein Agent in **Produktion** berührt echte Tickets und echte Anfragende; **Sandbox**, **Labor** und **Mock** eignen sich gefahrlos zum Experimentieren. Wenn Sie einen neuen Agenten in Betrieb nehmen, halten Sie ihn von Produktionstickets fern, bis seine Ausgabe stimmt.
- **Eine steigende Zahl fehlgeschlagener Tickets ist Ihr Frühwarnsignal.** Der Chip **N fehlgeschlagen** zeigt Tickets, die ins Stocken geraten sind. Öffnen Sie den Agenten und arbeiten Sie die Einträge unter **Aufmerksamkeit erforderlich** ab, bevor sie sich anhäufen – sie weisen meist auf ein Verbindungsproblem oder ein Ticket hin, das sich unter dem Agenten geändert hat.
- **Testen, bevor Sie überwachen.** Ein vom Assistenten erstellter Agent ist absichtlich **Nicht gestartet**. Lassen Sie ihn zuerst manuell an einigen repräsentativen Tickets aus seinem Arbeitsbereich laufen; schalten Sie die Überwachung erst ein, wenn Sie mit dem, was er entwirft, zufrieden sind.
- **Automatik wird verdient und ist umkehrbar.** Einen Aktionstyp auf automatisch hochzustufen entfernt keine Schutzvorkehrung – die Budgets pro Tag und pro Lauf, die Aktualitätsprüfungen und die Pausen gelten weiterhin, und eine nachlassende Annahme stuft den Aktionstyp wieder auf „Zuerst fragen" zurück.
- **Bevorzugen Sie die Pause pro Agent.** Greifen Sie nur bei einem echten flottenweiten Problem zu **Alle Agenten pausieren**. Bei einem einzelnen lauten Agenten hält die Pause pro Agent auf seiner Registerkarte „Monitor" den Rest Ihrer Flotte am Laufen.
