import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Funcionalidades',
    description:
      'Cinco módulos integrados: presupuesto, paisaje de TI, portafolio, conocimiento, asistente de IA. Listo para empresas con RBAC, auditoría, SSO y multi-tenant. Código abierto bajo AGPL v3.',
  },
  header: {
    eyebrow: 'La caja de herramientas de TI completa',
    title: 'Cinco módulos integrados.\nUna fuente de verdad.',
    lead: 'KANAP cubre el terreno esencial de cualquier departamento de TI, desde la primera línea de presupuesto hasta la última aplicación retirada, con un asistente de IA que lee todo de forma transversal.',
  },
  modules: [
    {
      slug: '/features/budget',
      eyebrow: 'Módulo 1',
      title: 'Gestión de presupuesto',
      body: 'Controla tu presupuesto de TI con planificación plurianual, asignación inteligente e informes de repercusión ejecutivos. Sigue OPEX y CAPEX con visibilidad completa a través de empresas y departamentos.',
      bullets: [
        'Planificación plurianual con columnas dinámicas',
        'Seis métodos de asignación, entre ellos plantilla y facturación',
        'Soporte multidivisa con tasas FX automáticas',
        'Informes de repercusión ejecutivos por empresa y departamento',
        'Flujos freeze / unfreeze para la gobernanza',
      ],
      ctaLabel: 'Explorar gestión de presupuesto',
      shotAlt: 'Grid presupuestario con OPEX y CAPEX',
    },
    {
      slug: '/features/it-landscape',
      eyebrow: 'Módulo 2',
      title: 'Paisaje de TI',
      body: 'Documenta todo tu sistema de información: aplicaciones, interfaces e infraestructura. Visualiza tu arquitectura con mapas interactivos y sigue los ciclos de vida de las aplicaciones desde la propuesta hasta la retirada.',
      bullets: [
        'Portafolio de aplicaciones con instancias por entorno',
        'Documentación de interfaces con soporte de middleware de 3 tramos',
        'Registro de servidores e infraestructura',
        'Mapas interactivos de interfaces y de conexiones',
        'Seguimiento del linaje de versiones para su evolución',
      ],
      ctaLabel: 'Explorar paisaje de TI',
      shotAlt: 'Mapa de interfaces con nodos de aplicación',
    },
    {
      slug: '/features/portfolio',
      eyebrow: 'Módulo 3',
      title: 'Gestión de portafolio',
      body: 'De la solicitud a la entrega: prioriza la demanda, simula planes de entrega viables y aplica las fechas de hoja de ruta con confianza. Toma decisiones basadas en datos sobre qué construir y cuándo.',
      bullets: [
        'Puntuación de solicitudes configurable con criterios ponderados',
        'Flujo de conversión de solicitud a proyecto',
        'Generación automática de hoja de ruta a partir de esfuerzo, dependencias y capacidad',
        'Análisis de cuellos de botella y ocupación',
        'Aplicación selectiva y transaccional de las fechas generadas',
        'Captura de baseline para análisis de desviación',
      ],
      ctaLabel: 'Explorar gestión de portafolio',
      shotAlt: 'Hoja de ruta con heatmap de capacidad',
    },
    {
      slug: '/features/knowledge',
      eyebrow: 'Módulo 4',
      title: 'Conocimiento',
      body: 'Gobierna tu documentación de TI con un editor markdown, bibliotecas estructuradas y flujos de revisión. Vincula documentos con aplicaciones, activos, proyectos, solicitudes y tareas para una trazabilidad total.',
      bullets: [
        'Editor markdown con bloqueos de edición y guardado automático',
        'Bibliotecas, carpetas y tipos de documento',
        'Flujos de revisión y aprobación',
        'Historial de versiones con reversión',
        'Exportación a PDF, DOCX y ODT',
        'Integración profunda con aplicaciones, activos, proyectos y tareas',
      ],
      ctaLabel: 'Explorar conocimiento',
      shotAlt: 'Árbol de biblioteca con tipos de documento',
    },
    {
      slug: '/features/ai',
      eyebrow: 'Asistente de IA',
      title: 'Conoce a Plaid',
      body: 'Pregunta lo que quieras sobre tus datos de TI en lenguaje natural. Plaid busca en todos los módulos, crea documentos y gestiona tareas, siempre respetando tus permisos.',
      bullets: [
        'Consultas en lenguaje natural en todos los módulos',
        'Creación de documentos y actualización de tareas desde el chat',
        'Servidor MCP para cualquier herramienta de IA',
        'Usa tu propia clave API, OpenAI, Anthropic, Ollama, personalizada',
        'Aislamiento total por tenant y aplicación de RBAC',
      ],
      ctaLabel: 'Explorar Plaid',
      shotAlt: 'Chat de Plaid con consulta entre módulos',
    },
  ],
  crossCutting: {
    eyebrow: 'Listo para empresas',
    title: 'Todo conectado. Siempre bajo control.',
    intro: 'Cinco módulos trabajan sobre los mismos datos, con la capa de gobernanza que un departamento de TI realmente necesita.',
    items: [
      { title: 'Informes y paneles', body: 'Informes para dirección, análisis de tendencias y paneles de KPIs.' },
      { title: 'Control de acceso por rol', body: 'Permisos granulares por módulo. Niveles lector, gestor, administrador.' },
      { title: 'Interconexiones ricas', body: 'Vincula costes con apps, apps con proyectos, proyectos con presupuestos, conocimiento con todo.' },
      { title: 'Pista de auditoría completa', body: 'Cada cambio registrado con historial completo antes/después.' },
      { title: 'Gestión unificada de tareas', body: 'Asigna tareas entre OPEX, CAPEX y contratos. Sigue fechas y avance.' },
      { title: 'Arquitectura multi-tenant', body: 'Aislamiento seguro de tenants con row-level security.' },
      { title: 'SSO vía Microsoft Entra ID', body: 'Integración con Single Sign-On empresarial.' },
      { title: 'Código abierto bajo AGPL v3', body: 'Código abierto de verdad. Inspecciona, autoaloja y contribuye.' },
    ],
  },
  cta: {
    title: '¿Listo para aportar claridad a tu departamento de TI?',
    body: 'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
