# Administración

La sección de Administración proporciona acceso a la gestión de usuarios, configuración de roles, facturación, ajustes de autenticación, controles de personalización y el visor de registro de auditoría. Estas páginas normalmente están restringidas a los administradores.

## Dónde encontrarla

Navegue a **Administración** desde el menú principal para acceder al centro de administración.

**Permisos**: Las distintas páginas de administración requieren permisos diferentes:
- Empresas, Departamentos, Proveedores, Cuentas: `{recurso}:reader` para ver
- Usuarios y acceso: `users:reader` para ver, `users:admin` para gestionar
- Roles: `users:reader` para ver, `users:admin` para editar
- Registro de auditoría: Requiere `users:admin`
- Facturación: Requiere el rol de administrador de facturación
- Autenticación: Requiere `users:admin` (con flag de funcionalidad; requiere SSO habilitado)
- Personalización: Requiere `users:admin` (solo host del espacio de trabajo; accesible desde la barra lateral)

---

## Centro de Administración

La página principal de Administración proporciona acceso rápido a las funciones administrativas principales:

| Tarjeta | Descripción | Permiso requerido |
|---------|-------------|-------------------|
| **Empresas** | Gestionar empresas y métricas anuales | `companies:reader` |
| **Departamentos** | Gestionar departamentos y plantilla | `departments:reader` |
| **Proveedores** | Gestionar proveedores y contactos | `suppliers:reader` |
| **Cuentas** | Gestionar códigos contables | `accounts:reader` |
| **Usuarios y acceso** | Asignar puestos y roles | `users:reader` |
| **Roles** | Definir permisos de roles | `users:reader` |
| **Registro de auditoría** | Consultar todo el historial de cambios | `users:admin` |
| **Facturación** | Plan, puestos y facturas | Administrador de facturación |

Autenticación y Personalización están disponibles desde la navegación lateral pero no aparecen en la página principal del centro de Administración.

---

## Registro de auditoría

La página de Registro de auditoría muestra el historial de cambios del espacio de trabajo para las actualizaciones de datos en toda la plataforma.

### Acceso

- Ruta: `/admin/audit-logs`
- Permiso requerido: `users:admin`
- Esta página es de solo lectura (no hay acciones de crear/editar/eliminar).

### Qué puede hacer

- Buscar por nombre de tabla, acción y actor (correo/nombre)
- Filtrar por:
  - Fecha
  - Tabla
  - Acción
  - Origen (`user`, `system`, `webhook`)
- Abrir cualquier fila para ver los detalles completos:
  - Chips de metadatos (fecha, tabla, acción, origen, referencia de origen, espacio de trabajo, ID de registro, usuario)
  - Resumen de campos modificados
  - Comparación lado a lado de los datos JSON **Antes** y **Después**

### Columnas

**Columnas predeterminadas**:
- **Fecha**: Cuándo ocurrió el cambio
- **Tabla**: Qué tabla de la base de datos fue afectada
- **Acción**: El tipo de cambio (crear, actualizar, eliminar, desactivar)
- **Origen**: Quién o qué desencadenó el cambio (usuario, sistema, webhook)
- **Usuario**: Correo del usuario que realizó el cambio (o "Sistema"/"Webhook" para orígenes no humanos)

**Columnas adicionales** (mediante el selector de columnas):
- **ID de registro**: Identificador del registro afectado
- **ID de usuario**: UUID del usuario que actuó
- **Nombre de usuario**: Nombre visible del usuario que actuó
- **Ref. de origen**: Referencia externa para cambios originados por webhook
- **ID de espacio de trabajo**: El espacio de trabajo al que pertenece esta entrada

### Paginación

- La cuadrícula utiliza paginación explícita con **100 filas por página**.
- Los filtros y la búsqueda se aplican a todo el conjunto de datos, no solo a la página actual.

### Comprender el origen y el actor

- **Origen = user**: cambio iniciado por una acción de usuario autenticado.
- **Origen = webhook**: cambio iniciado por un webhook externo (por ejemplo, eventos de sincronización de facturación). Utilice **Ref. de origen** para correlacionar los IDs del evento de origen.
- **Origen = system**: proceso interno de la plataforma sin un actor de usuario directo.

Si una cuenta de usuario ya no es resoluble en el contexto actual, la columna de Usuario puede mostrar un UUID alternativo (`Unknown (xxxx...)`) en lugar de un correo electrónico.

---

## Usuarios y acceso

Gestione quién puede acceder a KANAP y qué puede hacer.

### La cuadrícula de usuarios

**Columnas predeterminadas**:
- **Apellido** / **Nombre**: Nombre del usuario
- **Dirección de correo electrónico**: Correo de inicio de sesión
- **Puesto de trabajo**: Su cargo en la organización
- **Rol**: Rol principal asignado
- **Empresa** / **Departamento**: Asignación organizacional del usuario

**Columnas adicionales** (mediante el selector de columnas):
- **Teléfono profesional** / **Teléfono móvil**: Números de contacto
- **MFA habilitado**: Si la autenticación multifactor está activa
- **Creado**: Cuándo se creó el usuario

La cuadrícula muestra por defecto los usuarios **habilitados**. Utilice el conmutador de alcance para alternar entre **Habilitados**, **Deshabilitados** y **Todos**.

### Acciones de gestión de usuarios

| Acción | Descripción | Permiso |
|--------|-------------|---------|
| **Nuevo** | Crear un nuevo usuario | `users:member` |
| **Editar** | Modificar datos del usuario (haga clic en cualquier fila) | `users:member` |
| **Importar CSV** | Importación masiva de usuarios | `users:admin` |
| **Exportar CSV** | Exportar lista de usuarios | `users:admin` |
| **Invitar** | Enviar invitaciones de inicio de sesión a los usuarios seleccionados | `users:admin` |
| **Eliminar** | Eliminar permanentemente los usuarios seleccionados | `users:admin` |

### Crear un usuario

1. Haga clic en **Nuevo**
2. Complete los campos obligatorios:
   - **Correo electrónico**: Dirección de correo de inicio de sesión (debe ser única)
3. Campos opcionales:
   - **Nombre** / **Apellido**: Nombre del usuario
   - **Puesto de trabajo**: Su cargo en la organización
   - **Teléfono profesional** / **Teléfono móvil**: Números de contacto
   - **Roles**: Asignar uno o más roles (determina los permisos)
   - **Empresa** / **Departamento**: Asignación organizacional
   - **Habilitado**: Si el usuario puede iniciar sesión (consume un puesto)
4. Haga clic en **Guardar** o **Guardar e invitar** para enviar el correo de inicio de sesión

### Asignación de múltiples roles

Se pueden asignar múltiples roles a los usuarios. Sus permisos efectivos son la combinación de todos los roles asignados: si cualquier rol otorga acceso a un recurso, el usuario tiene ese acceso.

### Gestión de puestos

Los usuarios consumen **puestos** según su plan de suscripción:
- **Usuarios habilitados**: Cuentan contra su límite de puestos
- **Usuarios deshabilitados**: No consumen puestos
- El contador de puestos en la barra de herramientas muestra el uso actual (p. ej., "Puestos 5/10")
- Active o desactive el interruptor **Habilitado** al editar un usuario para gestionar la asignación de puestos

### Usuarios gestionados por SSO

Cuando Microsoft Entra ID (SSO) está conectado, los campos del perfil del usuario (nombre, puesto de trabajo, teléfono) se sincronizan desde Entra al iniciar sesión y no pueden editarse en KANAP. Aún puede gestionar roles y asignaciones organizacionales.

---

## Roles

Defina qué puede hacer cada rol en todo KANAP.

### Cómo funcionan los roles

Cada rol tiene niveles de permiso para diferentes recursos:
- **Ninguno**: Sin acceso a este recurso
- **Lector**: Solo lectura
- **Colaborador**: Ver y editar elementos existentes, añadir comentarios y adjuntos, pero no puede crear nuevos elementos de nivel superior (actualmente utilizado para proyectos del portafolio)
- **Miembro**: Ver, crear y editar
- **Administrador**: Acceso completo incluyendo eliminación

### Grupos de permisos

Los recursos están organizados en grupos para facilitar la gestión:

**Presupuesto y Finanzas**
| Recurso | Qué controla |
|---------|--------------|
| `opex` | Gastos operativos |
| `capex` | Gastos de capital |
| `budget_ops` | Herramientas de administración presupuestaria |
| `contracts` | Contratos con proveedores |
| `analytics` | Dimensiones analíticas |
| `reporting` | Acceso a informes |

**Gestión del Portafolio**
| Recurso | Qué controla |
|---------|--------------|
| `portfolio_requests` | Solicitudes del portafolio |
| `portfolio_projects` | Proyectos del portafolio |
| `portfolio_planning` | Planificación del portafolio |
| `portfolio_reports` | Informes del portafolio |
| `portfolio_settings` | Configuración del portafolio |

**Panorama IT**
| Recurso | Qué controla |
|---------|--------------|
| `applications` | Aplicaciones |
| `infrastructure` | Servidores e infraestructura |
| `locations` | Datos maestros de ubicaciones |
| `settings` | Configuración de aplicaciones |

**Datos maestros**
| Recurso | Qué controla |
|---------|--------------|
| `companies` | Datos maestros de empresas |
| `departments` | Datos maestros de departamentos |
| `suppliers` | Datos maestros de proveedores |
| `contacts` | Directorio de contactos |
| `accounts` | Plan de cuentas |
| `business_processes` | Catálogo de procesos de negocio |

**Tareas**
| Recurso | Qué controla |
|---------|--------------|
| `tasks` | Gestión de tareas |

**Base de conocimiento**
| Recurso | Qué controla |
|---------|--------------|
| `knowledge` | Artículos de la base de conocimiento |

El recurso de Base de conocimiento admite los niveles Lector, Miembro y Administrador (Colaborador no está disponible para este recurso).

**Administración**
| Recurso | Qué controla |
|---------|--------------|
| `users` | Gestión de usuarios y roles |
| `billing` | Facturación y suscripción |

### Tipos de roles

Los roles se clasifican según cómo pueden modificarse:

| Etiqueta | Descripción |
|----------|-------------|
| **Sistema** | No puede modificarse. Administrador tiene acceso completo; Contacto es solo para entradas del directorio. |
| **Integrado** | Roles preconfigurados que proporcionan patrones de acceso estándar. No se pueden modificar directamente; utilice **Duplicar** para crear una copia personalizable. |
| _(sin etiqueta)_ | Roles personalizados que usted crea. Totalmente editables. |

### Roles integrados

KANAP incluye roles preconfigurados organizados por área funcional:

**Presupuesto**: Administrador de presupuesto, Miembro de presupuesto, Lector de presupuesto
**Portafolio**: Administrador de portafolio, Miembro de portafolio, Lector de portafolio, **Colaborador de negocio**
**Panorama IT**: Administrador de panorama IT, Miembro de panorama IT, Lector de panorama IT
**Datos maestros**: Administrador de datos maestros, Miembro de datos maestros, Lector de datos maestros
**Tareas**: Administrador de tareas, Miembro de tareas, Lector de tareas

#### El rol de Colaborador de negocio

El rol de **Colaborador de negocio** está diseñado para partes interesadas del negocio que participan en el proceso del portafolio sin privilegios completos de gestión de proyectos. Un Colaborador de negocio puede:

- **Enviar y gestionar solicitudes del portafolio** (acceso completo de miembro a solicitudes)
- **Editar proyectos existentes**: actualizar campos, añadir comentarios, subir adjuntos, gestionar fases, hitos, dependencias y entradas de tiempo
- **Crear y trabajar en tareas del proyecto**: añadir tareas a proyectos, registrar tiempo y publicar comentarios
- **Ver usuarios, empresas, departamentos y contactos** para selecciones en desplegables

Un Colaborador de negocio **no puede**:
- Crear nuevos proyectos (requiere nivel Miembro en proyectos del portafolio)
- Convertir solicitudes en proyectos (requiere nivel Miembro)
- Importar/exportar CSV (requiere nivel Administrador)

Este rol cubre la brecha entre el acceso de solo lectura (Lector) y la gestión completa de proyectos (Miembro), permitiendo a los usuarios de negocio contribuir activamente sin la capacidad de crear nuevos proyectos.

### El rol de Contacto

El rol de **Contacto** es un rol especial del sistema para usuarios que aparecen en listas desplegables pero no necesitan iniciar sesión. Usos comunes:

- Solicitantes o patrocinadores que solo necesitan ser referenciados, no usuarios activos
- Partes interesadas externas listadas con fines de seguimiento
- Entradas de marcador de posición para la estructura organizacional

**Usuarios con rol de Contacto:**
- No pueden iniciar sesión en KANAP
- No consumen puestos de suscripción
- No reciben notificaciones por correo electrónico (incluso si están asignados a proyectos/tareas)
- Pueden ser seleccionados en desplegables de usuario (p. ej., como patrocinador del proyecto)

Si alguien con el rol de Contacto necesita usar activamente KANAP, cambie su rol a un rol regular (p. ej., Lector, Miembro) e invítelo.

### Gestión de roles

La página de Roles tiene un diseño de dos paneles:
- **Panel izquierdo**: Lista de todos los roles con etiquetas indicando el tipo y un conteo de usuarios para cada rol
- **Panel derecho**: Detalles y permisos del rol seleccionado

**Acciones**:
- **Nuevo rol**: Crear un rol personalizado desde cero
- **Duplicar**: Copiar un rol existente (incluyendo roles integrados) como punto de partida. No disponible para roles de Sistema.
- **Eliminar**: Eliminar un rol personalizado (solo si no tiene usuarios asignados)
- **Guardar detalles**: Actualizar nombre y descripción del rol
- **Guardar permisos**: Aplicar cambios de permisos

### Crear un rol personalizado

1. Haga clic en **Nuevo rol**
2. Introduzca un nombre y una descripción
3. Haga clic en **Crear**
4. Configure los niveles de permiso para cada grupo de recursos
5. Haga clic en **Guardar permisos**

**Consejo**: Comience duplicando un rol integrado que se aproxime a lo que necesita, y luego ajuste los permisos.

---

## Facturación

Gestione su suscripción, puestos y facturas.

### Resumen de la suscripción

La tarjeta de suscripción muestra su plan actual de un vistazo:
- **Plan**: Su nivel de suscripción (Solo, Team, Pro o Prueba gratuita)
- **Puestos**: Puestos utilizados vs. disponibles
- **Estado**: Activo, En prueba, Pago vencido, Cancelado, etc.
- **Fecha de renovación**: Cuándo comienza el siguiente ciclo de facturación

Para suscripciones activas (no pruebas locales), se muestran detalles adicionales:
- **Importe por período**: Coste del ciclo de facturación actual
- **Frecuencia de facturación**: Mensual o Anual
- **Método de cobro**: Cargo automático o Factura (pago manual)
- **Método de pago**: Datos de la tarjeta o Transferencia bancaria
- **Última sincronización con Stripe**: Cuándo se actualizaron por última vez los datos de suscripción desde Stripe

Si la suscripción está en período de prueba, se muestran los días restantes de prueba.

### Acciones

- **Elegir plan** / **Cambiar plan**: Abrir el cuadro de selección de plan para suscribirse o cambiar de plan. Requiere administrador de facturación.
- **Gestionar suscripción**: Abrir el portal de cliente de Stripe para actualizar métodos de pago, cancelar u otros cambios. Solo disponible cuando existe una suscripción de Stripe.

Si su suscripción no está en buen estado (prueba expirada, pago vencido, etc.), el cuadro de selección de plan se abre automáticamente al visitar la página de Facturación.

### Historial de facturas

Las facturas anteriores se muestran debajo de la tarjeta de suscripción:
- Número de factura y fecha
- Estado (Borrador, Abierta, Pagada, Anulada, Incobrable)
- Importe y moneda
- **Ver**: Abrir la factura en el visor alojado de Stripe
- **Descargar**: Descargar la factura en PDF

Por defecto, se muestran las cinco facturas más recientes. Haga clic en **Mostrar más facturas** para ver el historial completo.

### Información del cliente

Actualice los datos de contacto asociados a su registro de cliente en Stripe:
- **Nombre del cliente** y **Empresa**
- **Correo electrónico** y **Teléfono**
- **Número de IVA**
- **Dirección** (línea 1, línea 2, ciudad, estado/provincia, código postal, país)

### Información de facturación

Datos de contacto separados utilizados específicamente en las facturas. Haga clic en **Copiar del cliente** para autocompletar a partir de la información del cliente anterior.

Los campos coinciden con la sección de información del cliente: nombre del destinatario, empresa, correo electrónico, teléfono, número de IVA y dirección completa.

Haga clic en **Guardar cambios** para actualizar tanto los datos del cliente como los de facturación. Utilice **Restablecer** para descartar las ediciones no guardadas.

---

## Autenticación

Configure el inicio de sesión único (SSO) para su organización. Esta página solo está disponible cuando la funcionalidad SSO está habilitada y no es accesible desde el host de administración de la plataforma.

### Microsoft Entra ID (Azure AD)

Conecte KANAP a su inquilino de Microsoft Entra ID para SSO:

1. Haga clic en **Conectar Microsoft Entra**
2. Inicie sesión con una cuenta de administrador de Microsoft
3. Conceda los permisos solicitados
4. Los usuarios ahora pueden iniciar sesión con sus cuentas de Microsoft

### Estado del SSO

- **Conectado**: Muestra su ID de inquilino de Entra
- **No conectado**: Solo autenticación local

### Acciones

| Acción | Descripción |
|--------|-------------|
| **Conectar Microsoft Entra** | Iniciar el flujo de configuración de Microsoft Entra |
| **Reconectar Microsoft Entra** | Volver a ejecutar el flujo de configuración (se muestra cuando ya está conectado) |
| **Probar inicio de sesión de Microsoft** | Probar el inicio de sesión SSO con su cuenta de Microsoft |
| **Desconectar** | Eliminar la configuración SSO (vuelve a autenticación local) |

---

## Personalización

Utilice **Administración > Personalización** para aplicar la identidad de su empresa en KANAP.

- Ruta: `/admin/branding`
- Permiso: `users:admin`
- Alcance: solo hosts de espacio de trabajo (no disponible en el host de administración de la plataforma)

La Personalización le permite:
- Subir o eliminar el logotipo de su espacio de trabajo
- Controlar si el logotipo se muestra en modo oscuro
- Configurar colores primarios separados para los modos claro y oscuro
- Restablecer toda la personalización a los valores predeterminados

Para instrucciones detalladas paso a paso, consulte: [Personalización](branding.md)

---

## Configuración

La página de Configuración le permite gestionar su perfil personal y sus preferencias de notificación. Acceda a ella desde el menú de usuario (avatar superior derecho) o navegue a `/settings`.

La página tiene dos pestañas, accesibles por URL:
- `/settings/profile` (predeterminada) -- Pestaña de Perfil
- `/settings/notifications` -- Pestaña de Notificaciones

### Perfil

Edite su información personal:
- **Nombre** / **Apellido**
- **Puesto de trabajo**
- **Teléfono profesional** / **Teléfono móvil**

Si su organización utiliza Microsoft Entra ID (SSO), algunos campos pueden estar sincronizados desde Entra y no pueden editarse en KANAP.

### Notificaciones

Controle qué notificaciones por correo electrónico recibe.

**Conmutador principal**: Active o desactive todas las notificaciones por correo electrónico con el interruptor **Notificaciones por correo electrónico** en la parte superior.

**Categorías por espacio de trabajo** (cada una con su propio conmutador de activar/desactivar):

| Espacio de trabajo | Categorías de notificación |
|---------------------|----------------------------|
| **Portafolio** | Cambios de estado, cuando se le añade a un equipo, cambios de equipo en elementos que usted dirige, comentarios |
| **Tareas** | Asignación (como asignado, solicitante o visor), cambios de estado, comentarios |
| **Presupuesto** | Advertencias de expiración, cambios de estado, comentarios |

**Correo electrónico de revisión semanal**: Reciba un resumen periódico de su actividad y elementos próximos. Configure:
- **Día de la semana** (p. ej., Lunes)
- **Hora** (hora en su zona horaria)
- **Zona horaria**

Utilice el botón **Vista previa del correo** para enviarse un correo de prueba y verificar el formato.

Todos los cambios se guardan automáticamente al activar/desactivar interruptores o cambiar selecciones.

---

## Consejos

  - **Duplique roles integrados**: En lugar de crear roles desde cero, duplique un rol integrado y ajuste los permisos. Esto ahorra tiempo y garantiza que no omita recursos importantes.
  - **Use múltiples roles para mayor flexibilidad**: Asigne a los usuarios múltiples roles para combinar permisos, por ejemplo, un rol de "Lector de finanzas" más un rol de "Gestor de proyectos".
  - **Utilice SSO**: Si tiene Microsoft 365, conecte Entra ID para facilitar la gestión de usuarios y la sincronización automática de perfiles.
  - **Supervise los puestos**: Controle el uso de puestos en la barra de herramientas para evitar alcanzar los límites.
  - **Desactive, no elimine**: Cuando alguien se va, desactive su cuenta para preservar el historial de auditoría.
  - **Revise los permisos periódicamente**: Audite los permisos de los roles de forma regular para mantener el principio de mínimo privilegio.
