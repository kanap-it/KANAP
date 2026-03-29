# Portfolio-Anfragen

Portfolio-Anfragen sind die Erfassungsebene für geplante Arbeiten. Eine Anfrage ermöglicht es Ihnen, den geschäftlichen Bedarf zu erfassen, die Machbarkeit zu bewerten, die Priorität zu bewerten, unterstützendes Wissen zu sammeln und zu entscheiden, ob die Initiative als Projekt weitergeführt werden soll. In der Praxis ist dies der Ort, an dem Ideen zu gesteuerter Arbeit werden, anstatt als Flurfunk zu bleiben.

## Wo Sie es finden

- Arbeitsbereich: **Portfolio**
- Pfad: **Portfolio > Anfragen**

### Berechtigungen

| Berechtigung | Was sie erlaubt |
| --- | --- |
| `portfolio_requests:reader` | Die Anfragenliste öffnen und Anfrage-Arbeitsbereiche anzeigen |
| `portfolio_requests:member` | Die verwalteten Anfragedokumente bearbeiten, die in den Arbeitsbereich eingebettet sind, auch ohne umfassendere Anfragenverwaltungsrechte |
| `portfolio_requests:manager` | Anfragen erstellen, Anfragedaten aktualisieren, Team und Verknüpfungen pflegen, Kommentare und Entscheidungen hinzufügen, Status ändern, Analyseempfehlungen abgeben und Bewertung bearbeiten |
| `portfolio_requests:admin` | Anfragen löschen und CSV-Import/Export verwenden |

Der Reiter **Wissensdatenbank** folgt den Wissensdatenbank-Berechtigungen für Erstellungs- und Verknüpfungsaktionen. Ein Benutzer kann an Anfrageinhalten arbeiten, ohne eigenständige Wissensdatenbank-Dokumente erstellen oder neu verknüpfen zu dürfen.

## Arbeiten mit der Liste

Die Liste ist für die Sichtung konzipiert, nicht für die Archivdurchsicht. Standardmäßig sortiert sie Anfragen nach Priorität, damit die dringendste oder strategisch wichtigste Arbeit zuerst erscheint.

### Bereichsfilter

Verwenden Sie die Bereichsauswahl über dem Raster, um zu steuern, wessen Pipeline Sie betrachten:

- **Meine Anfragen** zeigt Anfragen, bei denen Sie explizit beteiligt sind, z. B. als Antragsteller, Sponsor, Leiter oder Mitwirkender.
- **Anfragen meines Teams** erweitert diese Ansicht auf Anfragen, die Mitglieder Ihres Portfolio-Teams betreffen. Diese Option ist nicht verfügbar, wenn Sie keinem Team zugeordnet sind.
- **Alle Anfragen** entfernt den Beteiligungsfilter und zeigt die gesamte Anfragen-Pipeline.

Ihre Bereichsauswahl wird gespeichert. Wenn Sie eine Anfrage aus der Liste öffnen und später zurückkehren, behält KANAP den Listenkontext bei, damit Sie Ihren Filterstapel nicht jedes Mal neu aufbauen müssen.

### Standardspalten

Das Standardraster hebt die Felder hervor, die während der Erfassung und Prüfung wichtig sind:

- **#**
- **Anfragename**
- **Priorität**
- **Status**
- **Quelle**
- **Kategorie**
- **Stream**
- **Unternehmen**
- **Antragsteller**
- **Zieldatum**
- **Erstellt**

Zusätzliche Spalten wie **Zuletzt geändert** können über die Rastereinstellungen bei Bedarf eingeblendet werden.

### Filterverhalten

- Die globale Suche funktioniert über Anfrageinhalte und sichtbare Geschäftsmetadaten.
- Spaltenfilter sind für die wichtigsten Klassifizierungs- und Verantwortlichkeitsfelder verfügbar.
- Anfragen mit dem Status **Konvertiert** sind standardmäßig ausgeblendet, damit die Liste auf die aktive Erfassung fokussiert bleibt. Wenn Sie historische Erfassungsentscheidungen überprüfen möchten, nehmen Sie **Konvertiert** in den Statusfilter auf.

### Listenaktionen

- **Neue Anfrage** ist für Anfragenmanager verfügbar.
- **CSV importieren** und **CSV exportieren** sind für Anfragenadministratoren verfügbar.

## Der Anfrage-Arbeitsbereich

Der aktuelle Arbeitsbereich verwendet ein geteiltes Modell:

- Der Hauptbereich ist für Erzählung, Analyse, Bewertung, Aktivität und Wissensdatenbank.
- Die rechte Eigenschaftsseitenleiste ist für stabile Anfragemetadaten, Teamzuweisung und Verknüpfungen.

Das ist wichtig, weil nicht alles auf die gleiche Weise gespeichert wird:

- Änderungen in der **Eigenschaftsseitenleiste** werden direkt auf die Anfrage angewendet.
- Änderungen in **Zusammenfassung**, **Analyse** und **Bewertung** sind Arbeitsbereich-Bearbeitungen und verwenden **Speichern** / **Zurücksetzen**.
- Die verwalteten Dokumente **Zweck** und **Risiken & Maßnahmen** verwenden ebenfalls den Arbeitsbereich-Speicherablauf.

Wenn Sie eine neue Anfrage erstellen, startet KANAP bei **Zusammenfassung**. Die anderen Reiter werden nützlich, nachdem die Anfrage als tatsächlicher Datensatz existiert und nicht nur als eine sehr ernsthafte Idee.

Die Arbeitsbereich-Kopfzeile gibt Ihnen den betrieblichen Kontext, ohne die Seite zu verlassen:

- eine kopierbare Anfragenreferenz wie `REQ-42`
- den aktuellen Status
- die Ursprungsaufgabe, wenn die Anfrage aus einer Aufgabe erstellt wurde
- **Link senden** zum Teilen
- Zurück/Weiter-Navigation basierend auf dem exakten Listenkontext, aus dem Sie kamen

### Eigenschaftsseitenleiste – Konzept

Behandeln Sie die Seitenleiste als das strukturelle Rückgrat der Anfrage.

#### Kerneigenschaften

Dieser Abschnitt enthält die Identität und Klassifizierung der Anfrage:

- Anfragename
- Status
- Quelle, Kategorie und Stream
- Antragsteller
- Unternehmen und Abteilung
- Ziellieferdatum

Diese Felder beeinflussen, wie die Anfrage weitergeleitet, gefiltert und an anderer Stelle im Arbeitsbereich geprüft wird. Zum Beispiel:

- eine Änderung des **Status** beeinflusst, welche Entscheidungen folgen können und ob eine Konvertierung verfügbar ist
- eine Änderung der **Kategorie** oder des **Streams** ändert den analytischen Kontext für Machbarkeit und Bewertung
- eine Änderung des **Unternehmens** oder des **Antragstellers** ändert die Berichts- und Verantwortlichkeitssichtbarkeit im gesamten Portfolio

#### Team

Der Teamabschnitt weist Verantwortlichkeit zu, anstatt nur eine Kontaktliste zu führen:

- Fachbereichssponsor
- Fachbereichsleiter
- IT-Sponsor
- IT-Leiter
- Fachbereichs-Mitwirkende
- IT-Mitwirkende

Diese Zuweisungen steuern die gemeinsame Sichtbarkeit und machen deutlich, wer die Anfrage sponsern, gestalten und umsetzen soll. Die Zusammenfassung verwendet diese Daten, um anzuzeigen, ob die Anfrage ausreichend benannte Verantwortliche hat, um sinnvoll weiterzukommen.

#### Verknüpfungen

Verknüpfungen erklären, wie die Anfrage in das breitere Portfolio passt:

- **Abhängigkeiten** identifizieren Arbeiten, die existieren, abgeschlossen oder abgestimmt sein müssen, bevor diese Anfrage erfolgreich sein kann.
- **Resultierende Projekte** zeigen, was aus der Anfrage nach der Konvertierung erstellt wurde.

Dieser Abschnitt ist wichtig für die Auswirkungsanalyse. Eine Anfrage mit schwachen Verknüpfungsdaten mag harmlos aussehen, bis sie mit bestehender Arbeit kollidiert.

Ältere Lesezeichen verweisen möglicherweise noch auf `overview`, `team` oder `relations`. Im aktuellen Arbeitsbereich befindet sich dieser Inhalt in **Zusammenfassung** und der Eigenschaftsseitenleiste.

## Zusammenfassung

**Zusammenfassung** ist das Cockpit der Anfrage. Es ist kein einfacher Übersichtsreiter; hier komprimiert KANAP den Zustand der Anfrage in einen betrieblichen Überblick.

Die Zusammenfassung umfasst:

- **Status-Überblick**, einschließlich aktuellem Status, aktueller Priorität, verknüpften Geschäftsprozessen und letzter Aktivität
- **Analyse-Überblick**, einschließlich des stärksten Machbarkeitssignals und der neuesten Analyseempfehlung
- **Team und Wissen**, einschließlich Rollenabdeckung, Mitwirkendenzahl, Ursprungsaufgabe und verknüpften Wissensartikeln
- das verwaltete **Zweck**-Dokument
- einen Feed **Aktuelle Aktivität**

Verwenden Sie die Zusammenfassung, wenn Sie verstehen müssen, ob die Anfrage lediglich erfasst ist oder tatsächlich bereit ist, besprochen, bewertet und konvertiert zu werden.

### Zweck als verwaltetes Dokument

Der Abschnitt **Zweck** ist ein verwaltetes Markdown-Dokument, das direkt in die Anfrage eingebettet ist. Es ist mehr als ein langes Beschreibungsfeld:

- es gibt Prüfern eine stabile Absichtserklärung
- es ist während der Konvertierung von Anfrage zu Projekt verfügbar
- es kann von Benutzern mit `portfolio_requests:member` bearbeitet werden, auch wenn sie den Rest der Anfrage nicht verwalten
- es unterstützt **DOCX-Import**, damit Sie vorhandene Word-Dokumente direkt einbringen können, und **Export** zum Herunterladen des aktuellen Inhalts

Diese Aufteilung ist beabsichtigt. Sie ermöglicht es Fachexperten, die Anfragenerzählung zu verbessern, ohne die volle Kontrolle über Status, Bewertung und Portfoliostruktur zu erhalten.

## Aktivität

**Aktivität** trennt Diskussion von Audit-Trail:

- **Kommentare** ist der Kollaborationsstream
- **Verlauf** ist das Änderungsprotokoll

### Kommentare

Kommentare unterstützen normale Diskussionen, aber sie unterstützen auch **formale Entscheidungen**. Eine formale Entscheidung kann erfassen:

- den Besprechungs- oder Entscheidungskontext
- das Entscheidungsergebnis
- die Begründung
- eine optionale Statusänderung in derselben Aktion

Diese Kombination ist wichtig. Sie hält die Governance nachvollziehbar: Der Nachweis, *warum* sich etwas geändert hat, bleibt an der Änderung haften, anstatt später aus Erinnerung und Optimismus rekonstruiert zu werden.

Kommentare unterstützen Markdown und Inline-Bilder, was für Designnotizen, Nachweise, Screenshots und Prüfungsmaterial nützlich ist.

### Verlauf

Der Verlauf ist die Audit-Ansicht. Verwenden Sie ihn, wenn Sie Fragen beantworten müssen wie:

- wer hat den Status geändert
- wann haben sich die Teamzuweisungen geändert
- ob eine Bewertungs- oder Analyseänderung vor oder nach einer Entscheidung stattfand

Wenn Sie Erzählung brauchen, verwenden Sie Kommentare. Wenn Sie Nachweise brauchen, verwenden Sie den Verlauf.

## Analyse

**Analyse** ist der Bereich, in dem die Anfrage von „klingt vernünftig" zu „gut genug verstanden, um zu entscheiden" übergeht.

Sie bringt vier verschiedene Elemente zusammen:

- betroffene Geschäftsprozesse
- strukturierte Machbarkeitsprüfung
- verwaltete **Risiken & Maßnahmen**
- die formale **Analyseempfehlung**

### Betroffene Geschäftsprozesse

Verknüpfen Sie die von der Anfrage berührten Geschäftsprozesse. Dies verändert die Bedeutung der Anfrage im Portfolio-Kontext: Eine Anfrage, die zentrale operative Prozesse betrifft, sollte nicht auf die gleiche Weise bewertet werden wie eine lokale Komfortverbesserung.

### Machbarkeitsprüfung

Die Machbarkeitsprüfung ist eine strukturierte Bewertung über sieben Dimensionen. Jede Dimension kann mit einer Bedenkensstufe und unterstützenden Notizen bewertet werden.

Verwenden Sie diesen Abschnitt, um Umsetzungsreibungen frühzeitig aufzudecken:

- nicht jede Anfrage scheitert, weil die Idee schlecht ist
- viele scheitern, weil Integration, Infrastruktur, Sicherheit, Timing oder Change-Management-Einschränkungen bis zuletzt ignoriert wurden

Der Reiter Zusammenfassung zeigt die stärkste Bedenkensstufe aus dieser Prüfung an, sodass größere Probleme sichtbar bleiben, auch wenn niemand die Analyse öffnet.

### Risiken & Maßnahmen

**Risiken & Maßnahmen** ist ein weiteres verwaltetes Markdown-Dokument. Verwenden Sie es, um Restrisiken, Maßnahmen und Verantwortlichkeiten zu dokumentieren. Wie der Zweck kann es von Benutzern mit `portfolio_requests:member` bearbeitet werden und unterstützt **DOCX-Import** zum Einbringen vorhandener Word-Dokumente sowie **Export**.

Dies ist nützlich, wenn die Personen, die am besten in der Lage sind, die Risiken zu beschreiben, nicht dieselben Personen sind, die den Anfragestatus oder die Portfoliostruktur ändern sollten.

### Analyseempfehlung

Der Empfehlungsablauf veröffentlicht eine formale Entscheidung in der Aktivität mit dem festen Kontext **Analyseempfehlung**. Er kann auch gleichzeitig den Anfragestatus ändern.

Das bedeutet, Analyse ist kein isolierter Notizbereich. Sie ist Teil des Governance-Trails:

- Prüfer können die neueste Empfehlung direkt in der Analyse sehen
- dieselbe Empfehlung erscheint in der Aktivität als Entscheidungsdatensatz
- optionale Statusänderungen bleiben an der Empfehlung gebunden, die sie begründet hat

Ältere Anfragen können auch einen Abschnitt **Vorherige Analyse (Legacy)** anzeigen. Dieser Inhalt wird aus Kontinuitätsgründen beibehalten, aber das aktuelle Anfragemodell stützt sich auf Machbarkeitsprüfung, verwaltete Risiken und formale Empfehlungen.

## Bewertung

**Bewertung** evaluiert die Anfrage anhand des Portfolio-Bewertungsmodells, das für Ihren Mandanten konfiguriert ist.

In der Praxis:

- jedes aktive Kriterium trägt zur berechneten Priorität bei
- der resultierende Wert fließt in den Portfoliovergleich und die Listensortierung ein
- ein Override kann verwendet werden, wenn der berechnete Wert mathematisch korrekt, aber betrieblich falsch ist

Wenn der Prioritäts-Override verwendet wird, sollte er als Ausnahme behandelt werden, nicht als Regelfall.

Wo es durch Portfolio-Einstellungen aktiviert ist, können obligatorische Bypass-Regeln die höchste Priorität für qualifizierende Anfragen erzwingen. Dies wird typischerweise für Arbeit verwendet, die nicht sinnvoll mit diskretionärer Nachfrage konkurrieren kann.

Sobald eine Anfrage **Konvertiert** ist, wird die Bewertung schreibgeschützt. Zu diesem Zeitpunkt hat die Anfrage ihre Aufgabe als Erfassungs- und Priorisierungsdatensatz bereits erfüllt.

## Wissensdatenbank

Der Reiter **Wissensdatenbank** verbindet die Anfrage mit eigenständigen Wissensdatenbank-Dokumenten. Er ist nicht nur ein Anhängeregal mit besserer Haltung.

Der Reiter unterscheidet zwischen zwei Arten von Wissen:

- **Verknüpfte Dokumente** sind direkt an die Anfrage angehängt.
- **Verwandte Dokumente** werden über den breiteren Kontext der Anfrage entdeckt, wie Abhängigkeiten, verwandte Anfragen, resultierende Projekte und andere verknüpfte Objekte.

Diese Unterscheidung ist wichtig:

- direkte Dokumente sind Teil des expliziten Dokumentationssatzes der Anfrage
- verwandte Dokumente fügen Kontext hinzu, ohne zu behaupten, dass die Anfrage sie besitzt

### Was Sie tun können

Mit ausreichenden Wissensdatenbank-Berechtigungen können Sie:

- ein neues leeres Wissensdatenbank-Dokument erstellen, das bereits mit der Anfrage verknüpft ist
- ein verknüpftes Dokument aus einer Vorlage erstellen
- ein bestehendes Wissensdatenbank-Dokument verknüpfen
- ein direkt verknüpftes Dokument trennen
- jedes verknüpfte oder verwandte Dokument im Arbeitsbereich Wissensdatenbank öffnen

Ohne diese Berechtigungen funktioniert der Reiter weiterhin als Referenzansicht, solange Sie das zugrunde liegende Wissen sehen dürfen.

### Verwaltete Dokumente vs. Wissensdatenbank-Dokumente

Die verwalteten Dokumente **Zweck** und **Risiken & Maßnahmen** sind Teil der Anfrage selbst. Sie sind nicht dasselbe wie Wissensdatenbank-Dokumente.

Verwenden Sie verwaltete Dokumente für die zentrale Anfrageerzählung, die immer mit der Anfrage reisen sollte. Verwenden Sie die Wissensdatenbank für eigenständige Dokumente, die möglicherweise einen eigenen Lebenszyklus, Verknüpfungen, Exporte, Vorlagen und Wiederverwendung über eine einzelne Anfrage hinaus benötigen.

## Eine Anfrage in ein Projekt umwandeln

Sobald eine Anfrage **Genehmigt** erreicht, bietet der Arbeitsbereich **In Projekt umwandeln** an.

Der Konvertierungsablauf ermöglicht es Ihnen:

- den Projektnamen zu bestätigen oder anzupassen
- geplante Start- und Enddaten festzulegen
- den aktuellen Zwecktext zu überprüfen
- geschätzten IT- und Business-Aufwand zu übernehmen, der aus den Bewertungseingaben der Anfrage abgeleitet wurde

Nach der Konvertierung:

- wird die Anfrage zu einem dauerhaften Erfassungs- und Entscheidungsdatensatz
- erscheint das resultierende Projekt im Abschnitt Verknüpfungen der Anfrage
- wird die Bewertung auf der Anfrage eingefroren
- kann die Anfrage weiterhin für Audit, Kontext und Wissensverfolgung geöffnet werden

Mit anderen Worten: Die Konvertierung löscht die Anfrage nicht. Sie befördert sie.

## CSV-Import und -Export

CSV-Import und -Export stehen `portfolio_requests:admin` zur Verfügung.

Verwenden Sie den Export, wenn Sie Portfolio-Berichte oder Offline-Anreicherung benötigen. Verwenden Sie den Import, wenn Sie Anfragen in großen Mengen erstellen oder aktualisieren müssen. Da der Import Erfassungsdatensätze im großen Maßstab verändern kann, ist er absichtlich Administratoren vorbehalten.

## Tipps

- **Verwenden Sie den DOCX-Import für vorhandene Inhalte**: Wenn Sie bereits eine Zweckbeschreibung oder ein Risikoregister in einem Word-Dokument haben, verwenden Sie die Schaltfläche **Import** im Zweck- oder Risiken-&-Maßnahmen-Editor, anstatt zu kopieren und einzufügen. Der Import konvertiert das Dokument in Markdown und warnt Sie, wenn Inhalte nicht übernommen werden konnten.
- **Bereichsfilter bleiben erhalten**: KANAP merkt sich Ihre letzte Bereichsauswahl, sodass Sie sie nicht jede Sitzung neu auswählen müssen.
- **Konvertierte Anfragen sind standardmäßig ausgeblendet**: Wenn Sie nach einer Anfrage suchen, die bereits in ein Projekt konvertiert wurde, fügen Sie **Konvertiert** zum Statusfilter in der Liste hinzu.
- **Member-Berechtigung für Mitwirkende**: Geben Sie Fachexperten `portfolio_requests:member`, damit sie Zweck und Risiken & Maßnahmen bearbeiten können, ohne Status, Bewertung oder Portfoliostruktur ändern zu können.
