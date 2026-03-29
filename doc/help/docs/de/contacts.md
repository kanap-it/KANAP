# Kontakte

Kontakte dokumentieren die Personen, mit denen Sie zusammenarbeiten -- Key Account Manager, Support-Ingenieure, Berater und andere externe Stakeholder. Verknüpfen Sie Kontakte mit Lieferanten, um ein Lieferanten-Kontaktverzeichnis aufzubauen, und referenzieren Sie sie von Anwendungen und Standorten für Support-Informationen.

## Erste Schritte

Navigieren Sie zu **Stammdaten > Kontakte**, um Ihr Kontaktverzeichnis zu sehen. Klicken Sie auf **Neu**, um Ihren ersten Eintrag zu erstellen.

**Pflichtfelder**:
- **E-Mail**: Die E-Mail-Adresse des Kontakts (wird als eindeutige Kennung verwendet)

**Dringend empfohlen**:
- **Vorname** / **Nachname**: Der Name des Kontakts
- **Lieferant**: Für welchen Anbieter dieser Kontakt arbeitet
- **Kontakttyp**: Die Rolle des Kontakts beim Lieferanten (Kommerziell, Technisch, Support oder Sonstige) -- verfügbar, sobald ein Lieferant ausgewählt ist

**Optional aber nützlich**:
- **Berufsbezeichnung**: Rolle oder Position
- **Telefon** / **Mobil**: Telefonnummern, mit Landesvorwahl eingegeben
- **Land**: Standort (ISO-Ländercode)

**Tipp**: Verknüpfen Sie Kontakte zuerst mit Lieferanten und referenzieren Sie sie dann von Anwendungen und Standorten für konsistente Support-Informationen.

---

## Mit der Liste arbeiten

Das Kontakte-Grid bietet ein durchsuchbares Verzeichnis aller externen Kontakte. Jede Zelle in einer Zeile ist ein anklickbarer Link, der den Kontakt-Arbeitsbereich öffnet.

**Standardspalten**:
- **Nachname** / **Vorname**: Kontaktname
- **Lieferant**: Der Anbieter, für den sie arbeiten
- **E-Mail**: E-Mail-Adresse
- **Aktiv**: Ob der Kontakt derzeit aktiv ist (Ja / Nein)

**Zusätzliche Spalten** (über Spaltenauswahl):
- **Berufsbezeichnung**: Rolle
- **Telefon** / **Mobil**: Telefonnummern
- **Land**: Standort
- **Erstellt**: Wann der Datensatz erstellt wurde

**Standardsortierung**: Nach Nachname, alphabetisch.

**Aktionen**:
- **Neu**: Neuen Kontakt erstellen (erfordert `contacts:manager`)
- **CSV importieren**: Massenimport von Kontakten (erfordert `contacts:admin`)
- **CSV exportieren**: Als CSV exportieren (erfordert `contacts:admin`)
- **Ausgewählte löschen**: Ausgewählte Kontakte entfernen (erfordert `contacts:admin`)

---

## Der Kontakte-Arbeitsbereich

Klicken Sie auf eine beliebige Zeile, um den Arbeitsbereich zu öffnen. Er hat einen Tab.

### Übersicht

**Was Sie bearbeiten können**:
- **E-Mail**: E-Mail-Adresse (Pflicht)
- **Vorname** / **Nachname**: Name des Kontakts
- **Lieferant**: Verknüpfung zu einem Lieferanten aus den Stammdaten
- **Kontakttyp**: Die Rolle des Kontakts beim Lieferanten -- Kommerziell, Technisch, Support oder Sonstige. Dieses Feld wird verfügbar, sobald ein Lieferant ausgewählt ist. Wenn Sie den Lieferanten entfernen, wird auch der Kontakttyp gelöscht.
- **Berufsbezeichnung**: Rolle oder Position
- **Telefon** / **Mobil**: Telefonnummern. Jeweils mit einer Landesvorwahl-Auswahl neben dem lokalen Nummernfeld. Die Eingabe einer Vorwahl schlägt automatisch das Land vor, falls keines gesetzt ist.
- **Land**: Standort, aus einer durchsuchbaren Liste von ISO-Ländercodes ausgewählt
- **Aktiv**: Ob dieser Kontakt derzeit aktiv ist
- **Notizen**: Freitext-Notizen (bis zu 2.000 Zeichen)

---

## Wo Kontakte verwendet werden

Kontakte erscheinen an mehreren Stellen in KANAP.

### Lieferantenkontakte

Jeder Lieferant hat einen **Kontakte**-Tab, der alle mit diesem Anbieter verknüpften Kontakte zeigt. Sie können einen neuen Kontakt direkt aus dem Lieferanten-Arbeitsbereich erstellen:

1. Öffnen Sie den Lieferanten-Arbeitsbereich und gehen Sie zum **Kontakte**-Tab.
2. Klicken Sie auf **Erstellen** neben einer Kontaktrolle.
3. Füllen Sie die Kontaktdetails aus -- Lieferant und Kontakttyp sind vorausgefüllt.
4. Nach dem Speichern werden Sie automatisch zum Lieferanten-Arbeitsbereich zurückgeführt.

### Anwendungs-Support

Im Anwendungs-Arbeitsbereich referenziert der Tab **Technik & Support** Kontakte für die Support-Eskalation.

### Standort-Kontakte

Standorte können Support-Kontakte haben (Facility Manager, NOC-Kontakte usw.).

---

## CSV-Import/Export

Verwalten Sie Kontakte in großen Mengen per CSV.

**Export**: Lädt alle Kontakte mit ihren Details herunter.

**Import**:
- Verwenden Sie die **Vorprüfung** zum Validieren vor dem Anwenden
- Zuordnung über E-Mail-Adresse
- Kann neue Kontakte erstellen oder bestehende aktualisieren

**Pflichtfelder**: E-Mail

**Optionale Felder**: Vorname, Nachname, Lieferantenname, Berufsbezeichnung, Telefon, Mobil, Land, Aktiv

**Hinweise**:
- Verwenden Sie **UTF-8-Kodierung** und **Semikolons** als Trennzeichen
- Der Lieferant wird nach Name zugeordnet -- stellen Sie sicher, dass der Lieferant vor dem Import existiert

---

## Tipps

- **Immer einen Lieferanten zuweisen**: Das Verknüpfen von Kontakten mit Lieferanten erleichtert das Finden und Verwalten.
- **Kontakttyp festlegen**: Sobald ein Lieferant verknüpft ist, wählen Sie, ob der Kontakt Kommerziell, Technisch, Support oder Sonstige ist. Das hilft beim Durchsuchen der Kontakte aus dem Lieferanten-Arbeitsbereich.
- **Konsistente Benennung**: Geben Sie Namen in einheitlichem Format ein (z. B. immer „Vorname Nachname").
- **Inaktive Kontakte markieren**: Wenn jemand einen Anbieter verlässt, markieren Sie ihn als inaktiv statt zu löschen -- dies bewahrt den Audit-Trail.
- **Berufsbezeichnungen eintragen**: Berufsbezeichnungen helfen, den richtigen Kontakt für verschiedene Bedürfnisse zu identifizieren (Vertrieb vs. Support vs. Account Management).
