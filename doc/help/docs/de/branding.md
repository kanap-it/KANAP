# Branding

Verwenden Sie die Branding-Seite, um Ihre Unternehmensidentität in KANAP anzuwenden.

Route: `/admin/branding`

## Zugriff & Geltungsbereich

- Erforderliche Berechtigung: `users:admin`
- Nur auf Mandanten-Hosts verfügbar (nicht auf dem Plattform-Admin-Host)
- Änderungen gelten nur für Ihren aktuellen Mandanten

## Was Sie anpassen können

- **Logo**
  - Erscheint in der oberen App-Leiste (wenn angemeldet)
  - Erscheint im Header der Anmeldeseite
- **Primärfarben**
  - Eine Primärfarbe für den **Hellmodus**
  - Eine Primärfarbe für den **Dunkelmodus**
  - Werden für App-Leisten, primäre Schaltflächen und Links verwendet

## Logo einrichten

### Unterstützte Dateien

- Formate: `PNG`, `JPG/JPEG`, `GIF`, `WEBP`
- Maximale Größe: `20 MB`

### Empfohlenes Logo-Format

- Verwenden Sie ein breites, horizontales Logo (transparenter Hintergrund bevorzugt)
- Halten Sie wichtige Inhalte zentriert (der Header-Bereich ist kompakt)
- Für scharfe Darstellung verwenden Sie mindestens ~2x Anzeigegröße (z. B. `280x72` oder höher)

### Aktionen

1. Klicken Sie auf **Logo hochladen** und wählen Sie Ihre Datei.
2. Verwenden Sie die integrierten Vorschauen für hellen und dunklen Header zur Überprüfung.
3. Aktivieren Sie bei Bedarf **Logo im Dunkelmodus anzeigen**.
4. Klicken Sie auf **Änderungen speichern** zum Veröffentlichen.

Um das Logo zu entfernen, klicken Sie auf **Logo entfernen**.

Wenn kein Logo gesetzt ist (oder die Dunkelmodus-Logo-Anzeige deaktiviert ist), verwendet KANAP das Standard-Text/Icon-Branding.

## Primärfarben einrichten

### Wie Sie Farben auswählen

Sie können Farben festlegen mit:
- Hex-Eingabe (`#RRGGBB`)
- Farbauswahl-Schaltfläche
- Voreingestellte Farbpaletten-Chips
- **Löschen**-Schaltfläche (benutzerdefinierten Wert entfernen)

### Hell/Dunkel-Verhalten

- **Hellmodus-Primärfarbe** wird im Hellmodus verwendet.
- **Dunkelmodus-Primärfarbe** wird im Dunkelmodus verwendet.
- Wenn nur eine Farbe gesetzt ist, verwendet KANAP diese in beiden Modi.
- Wenn beide leer sind, verwendet KANAP die Standardfarben.

### Kontrastwarnung

Die Seite zeigt eine Warnung an, wenn der Kontrast niedrig ist.
Diese Warnung ist beratend (Sie können trotzdem speichern), aber ein niedriger Kontrast kann die Lesbarkeit beeinträchtigen.

## Speichern, Verwerfen und Zurücksetzen

- **Änderungen speichern**: Wendet das hochgeladene Logo + Farbeinstellungen an
- **Verwerfen**: Setzt nicht gespeicherte Änderungen auf der Seite zurück
- **Auf Standard zurücksetzen**: Entfernt das Logo und löscht alle benutzerdefinierten Farben

Das Zurücksetzen erfordert eine Bestätigung.

## Tipps für professionelle Ergebnisse

- Testen Sie in beiden Designmodi (Hell und Dunkel), bevor Sie speichern.
- Halten Sie Markenfarben sowohl vor weißen als auch vor dunklen Hintergründen gut lesbar.
- Bevorzugen Sie schlichte Logos mit transparentem Hintergrund für die sauberste Header-Darstellung.
- Verwenden Sie die Zurücksetzen-Funktion, um schnell die Standardwerte wiederherzustellen, wenn ein Teststil nicht zufriedenstellend ist.
