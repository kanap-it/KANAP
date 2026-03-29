# On-Premise: Microsoft Entra SSO-Einrichtung

Dieser Leitfaden erklärt, wie Sie Microsoft Entra (Azure AD) SSO für eine On-Premise KANAP-Bereitstellung aktivieren.
Entra SSO ist optional; wenn Sie es nicht konfigurieren, bleibt die lokale E-Mail/Passwort-Authentifizierung verfügbar.

## Übersicht

KANAP verwendet den OAuth2/OIDC-Autorisierungscode-Flow als vertraulicher Client.
Jeder On-Premise-Kunde **muss seine eigene Entra-Anwendung registrieren** und deren Client-ID/Secret bereitstellen.

### Was der Kunde bereitstellt

- Eine Entra App-Registrierung **in seinem Mandanten**
- `ENTRA_CLIENT_ID` und `ENTRA_CLIENT_SECRET`
- `ENTRA_AUTHORITY`, die auf seinen Mandanten zeigt
- `ENTRA_REDIRECT_URI`, die mit seiner KANAP-URL übereinstimmt

## Voraussetzungen

- Eine öffentliche HTTPS-URL für KANAP (Reverse Proxy vor der API)
- Fähigkeit, eine App-Registrierung zu erstellen und Admin-Zustimmung in Entra zu erteilen
- Ausgehende Konnektivität vom KANAP-API-Container zu:
  - `login.microsoftonline.com` (OIDC-Metadaten, Token-Austausch, JWKS)
  - `graph.microsoft.com` (optionale Profilanreicherung)

## Schritt 1: App-Registrierung erstellen (Entra)

1. Öffnen Sie **Microsoft Entra ID > App-Registrierungen > Neue Registrierung**
2. Name: `KANAP (On-Prem)`
3. Unterstützte Kontotypen: **Einzelner Mandant** (empfohlen)
4. Umleitungs-URI (Web):
   `https://<ihre-kanap-domain>/api/auth/entra/callback`
5. Speichern und notieren:
   - **Anwendungs-ID (Client-ID)**
   - **Verzeichnis-ID (Mandanten-ID)**

## Schritt 2: Client-Secret erstellen

1. Gehen Sie zu **Zertifikate & Geheimnisse**
2. Erstellen Sie ein neues **Client-Secret**
3. Kopieren Sie den **Secret-Wert** (wird nur einmal angezeigt)

## Schritt 3: API-Berechtigungen

KANAP fordert während der Entra-Anmeldung folgende Bereiche an:

- `openid profile email offline_access`
- `User.Read` (Microsoft Graph, für Profilanreicherung)

Stellen Sie sicher, dass **Microsoft Graph > User.Read (Delegiert)** erlaubt ist, und erteilen Sie bei Bedarf Admin-Zustimmung.

Wenn Sie Graph-Aufrufe nicht zulassen möchten, setzen Sie:

```
ENTRA_ENRICH_PROFILE=false
```

## Schritt 4: KANAP-Umgebungsvariablen konfigurieren

Setzen Sie Folgendes in Ihrer On-Premise `.env`:

```bash
# Entra SSO (On-Prem)
ENTRA_CLIENT_ID=<anwendungs-client-id>
ENTRA_CLIENT_SECRET=<client-secret>
ENTRA_AUTHORITY=https://login.microsoftonline.com/<mandanten-id>
ENTRA_REDIRECT_URI=https://kanap.firma.de/api/auth/entra/callback
```

Hinweise:
- `ENTRA_AUTHORITY` sollte für On-Premise **mandantenspezifisch** sein.
- `ENTRA_REDIRECT_URI` muss **exakt** mit dem übereinstimmen, was Sie in Entra registriert haben.
- Stellen Sie sicher, dass `APP_BASE_URL` auf die öffentliche URL gesetzt ist, damit die Post-Login-Umleitung korrekt funktioniert.

## Schritt 5: KANAP neustarten

Nach der Aktualisierung von `.env` starten Sie Ihre Container neu, damit die API die neue Konfiguration übernimmt.

## Schritt 6: Entra in KANAP verbinden

1. Als Admin anmelden
2. Gehen Sie zu **Administration > Authentifizierung**
3. Klicken Sie auf **Microsoft Entra verbinden**
4. Zustimmung in Entra erteilen
5. Verwenden Sie **Anmeldung testen**, um die End-to-End-Anmeldung zu bestätigen

## Fehlerbehebung

- **SSO_NOT_CONFIGURED**: Entra-Umgebungsvariablen fehlen oder Mandant ist nicht verbunden.
- **ENTRA_TENANT_MISMATCH**: Sie haben einen Mandanten verbunden, versuchen sich aber von einem anderen anzumelden.
- **Invalid Entra state / nonce**: Cookie blockiert oder HTTPS falsch konfiguriert.
- **Fehlerhafte Umleitung nach Anmeldung**: Prüfen Sie `APP_BASE_URL` und Reverse-Proxy-Header (`Host`, `X-Forwarded-Proto`).

## Sicherheitshinweise

- Committen Sie `ENTRA_CLIENT_SECRET` nie in Git.
- Rotieren Sie das Secret regelmäßig.
- Verwenden Sie eine dedizierte App-Registrierung.
