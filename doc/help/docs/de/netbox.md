# Netbox-Synchronisierung

[Netbox](https://netboxlabs.com/docs/netbox/) beschreibt Ihre physische und virtuelle Infrastruktur: Geräte, virtuelle Maschinen, Racks, Standorte, Adressen. KANAP liest dieses Inventar und hält seine eigenen Assets damit im Einklang.

Die Aufteilung der Zuständigkeiten ist bewusst gewählt. Netbox bleibt die Referenz für die dort beschriebenen Geräte. Der Name, die Seriennummer, die Rack-Position oder die primäre Adresse kommen also immer von dort. KANAP führt die fachliche Ebene rund um jedes Asset: Umgebung, Anwendungen, Verträge und Kosten, Support, Termine, Beziehungen, Notizen. Sie tippen das Inventar nicht mehr ab und behalten alles, was Netbox nicht kennt.

## Wo Sie es finden

- Arbeitsbereich: **IT-Landschaft**
- Pfad: **IT-Landschaft > Netbox**
- Route: `/it/netbox`
- Verbindungseinstellungen: **Administration > Integrationen**
- Berechtigung: `infrastructure:admin`, sowohl für die Verbindungskarte als auch für die Synchronisierungsseite
- Verfügbar in der Cloud und in der On-Premise-Edition. Es gibt kein Feature-Flag, das aktiviert werden muss.

---

## Bevor Sie beginnen

**Eine Netbox-Instanz, die KANAP erreichen kann.** KANAP ruft Netbox vom Server aus auf, nicht aus Ihrem Browser. Die Adresse, die Sie eintragen, muss dort auflösbar sein und antworten, wo KANAP läuft. In der Cloud-Edition muss diese Adresse öffentlich sein: Eine private oder interne Adresse wird beim Speichern der Verbindung abgelehnt und ebenso vor jedem Aufruf. In der On-Premise-Edition ist eine Adresse in Ihrem eigenen Netz genau das, was erwartet wird.

**Ein API-Token mit Leserechten.** Öffnen Sie in Netbox oben rechts das Benutzermenü, dann **API tokens**, und legen Sie eines an. Ein Token mit reinen Leserechten genügt: KANAP schreibt nie etwas nach Netbox zurück. Geben Sie dem Token eine Beschreibung, damit Sie es später wiedererkennen, und tauschen Sie es so regelmäßig aus wie jede andere Zugangsinformation eines Dienstes.

**Eine Entscheidung zum Zertifikat.** Wenn Ihre Netbox-Instanz ein Zertifikat verwendet, dem KANAP nicht vertraut (typischerweise ein selbst signiertes oder internes Zertifikat), können Sie **Zertifikatsfehler ignorieren** aktivieren. Die Verbindung bleibt verschlüsselt, das Zertifikat wird aber nicht mehr geprüft. Nutzen Sie das nur für ein Zertifikat, das Sie kennen und dem Sie vertrauen, in einem Netz, das Sie kontrollieren. Installieren Sie bei einer öffentlichen Netbox-Instanz stattdessen ein vertrauenswürdiges Zertifikat.

---

## KANAP mit Netbox verbinden

Gehen Sie zu **Administration > Integrationen** und öffnen Sie die Karte **Netbox-Inventar**.

| Feld | Was einzutragen ist |
|-------|---------------|
| **Netbox-Synchronisierung aktivieren** | Der Hauptschalter. Ist er aus, ruft KANAP Netbox nie auf, weder manuell noch nach Zeitplan. |
| **Netbox-Adresse** | Die Adresse, mit der Sie Netbox im Browser öffnen, zum Beispiel `https://netbox.example.com`. |
| **API-Token** | Das Token, das Sie in Netbox angelegt haben. Es wird verschlüsselt gespeichert und nie wieder angezeigt. Lassen Sie das Feld beim Speichern leer, um das bereits gespeicherte Token zu behalten. |
| **Zeitlimit für Anfragen (Sekunden)** | Wie lange auf Netbox gewartet wird, bevor abgebrochen wird, zwischen 5 und 120. Für 30 Sekunden leer lassen. |
| **Zertifikatsfehler ignorieren** | Standardmäßig aus. Siehe oben. |
| **Automatische Synchronisierung** | Läuft stündlich und wendet die Änderungen selbstständig an. Lassen Sie sie aus, bis Ihr erster Lauf stimmig aussieht. |
| **Umgebung für neue Assets** | Gilt für die Assets, die diese Integration anlegt. Danach wird sie nie geändert. |

**Verbindung testen** führt einen reinen Leseaufruf aus und meldet die gefundene Netbox-Version oder den Grund des Fehlschlags. Führen Sie den Test nach jeder Änderung der Adresse oder des Tokens aus. Sind die Einstellungen gespeichert, bietet die Karte den Link **Synchronisierung einrichten** an, der Sie zu **IT-Landschaft > Netbox** führt.

---

## Auswählen, was importiert wird

Öffnen Sie auf der Netbox-Seite den Tab **Zuordnungen**. Zwei Tabellen bestimmen den gesamten Umfang des Imports.

- **Netbox-Rolle > KANAP-Asset-Typ**. Jede Geräterolle, die Netbox kennt, erhält einen Asset-Typ oder **Nicht importieren**.
- **Netbox-Standort > KANAP-Standort**. Jeder Netbox-Standort erhält einen Ihrer Standorte oder **Nicht importieren**.

Alles, was auf **Nicht importieren** steht, wird übersprungen: Die zugehörigen Objekte werden nie angelegt, nie aktualisiert und nie als fehlend gemeldet. So halten Sie Steckdosenleisten, Patchpanels oder einen Laborstandort aus KANAP heraus und importieren trotzdem die Server daneben.

Bei den Rollen steht eine zusätzliche Zeile: **Virtuelle Maschinen**. Jede virtuelle Maschine in Netbox läuft über diese eine Zeile, unabhängig von der Rolle, die Netbox ihr gibt. Eine Entscheidung deckt also alle ab. Eine virtuelle Maschine übernimmt den Standort ihres Clusters, wenn sie selbst keinen trägt.

Jede Zeile zeigt, wie viele Geräte und virtuelle Maschinen sie umfasst, damit Sie sehen, worum es bei einer Auswahl geht. Wenn ein Netbox-Name eindeutig einem Ihrer Namen entspricht, ist die Zeile vorbelegt und mit **Vorschlag** gekennzeichnet. Ein Vorschlag ist nur ein Vorschlag: Nichts wird verwendet, bevor Sie **Zuordnungen speichern** drücken.

---

## Die erste Synchronisierung

Drücken Sie **Jetzt synchronisieren**. KANAP liest Netbox und zeigt **Vor dem Anwenden prüfen** an, bevor irgendetwas geschrieben wird.

Die Vorschau ist gruppiert:

- **Anzulegen**: Objekte ohne Gegenstück in KANAP. Sie werden angelegt.
- **Zu aktualisieren**: Objekte, die einem vorhandenen Asset zugeordnet sind und davon abweichen. Noch ist nichts geändert, die Werte werden beim Anwenden geschrieben. Jedes listet die Felder auf, die sich ändern, Feld für Feld, als `vorher → nachher`.
- **Zu entscheiden**: Objekte, über die KANAP nicht selbst entscheidet. Mit ihnen geschieht nichts, bis Sie sie klären, hier oder später auf der Seite.
- **Übersprungen**: Objekte außerhalb des Umfangs, gezählt nach Grund (Rolle nicht zugeordnet, Standort nicht zugeordnet, Kein Name in Netbox, Von Ihnen ignoriert).
- **Fehlt in Netbox**: Assets, die ein früherer Lauf verknüpft hat und deren Netbox-Objekt verschwunden ist.
- **Warnungen**: Werte, die Netbox meldet und die KANAP nicht übernehmen konnte, zum Beispiel ein Betriebssystem, das nicht in Ihrem Katalog steht. Ein Objekt, an dem nichts zu ändern, aber etwas zu melden ist, erscheint ebenfalls hier.

Lesen Sie die Vorschau und drücken Sie dann **Anwenden**. Objekte, die bereits identisch sind, werden als unverändert gezählt und gar nicht angefasst. Bei großen Inventaren listet die Vorschau nur die ersten 500 Zeilen auf. Der Lauf selbst wendet alles an. Der Filter oben schränkt die Liste auf ein Objekt oder einen Asset-Namen ein.

### Die Vorschau vor dem Anwenden korrigieren

KANAP kann ein Asset nur über seine Seriennummer, seinen Hostnamen oder seinen Namen erkennen. Ein Gerät, das Sie umbenannt haben und bei dem nichts davon übereinstimmt, erscheint unter **Anzulegen** und würde ein zweites Mal angelegt. Die Vorschau lässt Sie das vorher klären. Eine Zeile, für die KANAP etwas vorschlägt, hat eine Schaltfläche, **Korrigieren** unter **Anzulegen** und **Zu aktualisieren**, **Entscheiden** bei Objekten, die eine Entscheidung brauchen. Ein Objekt, das ein früherer Lauf bereits verknüpft hat, hat keine: Es ist geklärt, und die Zeile zeigt nur, was sich ändert. Ein erster Treffer nennt seine Grundlage („Erkannt an der Seriennummer“), so erkennen Sie einen falschen. Die Schaltfläche öffnet diese Auswahl:

- **Mit einem vorhandenen Asset verknüpfen**: Suchen Sie das Asset und wählen Sie es aus. Die Zeile wandert zu **Zu aktualisieren** und zeigt Feld für Feld, was Netbox an diesem Asset ändert. So lesen Sie weiterhin, bevor Sie anwenden.
- **Neues Asset anlegen**: für ein Objekt unter **Zu entscheiden** oder für eines, das KANAP dem falschen Asset zugeordnet hat.
- **Dieses Objekt nicht importieren**: Das Objekt bleibt bei dieser und den nächsten Synchronisierungen außen vor. Kein Asset wird verändert. Es wandert in der Vorschau zu **Von Ihnen geklärt** und nach dem Anwenden zu **Ignoriert** auf der Seite, wo Sie es später zurückholen können.

Eine Zeile, über die Sie entschieden haben, sagt das und bietet **Rückgängig** an. Wenn mehrere Objekte unter **Zu entscheiden** genau ein vorgeschlagenes Asset haben, klärt **Die N Objekte mit nur einem Vorschlag verknüpfen** sie alle auf einmal. Sie wandern zu **Zu aktualisieren**, wo Sie vor dem Anwenden lesen, was sich ändert.

Während Sie entscheiden, wird nichts geschrieben. Ihre Auswahl wird zusammen mit allem anderen angewendet, sobald Sie **Anwenden** drücken, und sie bleibt danach bestehen: Die automatische Synchronisierung folgt den Verknüpfungen, die Sie gesetzt haben. Wenn Sie die Vorschau schließen, gehen sie verloren.

Das Anwenden läuft im Hintergrund. Die Seite verfolgt den Lauf und aktualisiert sich selbst, sobald er fertig ist.

---

## Wie Objekte vorhandenen Assets zugeordnet werden

Ein erster Import in ein bereits gefülltes KANAP muss die vorhandenen Assets finden, statt sie zu verdoppeln. KANAP versucht vier Dinge, in dieser Reihenfolge, und hört bei dem ersten auf, das einen Treffer liefert:

1. **Eine bestehende Verknüpfung**. Das Objekt wurde bei einem früheren Lauf bereits einem Asset zugeordnet.
2. **Die Seriennummer**. Sie übersteht eine Umbenennung auf beiden Seiten.
3. **Der Hostname**. Ein Kurzname und ein vollständiger Name gelten als dieselbe Maschine, `par-esx-01` in KANAP passt also zu `par-esx-01.example.com` in Netbox.
4. **Der Asset-Name**, ohne Beachtung von Groß- und Kleinschreibung und der Domänenendung.

Findet ein Schritt genau ein Asset, ist das die Zuordnung. Findet er mehrere, hält KANAP dort an und legt das Objekt unter **Zu entscheiden** ab, mit den aufgeführten Kandidaten. Auf Verdacht wird nie zusammengeführt.

**Die IP-Adresse ist ein Sicherheitsnetz, nie eine Zuordnung.** Findet keiner der vier Schritte etwas, prüft KANAP, ob ein Asset die primäre Adresse des Objekts bereits trägt. Ist das der Fall, wird das Objekt nicht angelegt. Es geht unter **Zu entscheiden** mit diesem Asset als Vorschlag, und Sie bestätigen, ob es dasselbe Gerät ist. Eine Adresse allein verknüpft nie etwas, auch dann nicht, wenn nur ein einziges Asset sie trägt. Adressen werden wiederverwendet, unter Cluster-Mitgliedern geteilt oder sind schlicht veraltet, und eine falsche Verknüpfung ließe Netbox das falsche Asset überschreiben. Die automatische Synchronisierung folgt derselben Regel. Ein neues Netbox-Gerät auf einer bekannten Adresse wartet also auf Sie, statt zum Duplikat zu werden.

Zwei weitere Regeln halten das Ergebnis sauber:

- **Ein Asset gehört zu genau einem Netbox-Objekt**, und umgekehrt. Die Datenbank erzwingt das. Ein Asset, das bereits einem anderen Objekt gehört, ist für alles andere unerreichbar, und das Verknüpfen eines bereits belegten Assets wird mit einer Meldung abgelehnt, die das haltende Objekt nennt. Greifen zwei Netbox-Objekte auf dasselbe freie Asset zu, werden beide Ihnen zur Entscheidung vorgelegt.
- **Ein in Netbox gelöschtes und neu angelegtes Gerät wird wiedererkannt.** Es kommt mit einer neuen Netbox-Kennung zurück. Der alte Datensatz gilt damit als fehlend, gibt sein Asset frei, und das neue Objekt übernimmt es im selben Lauf über den Hostnamen. Hat sich zwischenzeitlich ein anderes Objekt dieses Asset geholt, wird das zurückkehrende Gerät wie ein neues Objekt behandelt.

---

## Welche Felder Netbox verwaltet

| Von Netbox verwaltet | Bleibt Ihnen in KANAP |
|-------------------|----------------------|
| Name | Umgebung |
| Hostname und Domäne | Notizen und Beschreibung |
| Seriennummer | Termine, Support und Garantie |
| Hersteller und Modell | Verträge und Kosten |
| Rack-Position und Höheneinheit | Anwendungen, die auf dem Asset laufen |
| Primäre IP-Adresse | Verbindungen und andere Beziehungen |
| Betriebssystem | Anhänge, Aufgaben, Vorfälle |
| Lebenszyklus | Alles Übrige am Asset |
| Standort | |

Bei einem Asset, das mit Netbox verknüpft ist, sind die verwalteten Felder mit **Wird von Netbox verwaltet** gekennzeichnet und können in KANAP nicht bearbeitet werden. Ändern Sie sie in Netbox, und der nächste Lauf übernimmt sie. Alles Übrige am Asset bleibt wie gewohnt bearbeitbar.

Die Asset-Seite trägt außerdem eine Zeile **Quelle**: wann die letzte Synchronisierung stattfand, ein Link **In Netbox öffnen** und ein Hinweis, wenn das Objekt nicht mehr vorhanden ist.

### Regeln, die man kennen sollte

**Ein leerer Netbox-Wert löscht nie einen KANAP-Wert.** Hat Netbox keine Seriennummer und KANAP eine, bleibt die Seriennummer erhalten. Geschrieben wird nur ein Wert, den Netbox tatsächlich führt.

**Manuelle Änderungen werden korrigiert.** Jeder Lauf vergleicht mit den tatsächlichen Werten am Asset. Ein verwaltetes Feld, das in KANAP auf anderem Weg geändert wurde, wird beim nächsten Lauf wieder angeglichen.

**Umbenennungen werden verstanden.** Ein Unterschied in der Groß- und Kleinschreibung oder eine Domänenendung ist keine Umbenennung. `PAR-ESX-01` und `par-esx-01.example.com` sind dieselbe Maschine wie `par-esx-01`.

**Der Lebenszyklus folgt einer festen Tabelle.**

| Netbox-Status | KANAP-Lebenszyklus |
|---------------|-----------------|
| Planned, Staged, Inventory | Vorgeschlagen |
| Active, Offline, Failed, Paused | Aktiv |
| Decommissioning | Veraltet |
| Alles andere | Bleibt unverändert, mit einer Warnung |

**Offline, Failed und Paused bleiben sichtbar.** Der Lebenszyklus bleibt Aktiv, denn das Gerät ist formal weiter in Betrieb. KANAP merkt sich den Netbox-Status und zeigt ihn als Hinweis an: am Asset neben der Quelle („Netbox-Status: Ausgefallen“), in der Liste der verknüpften Objekte und unter den Warnungen in der Vorschau. Ändert sich in Netbox nur dieser Status, wird das Asset nicht neu geschrieben.

Eine Synchronisierung setzt ein Asset nie auf **Außer Betrieb**. Geräte außer Betrieb zu nehmen ist eine Entscheidung, die Sie treffen, aus der Liste **Fehlt in Netbox**.

**Die Umgebung wird einmal gesetzt.** Neue Assets erhalten die auf der Integrationskarte gewählte Umgebung. Spätere Läufe fassen sie nie an, Sie können sie also in KANAP korrigieren, und die Korrektur bleibt bestehen.

**Werte, die KANAP nicht kennt, werden übersprungen, nie erfunden.** Ein Betriebssystem, eine Domänenendung oder ein Lebenszyklus ohne Eintrag in **IT-Landschaft > Einstellungen** bleibt unverändert und wird als Warnung gemeldet. Legen Sie den Eintrag dort an und starten Sie den Lauf erneut. Eine primäre IPv6-Adresse wird genauso ausgelassen, mit dem Hinweis „Die primäre Adresse ist eine IPv6-Adresse, die noch nicht importiert wird.“

**Ein neues Asset übernimmt den Anbieter seines Standorts**, wenn dieser Anbieter in Ihren IT-Einstellungen vorhanden ist, sonst „Sonstige“. Netbox kennt keinen Hosting-Anbieter.

**Ein Lauf, der immer weiter scheitert, hört auf.** Wenn 10 Objekte nacheinander nicht gespeichert werden können, wird der Lauf abgebrochen und als fehlgeschlagen gemeldet, statt die Liste mit Fehlerzeilen zu füllen und am Ende Erfolg zu melden.

**Ein unvollständiger Lesevorgang meldet nie etwas als fehlend.** Hält Netbox mehr Seiten bereit, als KANAP in einem Lauf liest, wird nichts als fehlend gemeldet, und neben dem Ergebnis steht ein Hinweis.

**Ein Serverneustart blockiert die Seite nicht.** **Jetzt synchronisieren** funktioniert sofort wieder. Ein Lauf, den der Neustart unterbrochen hat, wird als abgebrochen gemeldet.

---

## Automatische Synchronisierung

Aktivieren Sie **Automatische Synchronisierung** auf der Integrationskarte, und KANAP führt denselben Lauf stündlich aus und wendet die Änderungen ohne Vorschau an. Der Schalter gilt pro Mandant, und nur Mandanten, die ihn aktiviert haben, werden angefahren. Der stündliche Lauf übernimmt nie den ersten Import: Er startet, sobald Sie selbst eine Synchronisierung angewendet haben und diese fehlerfrei beendet wurde. Bis dahin kann der Schalter eingeschaltet sein, ohne dass etwas läuft.

Objekte, die eine Entscheidung brauchen, werden nie automatisch aufgelöst. Sie sammeln sich unter **Zu entscheiden** und warten auf Sie.

Ein manueller und ein geplanter Lauf können sich nicht überschneiden: Läuft bereits einer, tut der andere für diesen Mandanten nichts und versucht es später erneut. In der Cloud-Edition wird ein Mandant übersprungen, dessen Abonnement eingefroren ist oder dessen Testphase abgelaufen ist, bis das Abonnement geklärt ist. On-Premise-Installationen sind davon nicht betroffen.

---

## Die Verwaltungsseite

Auf **IT-Landschaft > Netbox** findet die Arbeit statt, sobald die Verbindung eingerichtet ist. Der Streifen oben zeigt den letzten Lauf: wann er stattfand, ob er manuell oder automatisch gestartet wurde, wie lange er dauerte, sein Ergebnis und wie viele Objekte verknüpft sind oder geprüft werden müssen.

Darunter listet der Tab **Objekte** jedes Netbox-Objekt im Umfang auf, gefiltert nach Status.

| Status | Was er bedeutet | Was Sie tun können |
|-------|---------------|-----------------|
| **Zu entscheiden** | Mehrere Assets kommen für dieses Objekt infrage, zwei Objekte haben dasselbe Asset erreicht, oder ein Asset trägt bereits die IP-Adresse des Objekts. | **Verknüpfen mit...** einem der Kandidaten, **Neues Asset anlegen** oder **Ignorieren**. |
| **Fehlt in Netbox** | Das Objekt ist in Netbox nicht mehr vorhanden. Das Asset bleibt unberührt. | **Asset als „Außer Betrieb“ markieren**, **Ignorieren** oder es so belassen. |
| **Fehler** | Das Objekt konnte nicht geschrieben werden, mit dem Grund in der Spalte Meldung. | Ursache beheben und erneut ausführen oder das Objekt **Ignorieren**. |
| **Ignoriert** | Sie haben KANAP angewiesen, dieses Objekt in Ruhe zu lassen. Jeder Lauf überspringt es. | **Nicht mehr ignorieren** stellt es wieder in die Liste. Hält der Datensatz nichts zu entscheiden bereit, wird er stattdessen entfernt, und das Objekt wird bei der nächsten Synchronisierung erneut geprüft. |
| **Verknüpft** | Objekt und Asset sind zugeordnet und aktuell. | Beide Seiten über die Zeile öffnen. |

Jede Zeile verlinkt auf das Objekt in Netbox und auf das Asset in KANAP, mit seiner `AST-`-Referenz.

Ein Verknüpfen oder Anlegen von dieser Seite aus übernimmt die Netbox-Werte sofort. Dabei wird nur dieses eine Objekt aus Netbox gelesen, es bleibt also auch bei einem großen Inventar schnell. Meldungen und Warnungen erscheinen in Ihrer eigenen Sprache.

### Fehlt in Netbox

**KANAP löscht nie ein Asset.** Verschwindet ein Objekt aus Netbox, bleiben das Asset, seine Verknüpfungen und seine Historie genau so, wie sie sind, und das Objekt wird als fehlend gelistet, damit Sie entscheiden können. **Asset als „Außer Betrieb“ markieren** setzt den Lebenszyklus auf Außer Betrieb und lässt alles Übrige unverändert.

Zwei Sicherungen greifen. Es wird nichts als fehlend gemeldet, wenn der Aufruf an Netbox fehlgeschlagen ist oder wenn Netbox ein leeres Inventar geliefert hat: Eine Störung ist keine Außerbetriebnahme. Und ein Asset, dessen Netbox-Objekt verschwunden ist, ist wieder frei, sodass dieselbe Maschine, in Netbox neu angelegt, wieder damit verknüpft wird, statt ein Duplikat zu erzeugen.

---

## Die Kachel auf der Startseite

Für Ihr persönliches Dashboard steht eine Kachel **Netbox-Synchronisierung** bereit. Sie ist standardmäßig aus. Schalten Sie sie in den Dashboard-Einstellungen ein, über das Zahnradsymbol auf **Dashboard**, und setzen Sie den Haken bei **Netbox-Synchronisierung**. Die Kachel benötigt `infrastructure:admin`, wie der Rest der Integration.

Die Kachel hält sich zurück, wenn es nichts zu tun gibt: eine Zeile, dass die Synchronisierung aktuell ist, mit dem Zeitpunkt des letzten Laufs. Gibt es etwas zu prüfen, listet sie nur das auf: Objekte zu entscheiden, Assets, die in Netbox fehlen, Fehler oder einen fehlgeschlagenen Lauf. Jede Zeile öffnet die passende gefilterte Liste.

---

## Fehlerbehebung

| Was Sie sehen | Was es meist bedeutet |
|--------------|-----------------------|
| Netbox hat das API-Token abgelehnt | Das Token wurde beim Einfügen abgeschnitten, ist abgelaufen oder ist auf eine andere Adresse beschränkt. Legen Sie in Netbox ein neues an und speichern Sie es erneut. |
| Private oder interne Hosts sind nicht erlaubt | Die Cloud-Edition erreicht nur öffentliche Adressen. Veröffentlichen Sie Netbox unter einer Adresse, die KANAP erreichen kann, oder betreiben Sie KANAP on-premise daneben. |
| Das Zertifikat konnte nicht überprüft werden | Netbox zeigt ein Zertifikat, dem KANAP nicht vertraut. Installieren Sie ein vertrauenswürdiges Zertifikat oder aktivieren Sie **Zertifikatsfehler ignorieren**, wenn das Zertifikat eines Ihrer eigenen ist. |
| Der Netbox-Server hat nicht rechtzeitig geantwortet | Netbox ist langsam, nicht erreichbar oder hinter einer Firewall, die den Aufruf verwirft. Prüfen Sie es vom KANAP-Server aus und erhöhen Sie dann das Zeitlimit für Anfragen, wenn die Instanz einfach groß ist. |
| Objekte erscheinen als übersprungen, Grund „Rolle nicht zugeordnet“ oder „Standort nicht zugeordnet“ | Erwartet für alles, was Sie auf **Nicht importieren** gelassen haben. War es nicht beabsichtigt, ordnen Sie die Rolle oder den Standort zu und führen Sie den Lauf erneut aus. |
| Eine Warnung meldet, dass ein Betriebssystem nicht in Ihrem Katalog steht | Die Netbox-Plattform hat keinen passenden Eintrag in **IT-Landschaft > Einstellungen**. Legen Sie ihn dort an und führen Sie den Lauf erneut aus. Bis dahin bleibt das Feld unverändert. |
| Der Lauf ist nach einer Handvoll Objekte fehlgeschlagen | Zehn Objekte nacheinander konnten nicht gespeichert werden, deshalb wurde der Lauf abgebrochen. Die Ursache ist meist bei allen dieselbe, die Details stehen im Serverprotokoll. |
| „Netbox hat mehr Seiten geliefert als erwartet. Einige Objekte wurden nicht geprüft.“ | Das Inventar ist größer, als ein Lauf liest. Was gelesen wurde, wird angewendet, und nichts wird als fehlend markiert. Grenzen Sie den Umfang unter **Zuordnungen** ein, damit der Lauf das abdeckt, was für Sie zählt. |

---

## Tipps

- **Erst zuordnen, dann synchronisieren.** Die Zuordnung ist der Umfang. Beginnen Sie mit den Rollen und Standorten, bei denen Sie sicher sind, lassen Sie einen Lauf laufen und erweitern Sie danach.
- **Lesen Sie die Vorschau beim ersten Lauf.** Es ist der einzige Lauf, bei dem jede Zuordnung neu ist, also der eine, den es Zeile für Zeile zu lesen lohnt.
- **Umbenannte Geräte: Prüfen Sie die Liste Anzulegen.** Alles, was Sie dort wiedererkennen, steht kurz davor, verdoppelt zu werden. Verknüpfen Sie es in der Vorschau mit seinem Asset, oder tragen Sie seine Seriennummer oder seinen Hostnamen in KANAP nach und öffnen Sie die Vorschau erneut.
- **Pflegen Sie die Seriennummern.** Sie sind das stabilste Zuordnungsmerkmal. Assets mit Seriennummer überstehen Umbenennungen auf beiden Seiten, ohne je unter **Zu entscheiden** zu landen.
- **Warten Sie, bevor Sie den stündlichen Lauf einschalten.** Zwei saubere manuelle Läufe hintereinander, bei denen der zweite nichts mehr zu ändern hat, zeigen, dass Zuordnung und Treffer stimmen.
