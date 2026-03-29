# Schnittstellen

Schnittstellen dokumentieren die logischen Datenflüsse zwischen Ihren Anwendungen. Anders als direkte Code-Verbindungen repräsentiert eine Schnittstelle eine Geschäftsintegration -- das „Warum" und „Was" des Datenaustauschs -- unabhängig von der technischen Implementierung. Jede Schnittstelle kann mehrere umgebungsspezifische Bindungen haben, die die tatsächlichen Endpunkte und Konfigurationen definieren.

## Erste Schritte

Navigieren Sie zu **IT-Landschaft > Schnittstellen**, um Ihr Integrationsverzeichnis zu sehen. Klicken Sie auf **Schnittstelle hinzufügen**, um Ihren ersten Eintrag zu erstellen.

**Pflichtfelder**:

- **Schnittstellen-ID**: Ein eindeutiger Identifikator (z. B. `INT-CRM-ERP-001`)
- **Name**: Ein beschreibender Name für die Integration
- **Geschäftszweck**: Warum diese Integration existiert
- **Quellanwendung**: Wo Daten ihren Ursprung haben
- **Zielanwendung**: Wohin Daten fließen
- **Datenkategorie**: Die Art der übertragenen Daten

**Dringend empfohlen**:

- **Geschäftsprozess**: Welchen Geschäftsprozess diese Schnittstelle unterstützt
- **Lebenszyklus**: Aktueller Status (Aktiv, Veraltet usw.)

**Tipp**: Beginnen Sie mit der Dokumentation Ihrer Produktionsschnittstellen. Verwenden Sie den Reiter Bindungen & Verbindungen, um umgebungsspezifische Bindungen hinzuzufügen, sobald die logische Schnittstelle definiert ist.

---

## Arbeiten mit der Liste

Das Schnittstellenraster zeigt Ihr Integrationsverzeichnis auf einen Blick.

**Standardspalten**:

- **Schnittstellen-ID**: Der eindeutige Identifikator (klicken, um Arbeitsbereich zu öffnen)
- **Name**: Schnittstellenname (klicken, um Arbeitsbereich zu öffnen)
- **Umgebungen**: Farbige Chips, die zeigen, welche Umgebungen konfigurierte Bindungen haben
- **Quell-App**: Die Quellanwendung
- **Ziel-App**: Die Zielanwendung
- **Lebenszyklus**: Aktueller Status
- **Kritikalität**: Geschäftliche Bedeutung
- **Erstellt**: Wann der Datensatz erstellt wurde

**Aktionen**:

- **Schnittstelle hinzufügen**: Eine neue Schnittstelle erstellen (erfordert `applications:manager`)
- **Schnittstelle duplizieren**: Eine Kopie einer ausgewählten Schnittstelle erstellen (erfordert `applications:manager`)
- **Ausgewählte löschen**: Ausgewählte Schnittstellen entfernen (erfordert `applications:admin`)

---

## Der Schnittstellen-Arbeitsbereich

Klicken Sie auf eine Zeile, um den Arbeitsbereich zu öffnen. Er hat sechs Reiter.

### Übersicht

Der Reiter Übersicht erfasst Identität und Geschäftskontext der Schnittstelle.

**Was Sie bearbeiten können**:

- **Schnittstellen-ID**: Eindeutiger Identifikator
- **Name**: Anzeigename
- **Geschäftsprozess**: Verknüpfung zu einem Geschäftsprozess aus den Stammdaten
- **Geschäftszweck**: Freitext-Beschreibung, warum diese Integration existiert
- **Quellanwendung** / **Zielanwendung**: Die verbundenen Apps
- **Datenkategorie**: Die Art der übertragenen Daten
- **Integrationsroutentyp**: Direkt oder Via Middleware
- **Middleware-Anwendungen**: Bei Routentyp Via Middleware die beteiligten Middleware-Plattformen auswählen
- **Lebenszyklus**: Aktueller Status
- **Übersichtsnotizen**: Zusätzlicher Kontext

---

### Verantwortung & Kritikalität

Dieser Reiter dokumentiert, wer für die Schnittstelle verantwortlich ist und wie wichtig sie ist.

**Business-Verantwortliche**: Geschäftliche Stakeholder, die für die Integration rechenschaftspflichtig sind.

**IT-Verantwortliche**: Technische Teammitglieder, die für die Wartung verantwortlich sind.

**Kritikalität & Auswirkung**:
- **Kritikalität**: Geschäftskritisch, Hoch, Mittel oder Niedrig
- **Auswirkung bei Ausfall**: Freitext-Beschreibung der Konsequenzen bei Ausfall

**Betroffene Unternehmen**: Welche Unternehmen oder Rechtseinheiten von dieser Schnittstelle betroffen sind.

---

### Funktionale Definition

Der Reiter Funktionale Definition erfasst die Geschäftslogik der Integration.

**Was Sie dokumentieren können**:
- **Geschäftsobjekte**: Welche Datenentitäten übertragen werden
- **Hauptanwendungsfälle**: Primäre Szenarien, die diese Schnittstelle unterstützt
- **Funktionale Regeln**: Übergeordnete Geschäftsregeln für den Datenfluss
- **Schlüsselidentifikatoren**: Quell- und Ziel-Identifikator-Zuordnungen
- **Abhängigkeiten**: Vor- und nachgelagerte Schnittstellen
- **Funktionale Dokumentationslinks**: URLs zu externer Dokumentation
- **Funktionale Anhänge**: Spezifikationsdokumente direkt hochladen

---

### Technische Definition

Der Reiter Technische Definition definiert, wie die Integration auf technischer Ebene funktioniert.

**Legs-Vorlage**: Eine Tabelle, die die Datenfluss-Abschnitte definiert (Extract, Transform, Load oder Direct). Jeder Abschnitt spezifiziert:
- **Abschnittstyp**: EXTRACT, TRANSFORM, LOAD oder DIRECT
- **Von / Nach**: Welche Rolle jeden Schritt übernimmt
- **Auslösertyp**: Was diesen Abschnitt initiiert
- **Muster**: Das Integrationsmuster
- **Format**: Das Datenformat
- **Job-Name**: Ein optionaler Job- oder Prozessname

---

### Bindungen & Verbindungen

Dieser Reiter verwaltet umgebungsspezifische Bindungen. Er präsentiert eine Matrix aus Umgebungen und Abschnitten, sodass Sie jede Kombination unabhängig konfigurieren können.

**Bindungsfelder**:
- **Quellinstanz** / **Zielinstanz**: Welche Anwendungsinstanzen in dieser Umgebung verwendet werden
- **Status**: Aktiviert, Deaktiviert oder Test
- **Quell-Endpunkt** / **Ziel-Endpunkt**: Technische Endpunkte
- **Auslöserdetails**: Umgebungsspezifische Auslöserkonfiguration
- **Authentifizierungsmodus**: Wie die Bindung authentifiziert
- **Monitoring-URL**: Link zum Monitoring für diese Bindung

**Verbindungsverknüpfung**: Jede Bindung kann mit Infrastrukturverbindungen aus Ihrem Verbindungsverzeichnis verknüpft werden.

---

### Daten & Compliance

Der Reiter Daten & Compliance erfasst Datenschutz- und Sicherheitsinformationen.

**Was Sie bearbeiten können**:
- **Datenklassifizierung**: Sensibilitätsstufe
- **Enthält PII**: Ob personenbezogene Daten übertragen werden
- **Typische Daten**: Beschreibung einer typischen Datennutzlast
- **Audit & Protokollierung**: Wie die Schnittstelle auditiert wird
- **Sicherheitskontrollen (Zusammenfassung)**: Vorhandene Sicherheitsmaßnahmen
- **Datenhaltung**: Kommagetrennte ISO-2-Buchstaben-Ländercodes

---

## Schnittstellen kopieren

### Schnittstelle duplizieren (von der Schnittstellenseite)

Verwenden Sie dies, wenn Sie eine unabhängige Kopie einer Schnittstelle erstellen möchten.

1. Wählen Sie eine Schnittstelle im Raster
2. Klicken Sie auf **Schnittstelle duplizieren**
3. Wählen Sie, ob Umgebungsbindungen kopiert werden sollen:
   - **Ohne Bindungen**: Erstellt eine saubere Kopie
   - **Mit Bindungen**: Kopiert auch Umgebungsbindungen, löscht aber umgebungsspezifische Details

### Versionsmigration (aus der Anwendungsversionierung)

Verwenden Sie dies beim Upgrade einer Anwendung auf eine neue Version. Siehe [Anwendungen > Versionsverwaltung](applications.md#versionsverwaltung) für Details.

---

## Tipps

- **Zuerst das „Warum" dokumentieren**: Konzentrieren Sie sich auf den Geschäftszweck vor den technischen Details.
- **Umgebungsbindungen verwenden**: Erstellen Sie nicht separate Schnittstellen für jede Umgebung -- verwenden Sie eine Schnittstelle mit mehreren Bindungen.
- **Mit Geschäftsprozessen verknüpfen**: Die Verbindung von Schnittstellen mit Geschäftsprozessen hilft bei der Auswirkungsanalyse.
- **Middleware explizit halten**: Wenn Daten durch Middleware fließen, modellieren Sie dies explizit mit dem Routentyp Via Middleware.
- **Duplikat für ähnliche Schnittstellen verwenden**: Wenn Sie eine neue Schnittstelle erstellen, die einer bestehenden ähnelt, verwenden Sie **Schnittstelle duplizieren**.
- **Systemübergreifende IDs verfolgen**: Verwenden Sie Schlüsselidentifikatoren im Reiter Funktionale Definition.
