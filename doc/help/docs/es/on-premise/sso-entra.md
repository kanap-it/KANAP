# Despliegue local: Configuración de SSO con Microsoft Entra

Esta guía explica cómo habilitar SSO con Microsoft Entra (Azure AD) para un despliegue local de KANAP.
El SSO con Entra es opcional; si no lo configura, la autenticación local con correo/contraseña sigue disponible.

## Descripción general

KANAP usa el flujo de código de autorización OAuth2/OIDC como cliente confidencial.
Cada cliente local **debe registrar su propia aplicación Entra** y proporcionar su ID de cliente/secreto.

### Lo que proporciona el cliente

- Un registro de aplicación Entra **en su inquilino**
- `ENTRA_CLIENT_ID` y `ENTRA_CLIENT_SECRET`
- `ENTRA_AUTHORITY` apuntando a su inquilino
- `ENTRA_REDIRECT_URI` que coincida con su URL de KANAP

## Requisitos previos

- Una URL HTTPS pública para KANAP (proxy inverso delante de la API)
- Capacidad de crear un registro de aplicación y otorgar consentimiento de administrador en Entra
- Conectividad de salida desde el contenedor de la API de KANAP a:
  - `login.microsoftonline.com` (metadatos OIDC, intercambio de tokens, JWKS)
  - `graph.microsoft.com` (enriquecimiento opcional de perfil)

## Paso 1: Crear un registro de aplicación (Entra)

1. Abra **Microsoft Entra ID > Registros de aplicaciones > Nuevo registro**
2. Nombre: `KANAP (local)`
3. Tipos de cuenta soportados: **Inquilino único** (recomendado)
4. URI de redirección (Web):
   `https://<su-dominio-kanap>/api/auth/entra/callback`
5. Guarde y anote:
   - **ID de aplicación (cliente)**
   - **ID de directorio (inquilino)**

## Paso 2: Crear un secreto de cliente

1. Vaya a **Certificados y secretos**
2. Cree un nuevo **Secreto de cliente**
3. Copie el **valor del secreto** (se muestra solo una vez)

## Paso 3: Permisos de API

KANAP solicita los siguientes ámbitos durante el inicio de sesión con Entra:

- `openid profile email offline_access`
- `User.Read` (Microsoft Graph, para enriquecimiento de perfil)

Asegúrese de que **Microsoft Graph > User.Read (Delegado)** está permitido y otorgue consentimiento de administrador si es necesario.

Si prefiere no permitir llamadas a Graph, establezca:

```
ENTRA_ENRICH_PROFILE=false
```

## Paso 4: Configurar las variables de entorno de KANAP

Establezca lo siguiente en su `.env` local:

```bash
# SSO Entra (local)
ENTRA_CLIENT_ID=<id-de-cliente-de-la-aplicacion>
ENTRA_CLIENT_SECRET=<secreto-de-cliente>
ENTRA_AUTHORITY=https://login.microsoftonline.com/<id-de-inquilino>
ENTRA_REDIRECT_URI=https://kanap.empresa.com/api/auth/entra/callback
```

Notas:
- `ENTRA_AUTHORITY` debe ser **específico del inquilino** para despliegue local.
- `ENTRA_REDIRECT_URI` debe coincidir **exactamente** con lo que registró en Entra.
- Asegúrese de que `APP_BASE_URL` esté establecido a la URL pública para que la redirección posterior al inicio de sesión sea correcta.

## Paso 5: Reiniciar KANAP

Después de actualizar `.env`, reinicie sus contenedores para que la API recoja la nueva configuración.

## Paso 6: Conectar Entra en KANAP

1. Inicie sesión como administrador
2. Vaya a **Administración > Autenticación**
3. Haga clic en **Conectar Microsoft Entra**
4. Apruebe el consentimiento en Entra
5. Use **Probar inicio de sesión** para confirmar el inicio de sesión de extremo a extremo

## Solución de problemas

- **SSO_NOT_CONFIGURED**: Faltan las variables de entorno de Entra o el inquilino no está conectado.
- **ENTRA_TENANT_MISMATCH**: Conectó un inquilino pero está intentando iniciar sesión desde otro.
- **Invalid Entra state / nonce**: Cookie bloqueada o HTTPS mal configurado.
- **Mala redirección después del inicio de sesión**: Verificar `APP_BASE_URL` y cabeceras del proxy inverso (`Host`, `X-Forwarded-Proto`).

## Notas de seguridad

- No incluya `ENTRA_CLIENT_SECRET` en git.
- Rote el secreto periódicamente.
- Use un registro de aplicación dedicado.
