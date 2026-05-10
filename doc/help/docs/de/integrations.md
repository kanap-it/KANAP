# Integrationen

Verwenden Sie die Integrationsseite, um KANAP mit Drittanbieter-Tools zu verbinden, die die in der Plattform bereits verwalteten Daten ergänzen. Heute konzentriert sich die Seite auf den **GLPI-Ticketimport** über Plaid; weitere Integrationen werden hier im Laufe der Zeit hinzugefügt.

## Wo Sie es finden

- Arbeitsbereich: **Administration**
- Pfad: **Administration → Integrationen**
- Route: `/admin/integrations`
- Berechtigung: `ai_settings:admin`
- Feature-Flag: teilt sich dieselbe `ai_settings`-Oberfläche wie die Plaid-Einstellungsseite. Wenn die Oberfläche deaktiviert ist, erscheint der Eintrag nicht in der Seitenleiste.

## GLPI-Integration

[GLPI](https://glpi-project.org/) ist ein beliebtes Open-Source-IT-Service-Management-Tool. Die Integration ermöglicht es Ihrem Team, Plaid zu bitten, Tickets in GLPI zu finden und die relevanten als Aufgaben in KANAP zu importieren, mit einem Bestätigungsschritt bei jedem Import.

### Wie es funktioniert

1. Ein Endbenutzer fragt Plaid etwa: „Importiere die offenen GLPI-Tickets, die meinem Team zugewiesen sind."
2. Plaid fragt GLPI über die hier konfigurierten Anmeldedaten ab.
3. Die Kandidaten-Tickets werden als Vorschau im Chat zurückgegeben.
4. Der Benutzer überprüft die Vorschau und klickt für die Tickets, die er in KANAP übernehmen möchte, auf **Genehmigen**.
5. KANAP erstellt eine Aufgabe pro genehmigtem Ticket.

Ohne diese ausdrückliche Genehmigung wird nichts in KANAP geschrieben, sodass Administratoren die Integration an Endbenutzer übergeben können, ohne sich um stille Datenänderungen sorgen zu müssen.

### Voraussetzungen

- **Plaid-Chat muss aktiviert sein** auf Ihrem Mandanten. Die Seite zeigt einen Info-Tooltip neben dem Abschnittstitel an, um Sie an diese Abhängigkeit zu erinnern. Die Integration wird mandantenweise konfiguriert; die unten stehenden Anmeldedaten verlassen niemals Ihren Mandanten.
- Eine GLPI-Instanz, die von KANAP über HTTPS erreichbar ist.
- Ein **User Token** für ein GLPI-Benutzerkonto, das Lesezugriff auf die Tickets hat, die Sie offenlegen möchten.
- Ein optionales **App Token**, falls Ihre GLPI-Instanz eine Authentifizierung auf Anwendungsebene erfordert.

### Felder

Das Konfigurationsformular enthält:

- **GLPI-Ticketimport aktivieren** – Hauptschalter für die Integration. Wenn deaktiviert, wird Plaid nicht versuchen, GLPI abzufragen, selbst wenn Anmeldedaten festgelegt sind.
- **GLPI-URL** – die Basis-URL Ihrer GLPI-Instanz, zum Beispiel `https://glpi.example.com`.
- **User Token** – das persönliche API-Token des GLPI-Kontos, das Plaid verwenden wird. Vorhandene Token sind maskiert; lassen Sie das Feld bei einem Speicher- oder Testvorgang leer, um den gespeicherten Wert beizubehalten.
- **App Token** – das optionale GLPI-Anwendungstoken. Gleiches „leer-lassen-um-beizubehalten"-Verhalten wie beim User Token.

### Aktionen

- **Einstellungen speichern** – speichert das Formular. Im Formular eingegebene Token ersetzen die gespeicherten; leere Tokenfelder behalten das Gespeicherte bei.
- **Verbindung testen** – führt einen authentifizierten Round-Trip gegen die GLPI-URL unter Verwendung der Werte im Formular durch (oder, wo leer, der gespeicherten Werte). Das Ergebnisbanner zeigt Erfolg oder den zugrunde liegenden Fehler zusammen mit der Latenz.

### Geheimnisspeicher

Wenn Ihre KANAP-Instanz keinen konfigurierten Geheimnisspeicher hat, erscheint unter jedem Tokenfeld ein Hilfetext, der Sie warnt, dass die Werte nicht persistiert werden können. Konfigurieren Sie den Geheimnisspeicher auf Instanzebene, bevor Sie sich in der Produktion auf diese Integration verlassen.

## Tipps

- **Verwenden Sie ein dediziertes GLPI-Konto**: Erstellen Sie ein Servicekonto in GLPI mit gerade so vielen Berechtigungen, um die Ticketkategorien zu lesen, die Sie offenlegen möchten. Das hält das Audit-Protokoll sauber und ermöglicht es Ihnen, den Zugriff zu widerrufen, ohne einen echten Benutzer zu beeinträchtigen.
- **Vor der Ankündigung testen**: Führen Sie nach jeder Änderung der URL oder der Token **Verbindung testen** aus. Die Fehlermeldung ist weitaus aussagekräftiger als ein Fehler, der innerhalb der Chat-Konversation einer Person auftaucht.
- **Mit Plaid-Berechtigungen koppeln**: Nur Benutzer mit `ai_chat:reader` können Plaid bitten, Tickets zu importieren. Kombinieren Sie das mit rollenbasiertem Zugriff auf Aufgaben, wenn Sie einschränken möchten, wer tatsächlich Aufgabendatensätze aus den Importen erstellt.
- **Planen Sie die Token-Rotation**: Persönliche GLPI-Token können neu generiert werden. Wenn Sie das tun, speichern Sie hier den neuen Wert und führen Sie den Verbindungstest aus, bevor Benutzer die Integration erneut nutzen.
