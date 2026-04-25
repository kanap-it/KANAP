import type { SecurityContent } from './types';

const content: SecurityContent = {
  meta: {
    title: 'Seguridad',
    description:
      'Cómo KANAP protege tus datos: row-level security, cifrado, RBAC, auditoría, SSO y transparencia de código abierto. Autoalojado o en nube.',
  },
  header: {
    eyebrow: 'Seguridad',
    title: 'Seguridad que respeta tus datos.',
    lead:
      'Controles a la altura de la gobernanza desde el primer día. La misma plataforma corre en nuestra nube y en tus propios servidores, con el mismo aislamiento, cifrado y auditabilidad.',
  },
  overview: {
    title: 'Principios',
    intro:
      'KANAP está diseñado para departamentos de TI que manejan datos sensibles. Tratamos tus datos como queremos que los proveedores de TI traten los nuestros, transparentes, aislados y a mano cuando los necesitas.',
    pillars: [
      {
        title: 'Transparente por defecto',
        body: 'Todo el código fuente está en GitHub bajo AGPL v3. Tu equipo de seguridad lo lee, lo audita o lo hace fork. Nada oculto tras binarios propietarios.',
      },
      {
        title: 'Aislado por diseño',
        body: 'Row-level security a nivel de base de datos impone el aislamiento de tenants en cada consulta. No hay atajo cross-tenant que esquivar, porque no hay atajo alguno.',
      },
      {
        title: 'Exportable siempre',
        body: 'Tus datos son tuyos. Exportación CSV en cada grid, exportación de documentos a PDF, DOCX, ODT, exportación completa del tenant bajo petición. Sin tasa de extracción.',
      },
    ],
  },
  tenancy: {
    title: 'Aislamiento de tenants',
    body:
      'KANAP es multi-tenant a nivel de base de datos. Cada fila de cada tabla compartida lleva un `tenant_id`, y las policies de Row-Level Security de PostgreSQL imponen el filtro en cada lectura y escritura. La policy es parte del esquema, no de la aplicación, una consulta maliciosa no puede saltársela.',
    bullets: [
      'Policies PostgreSQL RLS en cada tabla compartida',
      'Filtrado `tenant_id` aplicado a nivel de base de datos, no solo en la app',
      'Pools de conexión por tenant con variables de sesión que fijan el tenant actual',
      'Operaciones por lote con `tenant_id = ANY($1)`, nunca fugas N+1',
      'Pruebas de regresión multi-tenant en cada ejecución de CI',
    ],
  },
  dataProtection: {
    title: 'Protección de datos',
    body:
      'Prácticas estándar aplicadas con rigor. Cifrado en tránsito y en reposo, contraseñas hasheadas, minimización de datos sensibles.',
    bullets: [
      'TLS en todas partes, sin texto plano entre componentes',
      'Hash Argon2 de contraseñas con salts por usuario',
      'Secretos gestionados vía entorno, no en el código',
      'Despliegues cloud con volúmenes persistentes cifrados',
      'Claves API (Plaid BYOK, tokens MCP) cifradas en reposo',
      'Ningún credencial en claro en los logs; logs estructurados con reglas de redacción',
    ],
  },
  access: {
    title: 'Control de acceso',
    body:
      'Permisos granulares por módulo, por rol. Cada feature gate y cada consulta de entidad respeta la misma matriz RBAC, incluidos Plaid y MCP.',
    bullets: [
      'Niveles lector / gestor / administrador por módulo',
      'Rol admin de workspace separado de los admins de módulo',
      'SSO vía Microsoft Entra ID (OIDC) tanto en cloud como en autoalojado',
      'Autenticación local con contraseña usando Argon2 + flujos opcionales de reinicio',
      'Plaid y MCP aplican el mismo RBAC que la interfaz, sin escalada de privilegios',
      'Tokens API ligados a usuarios individuales, revocables en cualquier momento',
    ],
  },
  audit: {
    title: 'Auditoría',
    body:
      'Cada cambio relevante queda registrado. Quién cambió qué, cuándo, con instantáneas antes/después completas. La actividad se ve en la app y se consulta por exportación.',
    bullets: [
      'Cronología de actividad por entidad (tareas, proyectos, documentos, etc.)',
      'Acciones de usuario registradas con timestamp y metadatos IP',
      'Acciones de login y administración en un feed de auditoría separado',
      'Exportable a CSV para ingesta en SIEM',
      'Estructura inmutable append-only, las filas se añaden, nunca se reescriben',
    ],
  },
  deployment: {
    title: 'Despliegue y operaciones',
    body:
      'Los despliegues cloud corren en hosts Linux reforzados dentro de la UE. Los despliegues autoalojados corren donde tú elijas. Ambos llevan el mismo modelo de seguridad.',
    bullets: [
      'Infraestructura solo en la UE para clientes cloud (OVH, Francia)',
      'Actualizaciones regulares de dependencias e imágenes de contenedor',
      'Tarballs de autoalojamiento o imágenes de contenedor, deterministas, auditables',
      'Logs estándar en stdout para integrarse con tu stack de observabilidad',
      'Copias de seguridad: pg_dump estándar, cífralo con tu propio pipeline',
    ],
  },
  disclosure: {
    title: 'Divulgación responsable',
    body:
      'Si encuentras un problema de seguridad, queremos saberlo. Escríbenos primero, danos un plazo razonable para corregir, y te daremos crédito en el aviso a menos que prefieras permanecer anónimo.',
    emailLabel: 'security@kanap.net',
    email: 'security@kanap.net',
  },
  cta: {
    title: '¿Preguntas sobre seguridad?',
    body: 'Compartimos encantados detalles de arquitectura, repasamos un modelo de amenazas o conectamos a tu equipo de seguridad con el nuestro.',
    primary: 'Habla con nosotros',
    secondary: 'Autoaloja y audita el código',
  },
};

export default content;
