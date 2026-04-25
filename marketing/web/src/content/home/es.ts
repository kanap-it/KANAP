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
    lead: 'Presupuesto, arquitectura, portafolio y conocimiento en una sola plataforma, con Plaid, el asistente de IA integrado.\nAutoaloja o déjanos gestionarla.',
    primaryCta: 'Empezar prueba gratuita',
    secondaryCta: 'Explorar funcionalidades',
    trialNote: 'Prueba de 14 días · sin tarjeta · sesión de activación gratuita.',
  },

  pillars: {
    eyebrow: 'Por qué KANAP',
    title: 'Pensada distinto.',
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
        body: 'AGPL v3. Código fuente completo en GitHub. Autoalojamiento gratuito, abierto a contribuciones. Sin bloqueo de proveedor, sin sorpresas, sin precios freemium.',
      },
    ],
  },

  modules: {
    eyebrow: 'Caja de herramientas de TI completa',
    title: 'Pensada para cada rol de TI.\nPlataforma completa, o ficha por ficha.',
    intro:
      'KANAP cubre todo lo que un departamento de TI necesita, desde la primera línea de presupuesto hasta la última aplicación retirada, con un asistente de IA que lee todos tus datos de forma transversal.',
    items: [
      {
        slug: '/features/budget',
        title: 'Gestión de presupuesto',
        blurb:
          'Para CIOs y socios de finanzas. Planificación plurianual, asignaciones inteligentes, repercusión lista para dirección. Defiende el presupuesto de TI con cifras que tu CFO va a respaldar.',
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
          'Para arquitectos, responsables de aplicación y equipos de infraestructura. Documenta aplicaciones, interfaces y servidores. Visualiza el sistema de un vistazo y planifica los cambios con las dependencias delante.',
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
          'Para jefes de proyecto y responsables de TI. Puntúa la demanda, simula hojas de ruta conscientes de la capacidad, comprométete con fechas sin cruzar los dedos.',
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
          'Para todo el mundo, especialmente soporte y operaciones. Editor markdown, bibliotecas, flujos de revisión. Runbooks, decisiones y notas de arquitectura conectados con las aplicaciones y proyectos que describen.',
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
          'Para cada rol, no solo para los entusiastas de la IA. Pregunta en lenguaje natural; obtén respuestas estructuradas en todos los módulos. El camino más corto entre una pregunta de TI y los datos que la responden.',
        bullets: [
          'Consultas en lenguaje natural en todos los módulos',
          'Acciones sobre documentos y tareas con vista previa',
          'Servidor MCP para Claude, Cursor, Windsurf…',
          'Uso gratuito incluido en planes cloud, o usa tu propia clave',
        ],
        ctaLabel: 'Más información',
      },
      {
        title: 'Adóptala a tu ritmo',
        blurb:
          'Cada módulo central está plenamente operativo por sí solo. Empieza por donde más duela — presupuesto, paisaje, portafolio, conocimiento — y añade el resto cuando estés listo. La plataforma te devuelve más cuanto más la adoptas, pero nunca necesitas los cinco para sacar valor.',
        bullets: [
          'Cada módulo plenamente usable por sí solo',
          'Sin secuencia obligada ni migración integral',
          'El valor transversal se acumula con la adopción',
          'Sustituye una herramienta hoy, consolida cuando quieras',
        ],
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Listo para empresas',
    title: 'Todo conectado.\nSiempre bajo control.',
    intro:
      'Cinco módulos trabajan sobre los mismos datos, creando la capa de gobernanza que un departamento de TI realmente necesita.',
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
        title: 'Relaciones ricas',
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
        title: 'SSO vía Microsoft Entra ID',
        body: 'Inicio de sesión único empresarial. Un solo acceso para toda la organización.',
      },
    ],
  },

  cta: {
    title: '¿Listo para aportar claridad a tu departamento de TI?',
    body:
      'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes.\nTodas las funcionalidades en cada plan, en la nube o autoalojado.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Desplegar desde GitHub',
  },
};

export default content;
