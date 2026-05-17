import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Precios',
    description:
      'Gratis y de código abierto. Autoalojamiento sin límites, soporte cuando lo necesites o KANAP alojado. Todas las funcionalidades en todos los planes. AGPL v3.',
  },

  header: {
    eyebrow: 'Precios simples y transparentes',
    title: 'Gratis y de código abierto.\nAutoaloja, o déjanos gestionarla.',
    lead: 'Todas las funcionalidades en cada plan. Sin restricciones, sin impuesto por usuario, sin bloqueo. Solo pagas por las operaciones y el soporte que no quieres llevar tú.',
  },

  selfHosted: {
    eyebrow: 'Autoalojado · la opción principal',
    title: 'Ejecuta KANAP tú mismo.\nGratis para siempre.',
    intro:
      'La plataforma completa bajo AGPL v3. Despliega en tu propia infraestructura, conserva tus datos, actualiza a tu ritmo. Soporte de pago opcional si quieres ayuda prioritaria sin renunciar al control.',
    plans: [
      {
        name: 'Autoalojado',
        badge: 'Gratis para siempre',
        target: 'Usuarios ilimitados · workspaces ilimitados',
        price: '0 €',
        period: '',
        features: [
          'Todas las funcionalidades incluidas',
          'Contribuidores ilimitados',
          'Soporte comunitario vía GitHub issues',
          'Bajo licencia AGPL v3: lee, modifica, contribuye',
          'Despliegue Docker Compose en minutos',
          'Tus datos permanecen en tu infraestructura',
        ],
        ctaLabel: 'Desplegar desde GitHub',
        ctaHref: 'https://github.com/kanap-it/kanap',
        ctaVariant: 'primary',
        featured: true,
      },
      {
        name: 'Soporte autoalojado',
        badge: 'Cumplimiento y control',
        target: 'Usuarios ilimitados · workspaces ilimitados',
        price: '2 490 €',
        period: '/año',
        features: [
          'Todo lo incluido en Autoalojado',
          'Soporte por email prioritario',
          '20 % de descuento en consultoría',
          'Plaid, clave propia',
          'Ayuda para la instalación',
          'Facturación anual únicamente',
        ],
        ctaLabel: 'Suscribirse',
        ctaHref: '/contact',
        ctaVariant: 'ghost',
      },
    ],
  },

  openSourceBanner: {
    title: 'Realmente código abierto, AGPL v3',
    body:
      'Todo el código fuente de KANAP está en GitHub. Léelo, audítalo, amplíalo, contribuye. AGPL v3 garantiza que el código siga abierto, para todos. Sin forks propietarios, sin bloqueo.',
    linkLabel: 'Leer la licencia',
    linkHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  },

  cloud: {
    eyebrow: 'Nube · si prefieres que lo gestionemos',
    title: 'La misma plataforma, operada por nosotros.',
    intro:
      'KANAP alojado es la misma plataforma open source, operada por nosotros: hosting, actualizaciones, copias de seguridad, soporte prioritario y una sesión de activación de 60 min gratuita. Prueba de 14 días, sin tarjeta.',
    plans: [
      {
        name: 'KANAP alojado',
        badge: 'Operado por nosotros',
        target: 'Usuarios ilimitados · workspaces ilimitados',
        price: '249 €',
        period: '/mes',
        subPrice: 'o 2 490 €/año (2 meses gratis)',
        features: [
          'Todas las funcionalidades incluidas',
          'Contribuidores y lectores ilimitados',
          'Hosting cloud y actualizaciones automáticas',
          'Copias de seguridad gestionadas',
          '2 500 mensajes Plaid/mes incluidos',
          'Plaid, clave propia',
          'Sesión de activación 60 min gratis',
          'Soporte por email prioritario',
          '20 % de descuento en consultoría',
        ],
        ctaLabel: 'Empezar prueba gratuita',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
        featured: true,
      },
    ],
  },

  howToChoose: {
    title: 'Cómo elegir',
    intro: 'Elige según quién lleva las operaciones. Todos los planes incluyen todas las funcionalidades del producto.',
    items: [
      {
        title: 'Autoalojado · gratis',
        body: 'Tienes capacidad de TI y quieres el control total. La mejor relación calidad-precio, sin ataduras. Soporte comunitario.',
      },
      {
        title: 'Autoalojado · con soporte',
        body: 'Necesitas el modelo autoalojado por cumplimiento o privacidad, pero quieres soporte prioritario y descuentos en consultoría.',
      },
      {
        title: 'Hosting cloud',
        body: 'Quieres el camino más corto al valor sin operar infraestructura. El mismo producto, operado por KANAP.',
      },
    ],
  },

  services: {
    title: 'Ayuda experta, cuando la quieras',
    intro: 'KANAP está diseñado para adopción self-service. Si quieres ir más rápido, las ofertas de pago incluyen soporte prioritario y 20 % de descuento en consultoría.',
    support: {
      title: 'Soporte prioritario',
      subtitle: 'Incluido con cualquier plan de pago',
      body: 'Mantenemos todo funcionando. Personas reales, tiempos razonables, sin teatro de SLA.',
      items: [
        'Bugs, errores, caídas, problemas de acceso',
        'Ayuda con la instalación on-premise',
        'Preguntas "¿es el comportamiento esperado?"',
        'Aclaraciones rápidas',
      ],
    },
    consulting: {
      title: 'Consultoría',
      subtitle: 'De pago · 20 % de descuento para suscriptores',
      body: 'Ayuda opcional para sacar más valor de KANAP: llamadas programadas, trabajo profundo, advisory.',
      items: [
        'Instalación, configuración, onboarding, formación',
        'Diseño de flujos y buenas prácticas',
        'Advisory CIO sobre tu modelo de gobernanza de TI',
        'Cualquier cosa que requiera una llamada programada',
      ],
    },
  },

  rates: {
    title: 'Tarifas de consultoría opcional',
    intro: 'Precios transparentes para equipos que quieren ayuda experta. Los suscriptores siempre tienen 20 % de descuento.',
    headings: {
      duration: 'Duración',
      useCases: 'Casos de uso',
      rate: 'Tarifa',
      subscriber: 'Suscriptor',
    },
    rows: [
      {
        duration: '1 hora',
        useCases: 'Troubleshooting, preguntas concretas, consejo rápido',
        rate: '190 €',
        subscriber: '150 €',
      },
      {
        duration: 'Media jornada (4h)',
        useCases: 'Onboarding, formación, taller de configuración',
        rate: '690 €',
        subscriber: '550 €',
      },
      {
        duration: 'Jornada completa (8h)',
        useCases: 'Formación de equipos grandes, consultoría profunda, advisory CIO',
        rate: '1 250 €',
        subscriber: '1 000 €',
      },
    ],
    note: 'Tarifas por sesión, sin IVA. Gastos de viaje facturados aparte si se requiere presencia.',
  },

  faqTeaser: {
    title: 'Preguntas frecuentes',
    body: 'Licencia, autoalojamiento, cloud, Plaid, soporte y facturación. Todas las respuestas.',
    ctaLabel: 'Leer las FAQ',
  },

  cta: {
    title: '¿Listo para empezar?',
    body:
      'Despliega KANAP tú mismo gratis, o prueba la versión alojada si quieres que la operemos nosotros.',
    primary: 'Desplegar gratis',
    secondary: 'Probar nube alojada',
  },
};

export default content;
