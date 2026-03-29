# Dashboard

Das Dashboard ist Ihre persönliche Startseite in KANAP. Es bietet Ihnen einen schnellen Überblick über Ihre Aufgaben, Projekte, erfasste Zeiten und aktuelle Aktivitäten -- alles an einem Ort. Sie können anpassen, welche Kacheln angezeigt werden und wie sie sich verhalten.

## Wo Sie es finden

- Klicken Sie auf das **KANAP**-Logo oder navigieren Sie zu `/`
- Dies ist die Standardseite nach der Anmeldung für Nicht-Admin-Benutzer.
- Für die Anzeige des Dashboards selbst sind keine besonderen Berechtigungen erforderlich, aber einzelne Kacheln hängen von Ihren Zugriffsrechten ab.

## Schnellaktionen

Am oberen Rand des Dashboards finden Sie Schaltflächen für häufige Aktionen:

- **Aufgabe erstellen** -- öffnet den Ablauf zur Aufgabenerstellung. Erfordert `tasks:member` oder höher.
- **Zeit erfassen** -- öffnet einen Schnelldialog zur Zeiterfassung für ein Projekt. Wählen Sie ein Projekt, geben Sie die Stunden ein, wählen Sie eine Kategorie (**IT** oder **Business**) und fügen Sie optional Notizen hinzu. Erfordert `portfolio_projects:member` oder höher.
- **Neues Dokument** -- öffnet den Erstellungsablauf der Wissensdatenbank, um ein leeres Dokument zu starten oder eines aus einer veröffentlichten Vorlage zu erstellen. Erfordert `knowledge:member` oder höher.
- **Einstellungen** (Zahnrad-Symbol) -- öffnet die Dashboard-Einstellungen zur Auswahl der anzuzeigenden Kacheln.

## Dashboard-Kacheln

Das Dashboard zeigt ein Raster von Kacheln, die jeweils einen anderen Aspekt Ihrer Arbeit darstellen. Kacheln werden in einem responsiven Raster angeordnet (drei Spalten auf großen Bildschirmen, zwei auf mittleren, eine auf kleinen).

### Meine Aufgaben

Zeigt Ihre zugewiesenen Aufgaben, gruppiert nach Dringlichkeit:

- **Überfällig** -- Aufgaben nach ihrem Fälligkeitsdatum (rot hervorgehoben)
- **Diese Woche fällig** -- Aufgaben, die innerhalb der nächsten 7 Tage fällig sind
- **Später** -- alles andere

Jede Aufgabe zeigt ihren Titel, das verknüpfte Projekt (falls vorhanden), das Fälligkeitsdatum und ein Prioritätskennzeichen, wenn die Priorität über Normal liegt. Klicken Sie auf eine Aufgabe, um ihren Arbeitsbereich zu öffnen.

Zeigt insgesamt bis zu 5 Einträge über die drei Gruppen an.

**Erfordert**: `tasks:reader`

---

### Projekte, die ich leite

Listet Projekte auf, in denen Sie eine Führungsrolle innehaben (IT-Leiter, Fachbereichsleiter, IT-Sponsor oder Fachbereichssponsor). Jedes Projekt zeigt:

- Ihre Rolle
- Aktueller Projektstatus (farbcodiert)
- Nächster Meilenstein und dessen Zieldatum, falls festgelegt

Zeigt bis zu 5 Einträge an.

**Erfordert**: `portfolio_projects:reader`

---

### Projekte, an denen ich mitwirke

Listet Projekte auf, in denen Sie Teammitglied sind. Jedes Projekt zeigt:

- Ihr Team (IT-Team oder Business-Team)
- Aktueller Projektstatus
- Anzahl der Ihnen in diesem Projekt zugewiesenen Aufgaben

Zeigt bis zu 5 Einträge an.

**Erfordert**: `portfolio_projects:reader` und `tasks:reader`

---

### Zuletzt angesehen

Zeigt Elemente, die Sie kürzlich in der Anwendung geöffnet haben -- Projekte, Anfragen, Anwendungen, Assets, Schnittstellen, Verbindungen, Verträge, Aufgaben, OPEX- und CAPEX-Positionen. Jeder Eintrag zeigt den Elementnamen, seinen Typ und wann Sie ihn zuletzt angesehen haben.

Zuletzt angesehene Elemente werden lokal in Ihrem Browser gespeichert und sind spezifisch für Ihren Benutzer und Mandanten. Klicken Sie auf **Leeren**, um die Liste zurückzusetzen.

Zeigt bis zu 5 Einträge an.

**Erfordert**: Keine besonderen Berechtigungen (Elemente, auf die Sie keinen Zugriff haben, werden automatisch ausgeblendet).

---

### Meine Zeit letzte Woche

Zeigt eine Zusammenfassung der von Ihnen erfassten Zeit über einen aktuellen Zeitraum:

- **Gesamtstunden** erfasst (prominent angezeigt)
- **Aufschlüsselung nach Kategorie** -- IT, Business und Sonstige Aufgaben
- **Top-Projekte** -- ein Balkendiagramm der Projekte, für die Sie die meiste Zeit aufgewendet haben

**Einstellungen**: Zeitraum in Tagen (7-30).

**Erfordert**: `portfolio_projects:reader` und `tasks:reader`

---

### Neue Anfragen

Zeigt Portfolio-Anfragen, die innerhalb eines aktuellen Zeitraums erstellt wurden. Jede Anfrage zeigt den Namen, den Antragsteller, das Erstellungsdatum und ein Prioritätskennzeichen, wenn der Prioritätswert über 80 liegt.

Zeigt bis zu 5 Einträge an.

**Erfordert**: `portfolio_requests:reader`

---

### Wissensdatenbank

Zeigt zwei auf die Wissensdatenbank fokussierte Bereiche:

- **Zu prüfen** -- Dokumente, bei denen Sie der aktive Prüfer oder Genehmiger sind
- **Zuletzt 5 aufgerufen** -- die letzten fünf Wissensdatenbank-Dokumente, die Sie in diesem Browser für den aktuellen Mandanten und Benutzer geöffnet haben

**Erfordert**: `knowledge:reader`

---

### Teamaktivität

Zeigt aktuelle Projektaktivitäten bei Projekten, an denen Sie beteiligt sind.

**Erfordert**: `portfolio_projects:reader`

---

### Projektstatusänderungen

Zeigt die neuesten Projektstatusänderungen der letzten Tage.

**Erfordert**: `portfolio_projects:reader`

---

### Veraltete Aufgaben

Zeigt Aufgaben, die seit langer Zeit nicht aktualisiert wurden, mit Unterstützung für persönlichen, Team- oder globalen Umfang.

**Erfordert**: `tasks:reader`

## Ihr Dashboard anpassen

Klicken Sie auf das **Einstellungen**-Symbol (Zahnrad) im oberen rechten Bereich des Dashboards, um den Einstellungsdialog zu öffnen.

Von hier aus können Sie:

- **Kacheln aktivieren oder deaktivieren** -- aktivieren oder deaktivieren Sie jede Kachel, um zu steuern, was auf Ihrem Dashboard erscheint
- **Auf Standardwerte zurücksetzen** -- stellt die ursprüngliche Kachelauswahl wieder her

Nur Kacheln, für die Sie die Berechtigung zur Anzeige haben, erscheinen in der Einstellungsliste. Änderungen werden in Ihrem Konto gespeichert und bleiben über Sitzungen und Geräte hinweg erhalten.

Wenn alle Kacheln deaktiviert sind, zeigt das Dashboard eine Meldung mit der Aufforderung, Kacheln in den Einstellungen zu aktivieren.

## Tipps

- **Beginnen Sie mit den Standardeinstellungen**: Das Dashboard wird mit einer nützlichen Auswahl bereits aktivierter Kacheln ausgeliefert. Probieren Sie es ein paar Tage aus, bevor Sie es anpassen.
- **Nutzen Sie Schnellaktionen**: Das Erstellen einer Aufgabe oder das Erfassen von Zeit über das Dashboard erspart Ihnen das Navigieren weg von Ihrer Übersicht.
- **Überprüfen Sie überfällige Aufgaben täglich**: Die Kachel „Meine Aufgaben" hebt überfällige Einträge rot hervor, damit nichts durchrutscht.
