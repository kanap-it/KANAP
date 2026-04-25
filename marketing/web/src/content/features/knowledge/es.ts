import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Gestión del conocimiento',
    description:
      'Editor markdown con bibliotecas, carpetas, flujos de revisión, historial de versiones y exportación a PDF / DOCX / ODT. Enlaces profundos a aplicaciones, proyectos, activos y tareas. Código abierto.',
  },
  header: {
    eyebrow: 'Conocimiento',
    title: 'Tu documentación de TI, conectada con todo.',
    lead: 'Gobernanza documental basada en markdown con bibliotecas estructuradas, flujos de revisión e integración profunda con tus aplicaciones, activos, proyectos y tareas.',
  },
  sections: [
    {
      title: 'Editor markdown con gobernanza',
      body: 'Escribe y mantén tu documentación de TI con un editor markdown completo. Los bloqueos de edición evitan modificaciones concurrentes y el guardado automático asegura que nada se pierde. Incrusta imágenes en línea y da formato con el soporte markdown completo.',
      bullets: [
        'Editor markdown completo con vista previa en vivo',
        'Bloqueos de edición para evitar modificaciones concurrentes',
        'Guardado automático con opción de guardado manual',
        'Soporte para imágenes en línea',
        'Markdown completo: títulos, listas, tablas, bloques de código',
      ],
      shotAlt: 'Editor markdown con indicador de bloqueo de edición',
    },
    {
      title: 'Bibliotecas, carpetas y tipos de documento',
      body: 'Organiza tu documentación en bibliotecas, navega por carpetas, clasifica por tipo. Usa plantillas para arrancar nuevos documentos con estructura y contenido predefinidos.',
      bullets: [
        'Múltiples bibliotecas para distintos dominios de conocimiento',
        'Jerarquía de carpetas para una organización lógica',
        'Tipos de documento para clasificación y gobernanza',
        'Plantillas agrupadas por tipo',
        'Navega, busca y filtra entre todos los documentos',
      ],
      shotAlt: 'Árbol de biblioteca con carpetas y tipos de documento',
    },
    {
      title: 'Flujos de revisión y aprobación',
      body: 'Asigna responsables, autores, revisores y aprobadores a los documentos. Envía documentos a revisión, recoge notas de decisión y sigue el estado de aprobación. La edición se bloquea durante la revisión para mantener la integridad.',
      bullets: [
        'Roles: responsable, autor, revisor, aprobador',
        'Envío a revisión con un clic',
        'Notas de decisión de revisores y aprobadores',
        'Edición bloqueada durante una revisión activa',
        'Seguimiento e historial del estado de aprobación',
      ],
      shotAlt: 'Panel de revisión de documento con chips de estado',
    },
    {
      title: 'Documentación conectada',
      body: 'Vincula documentos con aplicaciones, activos, proyectos, solicitudes y tareas. Accede a documentos gestionados desde otros workspaces y distingue entre contenido vinculado y relacionado para una trazabilidad total.',
      bullets: [
        'Relaciones con aplicaciones, activos, proyectos, solicitudes y tareas',
        'Documentos gestionados accesibles desde otros workspaces',
        'Distinción entre vinculado y relacionado',
        'Navegación bidireccional entre documentos y entidades',
        'Pista de auditoría completa de los cambios en las relaciones',
      ],
      shotAlt: 'Documento con barra lateral de entidades vinculadas',
    },
  ],
  more: {
    title: 'Más en conocimiento',
    items: [
      { title: 'Historial de versiones', body: 'Cada guardado crea una versión. Explora el historial y vuelve a cualquier estado anterior.' },
      { title: 'Exportación', body: 'Exporta a PDF, DOCX y ODT. Comparte documentación fuera de KANAP.' },
      { title: 'Plantillas', body: 'Plantillas reutilizables agrupadas por tipo. Arranca nuevos documentos rápidamente.' },
      { title: 'Importación', body: 'Importa desde Word y PDF. Trae tu documentación existente a KANAP con un solo clic.' },
    ],
  },
  crossLinks: {
    label: 'Explora otros módulos',
    links: [
      { label: 'Gestión de presupuesto', href: '/features/budget' },
      { label: 'Paisaje de TI', href: '/features/it-landscape' },
      { label: 'Gestión de portafolio', href: '/features/portfolio' },
    ],
  },
  cta: {
    title: '¿Listo para gobernar tu documentación de TI?',
    body: 'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
