# Wissensdatenbank

Die Wissensdatenbank ist KANAPs Dokumenten-Arbeitsbereich für Richtlinien, Verfahren, technische Notizen, Referenzmaterial und Dokumentation, die mit der tatsächlichen Arbeit verbunden sein muss. Sie kombiniert freies Schreiben mit Governance-Funktionen wie Vorlagen, Verantwortlichkeit, Review, Versionshistorie und Verknüpfungen zu Anwendungen, Assets, Projekten, Anfragen und Aufgaben.

Anders als ein Dateifreigabesystem ist die Wissensdatenbank nicht nur ein Ort zum Speichern von Dokumenten. Die wichtige Designentscheidung ist, dass jeder Artikel klassifiziert, geprüft, versioniert, exportiert und mit operativen Objekten auf der gesamten Plattform verknüpft werden kann. Das macht den Artikel leichter auffindbar und gibt ihm Kontext, wenn Personen ihn aus einem anderen Arbeitsbereich öffnen.

## Wo Sie es finden

- Arbeitsbereich: **Wissensdatenbank**
- Berechtigungen:
  - `knowledge:reader` ermöglicht das Öffnen und Lesen von Dokumenten
  - `knowledge:member` ermöglicht das Erstellen, Bearbeiten, Kommentieren, Organisieren von Ordnern und Verwalten von Dokumentmetadaten
  - `knowledge:admin` fügt Bibliotheksverwaltung und bibliotheksübergreifende Verschiebungen hinzu

Wenn Sie ein Dokument lesen, aber nicht bearbeiten können, bleibt der Arbeitsbereich im schreibgeschützten Modus verfügbar.

## Wie die Wissensdatenbank organisiert ist

Die Wissensdatenbank basiert auf vier Organisationsebenen: Bibliotheken, Ordner, Dokumenttypen und Verknüpfungen.

### Bibliotheken

Bibliotheken sind die obersten Container. Sie trennen Dokumentpopulationen, die unterschiedlich verwaltet werden sollen.

Typische Muster:
- Verwenden Sie eine reguläre Bibliothek für die Wissensbasis Ihres Teams.
- Verwenden Sie die **Vorlagen**-Bibliothek für wiederverwendbare Dokumentvorlagen.
- Verwenden Sie die **Verwaltete Dokumente**-Bibliothek für Dokumente, die aus einem anderen Arbeitsbereich stammen und dort teilweise verwaltet werden.

Konsequenzen der Bibliothekswahl:
- Die aktive Bibliothek bestimmt, welchen Ordnerbaum Sie sehen und wo neue leere Dokumente erstellt werden.
- In einer normalen Bibliothek verhalten sich Dokumente wie Standard-Wissensartikel.
- In **Vorlagen** werden veröffentlichte Dokumente zu wiederverwendbaren Ausgangspunkten für neue Artikel und werden nach Dokumenttyp im Vorlagenauswahldialog gruppiert.
- In **Verwaltete Dokumente** können Artikel weiterhin lesbar und bearbeitbar sein, aber einige Metadaten werden vom Quellarbeitsbereich gesteuert statt von der Wissensdatenbank selbst.

Die Bibliotheksverwaltung ist absichtlich strenger als die Dokumentbearbeitung. Das Erstellen, Umbenennen, Löschen oder Reorganisieren von Bibliotheken ist eine Administratorenaufgabe, da diese Änderungen Navigation und Zuständigkeit für alle betreffen.

### Ordner

Ordner organisieren Dokumente innerhalb einer Bibliothek. Sie sind nicht kosmetisch: Sie formen, wie Benutzer die Bibliothek durchsuchen und wie Teams eine gemeinsame Struktur im Laufe der Zeit pflegen.

Wichtiges Verhalten:
- Ordner existieren innerhalb einer Bibliothek. Sie werden nicht bibliotheksübergreifend geteilt.
- In der Einzelbibliotheksansicht können Dokumente per Drag-and-Drop in Ordner verschoben werden.
- Ordner können verschachtelt werden, um eine Browsingstruktur zu schaffen.
- Das Löschen eines Ordners löscht seine Dokumente nicht. Dokumente wandern stattdessen zu **Nicht abgelegt**.
- Ein Ordner mit Unterordnern kann nicht gelöscht werden, bis die Hierarchie bereinigt ist.

Verwenden Sie Ordner für stabile Themenbereiche, nicht für temporäre Workflow-Zustände. Status und Workflow existieren bereits dafür.

### Bereichsfilter

Der übergeordnete Bereichsfilter ändert, welche Dokumente aufgelistet werden:

- **Meine Dokumente** fokussiert auf Dokumente, die Ihnen gehören.
- **Dokumente meines Teams** fokussiert auf Dokumente, die Ihrem Team gehören.
- **Alle Dokumente** entfernt den Eigentumsbereich und zeigt die gesamte Population, die Sie sehen dürfen.

Wenn Sie keinem Team zugewiesen sind, ist der Team-Bereich nicht verfügbar. Ihre letzte Bereichswahl wird gespeichert, was praktisch ist, wenn sie Ihrem normalen Arbeitsmodus entspricht, und leicht verwirrend, wenn Sie vergessen haben, dass Sie sie gestern geändert haben.

### Vorlagen und Dokumenttypen

Vorlagen sind gewöhnliche Wissensdatenbank-Dokumente, die in der **Vorlagen**-Bibliothek gespeichert und zur Wiederverwendung veröffentlicht sind. Das Erstellen eines Dokuments aus einer Vorlage kopiert den Vorlageninhalt in einen neuen Artikel und bewahrt die Vorlagenreferenz.

Dokumenttypen sind wichtig, weil sie:
- den Artikel für Filterung und Berichterstattung klassifizieren
- Vorlagen im Erstellungsdialog gruppieren
- Lesern helfen zu verstehen, welche Art von Dokument sie öffnen

Ein subtiles, aber wichtiges Verhalten: Wenn ein Dokument aus einer Vorlage erstellt wurde und Sie später seinen Dokumenttyp in einen anderen Typ ändern, wird die Vorlagenverknüpfung gelöscht. Das verhindert, dass der Artikel vorgibt, einer Vorlage zu folgen, die er nicht mehr verwendet.

Beim Durchsuchen der **Vorlagen**-Bibliothek können Administratoren das Panel **Typen verwalten** öffnen, um Dokumenttypen zu erstellen, umzubenennen oder zu deaktivieren.

### Verwaltete Dokumente

Einige Wissensdatenbank-Artikel werden aus Anfragen, Projekten, Anwendungen, Assets oder Aufgaben erstellt. Diese erscheinen als **integrierte** Dokumente.

Verwaltete Dokumente behalten die Schreiberfahrung innerhalb der Wissensdatenbank, aber der Quellarbeitsbereich steuert weiterhin einen Teil ihrer Metadaten. In der Praxis bedeutet das:
- Der Status kann vom Quellobjekt gesteuert werden
- Die Ordnerplatzierung kann vom Quellarbeitsbereich festgelegt sein
- Dokumenttyp oder Vorlage können festgelegt sein
- Direkte Verknüpfungen können in der Wissensdatenbank schreibgeschützt sein
- Der Review-Workflow der Wissensdatenbank ist für diese Dokumente nicht verfügbar
- Verwaltete Dokumente können nicht aus der Wissensdatenbank verschoben oder aus der Wissensdatenbank-Liste gelöscht werden

Dies schützt die Verbindung zwischen dem Dokument und dem operativen Datensatz, dem es gehört.

## Mit der Wissensdatenbank-Liste arbeiten

Die Hauptseite der Wissensdatenbank ist ein Dokumentregister mit Navigations- und Organisationswerkzeugen.

### Was die Liste zeigt

Das Standard-Grid fokussiert auf Dokumentidentität und Governance:

- **Ref**: die permanente `DOC-{Nummer}`-Referenz
- **Titel**
- **Status**
- **Typ**
- **Version**
- **Verantwortlicher**
- **Ordner**
- **Aktualisiert**

**Zusätzliche Spalten** (standardmäßig ausgeblendet, verfügbar über Spaltenauswahl):
- **Vorlage**: zeigt die Vorlage, aus der das Dokument erstellt wurde, falls vorhanden
- **Bibliothek**: erscheint automatisch, wenn **Alle Bibliotheken** aktiviert ist, und kann manuell anderweitig eingeblendet werden

### Suche, Filter und Durchsuchen

Die Wissensdatenbank unterstützt zwei Navigationsstile:

- Eine Bibliothek mit ihrem Ordnerbaum durchsuchen, wenn Sie den Themenbereich bereits kennen.
- Über alle Bibliotheken suchen, wenn Ihnen der Artikel wichtiger ist als sein Speicherort.

Der Schalter **Alle Bibliotheken** ändert die Erfahrung erheblich:
- Der Ordnerbaum ist nicht mehr der Haupttreiber
- Die Suche wird breiter
- Die Liste kann Inhalte bibliotheksübergreifend vergleichen
- Die Bibliotheksspalte wird Teil des Ergebniskontexts

Einzelbibliothek-Browsen ist besser für die Pflege. Bibliotheksübergreifende Suche ist besser für das Auffinden.

**Filtern**:
- Schnellsuchleiste oben im Grid
- Spaltenfilter für **Status**, **Typ**, **Verantwortlicher**, **Ordner**, **Vorlage** und **Bibliothek** mit Kontrollkästchen-Set-Selektoren

### Dokumente und Ordner verschieben

In der Einzelbibliotheksansicht können Dokumente in Ordner gezogen werden. Ein Ziehgriff erscheint an jeder Zeile, wenn Ziehen verfügbar ist. Dies ist der schnellste Weg, eine Bibliothek aufzuräumen, ohne jeden Artikel zu öffnen.

Bibliotheksübergreifende Verschiebungen sind stärker kontrolliert:
- Sie erfordern höhere Berechtigungen
- Sie sind für verwaltete Dokumente nicht verfügbar
- Vorlagen-Dokumente sind absichtlich eingeschränkt, da Vorlagen im Vorlagensystem bleiben sollen

Ordner können auch per Drag-and-Drop zwischen Bibliotheken verschoben werden, indem sie auf den Zielbibliotheks-Tab abgelegt werden.

Ordnerverschiebungen folgen der gleichen Idee. Das Reorganisieren eines Ordners ändert die Browsingstruktur für alle, die diese Bibliothek nutzen, behandeln Sie es also als Informationsarchitektur-Änderung, nicht nur als persönliches Aufräumen.

### Listenaktionen

- **Neu** (aufgeteilte Schaltfläche): erstellt ein leeres Dokument in der aktiven Bibliothek oder öffnet den Vorlagenauswahldialog zum Erstellen aus einer veröffentlichten Vorlage
- **Verschieben**: verschiebt ausgewählte Dokumente in einen anderen Ordner oder eine andere Bibliothek
- **Löschen**: entfernt ausgewählte Dokumente dauerhaft (nur Admin; nicht verfügbar für verwaltete Dokumente)

## Dokumente erstellen und gestalten

Neue Artikel können auf zwei Arten beginnen:

- **Leeres Dokument**: am besten, wenn Sie die benötigte Struktur bereits kennen
- **Aus Vorlage**: am besten, wenn das Team konsistente Abschnitte, Sprache oder Review-Erwartungen wünscht

Wenn Sie aus einer Vorlage erstellen, wird der Vorlageninhalt in das neue Dokument kopiert. Ab diesem Punkt ist der neue Artikel unabhängig. Eine spätere Aktualisierung der Vorlage überschreibt keine bestehenden Dokumente.

Der Dokumenten-Arbeitsbereich hält das Schreiben im Zentrum und die Governance in der Seitenleiste.

Kerneigenschaften umfassen:
- **Titel**: die primäre Bezeichnung, nach der Leser suchen und die sie zitieren
- **Status**: der Lebenszyklus des Artikels
- **Ordner**: wo der Artikel innerhalb seiner Bibliothek lebt
- **Typ**: welche Art von Dokument es ist
- **Basiert auf Vorlage**: die Vorlagen-Abstammung, wenn relevant
- **Zusammenfassung**: eine kurze Beschreibung für Kontext

Nach dem ersten Speichern wird das vollständige Dokumenten-Governance-Modell verfügbar. Ab dann können Sie Mitwirkende, Klassifizierungen, Verknüpfungen, Kommentare und Versionshistorie gegen eine stabile Dokumentreferenz verwalten.

### Status und seine Bedeutung

Der Status ist keine Dekoration. Er sagt Lesern, wie ernst sie den Artikel nehmen sollen.

| Status | Bedeutung | Praktische Konsequenz |
|--------|-----------|----------------------|
| **Entwurf** | In Bearbeitung | Geeignet für Autorschaft und interne Iteration |
| **Im Review** | Unter formaler Prüfung | Bearbeitung ist gesperrt, während der Workflow aktiv ist |
| **Veröffentlicht** | Für den normalen Gebrauch genehmigt | Beste Wahl für Inhalte, auf die sich Personen verlassen sollen |
| **Archiviert** | Für die Aufzeichnung aufbewahrt | In der Regel weiterhin nützlich für die Historie, nicht für aktive Orientierung |
| **Veraltet** | Abgelöst oder nicht mehr gültig | Leser sollten es nicht als aktuelle Praxis befolgen |

Die Wissensdatenbank ermöglicht direkte Veröffentlichung auch ohne formalen Review-Workflow. Das ist nützlich für risikoarmes Material, bedeutet aber auch, dass Teams Disziplin brauchen, wann ein Review optional ist und wann er erwartet werden sollte.

## Schreiben, Sperren und automatisches Speichern

Die Wissensdatenbank verwendet eine Bearbeitungssperre, sodass nur eine Person gleichzeitig ein Dokument aktiv bearbeitet.

Funktionsweise:
- Das Starten des Bearbeitungsmodus erwirbt die Sperre
- Andere Benutzer können den Artikel weiterhin öffnen und lesen
- Sie können nicht bearbeiten, während die Sperre von jemand anderem gehalten wird
- Wenn die Sperre abläuft oder verloren geht, stoppt der Bearbeitungsmodus und muss erneut gestartet werden

Dies vermeidet stille Überschreibungen, was für die Dokumentintegrität hervorragend ist und weniger gut, wenn zwei Personen dachten, sie hätten „nur eine schnelle Änderung".

Während Sie bearbeiten:
- Änderungen werden manuell mit **Speichern** gespeichert
- Nicht gespeicherter Inhalt wird auch periodisch automatisch gespeichert, während Ihre Sperre aktiv ist
- **Verwerfen** kehrt zum zuletzt gespeicherten Zustand zurück

Der Arbeitsbereich unterstützt auch den Inline-Upload von Bildern im Markdown-Inhaltsbereich, sodass Screenshots und Diagramme beim Artikel leben können, statt in einem mysteriösen Ordner auf dem Desktop von jemandem. Wenn Sie ein Bild von einer externen URL einfügen oder referenzieren, wird das Bild automatisch importiert und im Dokument gespeichert, sodass es auch dann verfügbar bleibt, wenn die ursprüngliche URL offline geht.

## Dokument importieren

Sie können ein Word-Dokument (.docx) in einen bestehenden Wissensdatenbank-Artikel importieren. Die Schaltfläche **Importieren** erscheint in der Arbeitsbereich-Symbolleiste, sobald das Dokument mindestens einmal gespeichert wurde und Sie sich im Bearbeitungsmodus befinden.

Funktionsweise:
- Klicken Sie auf **Importieren** und wählen Sie eine `.docx`-Datei von Ihrem Computer.
- Wenn der Artikel bereits Inhalt hat, fragt ein Bestätigungsdialog, ob Sie ihn ersetzen möchten. Durch Auswahl von **Fortfahren** wird der aktuelle Markdown mit dem importierten Inhalt überschrieben.
- Der importierte Word-Inhalt wird in Markdown umgewandelt und in den Editor geladen. In der Word-Datei eingebettete Bilder werden extrahiert und als Inline-Anhänge gespeichert.
- Nach dem Import sind Ihre Änderungen ungespeichert. Verwenden Sie **Speichern**, um den importierten Inhalt zu sichern.

Wenn der Import auf einen Sperrkonflikt stößt (jemand anderes hat die Sperre erworben) oder eine abgelaufene Sperre, endet der Bearbeitungsmodus und eine entsprechende Meldung wird angezeigt. Starten Sie den Bearbeitungsmodus erneut und versuchen Sie es erneut.

Importwarnungen, wie nicht unterstützte Formatierungen, die während der Konvertierung vereinfacht wurden, erscheinen kurz als Benachrichtigung am unteren Bildschirmrand.

## Exportformate

Wissensdatenbank-Artikel können exportiert werden als:

- **PDF**
- **DOCX**
- **ODT**

Der Export ist verfügbar, wenn der Artikel Inhalt hat. Dies ist nützlich, wenn:
- ein Dokument außerhalb von KANAP zirkulieren muss
- ein Prüfer Word-Format-Markup bevorzugt
- ein stabiler PDF-Snapshot zum Teilen oder zur Dokumentation benötigt wird

Der Export ersetzt nicht den Live-Artikel. Die Wissensdatenbank-Version bleibt die verwaltete Quelle, während exportierte Dateien Verbreitungsformate sind.

## Mitwirkende und Review-Workflow

Jedes Dokument kann ein strukturiertes Mitwirkenden-Modell haben:

- **Verantwortlicher**: die rechenschaftspflichtige Person für den Artikel
- **Autoren**: Personen, die den Inhalt pflegen
- **Prüfer**: Prüfer der Stufe 1
- **Genehmiger**: Genehmiger der Stufe 2

Der Verantwortliche ist operativ wichtig. Bereichsfilterung basiert auf Verantwortlichkeit, und ein Dokument ohne klaren Verantwortlichen wird mit hoher Wahrscheinlichkeit zu „wichtigem Hintergrundmaterial", das niemand aktualisiert.

### Review-Workflow

Der Review-Workflow ist optional, aber bewusst:

- Prüfer arbeiten zuerst
- Genehmiger handeln, nachdem die Prüfphase abgeschlossen ist
- Genehmiger und Prüfer können Entscheidungsnotizen festhalten
- Das Anfordern von Änderungen sendet das Dokument zur Überarbeitung zurück
- Der Workflow verfolgt die zuletzt genehmigte Revision

Wichtige Konsequenzen:
- Sie können keinen Review anfordern, während es ungespeicherte Änderungen gibt
- Sie benötigen zugewiesene Prüfer oder Genehmiger, bevor ein Review angefordert werden kann
- Archivierte und veraltete Dokumente kommen nicht für eine neue Review-Anforderung in Frage
- Sobald der Review beginnt, ist die normale Bearbeitung deaktiviert, bis der Review genehmigt wird, Änderungen angefordert werden oder der Review abgebrochen wird

Dies macht den Review aussagekräftig. Wenn Autoren den Inhalt während der Genehmigung weiter bearbeiten könnten, wäre das genehmigte Dokument ein bewegliches Ziel, was eine hervorragende Art ist, Diskussionen zu erzeugen, und eine schlechte Art, Dokumentation zu erstellen.

## Die Dokumenten-Arbeitsbereich-Seitenleiste

Die Seitenleiste hat zwei Tabs: **Eigenschaften** und **Kommentare**.

### Eigenschaften-Tab

Der Eigenschaften-Tab organisiert Governance-Daten in einklappbare Abschnitte:

- **Status, Ordner, Typ, Vorlage und Zusammenfassung** sind immer oben sichtbar.
- **Mitwirkende**: Verantwortlichen, Autoren, Prüfer und Genehmiger zuweisen. Jede Rolle wird unabhängig vom Hauptdokument-Speichern gesichert.
- **Review-Workflow**: zeigt den aktuellen Workflow-Status, wenn ein Review aktiv ist, einschließlich Stufenfortschritt, Teilnehmerentscheidungen und aktuelle Workflow-Aktivität. Wenn kein Workflow aktiv ist, können Sie von hier einen Review anfordern.
- **Klassifizierung**: das Dokument mit Kategorien und Streams aus dem Klassifizierungsschema Ihrer Organisation taggen. Mehrere Klassifizierungszeilen können hinzugefügt werden.
- **Verknüpfungen**: das Dokument mit Anwendungen, Assets, Projekten, Anfragen oder Aufgaben verknüpfen. Jeder Verknüpfungstyp hat sein eigenes Such-und-Auswahl-Feld.
- **Versionen**: listet gespeicherte Revisionen mit Zeitstempeln. **Wiederherstellen** ist nur verfügbar, wenn Sie eine aktive Bearbeitungssperre halten.

### Kommentare-Tab

Der Kommentare-Tab zeigt Aktivitäten rund um das Dokument: Kommentare, Workflow-Ereignisse und Änderungshistorie. Verwenden Sie Kommentare für Review-Kontext, redaktionelle Klärung oder Änderungsbegründungen, die am Artikel angehängt bleiben sollen.

## Verknüpfungen und arbeitsbereichsübergreifender Kontext

Wissensdatenbank-Dokumente können direkt verknüpft werden mit:

- Anwendungen
- Assets
- Projekten
- Anfragen
- Aufgaben

Verknüpfungen sind nicht nur Tags. Sie steuern, wo das Dokument anderswo in KANAP erscheint und wie Benutzer es aus operativen Arbeitsbereichen entdecken.

Konsequenzen des Hinzufügens von Verknüpfungen:
- das Dokument wird leichter vom verknüpften Objekt aus auffindbar
- Leser, die das Objekt öffnen, erhalten kontextbezogene Dokumentation, ohne manuell suchen zu müssen
- Berichterstattung und Governance rund um das Objekt werden vollständiger

Konsequenzen schlechter Verknüpfungen:
- nützliche Dokumente bleiben außerhalb der Wissensdatenbank unsichtbar
- Benutzer erstellen Duplikate, weil sie den bestehenden Artikel nicht finden können
- dasselbe Thema beginnt sich über mehrere Dokumente zu verteilen

In verwandten Arbeitsbereichen unterscheiden Wissensdatenbank-Panels zwischen:
- **Verknüpfte Dokumente**: direkt am Objekt angehängt
- **Verwandte Dokumente**: durch Kontext und Herkunft aus verbundener Arbeit aufgetaucht

Diese Unterscheidung ist wichtig. Direkte Verknüpfungen drücken eine beabsichtigte Beziehung aus. Verwandte Dokumente drücken nützlichen Kontext aus, aber nicht das gleiche Maß an Zuständigkeit.

## Gute operative Gewohnheiten

- Verwenden Sie Bibliotheken für Governance-Grenzen, Ordner für Navigation und Verknüpfungen für Geschäftskontext.
- Halten Sie die Verantwortlichkeit aktuell. Ein guter Artikel mit dem falschen Verantwortlichen lebt meist auf geborgter Zeit.
- Verwenden Sie Vorlagen, wenn Konsistenz über Teams hinweg wichtig ist.
- Verwenden Sie Review für Dokumente, die Entscheidungen, Kontrollen oder wiederholbare Prozesse steuern.
- Markieren Sie veralteten Inhalt als archiviert oder veraltet, anstatt Leser raten zu lassen.
- Importieren Sie Word-Dokumente beim Migrieren bestehender Inhalte in die Wissensdatenbank, anstatt zu kopieren und einzufügen, damit eingebettete Bilder automatisch erhalten bleiben.
