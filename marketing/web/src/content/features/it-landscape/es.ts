import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Paisaje de TI',
    description:
      'Documenta aplicaciones, interfaces e infraestructura. Mapas de arquitectura interactivos, seguimiento del ciclo de vida, middleware de 3 tramos. Código abierto. Autoalojamiento gratuito o nube desde 49 €/mes.',
  },
  header: {
    eyebrow: 'Paisaje de TI',
    title: 'Documenta todo tu sistema de información.',
    lead: 'Aplicaciones, interfaces e infraestructura en un solo lugar. Visualiza tu arquitectura con mapas interactivos y sigue el ciclo de vida desde la propuesta hasta la retirada.',
  },
  sections: [
    {
      title: 'Portafolio de aplicaciones',
      body: 'Mantén un inventario completo de tus aplicaciones con instancias por entorno. Controla la propiedad, la criticidad, el estado de cumplimiento y la fase del ciclo de vida. Gestiona el linaje de versiones a medida que las aplicaciones evolucionan.',
      bullets: [
        'Aplicaciones lógicas con instancias por entorno (prod, pre-prod, QA, dev)',
        'Seguimiento del linaje de versiones para su evolución',
        'Ciclo de vida: Propuesta, Activa, Obsoleta, Retirada',
        'Propiedad: responsables de TI, responsables de negocio, contactos de soporte',
        'Campos de cumplimiento: clase de datos, marca PII, residencia',
      ],
      shotAlt: 'Portafolio de aplicaciones con columnas de ciclo de vida',
    },
    {
      title: 'Documentación de interfaces',
      body: 'Documenta las integraciones entre aplicaciones con definiciones de negocio y técnicas. Soporte para conexiones directas y patrones middleware de 3 tramos (Extract / Transform / Load). Configura bindings por entorno con endpoints y autenticación.',
      bullets: [
        'Propósito de negocio, categoría de datos, vínculo con procesos',
        'Tipos de ruta: directa o vía middleware',
        'Soporte de 3 tramos: Extract, Transform, Load',
        'Configuración de binding por entorno y por tramo',
        'Definición funcional: objetos de negocio, casos de uso, identificadores',
      ],
      shotAlt: 'Detalle de interfaz con middleware de 3 tramos',
    },
    {
      title: 'Registro de infraestructura',
      body: 'Sigue servidores, ubicaciones y conexiones en toda tu infraestructura. Soporte para despliegues on-premise y en la nube. Documenta la conectividad de red con topologías multiservidor y enrutamiento por capas.',
      bullets: [
        'Registro de servidores: VMs, bases de datos, colas, contenedores, funciones',
        'Ubicaciones: centros de datos, regiones cloud, zonas de disponibilidad',
        'Conexiones servidor-a-servidor y malla multiservidor',
        'Soporte de clústeres con agrupación de miembros',
        'Seguimiento del sistema operativo con fechas de soporte',
      ],
      shotAlt: 'Registro de servidores agrupado por ubicación',
    },
    {
      title: 'Mapas de arquitectura interactivos',
      body: 'Dos visualizaciones potenciadas por D3 ayudan a entender tu arquitectura de un vistazo. Filtra por entorno, ciclo de vida o nodos raíz específicos. Exporta a SVG o PNG para tu documentación.',
      bullets: [
        'Mapa de interfaces: apps como nodos, interfaces como aristas',
        'Mapa de conexiones: servidores y conectividad de red',
        'Vista de negocio (oculta middleware) y vista técnica',
        'Filtro de profundidad: limita el grafo a N saltos desde los nodos seleccionados',
        'Exportación SVG y PNG en resolución 2x',
      ],
      shotAlt: 'Mapa de interfaces interactivo con filtros',
    },
  ],
  more: {
    title: 'Más en paisaje de TI',
    items: [
      { title: 'Derivación de riesgo', body: 'Riesgo de conexión calculado a partir de las interfaces vinculadas. Criticidad, clase de datos y PII se derivan automáticamente.' },
      { title: 'Contactos de soporte', body: 'Usuarios internos y contactos externos por aplicación con roles y notas.' },
      { title: 'Enlace con costes', body: 'Vincula aplicaciones a ítems OPEX / CAPEX. Ve el coste real de tu portafolio.' },
      { title: 'Importación / exportación CSV', body: 'Importa aplicaciones e interfaces en masa. Exporta tu inventario para análisis.' },
    ],
  },
  crossLinks: {
    label: 'Explora otros módulos',
    links: [
      { label: 'Gestión de presupuesto', href: '/features/budget' },
      { label: 'Gestión de portafolio', href: '/features/portfolio' },
      { label: 'Conocimiento', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: '¿Listo para documentar tu sistema de información?',
    body: 'Empieza gratis autoalojando, o prueba la nube desde 49 €/mes. Todas las funcionalidades en todos los planes.',
    primary: 'Empezar prueba gratuita',
    secondary: 'Habla con nosotros',
  },
};

export default content;
