import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'La plataforma open source de gobernanza de TI',
    description:
      'Presupuesto, arquitectura empresarial, portafolio y conocimiento en una sola plataforma. Plaid permite trabajarla en lenguaje natural y los agentes de IA asumen la carga repetitiva. Open source bajo AGPL v3. Autoaloje gratis o elija KANAP alojado.',
  },

  hero: {
    eyebrow: 'Aporte claridad a su departamento de TI',
    title: 'La plataforma open source de gobernanza de TI.',
    lead: 'Presupuesto, arquitectura, portafolio y conocimiento en una sola plataforma. Plaid permite a su equipo trabajarla en lenguaje natural, y los agentes de IA asumen el trabajo repetitivo.\nAutoalójela gratis o déjenos operarla por usted.',
    primaryCta: 'Desplegar gratis',
    secondaryCta: 'Probar nube alojada',
    trialNote: 'AGPL v3 · código completo en GitHub · instalación Docker · sin paywall de funcionalidades.',
  },

  pillars: {
    eyebrow: 'Por qué KANAP',
    title: 'Lo que hace diferente a KANAP.',
    items: [
      {
        title: 'Creada por profesionales',
        body: 'Diseñada por un veterano de TI con experiencia real en distintos sectores. Resuelve los problemas reales de un departamento de TI, no problemas genéricos de colaboración.',
      },
      {
        title: 'Simple y potente',
        body: 'Cero teatro de complejidad. Lo bastante potente para resolver problemas difíciles. Lo bastante simple para que su equipo la adopte hoy.',
      },
      {
        title: 'Realmente open source',
        body: 'AGPL v3. Código fuente completo en GitHub. Autoalojamiento gratuito, abierto a contribuciones. Sin bloqueo de proveedor, sin paywall de funcionalidades, sin trampa freemium.',
      },
      {
        title: 'Todo el departamento de TI en un solo sistema.',
        body: 'Las aplicaciones, la infraestructura, los presupuestos, los proyectos y la documentación viven en un único repositorio, en lugar de diez herramientas desconectadas.',
      },
      {
        title: 'Agentes que liberan de trabajo a su equipo.',
        body: 'Los agentes autónomos se ocupan de la carga repetitiva y ganan más independencia a medida que se demuestran en tareas reales.',
      },
      {
        title: 'Adóptela a su ritmo',
        body: 'Cada módulo es plenamente usable por sí solo. Empiece por donde más duele y añada el resto cuando esté listo, sin migración integral de la plataforma.',
      },
    ],
  },

  layers: {
    eyebrow: 'Cómo encaja todo',
    title: 'Una plataforma completa para el departamento de TI.',
    intro:
      'KANAP se construye en tres capas que trabajan sobre la misma información, de modo que cada una hace más útiles a las demás.',
    items: [
      {
        title: 'El repositorio',
        body: 'KANAP guarda la imagen completa de su departamento de TI: aplicaciones e infraestructura, presupuestos, proyectos y documentación. Un solo lugar en lugar de diez herramientas.',
      },
      {
        title: 'La interacción',
        body: 'Plaid permite a cualquier persona de su equipo trabajar con el repositorio en lenguaje natural, hacer preguntas y aplicar cambios sin tener que aprender dónde está cada cosa.',
      },
      {
        title: 'La acción',
        body: 'Los agentes actúan sobre el mismo repositorio, asumen el trabajo repetitivo y lo llevan a cabo según la autonomía que usted les concede.',
      },
    ],
    outro: 'Cada parte es útil por sí sola, y juntas se refuerzan.',
  },

  modules: {
    eyebrow: 'Caja de herramientas de TI completa',
    title: 'Pensada para cada rol de TI.',
    intro:
      'KANAP cubre el terreno esencial que todo departamento de TI necesita para funcionar, desde la primera línea de presupuesto hasta la última aplicación retirada, con Plaid para trabajarlo de forma transversal en lenguaje natural y agentes que asumen la carga repetitiva.',
    items: [
      {
        slug: '/features/budget',
        title: 'Gestión de presupuesto',
        blurb:
          'Para CIOs y socios de finanzas. Planificación plurianual, asignaciones inteligentes, repercusión lista para dirección. Defienda el presupuesto de TI con cifras en las que su CFO confiará.',
        bullets: [
          'Planificación presupuestaria plurianual',
          'Seis métodos de asignación',
          'Multidivisa con FX del Banco Mundial',
          'Informes de repercusión para dirección',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/it-landscape',
        title: 'Paisaje de TI',
        blurb:
          'Para arquitectos, responsables de aplicación y equipos de infraestructura. Documente aplicaciones, interfaces y servidores. Vea el sistema de un vistazo y planifique los cambios con las dependencias delante.',
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
          'Para jefes de proyecto y responsables de TI. Puntúe la demanda, simule hojas de ruta conscientes de la capacidad y comprométase con fechas sin cruzar los dedos.',
        bullets: [
          'Puntuación de solicitudes con criterios ponderados',
          'Planificación automática de la hoja de ruta',
          'Análisis de cuellos de botella y ocupación',
          'Seguimiento del ciclo de vida del proyecto',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/knowledge',
        title: 'Conocimiento',
        blurb:
          'Para todo el mundo, en especial soporte y operaciones. Editor markdown, bibliotecas, flujos de revisión. Runbooks, decisiones y notas de arquitectura conectados con las aplicaciones y proyectos que describen.',
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
        title: 'Plaid, asistente de IA',
        blurb:
          'Para cada rol, no solo para los entusiastas de la IA. Pregunte en lenguaje natural y obtenga respuestas estructuradas en todos los módulos. El camino más corto entre una pregunta de TI y los datos que la responden.',
        bullets: [
          'Consultas en lenguaje natural en todos los módulos',
          'Acciones sobre documentos y tareas con vista previa',
          'Servidor MCP para Claude, Cursor, Windsurf…',
          'Uso incluido en nube alojada, o use su propia clave',
        ],
        ctaLabel: 'Más información',
      },
      {
        slug: '/features/agents',
        title: 'Agentes',
        blurb:
          'Para equipos sepultados en tickets repetitivos. Un agente lee cada tarea contra sus datos de TI y propone una acción o la lleva a cabo, según la autonomía que usted defina. Hoy hay un conector de mesa de servicio en producción, y el runtime está pensado para ampliarse.',
        bullets: [
          'Razona sobre su repositorio de TI real',
          'Empieza supervisado y gana más autonomía',
          'Cada acción registrada y reversible',
          'Runtime abierto, escriba su propio conector',
        ],
        ctaLabel: 'Más información',
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Listo para empresas',
    title: 'Un sistema conectado, bajo su control.',
    intro:
      'Los módulos trabajan sobre los mismos datos, que es lo que da a un departamento de TI una gobernanza real. También es lo que permite a un agente actuar sin poner en riesgo su entorno.',
    items: [
      {
        title: 'Informes y paneles',
        body: 'Paneles listos para dirección, análisis de tendencias, exportaciones a CSV y PNG.',
      },
      {
        title: 'Control de acceso por rol',
        body: 'Permisos granulares por módulo. Niveles lector, gestor, administrador.',
      },
      {
        title: 'Relaciones ricas',
        body: 'Vincule costes con aplicaciones, aplicaciones con proyectos, proyectos con presupuestos, conocimiento con todo.',
      },
      {
        title: 'Registro de auditoría completo',
        body: 'Cada cambio queda registrado, incluidas las acciones de los agentes. Sepa quién cambió qué y cuándo, con historial completo de antes y después.',
      },
      {
        title: 'Gestión unificada de tareas',
        body: 'Asigne tareas en OPEX, CAPEX, contratos y proyectos. Un único backlog en toda la plataforma.',
      },
      {
        title: 'SSO vía Microsoft Entra ID',
        body: 'Inicio de sesión único empresarial. Un solo acceso para toda su organización.',
      },
    ],
  },

  vision: {
    eyebrow: 'Hacia dónde va esto',
    title: 'Hacia un departamento de TI aumentado con IA.',
    body: 'La dirección es un departamento de TI donde los agentes asumen sin ruido la carga repetitiva para que su equipo dedique su tiempo al trabajo que exige criterio real, todo ello sobre software que usted posee y puede leer de principio a fin.',
  },

  cta: {
    title: 'Gestione su departamento de TI sobre un sistema que es suyo.',
    body: 'Despliegue KANAP usted mismo gratis, o déjenos alojarlo. El producto y todas las funcionalidades son los mismos, agentes incluidos.',
    primary: 'Desplegar gratis',
    secondary: 'Probar nube alojada',
  },
};

export default content;
