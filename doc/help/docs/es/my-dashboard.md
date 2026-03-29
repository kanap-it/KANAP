# Panel de control

El Panel de control es su página de inicio personal en KANAP. Le ofrece una visión rápida de sus tareas, proyectos, tiempo registrado y actividad reciente, todo en un solo lugar. Puede personalizar qué mosaicos aparecen y cómo se comportan.

## Dónde encontrarlo

- Haga clic en el logotipo de **KANAP** o navegue a `/`
- Esta es la página predeterminada después de iniciar sesión para usuarios no administradores.
- No se requieren permisos especiales para ver el panel de control en sí, pero los mosaicos individuales dependen de sus derechos de acceso.

## Acciones rápidas

En la parte superior del panel de control encontrará botones de acceso directo para acciones comunes:

- **Crear tarea** — abre el flujo de creación de tareas. Requiere `tasks:member` o superior.
- **Registrar tiempo** — abre un diálogo rápido para registrar horas en un proyecto. Elija un proyecto, introduzca las horas, seleccione una categoría (**IT** o **Negocio**) y, opcionalmente, añada notas. Requiere `portfolio_projects:member` o superior.
- **Nuevo documento** — abre el flujo de creación de la Base de conocimiento para iniciar un documento en blanco o crear uno a partir de una plantilla publicada. Requiere `knowledge:member` o superior.
- **Configuración** (icono de engranaje) — abre la configuración del panel de control para elegir qué mosaicos mostrar.

## Mosaicos del panel de control

El panel de control muestra una cuadrícula de mosaicos, cada uno mostrando un aspecto diferente de su trabajo. Los mosaicos se distribuyen en una cuadrícula adaptable (tres columnas en pantallas grandes, dos en medianas, una en pequeñas).

### Mis tareas

Muestra sus tareas asignadas agrupadas por urgencia:

- **Vencidas** — tareas pasadas de su fecha límite (resaltadas en rojo)
- **Vencen esta semana** — tareas con vencimiento en los próximos 7 días
- **Más adelante** — todo lo demás

Cada tarea muestra su título, proyecto vinculado (si lo hay), fecha límite e indicador de prioridad cuando la prioridad es superior a normal. Haga clic en una tarea para abrir su espacio de trabajo.

Muestra hasta 5 elementos en total entre los tres grupos.

**Requiere**: `tasks:reader`

---

### Proyectos que lidero

Lista los proyectos donde usted tiene un rol de liderazgo (responsable IT, responsable de negocio, patrocinador IT o patrocinador de negocio). Cada proyecto muestra:

- Su rol
- Estado actual del proyecto (codificado por color)
- Próximo hito y su fecha objetivo, si está definido

Muestra hasta 5 elementos.

**Requiere**: `portfolio_projects:reader`

---

### Proyectos en los que contribuyo

Lista los proyectos donde usted es miembro del equipo. Cada proyecto muestra:

- Su equipo (Equipo IT o Equipo de negocio)
- Estado actual del proyecto
- Número de tareas asignadas a usted en ese proyecto

Muestra hasta 5 elementos.

**Requiere**: `portfolio_projects:reader` y `tasks:reader`

---

### Vistos recientemente

Muestra elementos que ha abierto recientemente en la aplicación: proyectos, solicitudes, aplicaciones, activos, interfaces, conexiones, contratos, tareas, partidas OPEX y CAPEX. Cada entrada muestra el nombre del elemento, su tipo y cuándo lo vio por última vez.

Los elementos vistos recientemente se almacenan localmente en su navegador y son específicos de su usuario y espacio de trabajo. Haga clic en **Borrar** para restablecer la lista.

Muestra hasta 5 elementos.

**Requiere**: No se requieren permisos especiales (los elementos a los que no puede acceder se ocultan automáticamente).

---

### Mi tiempo la última semana

Muestra un resumen del tiempo que ha registrado durante un período reciente:

- **Total de horas** registradas (mostrado de forma destacada)
- **Desglose por categoría** — IT, Negocio y Otras tareas
- **Principales proyectos** — un gráfico de barras de los proyectos en los que más tiempo invirtió

**Configuración**: Período en días (7–30).

**Requiere**: `portfolio_projects:reader` y `tasks:reader`

---

### Nuevas solicitudes

Muestra solicitudes de portafolio creadas dentro de un período reciente. Cada solicitud muestra el nombre, el solicitante, la fecha de creación y un indicador de prioridad si la puntuación de prioridad es superior a 80.

Muestra hasta 5 elementos.

**Requiere**: `portfolio_requests:reader`

---

### Base de conocimiento

Muestra dos secciones centradas en la Base de conocimiento:

- **Por revisar** — documentos donde usted es el revisor o aprobador activo
- **Últimos 5 accedidos** — los últimos cinco documentos de la Base de conocimiento que abrió en este navegador para el usuario y espacio de trabajo actual

**Requiere**: `knowledge:reader`

---

### Actividad del equipo

Muestra la actividad reciente en proyectos donde usted está involucrado.

**Requiere**: `portfolio_projects:reader`

---

### Cambios de estado de proyectos

Muestra los últimos cambios de estado de proyectos de los últimos días.

**Requiere**: `portfolio_projects:reader`

---

### Tareas inactivas

Muestra tareas que no se han actualizado durante mucho tiempo, con soporte para alcance personal, de equipo o global.

**Requiere**: `tasks:reader`

## Personalización de su panel de control

Haga clic en el icono de **Configuración** (engranaje) en la zona superior derecha del panel de control para abrir el diálogo de configuración.

Desde aquí puede:

- **Activar o desactivar mosaicos** — marque o desmarque cada mosaico para controlar qué aparece en su panel de control
- **Restablecer valores predeterminados** — restaurar la selección original de mosaicos

Solo los mosaicos que tiene permiso para ver aparecen en la lista de configuración. Los cambios se guardan en su cuenta y persisten entre sesiones y dispositivos.

Si todos los mosaicos están desactivados, el panel de control muestra un mensaje invitándole a activar mosaicos en la configuración.

## Consejos

- **Comience con los valores predeterminados**: El panel de control viene con un conjunto útil de mosaicos ya activados. Pruébelo durante unos días antes de personalizar.
- **Use las acciones rápidas**: Crear una tarea o registrar tiempo desde el panel de control le ahorra navegar fuera de su vista general.
- **Revise las tareas vencidas diariamente**: El mosaico Mis tareas resalta los elementos vencidos en rojo para que nada se pase por alto.
