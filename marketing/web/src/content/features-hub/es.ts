import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Cómo los equipos de TI usan KANAP de verdad',
    description:
      'Cinco escenarios de quienes operan TI cada día — CIO, arquitecto, PMO, soporte, lead de TI. Mira cómo se combinan los módulos, no solo lo que hace cada uno por separado.',
  },
  header: {
    eyebrow: 'Por rol',
    title: 'Cómo los equipos de TI usan KANAP de verdad.',
    lead: 'Cinco escenarios de quienes mantienen la TI en marcha cada día. Dolor real, flujos reales, resultados reales. Mira cómo se combinan los módulos, no solo lo que hace cada uno por separado.',
  },
  modulesUsedLabel: 'Módulos combinados',
  personas: [
    {
      role: 'CIO / director de TI',
      headline: 'Defiende el presupuesto de TI ante el comité de dirección.',
      body:
        'Tu CFO pregunta por qué los costes de TI subieron un 12 %. Llegas con los números: un informe de repercusión por empresa y departamento, OPEX y CAPEX desglosados por aplicación, la tendencia plurianual. Cada línea se rastrea hasta un contrato o un proyecto. Sin gimnasia de hojas de cálculo, sin «ya te vuelvo a llamar».',
      outcome: 'Entra a la revisión presupuestaria con respuestas, no con preguntas.',
      modules: [
        { slug: 'budget', label: 'Presupuesto' },
        { slug: 'it-landscape', label: 'Paisaje de TI' },
      ],
      shotAlt: 'Informe de repercusión por empresa y departamento, desglose OPEX/CAPEX',
    },
    {
      role: 'Arquitecto de empresa',
      headline: 'Planifica una migración sin sorpresas.',
      body:
        'Vas a retirar el CRM heredado. Antes de comprometer fechas, necesitas saber qué depende de él: qué interfaces, qué aplicaciones aguas abajo, qué proyectos ya lo tocan. El mapa de interfaces muestra el grafo de dependencias de un vistazo. Tu plan de migración lista cada responsable de interfaz que llamar, cada proyecto que avisar. La base de conocimiento ata las decisiones a las aplicaciones que describen. Tu sucesor sabrá por qué.',
      outcome: 'Migra con los ojos abiertos, no con los dedos cruzados.',
      modules: [
        { slug: 'it-landscape', label: 'Paisaje de TI' },
        { slug: 'knowledge', label: 'Conocimiento' },
        { slug: 'portfolio', label: 'Portafolio' },
      ],
      shotAlt: 'Mapa de interfaces que muestra las dependencias del CRM a retirar',
    },
    {
      role: 'PMO / jefe de proyecto de TI',
      headline: 'Haz la planificación trimestral con cifras de capacidad.',
      body:
        'Veinte solicitudes entrantes, ocho equipos, un trimestre. Puntúa cada solicitud con criterios ponderados y genera una hoja de ruta consciente de la capacidad. Los cuellos de botella son visibles antes del compromiso. Las fechas no son ilusión. Son aritmética. En el comité de seguimiento explicas por qué este proyecto cae en Q3 y no en Q1: capacidad del equipo de plataforma.',
      outcome: 'Comprométete con fechas que realmente puedes defender.',
      modules: [
        { slug: 'portfolio', label: 'Portafolio' },
        { slug: 'budget', label: 'Presupuesto' },
      ],
      shotAlt: 'Hoja de ruta consciente de la capacidad con mapa de calor de cuellos de botella',
    },
    {
      role: 'Operaciones de TI / soporte',
      headline: 'Encuentra la causa raíz en segundos, no en horas.',
      body:
        'La gestión de pedidos en producción está lenta. Le preguntas a Plaid: «¿Qué aplicaciones consumen la API order-management?» Cinco segundos después, una lista. «¿Cuáles se han actualizado esta semana?» Una. «¿Quién es la persona responsable?» Email y Teams. Del síntoma a la persona sin abrir cinco herramientas.',
      outcome: 'Resuelve incidencias desde un solo lugar. Duerme mejor.',
      modules: [
        { slug: 'it-landscape', label: 'Paisaje de TI' },
        { slug: 'knowledge', label: 'Conocimiento' },
        { slug: 'ai', label: 'Plaid' },
      ],
      shotAlt: 'Plaid respondiendo a una investigación de incidencia con resultados estructurados',
    },
    {
      role: 'Lead de TI / responsable de infraestructura',
      headline: 'Identifica qué retirar, qué renovar, qué consolidar.',
      body:
        '¿Cuántos SaaS estamos pagando? ¿Cuáles se solapan? ¿Quién es el propietario cuando toca renegociar? Cada aplicación lleva su línea OPEX, su contrato, su fecha de renovación, su clasificación de datos. Ordena por coste, por solapamiento, por uso. Mantén la conversación con finanzas con los hechos delante.',
      outcome: 'Deja de renovar lo que nadie usa.',
      modules: [
        { slug: 'it-landscape', label: 'Paisaje de TI' },
        { slug: 'budget', label: 'Presupuesto' },
        { slug: 'knowledge', label: 'Conocimiento' },
      ],
      shotAlt: 'Portafolio de aplicaciones ordenado por coste OPEX con fechas de renovación',
    },
  ],
  cta: {
    title: '¿Listo para ver tu rol en la plataforma?',
    body:
      'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes.\nTodas las funcionalidades en cada plan, en la nube o autoalojado.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Desplegar desde GitHub',
  },
};

export default content;
