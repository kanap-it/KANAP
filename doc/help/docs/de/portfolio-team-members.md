# Mitwirkende

Mitwirkende ermöglicht es Ihnen, Fähigkeiten, Teamzuweisungen, Projektverfügbarkeit und Klassifizierungsstandards für Personen zu definieren, die an Portfolio-Projekten arbeiten. Diese Informationen helfen bei der Ressourcenplanung und stellen sicher, dass Sie die richtige Expertise für anstehende Arbeit haben.

## Erste Schritte

Navigieren Sie zu **Portfolio > Mitwirkende**, um konfigurierte Mitwirkende gruppiert nach Team zu sehen. Klicken Sie auf **Mitwirkenden hinzufügen**, um jemanden aus Ihrer Benutzerliste hinzuzufügen.

**Um einen Mitwirkenden hinzuzufügen**:
1. Klicken Sie auf **Mitwirkenden hinzufügen**
2. Suchen Sie nach einem Benutzer im Dropdown und wählen Sie ihn aus
3. Klicken Sie auf **Hinzufügen**, um sein Profil zu erstellen
4. Konfigurieren Sie Team, Verfügbarkeit, Fähigkeiten und Standards im Arbeitsbereich

**Tipp**: Mitwirkende sind unabhängig von Benutzerkonten. Jemanden als Mitwirkenden hinzuzufügen ändert nicht seinen Login-Zugang -- es ermöglicht Ihnen lediglich, seine Teammitgliedschaft, Fähigkeiten, Verfügbarkeit und Klassifizierungsstandards für die Projektplanung zu verfolgen.

---

## Wo Sie es finden

- Arbeitsbereich: **Portfolio**
- Pfad: **Portfolio > Mitwirkende**
- Self-Service-Pfad: **Einstellungen > Profil > Mitwirkenden-Einstellungen** (öffnet Ihr eigenes Mitwirkenden-Profil)
- Berechtigungen:
  - Anzeigen: `portfolio_settings:reader`
  - Mitwirkende hinzufügen oder bearbeiten: `portfolio_settings:member`
  - Mitwirkende entfernen: `portfolio_settings:admin`
  - Eigenes Profil bearbeiten: jede Portfolio-Reader-Berechtigung (z. B. `tasks:reader`, `portfolio_projects:reader`, `portfolio_settings:reader`)

Wenn Sie Mitwirkende nicht im Menü sehen, bitten Sie Ihren Administrator, Ihnen die entsprechenden Berechtigungen zu erteilen.

---

## Arbeiten mit der Liste

Mitwirkende werden als Karten angezeigt, gruppiert nach Team.

**Jede Mitwirkenden-Karte zeigt**:
- **Name** (oder E-Mail, wenn kein Anzeigename gesetzt ist)
- **Fähigkeiten-Anzahl**: Anzahl konfigurierter Fähigkeiten (z. B. „3 Fähigkeiten")
- **Verfügbarkeit**: Verfügbare Tage pro Monat für Projekte (z. B. „5d/Mo")
- **Durchschnittlicher Projektaufwand**: Durchschnittliche monatliche Projektzeit aus erfassten Einträgen der letzten 6 Monate, wenn Daten verfügbar sind

**Filterung**:
- Verwenden Sie das Dropdown **Nach Team filtern**, um nur Mitwirkende eines bestimmten Teams anzuzeigen
- Wählen Sie **Nicht zugewiesen**, um Mitwirkende zu sehen, die noch keinem Team zugewiesen sind
- Wählen Sie **Alle Teams**, um alle zu sehen

**Teamgruppen**:
- Jedes Team wird als zusammenklappbare Karte mit einem Mitgliederzahl-Badge angezeigt
- Klicken Sie auf die Team-Kopfzeile, um sie auf- oder zuzuklappen
- Teams werden alphabetisch sortiert; **Nicht zugewiesen** erscheint immer zuletzt

Klicken Sie auf eine Mitwirkenden-Karte, um ihren Arbeitsbereich zu öffnen.

---

## Der Mitwirkenden-Arbeitsbereich

Klicken Sie auf eine Mitwirkenden-Karte, um ihren Arbeitsbereich zu öffnen. Er hat vier Reiter: **Allgemein**, **Fähigkeiten**, **Erfasste Zeit** und **Standards**.

### Allgemein

Konfigurieren Sie Teamzuweisung, Verfügbarkeit, sehen Sie Zeitstatistiken und fügen Sie Notizen hinzu.

**Team**
Verwenden Sie das Dropdown, um diesen Mitwirkenden einem Team zuzuweisen. Teams sind Organisationsgruppen, die in den Portfolio-Einstellungen konfiguriert sind. Diese Zuweisung bestimmt, wie Mitwirkende auf der Mitwirkenden-Seite gruppiert werden. Dieses Feld ist nur beim Bearbeiten des Profils eines anderen Mitwirkenden sichtbar (nicht Ihres eigenen).

**Projektverfügbarkeit (Tage pro Monat)**
Verwenden Sie den Schieberegler, um festzulegen, wie viele Tage pro Monat diese Person an Portfolio-Projekten arbeiten kann. Der Bereich ist 0 -- 20 Tage, in 0,5-Tage-Schritten. Standard ist 5 Tage.

**Zeitstatistiken**
Schreibgeschützte Zusammenfassung der erfassten Zeit für diesen Mitwirkenden. Erfordert `portfolio_settings:reader` zur Ansicht.

- **Durchschnittlicher monatlicher Projektaufwand (letzte 6 Monate)**: Angezeigt in Personentagen (Stunden / 8)
- **Monatlicher Aufwand (12 Monate)**: Liniendiagramm mit **Gesamt**, **Projekt** und **Sonstig**
  - **Projekt** = Projekt-Overhead-Zeit + für Projektaufgaben erfasste Zeit
  - **Sonstig** = für Nicht-Projekt-Aufgaben erfasste Zeit
  - Monate ohne Daten werden als Lücken im Diagramm angezeigt

**Notizen**
Freitextfeld für zusätzliche Informationen über diesen Mitwirkenden -- Zertifizierungen, Präferenzen, Einschränkungen oder andere relevante Details.

---

### Fähigkeiten

Verfolgen Sie, was dieser Mitwirkende kann und wie kompetent er ist.

**Fähigkeiten hinzufügen**:
1. Verwenden Sie das Dropdown **Fähigkeit hinzufügen**, um nach einer Fähigkeit zu suchen
2. Fähigkeiten sind nach Kategorie gruppiert
3. Wählen Sie eine Fähigkeit, um sie dem Profil des Mitwirkenden hinzuzufügen
4. Die Fähigkeit erscheint mit einem Standardkompetenzgrad von 2 („Kann mit Unterstützung ausführen")

**Kompetenzgrade**:
Jede Fähigkeit hat eine Kompetenzbewertung von 0 -- 4:

| Stufe | Bezeichnung | Beschreibung |
|-------|-------|-------------|
| 0 | Keine Kenntnisse | Nicht vertraut mit dieser Fähigkeit |
| 1 | Grundlagen / Theoretisch | Versteht Konzepte, hat sie aber noch nicht angewendet |
| 2 | Kann mit Unterstützung ausführen | Kann die Arbeit mit Anleitung erledigen |
| 3 | Eigenständig | Kann unabhängig arbeiten |
| 4 | Experte | Tiefgreifende Expertise, kann andere anleiten |

Verwenden Sie den Schieberegler neben jeder Fähigkeit, um den Kompetenzgrad anzupassen.

**Fähigkeiten entfernen**:
Klicken Sie auf das Löschen-Symbol neben einer Fähigkeit, um sie aus dem Profil des Mitwirkenden zu entfernen.

**Fähigkeitskategorien**:
Fähigkeiten sind in zusammenklappbare Kategorien organisiert. Klicken Sie auf eine Kategorieüberschrift, um sie auf- oder zuzuklappen. Kategorien, die ausgewählte Fähigkeiten enthalten, werden automatisch erweitert, wenn Sie den Reiter öffnen.

---

### Erfasste Zeit

Zeigen und verwalten Sie alle Zeiteinträge für diesen Mitwirkenden an einem Ort. Dieser Reiter ist nur sichtbar, wenn Sie `portfolio_settings:reader` oder höher haben.

Die Tabelle konsolidiert Zeit aus Projekt-Overhead-Einträgen und Aufgaben-Zeiteinträgen und gibt Ihnen ein vollständiges Bild davon, wie der Mitwirkende seine Zeit verbringt.

**Spalten**:
- **Datum**: Wann die Zeit erfasst wurde
- **Quelle**: Wo die Zeit erfasst wurde -- entweder ein Aufgabenname oder Projektname
- **Kategorie**: Ob der Eintrag als **IT** oder **Business** klassifiziert ist, angezeigt als farbcodiertes Label
- **Zeit**: Dauer in Stunden oder Tagen (z. B. „4h", „1d 2h")
- **Notizen**: Alle dem Eintrag beigefügten Notizen

**Einträge bearbeiten**:
Klicken Sie auf das **Bearbeitungssymbol** neben einem Zeiteintrag, um den Bearbeitungsdialog zu öffnen. Der Dialog hängt vom Eintragstyp ab:
- **Aufgabeneinträge** öffnen den Aufgaben-Zeiterfassungsdialog, in dem Sie Stunden, Datum, Kategorie und Notizen anpassen können
- **Projekteinträge** öffnen den Projekt-Zeiterfassungsdialog, in dem Sie Stunden, Kategorie, Benutzer und Notizen anpassen können

**Einträge löschen**:
Klicken Sie auf das **Löschsymbol** neben einem Zeiteintrag, um ihn zu entfernen. Sie werden vor dem Löschen um Bestätigung gebeten. Das Löschen eines Eintrags aktualisiert auch die Zeitstatistiken des Mitwirkenden im Reiter **Allgemein**.

**Berechtigungen für Zeiteintragsaktionen**:
- Um die Spalte **Aktionen** zu sehen, benötigen Sie mindestens `tasks:member` oder `portfolio_projects:contributor`
- Nicht-Admin-Benutzer können nur Einträge bearbeiten oder löschen, die sie erstellt haben oder denen sie zugewiesen sind
- Benutzer mit `tasks:admin` können jeden eigenständigen Aufgabeneintrag bearbeiten oder löschen
- Benutzer mit `portfolio_projects:admin` können jeden Projektaufgabeneintrag oder Projekt-Overhead-Eintrag bearbeiten oder löschen

---

### Standards

Legen Sie Klassifizierungsstandards fest, die bei neuen Aufgaben, Anfragen und Projekten vorausgefüllt werden, wenn Klassifizierungsfelder noch leer sind. Dies spart Zeit für Mitwirkende, die regelmäßig im selben Bereich arbeiten.

**Was Sie festlegen können**:
- **Quelle**: Die Standardquell-Klassifizierung
- **Kategorie**: Die Standard-Kategorie-Klassifizierung
- **Stream**: Die Standard-Stream-Klassifizierung (nur verfügbar, wenn eine **Kategorie** ausgewählt ist; gefiltert auf Streams, die zu dieser Kategorie gehören)
- **Unternehmen**: Das Standardunternehmen

Wenn ein Mitwirkender eine neue Aufgabe, Anfrage oder ein neues Projekt erstellt, werden diese Standards verwendet, um die Klassifizierungsfelder automatisch vorzubelegen. Die Änderung der **Kategorie** löscht den **Stream**, wenn der aktuelle Stream nicht zur neu ausgewählten Kategorie gehört.

**Tipp**: Sie können Ihre eigenen Standards auch über **Einstellungen > Profil** erreichen, was direkt zum Reiter **Standards** Ihres Mitwirkenden-Profils verlinkt.

---

## Aktionen

Aus der Arbeitsbereich-Kopfzeile:
- **Speichern**: Änderungen an Team, Verfügbarkeit, Notizen, Fähigkeiten oder Standards speichern
- **Löschen**: Diese Mitwirkenden-Konfiguration entfernen (betrifft nicht das Benutzerkonto). Nur beim Bearbeiten des Profils eines anderen Mitwirkenden mit `portfolio_settings:admin` verfügbar.
- **Zurück-Pfeil**: Zur Mitwirkenden-Liste zurückkehren, oder zu **Einstellungen**, wenn Sie Ihr eigenes Profil geöffnet haben

---

## Ihr eigenes Mitwirkenden-Profil

Jeder Benutzer mit mindestens einer Portfolio-Reader-Berechtigung kann auf sein eigenes Mitwirkenden-Profil unter **Portfolio > Mitwirkende > ich** oder über **Einstellungen > Profil > Mitwirkenden-Einstellungen** zugreifen.

Beim Bearbeiten Ihres eigenen Profils:
- Können Sie Ihre **Verfügbarkeit**, **Fähigkeiten**, **Notizen** und **Klassifizierungsstandards** aktualisieren
- Können Sie nicht Ihre eigene **Teamzuweisung** ändern (das kann nur ein Portfolio-Settings-Mitglied)
- Können Sie nicht Ihren eigenen Mitwirkenden-Datensatz löschen

Wenn Sie noch keinen Mitwirkenden-Datensatz haben, wird beim Öffnen der Self-Service-Seite automatisch einer erstellt.

---

## Teams

Mitwirkende können organisatorischen Teams zugewiesen werden, um die Organisation zu verbessern. Teams werden in **Portfolio > Einstellungen > Teams** konfiguriert.

**Standardteams** (können angepasst werden):
- Infrastruktur
- Business-Anwendungen
- Engineering-Anwendungen
- Service Desk
- Stammdaten
- Cybersecurity

**Teams verwalten**:
- Gehen Sie zu **Portfolio > Einstellungen** und klicken Sie auf den Reiter **Teams**
- Teams hinzufügen, bearbeiten oder deaktivieren
- Verwenden Sie **Standardwerte laden**, um mit Standardteams zu befüllen
- Teams mit zugewiesenen Mitgliedern können nicht gelöscht werden

---

## Tipps

- **Mitwirkende Teams zuweisen**: Dies hilft, die Mitwirkenden-Seite zu organisieren und macht es einfacher, bestimmte Personen zu finden.
- **Realistische Verfügbarkeit festlegen**: Berücksichtigen Sie Meetings, Tagesgeschäft und Urlaub bei der Festlegung der Tage pro Monat. Die meisten Personen haben weniger Projektzeit als erwartet.
- **Kompetenz ehrlich einschätzen**: Ein Team voller „Experten" ist für die Planung nicht nützlich. Seien Sie realistisch bei Kompetenzgraden, um bessere Ressourcenentscheidungen zu treffen.
- **Fähigkeiten aktuell halten**: Überprüfen Sie die Fähigkeiten der Mitwirkenden regelmäßig, besonders nach Schulungen oder neuen Projekterfahrungen.
- **Klassifizierungsstandards früh einrichten**: Wenn Sie immer in derselben Kategorie und demselben Stream arbeiten, spart Ihnen die Konfiguration von Standards die Auswahl bei jeder Erstellung einer Aufgabe oder Anfrage.
