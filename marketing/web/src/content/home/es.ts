import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'La plataforma de gobernanza de TI de código abierto',
    description:
      'Presupuesto, arquitectura empresarial, portafolio y conocimiento en una plataforma con IA. Creada por un CIO. Código abierto bajo AGPL v3. Autoalojamiento gratuito o nube desde 49 €/mes.',
  },

  hero: {
    eyebrow: 'Aporta claridad a tu departamento de TI',
    title: 'La plataforma de gobernanza de TI de código abierto.',
    lead: 'Presupuesto, arquitectura, portafolio y conocimiento en una sola plataforma, con Plaid, el asistente de IA integrado. Autoaloja o déjanos gestionarla.',
    primaryCta: 'Empezar prueba gratuita',
    secondaryCta: 'Explorar funcionalidades',
    trialNote: 'Prueba de 14 días · sin tarjeta · sesión de activación gratuita.',
  },

  pillars: {
    eyebrow: 'Por qué KANAP',
    title: 'Pensada distinto.\nPrecio justo.',
    items: [
      {
        title: 'Creada por profesionales',
        body: 'Diseñada por un veterano de TI con experiencia real en distintas industrias. Resuelve problemas reales de TI. Encaja en cualquier sector.',
      },
      {
        title: 'Simple y potente',
        body: 'Cero teatro de complejidad. Lo bastante potente para problemas difíciles. Lo bastante simple para adoptarla hoy.',
      },
      {
        title: 'Realmente código abierto',
        body: 'AGPL v3. Código fuente completo en GitHub. Autoalojamiento gratuito, abierto a contribuciones. Sin bloqueo de proveedor, sin sorpresas. Si desaparecemos mañana, tu plataforma sigue siendo tuya.',
      },
    ],
  },

  modules: {
    eyebrow: 'Caja de herramientas de TI completa',
    title: 'Cinco módulos integrados.\nUna fuente de verdad.',
    intro:
      'KANAP cubre todo lo que un departamento de TI necesita, desde la primera línea de presupuesto hasta la última aplicación retirada, con un asistente de IA que lee todos tus datos de forma transversal.',
    items: [
      {
        slug: '/features/budget',
        title: 'Gestión de presupuesto',
        blurb:
          'Controla tu presupuesto de TI con planificación plurianual, asignaciones inteligentes e informes de repercusión ejecutivos. OPEX y CAPEX con visibilidad completa.',
        bullets: [
          'Planificación plurianual',
          'Seis métodos de asignación',
          'Multidivisa con tasas del Banco Mundial',
          'Informes de repercusión ejecutivos',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/it-landscape',
        title: 'Paisaje de TI',
        blurb:
          'Documenta tu sistema de información: aplicaciones, interfaces, infraestructura. Visualiza tu arquitectura con mapas interactivos.',
        bullets: [
          'Portafolio de aplicaciones con instancias por entorno',
          'Documentación de interfaces con middleware de 3 tramos',
          'Registro de servidores e infraestructura',
          'Mapas interactivos de interfaces y conexiones',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/portfolio',
        title: 'Gestión de portafolio',
        blurb:
          'De la demanda a la entrega: puntúa las solicitudes, genera hojas de ruta conscientes de la capacidad, aplica fechas con confianza.',
        bullets: [
          'Puntuación de solicitudes con criterios ponderados',
          'Planificación automática de hoja de ruta',
          'Análisis de cuellos de botella y ocupación',
          'Seguimiento del ciclo de vida del proyecto',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/knowledge',
        title: 'Conocimiento',
        blurb:
          'Gobierna tu documentación de TI con un editor markdown, bibliotecas estructuradas y flujos de revisión. Vincula documentos con todo.',
        bullets: [
          'Editor markdown con flujos de revisión',
          'Bibliotecas, carpetas, tipos de documento',
          'Historial de versiones y exportación a PDF, DOCX, ODT',
          'Enlaces profundos a aplicaciones, proyectos, activos, tareas',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/ai',
        title: 'Plaid, Asistente de IA',
        blurb:
          'Pregúntale a Plaid sobre tus datos. Crea documentos, actualiza tareas, conecta tus herramientas de IA mediante MCP.',
        bullets: [
          'Consultas en lenguaje natural en todos los módulos',
          'Acciones sobre documentos y tareas con vista previa',
          'Servidor MCP para Claude, Cursor, Windsurf…',
          'Uso gratuito incluido en planes cloud, o usa tu propia clave',
        ],
        ctaLabel: 'Más información',
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Listo para empresas',
    title: 'Todo conectado.\nSiempre bajo control.',
    intro:
      'Cinco módulos trabajan sobre los mismos datos, con la capa de gobernanza que un departamento de TI realmente necesita.',
    items: [
      {
        title: 'Informes y paneles',
        body: 'Paneles para dirección, análisis de tendencias, exportaciones a CSV y PNG.',
      },
      {
        title: 'Control de acceso por rol',
        body: 'Permisos granulares por módulo. Niveles lector, gestor, administrador.',
      },
      {
        title: 'Relaciones completas',
        body: 'Vincula costes con aplicaciones, aplicaciones con proyectos, proyectos con presupuestos, conocimiento con todo.',
      },
      {
        title: 'Auditoría completa',
        body: 'Cada cambio registrado. Quién cambió qué, cuándo, con historial antes/después completo.',
      },
      {
        title: 'Gestión unificada de tareas',
        body: 'Asigna tareas a OPEX, CAPEX, contratos y proyectos. Un único backlog en toda la plataforma.',
      },
      {
        title: 'Multi-tenant con RLS',
        body: 'Row-level security aísla cada tenant. Tus datos siguen siendo tuyos.',
      },
      {
        title: 'SSO vía Microsoft Entra ID',
        body: 'Inicio de sesión único empresarial. Un solo acceso para toda la organización.',
      },
      {
        title: 'Abierto por diseño',
        body: 'Servidor MCP, API pública, importación y exportación CSV. Ningún jardín cerrado.',
      },
    ],
  },

  cta: {
    title: '¿Listo para aportar claridad a tu departamento de TI?',
    body:
      'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes. Sin bloqueo.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
