# Portfolio-Projekte

Portfolio-Projekte sind die Ausführungsarbeitsbereiche für genehmigte Initiativen. Hier wird die Umsetzung geplant, der Fortschritt verfolgt, die Arbeitslast gemessen, Aufgaben koordiniert und projektspezifisches Wissen mit dem Rest von KANAP verbunden.

Projekte entstehen in der Regel aus genehmigten Anfragen, können aber auch direkt als **Schnellstart**- oder **Legacy**-Projekte erstellt werden, wenn die Anfragephase nicht Teil des Prozesses ist.

Für portfolioweite Sequenzierung und Roadmap-Arbeit verwenden Sie [Portfolio-Planung](portfolio-planning.md). Der Bereich Projekte ist für die laufende Arbeit, sobald ein Projekt existiert.

## Wo Sie es finden

- Arbeitsbereich: **Portfolio**
- Pfad: **Portfolio > Projekte**

## Berechtigungen

- `portfolio_projects:reader`: Liste öffnen und Projektarbeitsbereiche anzeigen
- `portfolio_projects:contributor`: Das verwaltete **Zweck**-Dokument aktualisieren und Projekt-Overhead-Zeiteinträge pflegen
- `portfolio_projects:manager`: Projekte erstellen und Projektdaten, Status, Team, Verknüpfungen, Zeitplan, Fortschritt, Aufgaben, Bewertung, Kommentare und Entscheidungen verwalten
- `portfolio_projects:admin`: Umfasst Manager-Fähigkeiten und kann zusätzlich CSV importieren/exportieren sowie Projekt-Overhead-Zeiteinträge anderer Benutzer pflegen
- Die Ansicht der Wissensdatenbank erfordert ebenfalls Wissensdatenbank-Zugriff
- Das Erstellen oder Verknüpfen eigenständiger Wissensdatenbank-Dokumente erfordert ebenfalls eine Wissensdatenbank-Erstellungsrolle

Wenn Projekte nicht in der Navigation erscheinen, fragen Sie einen Administrator nach Zugriff.

## Arbeiten mit der Liste

Die Projektliste ist darauf ausgelegt, zwei Fragen schnell zu beantworten: „Was sollte mich interessieren?" und „Was bewegt sich?"

**Bereichsauswahl**

- **Meine Projekte** zeigt Projekte, bei denen Sie explizit als Sponsor, Leiter oder Mitwirkender beteiligt sind
- **Projekte meines Teams** erweitert diese Ansicht auf Projekte, an denen Mitglieder Ihres Portfolio-Teams beteiligt sind
- **Alle Projekte** entfernt diesen Beteiligungsfilter
- Wenn Sie keinem Portfolio-Team zugeordnet sind, ist der Teambereich nicht verfügbar
- Ihre Bereichspräferenz wird gespeichert, sodass die Liste so zurückkommt, wie Sie sie verlassen haben

**Standardverhalten**

- Projekte werden nach Prioritätswert sortiert, sofern Sie die Sortierung nicht ändern
- Projekte im Status **Erledigt** sind standardmäßig ausgeblendet
- Die Suche funktioniert über Textinhalte
- Status, Ursprung, Quelle, Kategorie, Stream und Unternehmensfilter sind direkt im Raster verfügbar

**Was das Raster hervorhebt**

- Referenznummer (`PRJ-...`) und Name zur schnellen Identifizierung
- Priorität und Status für die Ausführungsstellung
- Ursprung, damit Sie anfragenbasierte Arbeit von Schnellstart- oder Legacy-Arbeit unterscheiden können
- Fortschritt für die Umsetzungssichtbarkeit
- Klassifizierungsfelder für Berichte und Portfolioaufteilung
- Geplante Termine und Erstellungsdatum für den Planungskontext

Das Öffnen eines Projekts aus der Liste behält den aktuellen Listenkontext bei. Das ist wichtig, weil der Projektarbeitsbereich denselben Kontext für die **Zurück**- und **Weiter**-Navigation verwendet, sodass Sie einen gefilterten Satz durchsehen können, ohne Ihre Position zu verlieren.

**Massenverwaltung**

- **Neues Projekt** ist für Manager verfügbar
- **CSV importieren** und **CSV exportieren** sind für Administratoren verfügbar

## Ein Projekt erstellen

Die direkte Projekterstellung ist für Arbeit gedacht, die ohne einen separaten Anfragedatensatz in die Ausführung eintreten soll.

- Neue Projekte öffnen sich nur bei **Zusammenfassung**
- Bis das Projekt zum ersten Mal gespeichert wird, sind die anderen Reiter nicht verfügbar
- Direkt erstellte Projekte verwenden den Ursprung **Schnellstart** oder **Legacy**
- Projekte mit Anfrage-Ursprung behalten ihren Anfrage-Ursprung und die Quellverknüpfung

Verwenden Sie **Schnellstart** für Arbeit, die tatsächlich direkt in die Umsetzung eingebracht wird. Verwenden Sie **Legacy** für Arbeit, die bereits außerhalb der normalen Erfassungshistorie existiert. Diese Unterscheidung beeinflusst Berichte und macht spätere Portfolioanalysen deutlich weniger verwirrend.

## Arbeitsbereich-Konzept

Der Projektarbeitsbereich hat zwei Ebenen:

- Der **Hauptinhaltsbereich** für operative Reiter: **Zusammenfassung**, **Aktivität**, **Zeitplan**, **Fortschritt**, **Aufgaben**, **Bewertung** und **Wissensdatenbank**
- Eine persistente **Projekteigenschaften**-Seitenleiste für Kerneigenschaften, Teamzuweisung und Verknüpfungen

Dies ist die wichtigste Verhaltensänderung gegenüber der älteren Dokumentation: **Team** und **Verknüpfungen** sind keine eigenständigen Reiter mehr. Sie befinden sich jetzt in der Seitenleiste und bleiben verfügbar, während Sie an anderer Stelle arbeiten.

Für bestehende Projekte verhält sich die Seitenleiste wie ein Live-Eigenschaftspanel: Änderungen dort werden sofort gespeichert. Der Hauptreiterinhalt folgt dem üblichen **Speichern**- und **Zurücksetzen**-Workflow, wenn dieser Reiter Entwurfsänderungen enthält. Wenn Sie Reiter wechseln oder zum vorherigen oder nächsten Projekt mit ungespeicherten Arbeitsbereichsänderungen navigieren, fragt KANAP, ob zuerst gespeichert werden soll.

## Kopfzeile und Navigation

Die Arbeitsbereich-Kopfzeile ist nicht nur Dekoration; sie ist die Steuerleiste des Projekts.

- Der `PRJ-...`-Chip ist die stabile, menschenlesbare Referenz und kann direkt kopiert werden
- Der Status-Chip zeigt den aktuellen Ausführungszustand
- Der Ursprungs-Chip zeigt, wie das Projekt ins Portfolio gelangt ist
- Projekte mit Anfrage-Ursprung bieten einen direkten Pfad zurück zur Quellanfrage
- Der Fortschrittsbalken in der Kopfzeile zeigt den aktuellen Ausführungsfortschritt, ohne die Seite zu verlassen
- **Zurück** und **Weiter** bewegen sich durch den aktuellen Listenergebnissatz, nicht durch alle Projekte im System
- **Link senden** sendet die aktuelle Projekt-URL mit einer optionalen Nachricht per E-Mail

Das Senden eines Links gewährt keinen Zugriff. Es teilt nur den Standort mit. Berechtigungen bleiben genau so, wie sie vor dem Versand der E-Mail waren, und so sollte es auch sein.

## Projekteigenschaften-Seitenleiste

Behandeln Sie die Seitenleiste als den persistenten Ausweis des Projekts.

### Kerneigenschaften

Der Kernabschnitt enthält die Projektfelder, die definieren, wie das Projekt an anderer Stelle in KANAP erscheint:

- Projektname
- Status
- Ursprung (nur bei der ersten Erstellung)
- Quelle, Kategorie und Stream
- Unternehmen und Abteilung
- Geplanter Start und geplantes Ende

Diese Felder steuern Berichte, Planung, Filterung und den Standard-Portfoliokontext. Klassifizierungsentscheidungen sind besonders wichtig, da sie beeinflussen, wo das Projekt in der portfolioübergreifenden Analyse erscheint.

Eine Statusänderung über die Seitenleiste ist mehr als ein Etikettenupdate. KANAP öffnet einen Statusänderungsdialog, damit der Übergang ordnungsgemäß erfasst werden kann. Dort können Sie die Änderung als formale Entscheidung protokollieren, Kontext erfassen und die Begründung mit dem Übergang speichern, anstatt sie in der Flurerinnerung verschwinden zu lassen.

Der Workflow ist absichtlich kontrolliert:

- **Warteliste** kann zu **Geplant**, **Zurückgestellt** oder **Abgebrochen** wechseln
- **Geplant** kann zu **In Bearbeitung**, **Zurückgestellt** oder **Abgebrochen** wechseln
- **In Bearbeitung** kann zu **Im Test**, **Erledigt**, **Zurückgestellt** oder **Abgebrochen** wechseln
- **Im Test** kann zurück zu **In Bearbeitung** oder vorwärts zu **Erledigt**, **Zurückgestellt** oder **Abgebrochen** wechseln
- **Zurückgestellt** kann zu **Warteliste**, **Geplant** oder **In Bearbeitung** zurückkehren oder **abgebrochen** werden
- **Erledigt** und **Abgebrochen** sind Endzustände

### Team

Die Teamzuweisung ist Teil der Seitenleiste, damit sie verfügbar bleibt, während Sie an Zeitplan, Aufwand oder Aufgaben arbeiten.

- Fachbereichssponsor / IT-Sponsor erfassen die exekutive Verantwortlichkeit
- Fachbereichsleiter / IT-Leiter identifizieren die tägliche Führung
- Fachbereichs-Mitwirkende / IT-Mitwirkende definieren das breitere Arbeitsteam

Diese Zuweisungen tun mehr als Kästchen auszufüllen:

- sie bestimmen, was in **Meine Projekte** und **Projekte meines Teams** erscheint
- sie fließen in den Projektkontext in Zusammenfassung und Berichten ein
- sie definieren, wer für die Aufwandszuordnung im Reiter **Fortschritt** verfügbar ist

Wenn Leiter und Mitwirkende falsch sind, wird auch Ihre Aufwandsplanung falsch sein.

### Verknüpfungen

Der Verknüpfungsabschnitt bringt die Links zusammen, die erklären, wie das Projekt in den Rest des Portfolios passt.

- **Abhängigkeiten** verfolgen Umsetzungsabhängigkeiten von anderen Anfragen oder Projekten
- **Quellanfragen** zeigen den Anfragedatensatz, der das Projekt hervorgebracht hat
- Zusätzliche Verknüpfungen erfassen verbundenen geschäftlichen und technischen Kontext

Abhängigkeiten sind operativ, nicht kosmetisch. Sie beeinflussen, wie Verzögerungen und Sequenzierung interpretiert werden sollten. Verknüpfungen zur Quellanfrage bewahren die Kette von der Erfassung bis zur Ausführung, was wesentlich ist, wenn jemand später fragt: „Warum machen wir dieses Projekt überhaupt?"

## Zusammenfassung

Der Reiter **Zusammenfassung** ist das Cockpit des Projekts. Er soll den aktuellen Stand des Projekts in einem Durchgang beantworten, nicht jedes Feld in der Seitenleiste duplizieren.

Die Zusammenfassungskarten decken ab:

- aktueller Status und Priorität
- Umsetzungsfenster und Planungsabweichung
- Aufwandsverbrauch und Aufgabenstatus
- Team- und Verknüpfungsabdeckung
- Wissensdatenbank-Umfang
- neueste Aktivität

Dieser Reiter ist der Ort, an dem ein Manager verstehen kann, ob das Projekt lediglich in der Datenbank existiert oder tatsächlich unter Kontrolle ist.

### Zweck

Der Abschnitt **Zweck** in der Zusammenfassung ist ein verwaltetes Projektdokument, kein Wegwerf-Notizfeld.

- verwenden Sie es für das narrative Briefing des Projekts: Absicht, erwartetes Ergebnis, Scope-Grenzen und jede Rahmung, die mit dem Projekt reisen sollte
- Zweckänderungen folgen dem Arbeitsbereich-**Speichern**- und **Zurücksetzen**-Ablauf
- Mitwirkende können den Zweck aktualisieren, auch wenn sie den Rest des Projekts nicht verwalten können

Diese Aufteilung ist beabsichtigt. Sie ermöglicht es, die narrative Verantwortung breiter als die strukturelle Projektadministration zu halten.

Der Zweck-Editor enthält Dokumentenimport und -export:

- **Import** akzeptiert eine `.docx`-Datei und konvertiert sie in das interne Markdown-Format. Wenn der Zweck bereits Inhalt hat, bittet KANAP um Bestätigung vor dem Ersetzen.
- **Export** ermöglicht es Ihnen, den aktuellen Zweck als PDF, DOCX oder ODT herunterzuladen.

Diese Werkzeuge sind nützlich, wenn ein Projektbrief in Word entsteht oder wenn Stakeholder eine formatierte Kopie außerhalb von KANAP benötigen.

Das verwaltete Zweckdokument unterscheidet sich vom Reiter **Wissensdatenbank**:

- **Zweck** ist das eingebettete, projekteigene Briefing
- **Wissensdatenbank** ist für eigenständige Dokumente, die möglicherweise einen eigenen Lebenszyklus, Wiederverwendung oder Beziehungen benötigen

## Aktivität

Der Reiter **Aktivität** trennt Konversation von Audit-Nachweisen:

- **Kommentare** für Diskussion, kontextuelle Notizen und formale Entscheidungen
- **Verlauf** für den Audit-Trail von Feld- und Statusänderungen

Manager können Projektkommentare hinzufügen und bearbeiten. Kommentare können auch als formale Entscheidungen erfasst werden, mit einem Ergebnis und einer optionalen Statusänderung. Verwenden Sie das, wenn die Diskussion selbst den Kurs des Projekts ändert.

Bilder können in Aktivitätskommentare eingefügt werden, wenn visuelle Nachweise nützlich sind. Das ist praktisch für Architekturskizzen, Screenshots oder Prüfungsnachweise.

Verwenden Sie den **Verlauf**, wenn Sie wissen müssen, was sich geändert hat. Verwenden Sie **Kommentare**, wenn Sie wissen müssen, warum.

## Zeitplan

Der Reiter **Zeitplan** ist der Bereich, in dem die Umsetzungsstruktur explizit wird.

### Projekttermine

Der Zeitplan zeigt sowohl geplante als auch tatsächliche Termine.

- Geplante Termine beschreiben das beabsichtigte Umsetzungsfenster
- Tatsächliche Termine werden durch Ausführungsereignisse erfasst und sind im Arbeitsbereich schreibgeschützt

Sobald das Projekt in die Ausführung eintritt, erfasst KANAP auch Baseline-Termine, damit spätere Planungsabweichungen gemessen statt geschätzt werden können.

### Phasen

Projekte können mit einer Phasenvorlage oder einem vollständig benutzerdefinierten Phasenplan beginnen.

- Wenn noch keine Phasen existieren, wenden Sie eine Vorlage an, um die Anfangsstruktur zu erstellen
- Sobald Phasen existieren, können sie umgeordnet, umbenannt, datiert und statusverwaltet werden
- Phasen können als Meilensteine markiert werden
- Jede Phase enthält eine Verknüpfung zum Erstellen einer Aufgabe, die bereits mit dieser Phase und dem Projekt verknüpft ist
- **Mit Vorlage ersetzen** baut die Phasenstruktur neu auf, verwenden Sie es also nur, wenn Sie wirklich „das Phasenmodell von vorne beginnen" meinen

Das Phasenmodell beeinflusst mehr als den Zeitplan:

- die aktive Phase erscheint zurück in der **Zusammenfassung**
- phasenverknüpfte Aufgaben erben sofort den Umsetzungskontext
- Phasenmeilensteine bieten Abschlussmarkierungen, ohne ein separates Verfolgungsschema zu erstellen

### Meilensteine

Meilensteine können auf zwei Arten erstellt werden:

- durch Aktivierung der Meilensteinverfolgung an einer Phase
- durch manuelles Hinzufügen eigenständiger Meilensteine

Phasenverknüpfte Meilensteine folgen der Phase, an die sie angehängt sind. Eigenständige Meilensteine sind für Prüfpunkte, die außerhalb der Phasenstruktur existieren sollen.

### Tabellen- und Gantt-Ansichten

Der Zeitplan kann als Tabelle oder als Gantt-Ansicht verwaltet werden.

- Verwenden Sie die Tabelle, wenn Sie die Struktur gestalten
- Verwenden Sie das Gantt, wenn Sie Überlappungen, Sequenzierung und Terminverteilung sehen müssen

Nur Phasen mit nutzbaren Start- und Enddaten erscheinen sinnvoll im Gantt. Wenn die Termine vage sind, wird auch das Diagramm entsprechend vage sein.

## Fortschritt

Der Reiter **Fortschritt** kombiniert Ausführungsfortschritt, Arbeitslastplanung und tatsächlichen Zeitverbrauch. Diese Kombination ist wichtig, weil ein Projekt, das 80 % Fortschritt bei 20 % Aufwandsverbrauch meldet, nicht unbedingt effizient ist; es könnte einfach schlecht geschätzt sein.

### Fortschritt und Arbeitslast

- **Ausführungsfortschritt** ist das allgemeine Abschlusssignal für das Projekt
- **Arbeitslastverbrauch** vergleicht den tatsächlichen Aufwand mit dem geplanten Aufwand

Halten Sie diese beiden Zahlen mit der Realität abgestimmt. Wenn der Fortschritt ohne entsprechenden Aufwand voranschreitet oder sich Aufwand ohne Umsetzungsbewegung ansammelt, sagt Ihnen die Diskrepanz normalerweise etwas Wichtiges über Umfang, Schätzung oder Berichtsdisziplin.

### Geschätzter Aufwand und Zuordnungen

Der Fortschritt trennt den geschätzten Aufwand in:

- **IT-Aufwand**
- **Business-Aufwand**

Jede Seite kann auf den jeweiligen Leiter und die Mitwirkenden verteilt werden. Diese Zuordnungen hängen vom in der Seitenleiste konfigurierten Team ab, sodass Teamänderungen auch hier Planungskonsequenzen haben.

### Tatsächlicher Aufwand und Zeitprotokoll

Der tatsächliche Aufwand wird aus zwei Quellen berechnet:

- **Projekt-Overhead**-Zeit, die direkt auf dem Projekt erfasst wird
- **Aufgabenzeit**, die aus den Aufgaben des Projekts erfasst wird

Das Zeitprotokoll vereint beides in einer Ansicht und identifiziert die Quelle für jeden Eintrag. Dies ist beabsichtigt: Der Projektaufwand sollte als gesamter Umsetzungsfußabdruck verstanden werden, nicht als Kampf zwischen „Projektarbeit" und „Aufgabenarbeit".

Wichtige Konsequenzen:

- Aufgabenzeit trägt automatisch zum tatsächlichen Projektaufwand bei
- Aufgabenzeit ist hier sichtbar, muss aber im Aufgaben-Arbeitsbereich korrigiert werden
- Projekt-Overhead-Einträge werden über den Reiter Fortschritt gepflegt
- Mitwirkende können ihre eigenen Projekt-Overhead-Einträge pflegen
- Administratoren können Projekt-Overhead-Einträge benutzerübergreifend pflegen

### Baseline-Aufwand

Wenn das Projekt zu **In Bearbeitung** wechselt, erfasst KANAP Baseline-Aufwandswerte. Spätere Änderungen werden als Abweichung gegenüber dieser Baseline angezeigt, was nützlich ist, um normale Umsetzungsaktualisierungen von stillem Scope Creep zu unterscheiden.

## Aufgaben

Der Reiter **Aufgaben** ist die Ausführungswarteschlange des Projekts.

- Hier erstellte Aufgaben werden automatisch mit dem Projekt verknüpft
- Aufgaben können auch direkt aus einer Zeitplanphase erstellt werden, wobei sie sowohl mit dem Projekt als auch mit der ausgewählten Phase verknüpft werden
- Der Reiter unterstützt Status- und Phasenfilterung
- Die Standard-Aufgabenansicht fokussiert auf aktive Arbeit, indem erledigte und abgebrochene Elemente ausgeblendet werden

Dieser Reiter dient der kontextbezogenen Verwaltung projektverknüpfter Aufgaben, nicht dem Ersatz des vollständigen Aufgaben-Arbeitsbereichs. Das Öffnen einer Aufgabe führt Sie zu ihrem eigenen Arbeitsbereich, wo aufgabenspezifische Details und Zeiterfassung fortgesetzt werden.

Aus Projektperspektive ist die wichtige Konsequenz: Aufgabenstatus und Aufgabenzeit sind nicht isoliert. Sie fließen in **Zusammenfassung** und **Fortschritt** zurück, sodass vernachlässigte Aufgaben das gesamte Projektbild weniger vertrauenswürdig machen.

## Bewertung

Der Reiter **Bewertung** hält die Umsetzung an die Priorisierung gebunden.

- Für Projekte mit Anfrage-Ursprung bleibt die Quellanfrage als Bewertungsreferenz sichtbar
- Für Schnellstart- und Legacy-Projekte wird die Bewertung direkt am Projekt gepflegt
- Manager können die Bewertung überprüfen oder aktualisieren, einschließlich Prioritäts-Overrides, wo Portfolio-Regeln dies erlauben

Der resultierende Prioritätswert ist außerhalb dieses Reiters wichtig:

- er erscheint in der Projektkopfzeile
- er ist in der Liste sichtbar
- er beeinflusst, wie Projekte gerankt werden, wenn die Liste nach Priorität sortiert ist

Wenn die Bewertung von der Umsetzungsrealität abdriftet, werden Portfoliodiskussionen schwieriger als nötig.

## Wissensdatenbank

Der Reiter **Wissensdatenbank** verbindet das Projekt mit eigenständigen Wissensdatenbank-Dokumenten.

Er unterscheidet zwischen:

- **Verknüpfte Dokumente**: Dokumente, die direkt an das Projekt angehängt sind
- **Verwandte Dokumente**: Dokumente, die über andere verknüpfte Entitäten wie Quellanfragen, Abhängigkeiten oder verbundene Elemente entdeckt werden

Diese Unterscheidung ist wichtig:

- Direkte Links repräsentieren Dokumentation, die das Projekt explizit besitzt oder verwendet
- Verwandte Links bieten Kontext, ohne vorzugeben, dass alles direkt zum Projekt gehört

Je nach Ihren Wissensdatenbank-Berechtigungen können Sie:

- ein neues leeres Dokument erstellen, das bereits mit dem Projekt verknüpft ist
- ein verknüpftes Dokument aus einer Vorlage erstellen
- ein bestehendes Dokument verknüpfen
- direkt verknüpfte Dokumente trennen
- jedes verknüpfte oder verwandte Dokument in der Wissensdatenbank öffnen

Wenn Sie das Projekt öffnen können, aber keine Wissensdatenbank-Ansichtsrechte haben, informiert KANAP Sie, dass Wissen existiert, ohne den Dokumenteninhalt preiszugeben. Das ist erwartetes Verhalten, kein defekter Reiter.

Die Wissensdatenbank wird auch in der **Zusammenfassung** angezeigt, wo das Projekt zeigt, wie viel eigenständige Dokumentation verknüpft ist und wann diese Dokumentation zuletzt aktualisiert wurde.

## CSV-Import und -Export

Projekt-CSV-Werkzeuge sind für Administratoren auf der Listenseite verfügbar.

### Export

Exporte unterstützen:

- **Vollständiger Export**
- **Datenanreicherung**
- **Benutzerdefinierte Auswahl**

Verwenden Sie **Datenanreicherung**, wenn Sie exportieren, ausgewählte Felder extern anpassen und das Ergebnis mit minimalem Aufwand zurück in KANAP importieren möchten.

### Import

Importe sind für kontrollierte Massenänderungen konzipiert:

- Laden Sie zuerst eine Vorlage herunter, wenn Sie die korrekte Struktur benötigen
- Validieren Sie vor dem Import
- Verwenden Sie erweiterte Optionen, um zwischen Anreicherungs- und Ersetzungsverhalten sowie Einfüge-/Aktualisierungsregeln zu wählen

Massenimport ist nützlich für die umfangreiche Portfoliopflege, aber er ist kein Abkürzung um die Projekt-Governance herum. Phasenplanung, Aufgaben, Wissensdatenbank und laufende Umsetzungskontrolle gehören weiterhin in den Arbeitsbereich.

## Einen Link senden

Verwenden Sie **Link senden** aus der Arbeitsbereich-Kopfzeile, um einen direkten Projektlink an interne oder externe Empfänger per E-Mail zu senden.

- Sie können ihn an Plattformbenutzer oder an jede E-Mail-Adresse senden
- Sie können eine optionale Nachricht hinzufügen
- Der kopierte oder gesendete Link verweist direkt auf den Projektarbeitsbereich

Nochmals: Das Senden eines Links gewährt keinen Zugriff. Es spart den Leuten nur die Suche nach dem Projekt.

## Praktische Hinweise

- Verwenden Sie die Seitenleiste für strukturelle Daten, die sichtbar bleiben sollen, während Sie arbeiten.
- Verwenden Sie **Zusammenfassung** für die Projekterzählung und das operative Gesamtbild.
- Verwenden Sie **Zeitplan**, um die Umsetzungsstruktur zu definieren, bevor das Aufgabenvolumen wächst.
- Verwenden Sie **Fortschritt** regelmäßig, sonst kommt die Aufwandsabweichung als Überraschung, obwohl die Daten Sie bereits gewarnt haben.
- Verwenden Sie **Wissensdatenbank** für wiederverwendbare oder regulierte Dokumentation, nicht als Zweitkopie des Zweck-Briefings.
- Verwenden Sie **Import** im Zweck-Editor, wenn ein Projektbrief bereits als Word-Dokument existiert, anstatt ihn von Hand umzuformatieren.
