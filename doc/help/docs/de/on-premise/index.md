# On-Premise-Bereitstellung

KANAP kann On-Premise im **Single-Tenant-Modus** bereitgestellt werden. Sie stellen Ihr eigenes PostgreSQL, S3-kompatiblen Speicher und TLS-Reverse-Proxy bereit. KANAP kümmert sich um den Rest: Migrationen laufen automatisch, der Mandant und Admin-Benutzer werden beim ersten Start erstellt, und ein großzügiges Platzlimit (1.000) ist vorkonfiguriert.

## Leitfäden

- **[Installation](installation.md):** Klonen, Bauen, Konfigurieren und Starten
- **[Installationsbeispiel](installation-example.md):** Schritt-für-Schritt-Anleitung auf Ubuntu 24.04 mit PostgreSQL, MinIO und nginx
- **[KI-gestützte Installation](installation-ai.md):** Installation mit einem einzigen Prompt über einen KI-Programmieragenten
- **[Konfiguration](configuration.md):** Umgebungsvariablen-Referenz
- **[Betrieb](operations.md):** Upgrades, Backups, Monitoring, Fehlerbehebung
- **[Microsoft Entra SSO](sso-entra.md):** Optionales Single Sign-On mit Microsoft Entra ID

## Was enthalten ist

- Volle Anwendungsfunktionalität (Budgets, Verträge, Portfolio, IT-Betrieb, Berichte)
- Automatische Datenbankmigrationen beim Start
- Erststart-Bereitstellung (Mandant, Admin-Benutzer, Abonnement)
- Lokale Benutzername/Passwort-Authentifizierung (keine externen Abhängigkeiten)
- Optionaler E-Mail-Versand über Resend API oder kundeneigenen SMTP
- Optionales Microsoft Entra SSO

## Was deaktiviert ist

- **Abrechnung / Stripe:** Automatisch deaktiviert (keine Abonnementverwaltung nötig)
- **Plattform-Admin:** Nur Single-Tenant, keine Multi-Tenant-Verwaltungsoberflächen
- **Test- / Support-Rechnungsendpunkte:** Nicht zutreffend für On-Premise

## Kurzhinweise

- `DEPLOYMENT_MODE=single-tenant` ist der einzige Schalter, der den On-Premise-Modus aktiviert.
- `APP_BASE_URL` muss Ihrer öffentlichen URL für E-Mail-Links und Exporte entsprechen.
- Für ausgehende E-Mail wählen Sie entweder **Resend** oder **SMTP**. SMTP ist nur für Single-Tenant/On-Premise-Bereitstellungen vorgesehen.
- Das Backend gibt strukturierte `FEATURE_DISABLED`-Antworten für deaktivierte Funktionen zurück -- die Benutzeroberfläche blendet sie automatisch aus.
