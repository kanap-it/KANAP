# Verbindungskarte

Die Verbindungskarte bietet eine interaktive Visualisierung Ihrer Infrastruktur-Netzwerktopologie. Assets erscheinen als Knoten und Verbindungen als Kanten und zeigen, wie Daten auf Infrastrukturebene fließen. Nutzen Sie sie, um Abhängigkeiten zu erkunden, Verbindungspfade nachzuverfolgen und Diagramme für die Architekturdokumentation zu exportieren.

## Wo Sie es finden

Navigieren Sie zu **IT-Landschaft > Verbindungskarte**, um die Visualisierung zu öffnen.

**Berechtigungen**: Sie benötigen mindestens `applications:reader`, um die Karte anzuzeigen.

---

## Die Visualisierung verstehen

Die Karte verwendet ein kraftgerichtetes Graph-Layout, bei dem:
- **Knoten** Server, Cluster oder logische Entitäten repräsentieren
- **Kanten** Verbindungen zwischen Infrastrukturkomponenten repräsentieren
- **Farben** den Hosting-Typ (On-Premises, Cloud) oder die Knotenart anzeigen
- **Rollenbasierte Platzierung** (standardmäßig aktiviert) Knoten in von oben nach unten angeordnete Bänder basierend auf Rollenebenen leitet

### Knotentypen

| Typ | Form | Randfarbe | Beschreibung |
|------|-------|--------------|-------------|
| **Server** | Abgerundetes Rechteck | Grün (On-prem) oder Blau (Cloud) | Einzelne Infrastrukturinstanzen (VMs, Container usw.) |
| **Cluster** | Abgerundetes Rechteck, gestrichelter Rand | Cyan | Gruppen von Servern, die als eine logische Einheit agieren |
| **Entitäten** | Pillen-/Stadionform | Orange | Logische Endpunkte (externe Systeme, SaaS-Dienste) |

Cluster-Mitglieder erscheinen als separate Knoten mit gestrichelten Linien, die sie mit ihrem übergeordneten Cluster-Knoten verbinden.

---

## Filter

### Lebenszyklus

Mehrfachauswahl-Filter für den Verbindungs-Lebenszyklus-Status. Wählen Sie, welche Status in der Visualisierung enthalten sein sollen (z. B. Aktiv, Geplant, Veraltet). Standard ist nur **Aktiv**.

### Anwendungen

Server über die darauf laufenden Anwendungen finden:
1. Wählen Sie eine oder mehrere Anwendungen aus dem Dropdown **Anwendungen**
2. Wählen Sie Umgebungen im Dropdown **App-Umg.** (zeigt nur Umgebungen, in denen ausgewählte Apps zugewiesene Server haben)
3. Die passenden Server werden automatisch zum **Server**-Filter hinzugefügt

Dies ist nützlich, wenn Sie die Infrastrukturverbindungen für eine bestimmte Anwendung sehen möchten, ohne zu wissen, auf welchen Servern sie läuft.

### Server

Server, Cluster oder Entitäten direkt auswählen, um den Fokus zu setzen:
1. Klicken Sie auf das Dropdown **Server**
2. Wählen Sie Elemente (gruppiert nach Typ: Entitäten, Cluster, Server)
3. Verwenden Sie den **Tiefe**-Filter, um zu steuern, wie viele Sprünge angezeigt werden

### Tiefe

Begrenzen Sie, wie viele „Sprünge" von ausgewählten Servern angezeigt werden:
- **Alle**: Alle Verbindungen anzeigen (keine Tiefenfilterung)
- **0**: Nur ausgewählte Server, ihre übergeordneten Cluster und direkt benachbarte Entitäten anzeigen
- **1--5**: Server innerhalb von N Sprüngen von ausgewählten Servern anzeigen

Die Tiefe wird automatisch auf **0** gesetzt, wenn Sie Server über die Anwendungs- oder Server-Filter auswählen.

---

## Anzeigeoptionen

### Multi-Server-Verbindungen anzeigen

Sichtbarkeit von Multi-Server-Verbindungen umschalten (Verbindungen mit mehr als zwei Servern in einer Mesh-Topologie). Standardmäßig aktiviert.

### Verbindungsschichten anzeigen

Wenn aktiviert (Standard), werden einzelne Verbindungsabschnitte als separate Kanten angezeigt. Dies zeigt, wie eine Verbindung mit mehreren Abschnitten durch Zwischenpunkte geroutet wird. Wenn deaktiviert, werden Verbindungen als einfache Quelle-zu-Ziel-Kanten angezeigt.

### Rollenbasierte Platzierung

Wenn aktiviert (Standard), behält die Karte ihr kraftgerichtetes Layout bei, fügt aber eine vertikale Ebenenführung hinzu:

- **Oben / Oberer / Mitte / Unterer / Unten**-Bänder
- **Server** verwenden die in den IT-Landschaft-Einstellungen konfigurierten Rollenzuweisungen
- **Entitäten** verwenden ihre konfigurierte Graph-Ebene (Standard ist Oben)
- **Nicht zugewiesene Server** fallen auf Mitte zurück
- **Cluster** erben die Ebene mit höchster Priorität von ihren Mitgliedern

Verwenden Sie diesen Schalter, wenn Sie eine Topologieansicht wünschen, die sich wie Architekturebenen liest (Edge-Komponenten oben, Datenspeicher unten).

Dieser Schalter ist nur für die Sitzung gültig und wird beim Neuladen der Seite zurückgesetzt.

---

## Graph-Steuerungen

Das Bedienfeld auf der linken Seite der Karte bietet diese Werkzeuge:

| Steuerung | Aktion | Beschreibung |
|---------|--------|-------------|
| Pause / Play | **Einfrieren / Freigeben** | Die Kraftsimulation anhalten, um Knoten manuell zu positionieren |
| Fadenkreuz | **Auto-Zentrieren** | Automatisches Zentrieren beim Auswählen von Knoten umschalten (blau = aktiviert) |
| Zoom + | **Hineinzoomen** | Zoomstufe erhöhen |
| Zoom - | **Herauszoomen** | Zoomstufe verringern |
| Raster | **Am Raster ausrichten** | Alle Knoten an einem Raster für sauberere Layouts ausrichten |
| SVG | **SVG exportieren** | Aktuelle Ansicht als Vektorbild herunterladen |
| PNG | **PNG exportieren** | Aktuelle Ansicht als Rasterbild herunterladen |

Sie können auch mit dem Mausrad zoomen und durch Klicken und Ziehen des Hintergrunds schwenken.

---

## Mit der Karte interagieren

### Knoten auswählen

Klicken Sie auf einen Server- oder Cluster-Knoten, um:
- Seine Verbindungen hervorzuheben
- Ein Detailpanel mit folgenden Informationen zu öffnen:
  - **Servertyp**: Art des Servers (Web, Datenbank, Anwendung usw.)
  - **Server-Standort**: Physischer oder Cloud-Standortcode
  - **Betriebssystem**: BS-Details
  - **Netzwerksegment**: Netzwerkzone
  - **IP-Adresse**: Netzwerkadresse
  - **Zugewiesene Anwendungen**: Apps, die auf diesem Server laufen, gruppiert nach Umgebung (klickbar)
- Schaltfläche **Server bearbeiten** oder **Cluster anzeigen**, um den Arbeitsbereich zu öffnen

Klicken Sie auf einen Entitätsknoten, um seinen Typ und seine Umgebung zu sehen.

### Kanten auswählen

Klicken Sie auf eine Verbindungskante, um:
- Verbindungsdetails zu sehen:
  - **Zweck**: Wofür die Verbindung verwendet wird
  - **Protokolle**: Verwendete Netzwerkprotokolle
  - **Typische Ports**: Erwartete Portnummern
  - **Kritikalität**: Geschäftliche Bedeutung
  - **Topologie**: Server-zu-Server oder Multi-Server
- Schaltfläche **Verbindung bearbeiten**, um den Verbindungs-Arbeitsbereich zu öffnen
- Abschnitt **Verknüpfte Schnittstellen**, der zeigt, welche Anwendungsschnittstellen diese Verbindung nutzen
  - Klicken Sie auf **Schnittstelle öffnen**, um die Schnittstelle anzuzeigen
  - Klicken Sie auf **In Schnittstellenkarte anzeigen**, um die Schnittstelle im Kontext zu sehen

### Knoten ziehen

Ziehen Sie einen beliebigen Knoten, um ihn neu zu positionieren. Während die Simulation läuft, passt sich das Layout um den verschobenen Knoten an. Wenn die Simulation eingefroren ist, bewegt das Ziehen den Knoten frei, ohne andere zu beeinflussen.

---

## Deep Linking

Die Karte unterstützt URL-Parameter zum Teilen bestimmter Ansichten:

| Parameter | Beschreibung | Beispiel |
|-----------|-------------|---------|
| `lifecycles` | Lebenszyklus-Filter vorauswählen (kommagetrennt) | `active,planned` |
| `focusConnectionId` | Eine bestimmte Verbindung hervorheben | UUID |
| `rootIds` | Server zum Fokussieren vorauswählen (kommagetrennt) | UUIDs |
| `depth` | Tiefenlimit festlegen | `0`, `1`, `all` |

**Beispiel**: `/it/connection-map?lifecycles=active&rootIds=abc123&depth=1`

---

## Cluster-Visualisierung

Cluster werden als eigenständige Knoten mit einem gestrichelten cyanfarbenen Rand angezeigt:
- Cluster-Mitglieder erscheinen als separate Knoten, verbunden mit ihrem übergeordneten Cluster durch gestrichelte Indikatorlinien
- Bei Filterung nach Tiefe=0 werden sowohl die ausgewählten Mitgliedsserver als auch ihre übergeordneten Cluster angezeigt
- Mitgliedsserver erben die Verbindungen des Clusters und behalten gleichzeitig ihre individuellen Server-zu-Server-Verbindungen bei

---

## Graph-Ebenen konfigurieren

Sie können steuern, wo Knoten vertikal tendieren, indem Sie Ebenen in **IT-Landschaft > Einstellungen** bearbeiten:

- **Serverrollen**-Liste: Graph-Ebene für jede Rolle festlegen (z. B. Web = Oben, DB = Unten)
- **Entitäten**-Liste: Graph-Ebene für jeden Entitätstyp festlegen (Entitäten standardmäßig Oben)

Ebenenänderungen werden wirksam, wenn die Kartendaten das nächste Mal geladen werden.

---

## Tipps

- **Von Anwendungen aus starten**: Verwenden Sie den Anwendungsfilter, um Server für eine bestimmte Anwendung zu finden, dann erkunden Sie deren Verbindungen mit Tiefe=1.
- **Tiefe=0 für fokussierte Ansichten verwenden**: Wenn Sie nur Verbindungen zwischen bestimmten Servern sehen möchten, wählen Sie diese aus und setzen Sie die Tiefe auf 0.
- **Für Architekturdokumente exportieren**: Verwenden Sie den SVG-Export, um Netzwerkdiagramme für Dokumentation oder Sicherheitsprüfungen zu erstellen. Der PNG-Export erzeugt ein hochauflösendes Rasterbild.
- **Schichten für Fehlerbehebung aktivieren**: Schalten Sie „Verbindungsschichten anzeigen" ein, um genau zu sehen, wie Verbindungen mit mehreren Abschnitten durch Ihre Infrastruktur geroutet werden.
- **Rollenebenen für Architekturansichten verwenden**: Lassen Sie „Rollenbasierte Platzierung" aktiviert, wenn Sie geschichtete Architekturdiagramme präsentieren.
- **Mit Schnittstellenkarte abgleichen**: Verwenden Sie die Schaltfläche „In Schnittstellenkarte anzeigen" im Verbindungspanel, um zu sehen, welche Geschäftsschnittstellen von jeder Infrastrukturverbindung abhängen.
- **Für Klarheit ausrichten**: Nach dem Positionieren von Knoten verwenden Sie „Am Raster ausrichten" für sauberere, ausgerichtete Layouts.
- **Vor dem Export einfrieren**: Frieren Sie das Layout ein und positionieren Sie Knoten manuell, bevor Sie exportieren, für die sauberste Ausgabe.
