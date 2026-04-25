import type { OnPremContent } from './types';

const content: OnPremContent = {
  meta: {
    title: 'Autoalojar KANAP, la opción principal',
    description:
      'Ejecuta KANAP en tu propia infraestructura, bajo AGPL v3. Plataforma completa, usuarios ilimitados, tus datos nunca salen de tu entorno. Despliega en minutos con Docker Compose.',
  },

  header: {
    eyebrow: 'Autoalojado · opción principal',
    title: 'Ejecuta KANAP tú mismo.\nControla cada capa.',
    lead: 'Código abierto bajo AGPL v3. Despliega en tu infraestructura, conserva tus datos, actualiza a tu ritmo. La plataforma completa, usuarios ilimitados, todas las funcionalidades, en tus términos.',
    primaryCta: 'Desplegar desde GitHub',
    primaryHref: 'https://github.com/kanap-it/kanap',
    secondaryCta: 'Leer la doc de instalación',
    secondaryHref: 'https://doc.kanap.net/on-premise/',
  },

  why: {
    eyebrow: 'Por qué autoalojar',
    title: 'Control, cumplimiento y sin ataduras.',
    intro:
      'Autoalojar KANAP no es una versión recortada. Es la plataforma completa con todas las funcionalidades, gratis. Estos son los motivos por los que los equipos la eligen primero.',
    pillars: [
      {
        title: 'Tus datos se quedan contigo',
        body: 'Cifras de presupuesto, contratos de proveedores, paisaje de TI, todo. En tus servidores, en tu red. Ningún tercero al que confiar tus datos de gobernanza.',
      },
      {
        title: 'Sin tasa por asiento',
        body: 'Usuarios ilimitados, workspaces ilimitados, uso ilimitado de Plaid con tu clave LLM. Despliega a todo el departamento sin hoja de cálculo de precios.',
      },
      {
        title: 'Listo para cumplimiento',
        body: 'Row-level security aísla tenants. Hash Argon2. TLS en todas partes. Tu VPC, tus copias de seguridad, tu SOC.',
      },
      {
        title: 'Audita el código',
        body: 'AGPL v3 significa código abierto. Tu equipo de seguridad lo lee, tus arquitectos lo extienden, tu CISO duerme mejor.',
      },
      {
        title: 'Compatible con air-gap',
        body: 'Despliegue Docker Compose en redes restringidas. Imágenes autocontenidas, sin llamadas salientes obligatorias para funciones básicas.',
      },
      {
        title: 'Tu ritmo',
        body: 'Fija una versión, prueba una release menor, migra en tu ventana de cambios. Sin actualizaciones forzadas, sin caídas sorpresa.',
      },
    ],
  },

  license: {
    title: 'AGPL v3: apertura sin concesiones',
    body:
      'KANAP se publica bajo GNU Affero General Public License v3. Todas las libertades clásicas de código abierto: usarla, leerla, modificarla, distribuirla. La cláusula copyleft asegura que quien ejecute una versión modificada como servicio debe compartir sus cambios, así el proyecto se mantiene realmente abierto.',
    bullets: [
      'Uso comercial, interno o externo, sin regalías, sin recuento de asientos',
      'Lectura y auditoría del código completo, nada oculto',
      'Modificación y extensión, el código es tuyo',
      'Contribución, tus mejoras benefician a toda la comunidad',
    ],
    linkLabel: 'Leer la licencia AGPL v3',
    linkHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  },

  deploy: {
    eyebrow: 'Instalación en minutos',
    title: 'Un solo prompt.\nQuince minutos.',
    intro:
      'Un agente IA de programación lee nuestra documentación, instala todas las dependencias y configura toda la pila — Docker, PostgreSQL 16, MinIO, nginx, Let\'s Encrypt — sobre un servidor Ubuntu limpio. Pegas un prompt, confirmas cada paso y entras.',
    steps: [
      {
        title: 'Preparar un servidor limpio',
        body: 'Un servidor Ubuntu 24.04 LTS recién aprovisionado con acceso sudo, un registro DNS A apuntando tu hostname al servidor, y acceso a Internet saliente para paquetes y Let\'s Encrypt. Instala tu agente IA de programación en el servidor (Claude Code, Codex o equivalente).',
      },
      {
        title: 'Activar sudo sin contraseña temporalmente',
        body: 'Para que el agente no te pida la contraseña en cada paso. Lo revertirás al final.',
        code: 'echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/90-install-nopasswd',
      },
      {
        title: 'Pegar el prompt de instalación',
        body: 'Abre tu agente y pega la plantilla de prompt de nuestra doc — rellena tu hostname, email de admin y (opcionalmente) tu transporte de email (Resend o SMTP). El agente lee las páginas de instalación enlazadas, instala Docker, PostgreSQL 16 con las extensiones necesarias, MinIO, nginx y certbot, clona KANAP en /opt/kanap, genera credenciales fuertes, construye las imágenes y arranca los contenedores. También configura TLS y la renovación automática. El agente pide confirmación antes de cada comando.',
      },
      {
        title: 'Iniciar sesión y reforzar',
        body: 'Inicia sesión en tu hostname con las credenciales admin generadas, cambia la contraseña y elimina la entrada temporal de sudo sin contraseña. Listo. El log completo de instalación queda guardado en ~/kanap-install.md.',
      },
    ],
    docsCtaLabel: 'Guía de instalación asistida por IA',
    docsHref: 'https://doc.kanap.net/on-premise/installation-ai/',
    manualOption: {
      label: '¿Prefieres el control total?',
      title: 'Instalación manual: tu stack, a tu manera.',
      body: 'Trae tu propio PostgreSQL, tu almacenamiento compatible con S3 y tu reverse proxy. Ejecuta en cualquier Linux compatible con Docker. Encaja KANAP en la arquitectura que ya operas, con la configuración que se ajusta a tu entorno. Misma plataforma, mismo código, cada decisión en tus manos.',
      ctaLabel: 'Guía de instalación manual',
      ctaHref: 'https://doc.kanap.net/on-premise/installation/',
    },
  },

  requirements: {
    title: 'Lo que necesitas',
    intro: 'Requisitos modestos para una plataforma que gestiona todo el departamento de TI.',
    items: [
      { label: 'SO', value: 'Cualquier Linux con Docker (Ubuntu 22+, Debian 12+, RHEL 9+ recomendados)' },
      { label: 'CPU', value: '2 vCPU mínimo · 4+ recomendadas para 50+ usuarios' },
      { label: 'RAM', value: '4 GB mínimo · 8 GB recomendados' },
      { label: 'Almacenamiento', value: '20 GB para la plataforma + el crecimiento de tus datos' },
      { label: 'Base de datos', value: 'PostgreSQL 15+ (incluida en Compose o externa)' },
      { label: 'Red', value: 'Terminador HTTPS a tu elección, nginx, Traefik, LB cloud' },
      { label: 'Saliente (opcional)', value: 'API World Bank FX para tasas en vivo · proveedor LLM para Plaid' },
    ],
  },

  operations: {
    title: 'Operar KANAP',
    intro: 'Pensada para operarse como cualquier otro servicio interno.',
    items: [
      {
        title: 'Actualizaciones en tu calendario',
        body: 'Fija una versión, prueba una release en pre-prod, aplica en tu ventana de cambios. Las migraciones corren al arranque, son idempotentes.',
      },
      {
        title: 'Las copias son un dump postgres',
        body: 'Tooling estándar. Programa pg_dump con tu pipeline de backup existente. Los archivos son mínimos y se pueden snapshotear aparte.',
      },
      {
        title: 'La observabilidad que ya tienes',
        body: 'Los contenedores emiten logs estructurados y endpoints de salud. Apunta tu stack existente a ellos (Prometheus, Loki, Datadog, lo que ya uses).',
      },
      {
        title: 'Branding incluido',
        body: 'Sube tu logo, ajusta el color primario. La página admin de branding funciona igual en autoalojado que en cloud.',
      },
      {
        title: 'SSO vía Entra ID',
        body: 'El SSO corporativo es parte de la plataforma, no un upsell. Configurable desde la consola de admin.',
      },
      {
        title: 'Plaid, a tu manera',
        body: 'Clave LLM propia, OpenAI, Anthropic, Ollama o cualquier endpoint compatible con OpenAI. Tus prompts nunca salen de tu proveedor.',
      },
    ],
  },

  support: {
    title: '¿Necesitas ayuda prioritaria?',
    body:
      'El plan Soporte autoalojado añade soporte por email prioritario, ayuda en instalación, desbloqueo BYOK de Plaid y 20 % de descuento en consultoría, sin cambiar el modelo de despliegue.',
    bullets: [
      'Soporte por email prioritario (humanos reales, respuesta best-effort)',
      'Ayuda con instalación y actualizaciones',
      '20 % de descuento en todos los servicios de consultoría',
      '2 490 €/año, facturación anual',
    ],
    ctaLabel: 'Ver precios',
    ctaHref: '/offer',
  },

  cta: {
    title: '¿Listo para autoalojar?',
    body: 'Clona el repo y arranca la pila en menos de diez minutos. Sin cuenta, sin cuenta atrás, solo código abierto.',
    primary: 'Desplegar desde GitHub',
    secondary: 'Habla con nosotros',
  },
};

export default content;
