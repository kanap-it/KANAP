# Despliegue local

KANAP puede desplegarse de forma local en **modo de inquilino único**. Usted proporciona su propia base de datos PostgreSQL, almacenamiento compatible con S3 y proxy inverso con TLS. KANAP se encarga de todo lo demás: las migraciones se ejecutan automáticamente, el espacio de trabajo y el usuario administrador se crean en el primer arranque, y un límite generoso de puestos (1.000) viene preconfigurado.

## Guías

- **[Instalación](installation.md):** Clonar, construir, configurar e iniciar
- **[Ejemplo de instalación](installation-example.md):** Guía paso a paso en Ubuntu 24.04 con PostgreSQL, MinIO y nginx
- **[Configuración](configuration.md):** Referencia de variables de entorno
- **[Operaciones](operations.md):** Actualizaciones, copias de seguridad, monitorización, solución de problemas
- **[SSO con Microsoft Entra](sso-entra.md):** Inicio de sesión único opcional con Microsoft Entra ID

## Qué incluye

- Funcionalidad completa de la aplicación (presupuestos, contratos, portafolio, operaciones IT, informes)
- Migraciones de base de datos automáticas al iniciar
- Aprovisionamiento en el primer arranque (espacio de trabajo, usuario administrador, suscripción)
- Autenticación local con nombre de usuario/contraseña (sin dependencias externas)
- Correo electrónico opcional vía API de Resend o SMTP gestionado por el cliente
- SSO opcional con Microsoft Entra

## Qué está deshabilitado

- **Facturación / Stripe:** Deshabilitado automáticamente (no se necesita gestión de suscripciones)
- **Administración de plataforma:** Solo inquilino único, sin superficies de gestión multi-inquilino
- **Endpoints de prueba / facturación de soporte:** No aplicables a despliegue local

## Notas rápidas

- `DEPLOYMENT_MODE=single-tenant` es el único interruptor que activa el modo local.
- `APP_BASE_URL` debe coincidir con su URL pública para enlaces de correo y exportaciones.
- Para correo saliente, elija **Resend** o **SMTP**. SMTP está destinado únicamente a despliegues de inquilino único/locales.
- El backend retorna respuestas estructuradas `FEATURE_DISABLED` para funcionalidades deshabilitadas — la interfaz las oculta automáticamente.
