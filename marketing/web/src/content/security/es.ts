import type { SecurityContent } from './types';

const content: SecurityContent = {
  meta: {
    title: 'Seguridad',
    description:
      'Cómo KANAP protege sus datos: row-level security, cifrado, RBAC, registro de auditoría, gobernanza de agentes, SSO y transparencia open source. Autoalojado o en nube.',
  },
  header: {
    eyebrow: 'Seguridad',
    title: 'Seguridad que respeta sus datos.',
    lead: 'Controles a la altura de la gobernanza desde el primer día. La misma plataforma se ejecuta en nuestra nube y en sus propios servidores, con el mismo aislamiento, cifrado, auditabilidad y gobernanza sobre lo que los agentes pueden hacer.',
  },
  overview: {
    title: 'Principios',
    intro:
      'KANAP está diseñado para departamentos de TI que manejan datos sensibles. Tratamos sus datos como queremos que los proveedores de TI traten los nuestros: transparentes, aislados y a su alcance cuando los necesita.',
    pillars: [
      {
        title: 'Transparente por defecto',
        body: 'Todo el código fuente está en GitHub bajo AGPL v3. Su equipo de seguridad lo lee, lo audita o lo bifurca. Nada queda oculto tras binarios propietarios.',
      },
      {
        title: 'Aislado por diseño',
        body: 'El row-level security a nivel de base de datos impone el aislamiento de tenants en cada consulta. No hay atajo entre tenants que esquivar, porque no hay atajo alguno.',
      },
      {
        title: 'Exportable, siempre',
        body: 'Sus datos son suyos. Exportación CSV en cada grid, exportación de documentos a PDF, DOCX, ODT, exportación completa del tenant bajo petición. Sin tasa de extracción.',
      },
    ],
  },
  tenancy: {
    title: 'Aislamiento de tenants',
    body:
      'KANAP es multi-tenant a nivel de base de datos. Cada fila de cada tabla compartida lleva un `tenant_id`, y las políticas de Row-Level Security de PostgreSQL imponen el filtro en cada lectura y escritura. La política es parte del esquema, no de la aplicación, una consulta maliciosa no puede saltársela.',
    bullets: [
      'Políticas RLS de PostgreSQL en cada tabla compartida',
      'Filtrado por `tenant_id` aplicado a nivel de base de datos, no solo en la app',
      'Pools de conexión por tenant con variables de sesión que fijan el tenant actual',
      'Las operaciones por lote usan `tenant_id = ANY($1)`, nunca fugas N+1',
      'Pruebas de regresión multi-tenant en cada ejecución de CI',
    ],
  },
  dataProtection: {
    title: 'Protección de datos',
    body:
      'Prácticas estándar, aplicadas con rigor. Cifrado en tránsito y en reposo, contraseñas con hash, minimización de datos sensibles.',
    bullets: [
      'TLS en todas partes, sin texto plano entre componentes',
      'Hash de contraseñas con Argon2 y salts por usuario',
      'Secretos gestionados vía entorno, no incluidos en el código',
      'Los despliegues en nube usan volúmenes persistentes cifrados',
      'Claves API (Plaid BYOK, tokens MCP) cifradas en reposo',
      'Sin credenciales en texto plano en los logs; logs estructurados con reglas de redacción',
    ],
  },
  access: {
    title: 'Control de acceso',
    body:
      'Permisos granulares por módulo, por rol. Cada feature gate y cada consulta de entidad respeta la misma matriz RBAC, incluidos Plaid y MCP.',
    bullets: [
      'Niveles lector / gestor / administrador por módulo',
      'Rol de administrador a nivel de workspace separado de los administradores de módulo',
      'SSO vía Microsoft Entra ID (OIDC) tanto en nube como en autoalojado',
      'Autenticación local con contraseña usando Argon2 + flujos opcionales de restablecimiento de contraseña',
      'Plaid y MCP aplican el mismo RBAC que la interfaz, sin escalada de privilegios',
      'Tokens API ligados a usuarios individuales, revocables en cualquier momento',
    ],
  },
  audit: {
    title: 'Registro de auditoría',
    body:
      'Cada cambio relevante queda registrado. Quién cambió qué y cuándo, con instantáneas completas de antes y después. La actividad se ve en la app y se puede consultar por exportación.',
    bullets: [
      'Cronología de actividad por entidad (tareas, proyectos, documentos, etc.)',
      'Acciones de usuario registradas con marcas de tiempo y metadatos de IP',
      'Acciones de inicio de sesión y administración en un feed de auditoría separado',
      'Las acciones de los agentes se registran en el mismo registro, con las fuentes que utilizó cada agente',
      'Exportable a CSV para ingesta en SIEM',
      'Estructura inmutable append-only, las filas se añaden, nunca se reescriben',
    ],
  },
  agentGovernance: {
    title: 'Gobernanza de agentes',
    body:
      'Los agentes actúan bajo los mismos controles que todo lo demás, más límites específicos del trabajo autónomo. Cada acción de un agente queda registrada y acotada a lo que usted permitió, y puede detener un agente en cualquier momento. La autonomía la concede usted y se mide frente al historial del agente, no se da por supuesta.',
    bullets: [
      'Los agentes actúan solo a través de operaciones definidas, sin acceso directo a la base de datos ni al shell',
      'Cada agente acotado a lo que usted permite, bajo el mismo RBAC que la interfaz',
      'Cada acción del agente registrada en el mismo registro de auditoría, exportable para su SIEM',
      'Las respuestas llevan las fuentes que utilizó el agente, para que una decisión se pueda comprobar',
      'Pause cualquier agente de inmediato, uno a uno o todos a la vez',
      'Los límites de gasto por agente mantienen acotado el coste de operación',
    ],
  },
  deployment: {
    title: 'Despliegue y operaciones',
    body:
      'Los despliegues en nube se ejecutan en hosts Linux reforzados dentro de la UE. Los despliegues autoalojados se ejecutan donde usted elija. Ambos llevan el mismo modelo de seguridad.',
    bullets: [
      'Infraestructura solo en la UE para clientes en nube (OVH, Francia)',
      'Actualizaciones periódicas de dependencias e imágenes de contenedor',
      'Tarballs de autoalojamiento o imágenes de contenedor, deterministas, auditables',
      'Logs estándar a stdout para integrarse con su stack de observabilidad',
      'Copias de seguridad: pg_dump estándar, cífrelo con su propio pipeline',
    ],
  },
  disclosure: {
    title: 'Divulgación responsable',
    body:
      'Si encuentra un problema de seguridad, queremos saberlo. Escríbanos primero, denos un plazo razonable para corregirlo y le daremos crédito en el aviso, salvo que prefiera permanecer anónimo.',
    emailLabel: 'security@kanap.net',
    email: 'security@kanap.net',
  },
  cta: {
    title: '¿Preguntas sobre seguridad?',
    body: 'Compartimos con gusto detalles de arquitectura, repasamos un modelo de amenazas o conectamos a su equipo de seguridad con el nuestro.',
    primary: 'Hablar con nosotros',
    secondary: 'Autoaloje y audite el código',
  },
};

export default content;
