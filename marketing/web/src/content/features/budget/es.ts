import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Gestión de presupuesto',
    description:
      'Planificación presupuestaria plurianual, seis métodos de asignación, multidivisa con tasas del Banco Mundial, repercusión ejecutiva. Código abierto. Autoalojamiento gratuito o nube desde 49 €/mes.',
  },
  header: {
    eyebrow: 'Gestión de presupuesto',
    title: 'Controla tu presupuesto de TI con visibilidad total.',
    lead: 'Planificación plurianual, asignación inteligente de costes, informes de repercusión listos para dirección. Sigue OPEX y CAPEX a través de empresas y departamentos.',
  },
  sections: [
    {
      title: 'Planificación presupuestaria plurianual',
      body: 'Planifica tu presupuesto de TI a lo largo de varios años con columnas dinámicas para Presupuesto, Revisión, Seguimiento y Aterrizaje. OPEX y CAPEX en una vista unificada.',
      bullets: [
        'Seguimiento de OPEX y CAPEX en grids dedicados',
        'Columnas dinámicas Presupuesto / Revisión / Seguimiento / Aterrizaje por año',
        'Comparativas interanuales y análisis de tendencia',
        'Copias masivas entre años presupuestarios',
        'Flujos freeze / unfreeze para la gobernanza',
      ],
      shotAlt: 'Grid presupuestario plurianual con columnas dinámicas',
    },
    {
      title: 'Asignación inteligente de costes',
      body: 'Distribuye los costes de TI entre empresas y departamentos con seis métodos de asignación. El sistema recalcula las asignaciones cuando cambian las métricas, con transparencia total y pista de auditoría.',
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
      body: 'Trabaja en varias divisas y consolida en una divisa canónica. KANAP obtiene tasas en tiempo real de la API del Banco Mundial y las congela al bloquear una versión del presupuesto.',
      bullets: [
        'Divisa de reporting única para todos los agregados',
        'Tasas FX automáticas del Banco Mundial',
        'Snapshots de tasas congelados al bloquear el presupuesto',
        'Lista de divisas permitidas configurable',
        'Tasas históricas para ejercicios pasados',
      ],
      shotAlt: 'Ajustes de divisa con tasas del Banco Mundial',
    },
    {
      title: 'Informes de repercusión ejecutivos',
      body: 'Genera informes de repercusión listos para comité de dirección con la distribución de costes de TI por empresa y departamento. Drill-down desde los totales de empresa hasta cada partida individual, con total transparencia sobre los métodos de asignación empleados.',
      bullets: [
        'Informe de repercusión global por empresa',
        'Informes por empresa desglosados por departamento',
        'Detalle de asignaciones línea a línea',
        'KPIs y cuota sobre el total',
        'Exportación CSV y descarga de gráficos',
      ],
      shotAlt: 'Informe de repercusión con drill-down',
    },
  ],
  more: {
    title: 'Más en presupuesto',
    items: [
      { title: 'Gestión de tareas', body: 'Asigna tareas de seguimiento a los ítems OPEX y CAPEX. Controla fechas de vencimiento y avance.' },
      { title: 'Enlace de contratos', body: 'Vincula partidas de gasto a contratos. Sigue fechas de renovación y plazos de cancelación.' },
      { title: 'Plan de cuentas', body: 'Mapea costes a tu estructura contable. Planes de cuentas por país y globales.' },
      { title: 'Higiene de datos', body: 'Los chips del panel señalan responsables ausentes, empresas pagadoras y discrepancias de plan de cuentas.' },
    ],
  },
  crossLinks: {
    label: 'Explora otros módulos',
    links: [
      { label: 'Paisaje de TI', href: '/features/it-landscape' },
      { label: 'Gestión de portafolio', href: '/features/portfolio' },
      { label: 'Conocimiento', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: '¿Listo para dominar tu presupuesto de TI?',
    body: 'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
