# Schnittstellenkarte

Die Schnittstellenkarte bietet eine interaktive Visualisierung Ihrer Anwendungsintegrationslandschaft. Anwendungen erscheinen als Knoten und Schnittstellen als verbindende Kanten und geben Ihnen einen Überblick darüber, wie Daten über Ihre Systeme fließen.

## Wo Sie es finden

Navigieren Sie zu **IT-Landschaft > Schnittstellenkarte**, um die Visualisierung zu öffnen.

**Berechtigungen**: Sie benötigen mindestens `applications:reader`, um die Karte anzuzeigen.

---

## Die Visualisierung verstehen

Die Karte verwendet ein kraftgerichtetes Graph-Layout, bei dem:

- **Knoten** Anwendungen repräsentieren
- **Kanten** Schnittstellen zwischen Anwendungen repräsentieren
- **Knotengröße** die Anzahl verbundener Schnittstellen widerspiegelt
- **Kantenbeschriftungen** den Schnittstellenidentifikator entlang jeder Verbindung anzeigen

### Business- vs. Technische Ansicht

**Business-Ansicht** (Standard):
- Blendet Middleware-Anwendungen aus
- Zeigt direkte Quelle-zu-Ziel-Beziehungen
- Am besten geeignet zum Verständnis geschäftlicher Datenflüsse

**Technische Ansicht**:
- Zeigt Middleware-Plattformen als Zwischenknoten (als Rautenform dargestellt)
- Zeigt den tatsächlichen Datenpfad (Quelle > Middleware > Ziel)
- Am besten geeignet zum Verständnis der technischen Architektur

Wechseln Sie zwischen den Ansichten mit dem Schalter **Middleware anzeigen** in der Werkzeugleiste.

---

## Filter

### Umgebung

Schnittstellen nach Bereitstellungsumgebung filtern: Production, Pre-Prod, QA, Test, Development, Sandbox. Standard ist **Production**.

### Lebenszyklus

Mehrfachauswahl-Filter für den Schnittstellen-Lebenszyklus-Status. Standard ist **Aktiv**.

### Anwendungen

Die Karte auf bestimmte Anwendungen oder Dienste fokussieren. Wenn Sie Anwendungen auswählen, wechselt der **Tiefe**-Filter automatisch von „Alle" auf „1".

### Tiefe

Begrenzen Sie, wie viele Sprünge von ausgewählten Anwendungen angezeigt werden:
- **Alle**: Alle verbundenen Knoten anzeigen
- **1--5**: Nur Knoten innerhalb von N Sprüngen der ausgewählten Anwendungen anzeigen

Middleware-Knoten zählen nicht als Sprung.

---

## Graph-Steuerungen

| Symbol | Aktion | Beschreibung |
|------|--------|-------------|
| Pause / Play | **Einfrieren / Freigeben** | Kraftsimulation anhalten, um Knoten manuell zu positionieren |
| Zentrieren | **Auto-Zentrieren** | Automatisches Zentrieren beim Auswählen von Knoten umschalten |
| Zoom + | **Hineinzoomen** | Zoomstufe erhöhen |
| Zoom − | **Herauszoomen** | Zoomstufe verringern |
| Raster | **Am Raster ausrichten** | Alle Knoten an einem Raster ausrichten |
| SVG | **SVG exportieren** | Aktuelle Ansicht als Vektorbild herunterladen |
| PNG | **PNG exportieren** | Aktuelle Ansicht als Rasterbild herunterladen |

---

## Mit der Karte interagieren

### Knoten auswählen

Klicken Sie auf einen Anwendungsknoten, um seine Verbindungen hervorzuheben und ein Detailpanel rechts zu öffnen.

### Kanten auswählen

Klicken Sie auf eine Schnittstellenkante, um Schnittstellendetails im Seitenpanel zu sehen.

### Knoten ziehen

Ziehen Sie einen Knoten, um ihn manuell neu zu positionieren.

### Deep Linking

| Parameter | Beschreibung | Beispiel |
|-----------|-------------|---------|
| `environment` | Umgebung vorauswählen | `prod`, `dev` |
| `lifecycles` | Lebenszyklus-Filter vorauswählen (kommagetrennt) | `active,planned` |
| `focusInterfaceId` | Eine bestimmte Schnittstelle hervorheben | UUID |
| `rootIds` | Anwendungen zum Fokussieren vorauswählen (kommagetrennt) | UUIDs |
| `depth` | Tiefenlimit festlegen | `1`, `2`, `all` |

---

## Das Detailpanel

### Anwendungspanel

- **Beschreibung**, **Herausgeber**, **Kritikalität**
- **Server**: Server, die diese App hosten, gruppiert nach Umgebung
- **Business-Verantwortliche** und **IT-Verantwortliche**
- **Supportinformationen**: Supportkontakte mit ihren Rollen
- **Anwendung bearbeiten**: Öffnet den Anwendungs-Arbeitsbereich

### Schnittstellenpanel

- **Kritikalität**, **Route**, **Bindungen**, **Via Middleware**
- **Endpunkte**: Für die ausgewählte Umgebung, zeigt Quell- und Zielanwendungen, Job-Namen und Endpunkt-URLs
- **Infrastrukturverbindungen**: Mit dieser Schnittstelle verknüpfte Infrastrukturverbindungen
- **Schnittstelle bearbeiten**: Öffnet den Schnittstellen-Arbeitsbereich

---

## Tipps

- **Mit Production beginnen**: Wählen Sie die Prod-Umgebung, um zuerst Ihre kritischsten Integrationen zu sehen.
- **Auf bestimmte Apps fokussieren**: Verwenden Sie den Anwendungsfilter mit Tiefe 2, um nur die Nachbarschaft einer Anwendung zu sehen.
- **Für Dokumentation exportieren**: Verwenden Sie den SVG-Export für Architekturdiagramme. Verwenden Sie PNG für Rasterbilder.
- **Für Klarheit ausrichten**: Nach dem Ziehen von Knoten verwenden Sie „Am Raster ausrichten" für sauberere Layouts.
- **Deep Link zum Teilen**: Kopieren Sie die URL nach dem Setzen von Filtern, um bestimmte Ansichten mit Kollegen zu teilen.
- **Zur Technischen Ansicht wechseln**: Bei der Fehlerbehebung aktivieren Sie die Middleware-Sichtbarkeit, um den tatsächlichen Datenpfad zu sehen.
