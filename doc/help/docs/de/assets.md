# Assets

Assets dokumentieren Ihr Infrastrukturinventar -- physische Server, virtuelle Maschinen, Container, Cloud-Instanzen und Netzwerkgeräte. Verknüpfen Sie Assets mit Anwendungen, Standorten, Verbindungen und Finanzdatensätzen, um ein vollständiges Bild Ihrer IT-Infrastruktur aufzubauen.

## Erste Schritte

Navigieren Sie zu **IT-Landschaft > Assets**, um Ihr Asset-Inventar zu sehen. Klicken Sie auf **Asset hinzufügen**, um Ihren ersten Eintrag zu erstellen.

**Pflichtfelder**:
- **Name**: Ein eindeutiger Asset-Name oder Hostname
- **Asset-Typ**: Webserver, Datenbank, Anwendungsserver, Netzwerkgerät usw.
- **Standort**: Wo das Asset gehostet wird (bestimmt Anbieter, Hosting-Typ und Land)

**Dringend empfohlen**:
- **Lebenszyklus**: Aktueller Status (Aktiv, Veraltet, Außer Betrieb usw.)
- **Umgebung**: Zu welcher Umgebung dieses Asset gehört (Prod, Pre-prod, QA usw.)

**Tipp**: Verwenden Sie konsistente Namenskonventionen, die Umgebungs- und Rolleninformationen enthalten (z. B. `prod-web-01`, `dev-db-master`). Beim Erstellen eines neuen Assets wird der Hostname automatisch aus dem eingegebenen Namen abgeleitet.

---

## Arbeiten mit der Liste

Die Asset-Liste gibt Ihnen einen filterbaren, sortierbaren Überblick über jedes Asset in Ihrem Inventar.

**Standardspalten**:

| Spalte | Was sie zeigt |
|--------|---------------|
| **Name** | Asset-Name (klicken, um Arbeitsbereich zu öffnen) |
| **Asset-Typ** | Die Rolle des Assets (z. B. Virtuelle Maschine, Physischer Server) |
| **Cluster** | Cluster-Mitgliedschaft oder ein „Cluster"-Badge, wenn dieses Asset ein Cluster ist |
| **Umgebung** | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| **Standort** | Wo das Asset gehostet wird |
| **Hosting** | Hosting-Typ (vom Standort abgeleitet) |
| **BS** | Betriebssystem |
| **Netzwerkzone** | Netzwerksegment (vom Subnetz abgeleitet) |
| **Lebenszyklus** | Aktueller Lebenszyklus-Status |
| **Zuweisungen** | Anzahl der Anwendungszuweisungen |
| **Erstellt** | Wann der Datensatz erstellt wurde |

**Zusätzliche Spalten** (standardmäßig ausgeblendet, über Spaltenauswahl verfügbar):
- **Unter-Standort**: Spezifischer Bereich innerhalb des Standorts (Gebäude, Raum, Rack)
- **Go-live**: Datum der Produktivinbetriebnahme
- **End-of-life**: Geplantes oder tatsächliches Außerbetriebnahmedatum

**Filterung**:

Die meisten Spalten unterstützen Kontrollkästchen-Set-Filter für schnelle Mehrfachauswahl-Filterung. Filteroptionen werden dynamisch basierend auf anderen aktiven Filtern und der Suchabfrage aktualisiert, sodass Sie nur Werte sehen, die im aktuellen Ergebnissatz existieren.

| Spalte | Hinweise |
|--------|-------|
| Asset-Typ | Nach einem oder mehreren Asset-Typen filtern |
| Cluster | Enthält „(Kein Cluster)" für eigenständige Assets |
| Umgebung | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| Standort | Enthält „(Kein Standort)" für nicht zugewiesene Assets |
| Unter-Standort | Enthält „(Kein Unter-Standort)" für Assets ohne einen |
| Hosting | Nach Hosting-Typ filtern |
| BS | Nach Betriebssystem filtern |
| Netzwerkzone | Nach Netzwerksegment filtern |
| Lebenszyklus | Nach Lebenszyklus-Status filtern |

**Tipp**: Kombinieren Sie Filter über Spalten hinweg, um Ergebnisse einzugrenzen. Zum Beispiel filtern Sie nach Umgebung = „Prod" und Lebenszyklus = „Aktiv", um nur aktive Produktions-Assets zu sehen.

**Aktionen**:
- **Asset hinzufügen**: Ein neues Asset erstellen (erfordert `infrastructure:member`)
- **CSV importieren** / **CSV exportieren**: Massenoperationen (erfordert `infrastructure:admin`)
- **Ausgewählte löschen**: Ausgewählte Assets entfernen (erfordert `infrastructure:admin`)

---

## Cluster

Assets können in Clustern organisiert werden:

- **Reguläres Asset**: Eine einzelne Infrastrukturinstanz
- **Cluster**: Eine Gruppe von Assets, die als eine logische Einheit agieren

Beim Erstellen oder Bearbeiten eines Assets schalten Sie **Dieser Server stellt einen Cluster dar** um, um ihn als Cluster zu markieren. Cluster-Assets können Endpunkte in Verbindungen sein, aber Anwendungsinstanzen sollten den Mitglieds-Hosts zugewiesen werden, nicht dem Cluster selbst.

Cluster-Mitglieder werden über den Reiter **Technik** des Cluster-Arbeitsbereichs verwaltet.

---

## Der Asset-Arbeitsbereich

Klicken Sie auf eine Zeile, um den Arbeitsbereich zu öffnen. Die Kopfzeile zeigt den Asset-Namen, ein „Cluster"-Badge (wenn zutreffend) und Ihre Position in der Liste (z. B. „3 von 47"). Verwenden Sie die Pfeilschaltflächen, um zum vorherigen oder nächsten Asset zu navigieren, ohne zur Liste zurückzukehren.

### Übersicht

Der Reiter Übersicht erfasst die Identität und den Standort des Assets.

**Was Sie bearbeiten können**:
- **Name**: Asset-Hostname oder Identifikator
- **Asset-Typ**: Rolle (Webserver, Datenbank, Anwendungsserver usw.)
- **Ist Cluster**: Umschalter, um dieses Asset als Cluster zu markieren
- **Standort**: Verknüpfung zu einem Standort-Datensatz (erforderlich). Die Auswahl eines Standorts füllt automatisch die schreibgeschützten Felder unten aus.
- **Unter-Standort**: Wenn der ausgewählte Standort definierte Unter-Standorte hat (Gebäude, Räume, Racks), erscheint dieses Dropdown, um genau anzugeben, wo das Asset innerhalb des Standorts steht.
- **Lebenszyklus**: Aktueller Status (Aktiv, Veraltet, Außer Betrieb usw.)
- **Go-live-Datum**: Wann das Asset in Produktion ging
- **End-of-life-Datum**: Geplantes oder tatsächliches Außerbetriebnahmedatum
- **Notizen**: Freitext-Notizen zum Asset

**Schreibgeschützte Felder** (vom ausgewählten Standort abgeleitet):
- **Hosting-Typ**: On-Premises, Colocation, Cloud usw.
- **Cloud-Anbieter / Betreiberunternehmen**: Für Cloud-Standorte wird der Cloud-Anbieter angezeigt; für On-Premises das Betreiberunternehmen
- **Land**: Land des Standorts
- **Stadt**: Stadt des Standorts

---

### Technik

Der Reiter Technik organisiert Netzwerkidentität und Konfiguration in logische Abschnitte.

**Umgebung**:
- **Umgebung**: Prod, Pre-prod, QA, Test, Dev oder Sandbox

**Cluster-Abschnitte**:
- Wenn dieses Asset **ein Cluster ist**: Zeigt die Tabelle **Mitglieder** mit allen Mitglieds-Assets (Name, Umgebung, Status, Betriebssystem). Klicken Sie auf **Mitglieder bearbeiten**, um Mitglieder über einen Suchdialog hinzuzufügen oder zu entfernen.
- Wenn dieses Asset **kein Cluster ist**: Zeigt **Cluster-Mitgliedschaft** -- welchen Clustern dieses Asset angehört, falls zutreffend.

**Identität**:
- **Hostname**: Der Netzwerk-Hostname des Assets. Wird beim Erstellen automatisch aus dem Asset-Namen vorausgefüllt; Sie können ihn jederzeit überschreiben. Erforderlich, wenn eine Domäne ausgewählt ist.
- **Domäne**: Die Active-Directory- oder DNS-Domäne, der das Asset angehört. Wählen Sie aus in **Einstellungen > IT-Landschaft** konfigurierten Domänen. Systemoptionen umfassen „Arbeitsgruppe" (eigenständig) und „N/A" (nicht zutreffend).
- **FQDN**: Fully Qualified Domain Name, automatisch aus Hostname und Domänen-DNS-Suffix berechnet. Schreibgeschützt.
- **Aliase**: Zusätzliche DNS-Namen oder Aliase für dieses Asset. Tippen und Enter drücken zum Hinzufügen.
- **Betriebssystem**: BS-Typ und Version (z. B. Windows Server 2022, Ubuntu 24.04 LTS). Für Cluster deaktiviert -- BS wird pro Mitglied definiert. Wenn ausgewählt, werden Standard- und erweiterte Support-Enddaten angezeigt.

**IP-Adressen**:

Assets unterstützen mehrere IP-Adressen, jeweils mit eigener Netzwerkkonfiguration:

- Klicken Sie auf **IP-Adresse hinzufügen**, um einen neuen Eintrag hinzuzufügen
- **Typ**: Der Zweck der IP-Adresse (Host, IPMI, Management, iSCSI oder benutzerdefinierte Typen aus den Einstellungen)
- **IP-Adresse**: Die Adresse selbst
- **Subnetz**: Netzwerk-Subnetz aus der konfigurierten Liste (gefiltert auf den Standort des Assets)
- **Netzwerkzone**: Automatisch vom ausgewählten Subnetz abgeleitet (schreibgeschützt)
- **VLAN**: Automatisch vom ausgewählten Subnetz abgeleitet (schreibgeschützt)

Dies ermöglicht Ihnen, mehrere Netzwerkschnittstellen pro Asset zu dokumentieren -- zum Beispiel einen physischen Server mit sowohl einer Host-IP als auch einer IPMI-Management-Adresse in verschiedenen Subnetzen.

---

### Hardware

*Nur für physische Asset-Typen sichtbar.*

Verfolgt physische Hardware-Details:
- **Seriennummer**
- **Hersteller**
- **Modell**
- **Kaufdatum**
- **Rack-Position** (z. B. Reihe A, Rack 12)
- **Höheneinheit** (z. B. U1-U4)
- **Notizen**

---

### Support

*Nur für physische Asset-Typen sichtbar.*

Verfolgt Lieferantensupport und Kontaktinformationen:
- **Lieferant**: Aus dem Lieferantenverzeichnis auswählen
- **Supportvertrag**: Verknüpfung zu einem Vertragsdatensatz
- **Support-Stufe**: Freitext (z. B. Gold, Silber, 24x7)
- **Support-Ablauf**: Ablaufdatum
- **Notizen**

**Supportkontakte**: Eine Tabelle, in der Sie Kontakte aus dem Kontaktverzeichnis hinzufügen können, jeweils mit einer Rollenbezeichnung. Die Tabelle zeigt automatisch E-Mail, Telefon und Mobil jedes Kontakts an.

---

### Verknüpfungen

Der Reiter Verknüpfungen ermöglicht es Ihnen zu definieren, wie dieses Asset mit anderen Datensätzen in KANAP verbunden ist.

**Asset-Verknüpfungen**:
- **Abhängig von**: Andere Assets, von denen dieses abhängt (z. B. ein Datenbankserver)
- **Enthält**: Assets, die in diesem enthalten sind (z. B. Server in einem Rack)
- **Enthalten in** / **Abhängig davon**: Schreibgeschützte Rückansichten, die zeigen, welche anderen Assets auf dieses verweisen

**Finanzen**:
- **OPEX-Positionen**: Verknüpfung zu Betriebsausgabenpositionen
- **CAPEX-Positionen**: Verknüpfung zu Investitionsausgabenpositionen
- **Verträge**: Verknüpfung zu Vertragsdatensätzen

**Projekte**: Verknüpfung zu Portfolio-Projekten, die mit diesem Asset zusammenhängen.

**Relevante Websites**: URLs mit optionalen Beschreibungen hinzufügen -- nützlich für Anbieterportale, Monitoring-Dashboards oder Dokumentationslinks.

**Anhänge**: Dateien per Drag & Drop oder **Dateien auswählen** hochladen. Klicken Sie auf einen Anhang-Chip, um ihn herunterzuladen.

---

### Wissensdatenbank

Wissensdatenbank-Artikel an dieses Asset anhängen. Wenn Sie die Berechtigung `knowledge:member` haben, können Sie neue Artikel direkt aus diesem Reiter erstellen.

---

### Zuweisungen

Anzeigen und verwalten, welche Anwendungen auf diesem Asset laufen. Jede Zuweisung verknüpft das Asset mit einer Anwendungsinstanz (einer bestimmten Umgebung einer Anwendung).

**Um eine Zuweisung hinzuzufügen**:
1. Klicken Sie auf **Zuweisung hinzufügen**
2. Wählen Sie eine **Anwendung**
3. Wählen Sie eine **Umgebung** (Instanz)
4. Wählen Sie eine **Rolle** (aus der Serverrollenliste in den Einstellungen)
5. Legen Sie optional ein **Seit**-Datum und **Notizen** fest

Cluster-Assets können keine Anwendungszuweisungen hosten -- weisen Sie stattdessen Mitglieds-Hosts zu.

Jede Zuweisungszeile zeigt den Anwendungsnamen (klickbar zur Navigation), Umgebung, Rolle, Seit-Datum und Notizen. Sie können Zuweisungen über die Aktionsspalte bearbeiten oder entfernen.

---

### Verbindungen

Eine schreibgeschützte Ansicht aller Verbindungen, die dieses Asset betreffen. Jede Zeile zeigt:

| Spalte | Was sie zeigt |
|--------|---------------|
| **Verbindungs-ID** | Klickbarer Link zum Verbindungs-Arbeitsbereich |
| **Name** | Verbindungsname |
| **Topologie** | Server zu Server oder Multi-Server |
| **Protokolle** | Protokoll-Chips |
| **Quelle** | Quell-Endpunkt-Bezeichnung |
| **Ziel** | Ziel-Endpunkt-Bezeichnung |
| **Lebenszyklus** | Verbindungs-Lebenszyklus-Status |

Um Verbindungen zu verwalten, navigieren Sie zu **IT-Landschaft > Verbindungen**.

---

## CSV-Import/Export

Pflegen Sie Ihr Asset-Inventar im großen Maßstab mit CSV-Import und -Export. Diese Funktion unterstützt Massenoperationen für die anfängliche Datenübernahme, periodische Updates aus externen Systemen und Datenextraktion für Berichte.

### Zugriff auf CSV-Funktionen

Aus der Asset-Liste:
- **CSV exportieren**: Assets in eine CSV-Datei herunterladen
- **CSV importieren**: Eine CSV-Datei hochladen, um Assets zu erstellen oder zu aktualisieren

**Erforderliche Berechtigungen**: `infrastructure:admin` für Import-/Export-Operationen.

### Export-Optionen

| Option | Beschreibung |
|--------|-------------|
| **Vollständiger Export** | Alle exportierbaren Felder -- verwenden Sie dies für Berichte und vollständige Datenextraktion |
| **Datenanreicherung** | Alle importierbaren Felder -- entspricht dem Import-Vorlagenformat, ideal für Roundtrip-Bearbeitung (exportieren, ändern, reimportieren) |
| **Benutzerdefinierte Auswahl** | Wählen Sie bestimmte Felder für Ihren Export aus |

**Vorlagen-Download** (aus dem Import-Dialog): Lädt eine leere CSV mit allen importierbaren Feldspaltenköpfen herunter -- verwenden Sie diese, um Importdateien mit der korrekten Struktur vorzubereiten.

### Import-Workflow

1. **Datei vorbereiten**: Verwenden Sie UTF-8-Kodierung mit Semikolon (`;`) als Trennzeichen. Laden Sie eine Vorlage herunter, um korrekte Spaltenköpfe sicherzustellen.

2. **Importeinstellungen wählen**:
   - **Modus**:
     - `Anreichern` (Standard): Leere Zellen behalten vorhandene Werte bei -- aktualisieren Sie nur, was Sie angeben
     - `Ersetzen`: Leere Zellen löschen vorhandene Werte -- vollständiger Ersatz aller Felder
   - **Operation**:
     - `Upsert` (Standard): Neue Assets erstellen oder vorhandene aktualisieren
     - `Nur aktualisieren`: Nur vorhandene Assets ändern, neue überspringen
     - `Nur einfügen`: Nur neue Assets erstellen, vorhandene überspringen

3. **Zuerst validieren**: Klicken Sie auf **Preflight**, um Ihre Datei ohne Änderungen zu validieren. Überprüfen Sie Fehler und Warnungen.

4. **Änderungen anwenden**: Wenn die Validierung erfolgreich ist, klicken Sie auf **Importieren**, um die Änderungen zu übernehmen.

### Feldreferenz

**Kernfelder**:

| CSV-Spalte | Beschreibung | Erforderlich | Hinweise |
|------------|-------------|----------|-------|
| `id` | Asset-UUID | Nein | Für Aktualisierungen; bei neuen Assets leer lassen |
| `name` | Asset-Name | Ja | Wird als eindeutiger Identifikator für den Abgleich verwendet |
| `location_code` | Standortcode | Ja | Muss einem vorhandenen Standortcode entsprechen |
| `kind` | Asset-Typ | Ja | Akzeptiert Code oder Bezeichnung (z. B. `vm` oder `Virtual Machine`) |
| `environment` | Umgebung | Ja | `prod`, `pre_prod`, `qa`, `test`, `dev`, `sandbox` |
| `status` | Lebenszyklus-Status | Nein | Akzeptiert Code oder Bezeichnung (z. B. `active` oder `Active`) |
| `is_cluster` | Ist dies ein Cluster | Nein | `true` oder `false` |
| `hostname` | Netzwerk-Hostname | Nein | |
| `domain` | DNS-Domäne | Nein | Akzeptiert Code oder Bezeichnung aus den Einstellungen |
| `aliases` | DNS-Aliase | Nein | Kommagetrennte Liste |
| `operating_system` | BS-Typ | Nein | Akzeptiert Code oder Bezeichnung aus den Einstellungen |
| `cluster` | Cluster-Mitgliedschaft | Nein | Name des übergeordneten Clusters |
| `notes` | Freitext-Notizen | Nein | |

**IP-Adressfelder** (bis zu 4 Adressen pro Asset):

| CSV-Spalte | Beschreibung | Hinweise |
|------------|-------------|-------|
| `ip_1_type` | IP-Adresstyp | Akzeptiert Code oder Bezeichnung (z. B. `host` oder `Host IP`) |
| `ip_1_address` | IP-Adresse | |
| `ip_1_subnet_cidr` | Subnetz in CIDR-Notation | |
| `ip_2_type` bis `ip_4_type` | Weitere IP-Typen | Gleiches Muster für Slots 2-4 |
| `ip_2_address` bis `ip_4_address` | Weitere Adressen | |
| `ip_2_subnet_cidr` bis `ip_4_subnet_cidr` | Weitere Subnetze | |

### Bezeichnungs- und Code-Akzeptanz

Für Felder, die in **Einstellungen > IT-Landschaft** konfiguriert sind, können Sie entweder den internen Code oder die Anzeigebezeichnung verwenden:

| Feld | Beispielcodes | Beispielbezeichnungen |
|-------|---------------|----------------|
| Asset-Typ (`kind`) | `vm`, `physical`, `container` | `Virtual Machine`, `Physical Server`, `Container` |
| Lebenszyklus (`status`) | `active`, `inactive`, `decommissioned` | `Active`, `Inactive`, `Decommissioned` |
| Betriebssystem | `windows_2022`, `ubuntu_24` | `Windows Server 2022`, `Ubuntu 24.04 LTS` |
| Domäne | `corp`, `dmz` | `Corporate Domain`, `DMZ` |
| IP-Adresstyp | `host`, `ipmi`, `mgmt` | `Host IP`, `IPMI`, `Management` |

Das System normalisiert Werte während des Imports automatisch, sodass `Virtual Machine`, `virtual machine` und `vm` alle zum selben Asset-Typ aufgelöst werden.

### Abgleich und Aktualisierungen

Assets werden nach **Name** (Groß-/Kleinschreibung ignorierend) abgeglichen. Wenn eine Übereinstimmung gefunden wird:
- Im Modus `Anreichern`: Nur nicht-leere CSV-Werte aktualisieren das Asset
- Im Modus `Ersetzen`: Alle Felder werden aktualisiert, leere Werte löschen vorhandene Daten

Wenn Sie die Spalte `id` mit einer gültigen UUID einschließen, verwendet der Abgleich zuerst die ID und fällt dann auf den Namen zurück.

### Abgeleitete Felder

Einige Felder werden berechnet und können nicht importiert werden:
- **Anbieter**: Automatisch vom Standort des Assets abgeleitet
- **FQDN**: Berechnet aus Hostname + Domäne

### Einschränkungen

- **Maximal 4 IP-Adressen**: Assets unterstützen bis zu 4 IP-Adresseinträge per CSV
- **Cluster-Zuweisung nach Name**: Verwenden Sie den Clusternamen, nicht die ID, in der Spalte `cluster`
- **Standort erforderlich**: Jedes Asset muss einen gültigen Standortcode haben
- **Verknüpfungen nicht enthalten**: Anwendungszuweisungen, Verbindungen, Finanzlinks und Anhänge müssen im Arbeitsbereich verwaltet werden

### Fehlerbehebung

**Fehler „Datei ist nicht richtig formatiert"**: Dies deutet normalerweise auf ein Kodierungsproblem hin. Stellen Sie sicher, dass Ihre CSV als **UTF-8** gespeichert ist:

- **In LibreOffice**: Wenn Sie eine CSV öffnen, wählen Sie `UTF-8` im Dropdown für den Zeichensatz (nicht „Japanese (Macintosh)" oder andere Kodierungen). Beim Speichern aktivieren Sie „Filtereinstellungen bearbeiten" und wählen Sie UTF-8.
- **In Excel**: Speichern unter > CSV UTF-8 (Trennzeichen-getrennt), dann in einem Texteditor Kommas durch Semikolons ersetzen.
- **Allgemeiner Tipp**: Wenn Sie verstümmelte Zeichen am Anfang Ihrer Datei sehen, ist die Kodierung falsch.

### Beispiel-CSV

```csv
name;location_code;kind;environment;status;hostname;domain;ip_1_type;ip_1_address
PROD-WEB-01;NYC-DC1;Virtual Machine;prod;Active;prodweb01;corp;Host IP;10.0.1.10
PROD-DB-01;NYC-DC1;vm;prod;active;proddb01;corp;host;10.0.1.20
```

---

## Tipps

- **Konsistente Benennung**: Umgebung, Rolle und Sequenz in Asset-Namen einfügen für einfache Identifizierung.
- **Cluster verwenden**: Verwandte Assets gruppieren (z. B. Web-Cluster, Datenbank-Cluster) zur vereinfachten Verwaltung.
- **Lebenszyklus verfolgen**: Veraltete und außer Betrieb genommene Assets markieren, um genaue Inventarzahlen zu pflegen.
- **Mit Standorten verknüpfen**: Assets Standorten zuweisen für geografische Berichte und DR-Planung.
- **Anwendungen zuweisen**: Assets mit Anwendungsinstanzen verknüpfen, um zu verstehen, was wo läuft.
- **Reiter Verknüpfungen nutzen**: Assets mit OPEX-/CAPEX-Positionen, Verträgen und Projekten verbinden für Finanzsichtbarkeit.
- **Dokumentation anhängen**: Konfigurationsdateien, Architekturdiagramme oder Lieferantendokumente direkt an das Asset hochladen.
