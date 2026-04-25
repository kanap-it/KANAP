import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Plaid, Asistente de IA para gobernanza de TI',
    description:
      'Pregúntale a Plaid sobre tus datos de TI. Crea documentos, actualiza tareas, conecta cualquier herramienta de IA vía MCP. Uso gratuito incluido en planes cloud. Código abierto.',
  },
  header: {
    eyebrow: 'Plaid · asistente de IA',
    title: 'No es un chatbot. Un asistente real para TI.',
    lead: 'Pregunta lo que quieras sobre tu presupuesto, aplicaciones, proyectos o documentación. Plaid entiende tus datos, actúa y se conecta a cualquier herramienta de IA empresarial vía MCP.',
  },
  sections: [
    {
      title: 'Busca y consulta todo',
      body: 'Pregúntale a Plaid sobre tus aplicaciones, servidores, contratos, partidas presupuestarias, proyectos, tareas o documentos. Obtén respuestas instantáneas con datos estructurados, no resúmenes vagos.',
      bullets: [
        'Búsqueda transversal entre entidades de todos los módulos',
        'Consultas estructuradas con filtros y ordenación',
        'Agregaciones y estadísticas',
        'Búsqueda de texto completo en la base de conocimiento',
      ],
      shotAlt: 'Plaid respondiendo a una consulta entre módulos',
    },
    {
      title: 'Actúa con vista previa',
      body: 'Plaid no solo lee, también escribe. Crea documentación, redacta briefings de proyecto y gestiona tareas. Cada operación de escritura se previsualiza antes de aplicarse.',
      bullets: [
        'Crea y edita documentos con markdown',
        'Redacta briefings y resúmenes de proyecto',
        'Actualiza tareas: estado, asignaciones, comentarios',
        'Previsualiza los cambios antes de aplicarlos',
      ],
      shotAlt: 'Plaid mostrando una vista previa de actualizaciones de tareas',
    },
    {
      title: 'MCP, usa KANAP desde cualquier herramienta de IA',
      body: 'KANAP expone un servidor MCP (Model Context Protocol) completo. Conecta Claude Desktop, Cursor, Windsurf o cualquier herramienta compatible con MCP, y consulta tus datos de gobernanza de TI sin salir de tu flujo de trabajo.',
      bullets: [
        'Protocolo MCP estándar, funciona con cualquier cliente compatible',
        'Autenticación segura con clave API y scoping granular',
        'Las mismas consultas y acciones que el chat integrado',
        'Conserva tus flujos de IA actuales y añade el contexto de KANAP',
      ],
      shotAlt: 'Configuración MCP con scoping de clave API',
    },
    {
      title: 'Control y cumplimiento totales',
      body: 'Plaid respeta las reglas de tu organización. Cada acción se rige por los permisos del usuario. Los administradores tienen control total sobre lo que Plaid puede y no puede hacer.',
      bullets: [
        'Respeto pleno de los permisos del usuario en cada consulta',
        'Claves API seguras con scoping granular de MCP',
        'La búsqueda web se puede activar o desactivar de forma independiente',
        'Vista previa y confirmación para todas las operaciones de escritura',
        'Modo solo lectura disponible para despliegues prudentes',
      ],
      shotAlt: 'Controles de administración de Plaid con matriz de permisos',
    },
  ],
  more: {
    title: 'Lo que puedes preguntarle a Plaid',
    items: [
      { title: '«¿Cuál es el estado del Proyecto Atlas?»', body: 'Plaid recupera el proyecto, sus tareas, el cronograma y el equipo, y te entrega un briefing de estado conciso con bloqueos y próximos hitos.' },
      { title: '«Lista aplicaciones en AWS sin responsable»', body: 'Consulta estructurada sobre tu paisaje de TI. Resultados filtrados y ordenados a partir de datos en vivo.' },
      { title: '«Redacta una política de seguridad de acceso remoto»', body: 'Plaid crea un nuevo documento en tu base de conocimiento, con metadatos correctos y contenido markdown.' },
      { title: '«¿Qué contratos expiran en 90 días?»', body: 'Respuesta inmediata con nombres de proveedores, importes y fechas de renovación. Sin navegar por paneles.' },
    ],
  },
  crossLinks: {
    label: 'Explora otros módulos',
    links: [
      { label: 'Gestión de presupuesto', href: '/features/budget' },
      { label: 'Paisaje de TI', href: '/features/it-landscape' },
      { label: 'Gestión de portafolio', href: '/features/portfolio' },
      { label: 'Conocimiento', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'La gobernanza de TI con IA empieza aquí.',
    body: 'Plaid está incluido en cada workspace de KANAP, con un uso gratuito generoso en los planes cloud. Autoalojamiento gratuito, o nube desde 49 €/mes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
