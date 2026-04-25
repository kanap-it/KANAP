import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Gestión de portafolio',
    description:
      'Puntuación de solicitudes, generación automática de hoja de ruta, planificación consciente de la capacidad, seguimiento del ciclo de vida del proyecto. Código abierto. Autoalojamiento gratuito o nube desde 49 €/mes.',
  },
  header: {
    eyebrow: 'Gestión de portafolio',
    title: 'De la solicitud a la entrega, con planificación automática de la hoja de ruta.',
    lead: 'Gestiona tu embudo de proyectos con puntuación inteligente, generación de hoja de ruta consciente de la capacidad y seguimiento del ciclo de vida. Simula escenarios antes de comprometer fechas.',
  },
  sections: [
    {
      title: 'Puntuación y evaluación de solicitudes',
      body: 'Evalúa solicitudes entrantes con criterios de puntuación configurables. Pondera valor de negocio, ROI, riesgo y urgencia para calcular una puntuación de prioridad. Soporte para reglas de bypass obligatorio y override manual con justificación.',
      bullets: [
        'Criterios de puntuación configurables con pesos personalizados',
        'Criterios por defecto: valor, alineación, costes, ROI, riesgo, urgencia',
        'Escalas invertidas para coste/riesgo (más alto = puntuación más baja)',
        'Reglas de bypass obligatorio para solicitudes críticas',
        'Override manual con justificación requerida',
      ],
      shotAlt: 'Editor de puntuación de solicitudes con criterios ponderados',
    },
    {
      title: 'Ciclo de vida de la solicitud',
      body: 'Sigue las solicitudes desde el envío inicial hasta la aprobación y conversión en proyectos. Estados de flujo integrados, historial de actividad y registro de decisiones del CAB mantienen a todos alineados sobre el estado de cada solicitud.',
      bullets: [
        'Flujo de estados: En revisión, Candidata, Aprobada, Convertida',
        'Rutas alternativas: En espera, Rechazada',
        'Historial de actividad con comentarios y cambios de estado',
        'Registro de decisiones del CAB con seguimiento formal de aprobación',
        'Conversión en un clic de solicitud aprobada a proyecto',
      ],
      shotAlt: 'Workspace de solicitud con línea de tiempo de actividad',
    },
    {
      title: 'Seguimiento del ciclo de vida del proyecto',
      body: 'Gestiona los proyectos desde la planificación hasta la ejecución y la finalización. Sigue fechas previstas frente a reales, captura baselines y monitoriza el esfuerzo. Soporte para proyectos estándar, mandatos fast-track y trabajo legacy.',
      bullets: [
        'Flujo de estados: Lista de espera, Planificado, En curso, En pruebas, Finalizado',
        'Captura de baseline al entrar en fase de ejecución',
        'Fechas previstas frente a reales para análisis de desviación',
        'Seguimiento de esfuerzo: estimado frente a real, de TI y de negocio',
        'Seguimiento del origen: Estándar, Fast-track, Legacy',
      ],
      shotAlt: 'Workspace de proyecto con fechas de baseline y reales',
    },
    {
      title: 'Planificación automática de la hoja de ruta',
      body: 'Genera escenarios de entrega a partir del esfuerzo restante, dependencias y capacidad de los colaboradores. Detecta cuellos de botella y ocupación antes de aplicar las fechas a los proyectos en producción.',
      bullets: [
        'Planificación semanal consciente de la capacidad a partir de las asignaciones reales de esfuerzo',
        'Alcance por defecto: Lista de espera, Planificado, En curso, En pruebas',
        'Recálculo opcional de proyectos ya planificados o simulación con plan congelado',
        'Análisis de sensibilidad a cuellos de botella por impacto del colaborador',
        'Vistas mensuales de ocupación por colaborador y equipo',
        'Aplicación selectiva y transaccional de las fechas generadas',
      ],
      shotAlt: 'Hoja de ruta generada con heatmap de capacidad',
    },
  ],
  more: {
    title: 'Más en portafolio',
    items: [
      { title: 'Gestión de equipos', body: 'Asigna sponsors, leads y miembros de negocio y de TI. Controla contactos externos.' },
      { title: 'Enlace con presupuesto', body: 'Vincula proyectos a ítems OPEX y CAPEX. Entiende el coste real de tu portafolio.' },
      { title: 'Dependencias', body: 'Sigue dependencias de solicitudes y proyectos. Los enlaces bloqueantes alimentan la secuenciación de la hoja de ruta.' },
      { title: 'Informes de portafolio', body: 'Heatmaps de capacidad, análisis de cuellos de botella, analíticas de ocupación.' },
    ],
  },
  crossLinks: {
    label: 'Explora otros módulos',
    links: [
      { label: 'Gestión de presupuesto', href: '/features/budget' },
      { label: 'Paisaje de TI', href: '/features/it-landscape' },
      { label: 'Conocimiento', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: '¿Listo para tomar el control de tu embudo de proyectos?',
    body: 'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
