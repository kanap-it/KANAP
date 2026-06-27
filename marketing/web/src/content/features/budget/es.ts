import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Gestión de presupuesto',
    description:
      'Planificación presupuestaria plurianual de TI, seis métodos de asignación, multidivisa con tasas del Banco Mundial, repercusión para dirección. Open source. Autoaloje gratis o elija la nube alojada.',
  },
  header: {
    eyebrow: 'Gestión de presupuesto',
    title: 'Domine su presupuesto de TI con visibilidad total.',
    lead: 'Planificación plurianual, asignación inteligente de costes, informes de repercusión listos para dirección. Siga OPEX y CAPEX entre empresas y departamentos.',
  },
  sections: [
    {
      title: 'Planificación presupuestaria plurianual',
      body: 'Planifique su presupuesto de TI a lo largo de varios años con columnas dinámicas para Presupuesto, Revisión, Seguimiento y Aterrizaje. Siga OPEX y CAPEX en una vista unificada.',
      bullets: [
        'Seguimiento de OPEX y CAPEX en grids dedicados',
        'Columnas dinámicas Presupuesto / Revisión / Seguimiento / Aterrizaje por año',
        'Comparativas interanuales y análisis de tendencia',
        'Copias masivas entre años presupuestarios',
        'Flujos de freeze / unfreeze para la gobernanza',
      ],
      shotAlt: 'Grid presupuestario plurianual con columnas dinámicas',
    },
    {
      title: 'Asignación inteligente de costes',
      body: 'Distribuya los costes de TI entre empresas y departamentos con seis métodos de asignación distintos. El sistema recalcula las asignaciones cuando cambian las métricas, con transparencia total y registro de auditoría.',
      bullets: [
        'Asignación por plantilla',
        'Asignación por usuarios de TI',
        'Asignación ponderada por facturación',
        'Repartos manuales por empresa y departamento',
        'Asignación por defecto proporcional a la plantilla',
      ],
      shotAlt: 'Editor de asignación mostrando seis métodos',
    },
    {
      title: 'Multidivisa con tasas en vivo',
      body: 'Trabaje con varias divisas y consolide en una única divisa canónica. KANAP obtiene tasas en vivo de la API del Banco Mundial y congela instantáneas de tasas cuando usted bloquea una versión del presupuesto.',
      bullets: [
        'Divisa de reporting única para todos los agregados',
        'Tasas FX automáticas del Banco Mundial',
        'Instantáneas de tasas congeladas al bloquear el presupuesto',
        'Lista de divisas permitidas configurable',
        'Tasas históricas para ejercicios pasados',
      ],
      shotAlt: 'Ajustes de divisa con tasas del Banco Mundial',
    },
    {
      title: 'Informes de repercusión para dirección',
      body: 'Genere informes de repercusión listos para el comité de dirección con la distribución de costes de TI por empresa y departamento. Profundice desde los totales de empresa hasta cada partida individual, con total transparencia sobre los métodos de asignación empleados. Hoy Plaid responde preguntas de presupuesto en lenguaje natural y, a medida que crecen los conectores, los agentes también actuarán sobre estos datos.',
      bullets: [
        'Informe de repercusión global por empresa',
        'Informes por empresa desglosados por departamento',
        'Desgloses de asignación línea a línea',
        'Métricas KPI y cuota sobre el total',
        'Exportación CSV y descarga de gráficos',
      ],
      shotAlt: 'Informe de repercusión con drill-down',
    },
  ],
  more: {
    title: 'Más en presupuesto',
    items: [
      { title: 'Gestión de tareas', body: 'Asigne tareas de seguimiento a los ítems OPEX y CAPEX. Controle fechas de vencimiento y avance.' },
      { title: 'Enlace de contratos', body: 'Vincule partidas de gasto a contratos. Siga fechas de renovación y plazos de cancelación.' },
      { title: 'Plan de cuentas', body: 'Mapee costes a su estructura contable. Planes de cuentas por país y globales.' },
      { title: 'Higiene de datos', body: 'Los chips del panel señalan responsables ausentes, empresas pagadoras y discrepancias de plan de cuentas.' },
    ],
  },
  crossLinks: {
    label: 'Explore la plataforma',
    links: [
      { label: 'Agentes', href: '/features/agents' },
      { label: 'Plaid, asistente de IA', href: '/features/ai' },
      { label: 'Paisaje de TI', href: '/features/it-landscape' },
      { label: 'Gestión de portafolio', href: '/features/portfolio' },
      { label: 'Conocimiento', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: '¿Listo para dominar su presupuesto de TI?',
    body: 'Autoaloje gratis o pruebe la nube alojada. Todas las funcionalidades en cada plan.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Hablar con nosotros',
  },
};

export default content;
