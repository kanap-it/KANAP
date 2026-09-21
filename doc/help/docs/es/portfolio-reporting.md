# Informes del portafolio

Los Informes del portafolio proporcionan análisis centrados en la carga de trabajo, capacidad y señales de entrega.

## Primeros pasos

Navegue a **Portafolio > Informes** para abrir el centro de informes.

**Permisos**:
- Necesita al menos `portfolio_reports:reader` para acceder a los informes del portafolio.

Si no ve Informes en el menú, solicite a su administrador que le otorgue acceso.

---

## Página de informes

La página de Informes del portafolio lista los informes disponibles como tarjetas. Haga clic en una tarjeta para abrir el informe.

Actualmente disponibles:
- **Informe de cambios de estado**
- **Mapa de calor de capacidad**
- **Informe semanal**

---

## Pilotaje

La primera franja encima de las tarjetas de informes es la vista de pilotaje diario. Responde a dos preguntas: qué se ha movido últimamente y qué espera a alguien.

### El periodo

La cabecera muestra el periodo en uso y permite cambiar entre los últimos 7, 30 y 90 días. El periodo termina siempre hoy y se lee en su propia zona horaria. Su elección se recuerda en este navegador.

### Flujo

Una línea por entidad se lee así: **14 creadas · 9 cerradas · 52 abiertas (+5)**.

- **Creadas**: elementos creados durante el periodo y todavía presentes hoy.
- **Cerradas**: elementos que pasaron de un estado abierto a uno cerrado durante el periodo. Cerrado significa Hecho o Cancelado para tareas y proyectos, Rechazado o Convertido para solicitudes.
- **Abiertas**: elementos abiertos ahora mismo, pase lo que pase durante el periodo. Esta cifra es un enlace a la lista correspondiente.
- **(+5)**: la variación neta, visible solo cuando no es cero. Es creadas, más reabiertas, menos cerradas. Los elementos reabiertos son los que volvieron de un estado cerrado a uno abierto. Pase el cursor sobre la cifra para ver la fórmula.

Creadas y cerradas proceden del historial de cambios, así que cubren todas las formas de escribir un elemento: la aplicación, una importación CSV y los agentes. Ningún filtro de lista reproduce ese historial, por eso esas dos cifras no son enlaces.

### Qué tareas cuentan

Cada cifra de tareas cuenta solo las tareas independientes y las tareas de proyecto. Las tareas vinculadas a un contrato, a una partida de gasto, a una partida CAPEX o a un incidente pertenecen a esos procesos y quedan fuera en toda la franja.

### Requiere atención

La última línea aparece solo cuando algo necesita una decisión:
- **Tareas vencidas**: tareas abiertas cuya fecha de vencimiento es anterior a hoy. La cifra abre la lista de tareas filtrada por los mismos elementos.
- **Tareas sin responsable**: tareas abiertas que nadie asume. La lista de tareas no tiene filtro para un responsable vacío, por eso esta cifra no es un enlace.
- **Proyectos sin actividad desde hace 30 días**: proyectos en curso o en pruebas donde no ha pasado nada desde hace un mes. Al hacer clic se abre una lista breve de esos proyectos con la fecha de su última actividad, y cada nombre abre el proyecto.

La actividad se lee en sentido amplio. Un proyecto cuenta como activo en cuanto algo cambia en él o en una de sus tareas, en cuanto alguien escribe en su diario, o en cuanto se registra tiempo en el proyecto o en una de sus tareas. Un proyecto solo aparece aquí cuando todo eso es más antiguo que 30 días.

---

## Por clasificar

Encima de las tarjetas de informes, una franja compacta muestra cuánto de su trabajo abierto sigue sin un valor de clasificación. Úsela como ayuda de pilotaje diario: vea la brecha, haga clic y corríjala.

### Qué cuenta

Una línea por entidad, solo para elementos abiertos:
- **Tareas**: estado distinto de Hecho y Cancelado.
- **Solicitudes**: estado distinto de Rechazado y Convertido.
- **Proyectos**: estado distinto de Hecho y Cancelado.

Cada línea indica cuántos de esos elementos no tienen Origen, ni Categoría, ni Línea. Las tareas indican además cuántas no tienen Tipo de tarea.

### Qué tareas se excluyen

Solo se cuentan las tareas independientes y las tareas de proyecto. Las tareas vinculadas a un contrato, a una partida de gasto, a una partida CAPEX o a un incidente nunca llevan clasificación. Contarlas señalaría una brecha que nadie puede cerrar.

Una tarea de proyecto sin clasificación propia hereda la de su proyecto, y la lista de tareas muestra ese valor heredado. Los recuentos siguen la misma regla, así que una cifra nunca le lleva a una lista donde la columna ya está rellenada.

### Líneas

Una Línea ausente solo se cuenta cuando el elemento ya tiene una Categoría y esa Categoría ofrece al menos una línea activa. Muchas categorías no ofrecen ninguna línea. Un elemento sin categoría ya se cuenta bajo Categoría.

### Abrir la lista

Cada cifra mayor que cero es un enlace. Al hacer clic se abre la lista correspondiente, ya filtrada exactamente por los elementos detrás de la cifra, en todo el inquilino. El total de la lista coincide con la cifra en la que hizo clic. Los ceros se muestran como contexto pero no son enlaces.

Cuando no falta nada, la franja muestra una sola línea confirmando que todo lo abierto está clasificado.

---

## Informe de cambios de estado

Use este informe para rastrear elementos creados durante un período seleccionado, o cuyo estado cambió en ese período.

### Qué muestra
- **Una fila por elemento** (tarea independiente, solicitud o proyecto).
- **Solo el último evento del período** para cada elemento, ya sea la creación o un cambio de estado.
- **Estado que lleva ese evento**. En una creación, es el estado con el que se creó el elemento.
- **Creado**, la fecha de creación cuando el elemento se creó dentro del período, y vacía en caso contrario.
- **Última modificación** fecha del evento retenido.

### Filtros
- **Fecha de inicio** y **Fecha de fin** (período obligatorio)
- **Estado** (selección múltiple)
- **Tipo de elemento** (selección múltiple: Tareas, Solicitudes, Proyectos)
- **Origen** (selección múltiple)
- **Categoría** (selección múltiple)
- **Flujo** (selección múltiple; disponible cuando al menos una categoría está seleccionada)

### Reglas de inclusión
- El elemento se incluye si se creó durante el período seleccionado, o si su estado cambió en ese período.
- Un elemento creado y luego movido a otro estado en el mismo período aparece una sola vez, con el estado de su último evento.
- Para tareas, solo se incluyen **tareas independientes** (las tareas vinculadas a proyectos se excluyen).
- El filtrado de estado se aplica al estado que lleva el evento retenido.
- El periodo, la fecha **Creado** y la fecha **Última modificación** siguen la zona horaria de su navegador.

### Columnas de la tabla
- **Nombre** (cliclable; abre el elemento)
- **Tipo de elemento**
- **Prioridad**
- **Estado**
- **Origen**
- **Categoría**
- **Flujo**
- **Empresa**
- **Creado**
- **Última modificación**

El orden predeterminado es por **Prioridad** (mayor primero). Puede ordenar por cualquier columna.

### Exportaciones
- Exportación **CSV**
- Exportación **XLSX** con nombres de elementos clicables

---

## Informe de mapa de calor de capacidad

Use este informe para comprender la carga de trabajo actual, la presión de capacidad y el trabajo sin asignar.

### Qué muestra
- **Esfuerzo restante** (IT + Negocio), ajustado por progreso de ejecución.
- **Capacidad** por colaborador (histórica o teórica).
- **Meses de trabajo** (días restantes / días de capacidad por mes).
- **Trabajo sin asignar** cuando el esfuerzo no está completamente asignado.
- **Las personas sin ficha de colaborador** asignadas a un proyecto. Aparecen al final de la lista con sus días restantes y sin capacidad, para que su carga siga siendo visible. Cree su ficha de colaborador para asignarles una capacidad.

### Filtros
- **Equipos** (selección múltiple, incluye **Sin equipo**)
- **Estado** (predeterminado: Lista de espera, Planificado, En progreso, En pruebas, En espera)
- **Modo de capacidad**: Histórica (predeterminado) o Teórica
- **Agrupar por**: Colaboradores (predeterminado) o Equipos

### Escala de color
Las celdas en la columna **Meses de trabajo** están codificadas por color:

| Rango | Color |
|-------|-------|
| <= 1 mes | Verde |
| 1-3 meses | Amarillo |
| 3-6 meses | Naranja |
| 6-12 meses | Rojo |
| > 12 meses | Violeta |
| Sin datos | Gris (N/D) |

### Tarjetas de resumen
La fila de resumen incluye:
- **Total de colaboradores**
- **Media de meses de trabajo** (solo colaboradores con capacidad)
- **Trabajo sin asignar** (total de días sin asignar y recuento de proyectos)

Haga clic en **Trabajo sin asignar** para expandir los detalles.

### Desglose detallado
Haga clic en una fila de colaborador para abrir un desglose por proyecto:
- Cada fila muestra esfuerzo restante, % de asignación y sus días.
- Los nombres de proyecto son clicables y abren la pestaña **Progreso** del proyecto.

### Exportaciones
- **CSV**: Exportar la tabla del mapa de calor
- **PNG**: Captura del informe
- **Imprimir**: Imprimir o guardar como PDF

---

## Informe semanal

Use este informe para producir un resumen semanal para interesados que cubre actualizaciones de proyectos, actividad de tareas y cambios de solicitudes durante un período seleccionado.

### Qué muestra

El informe se divide en tres tablas:

- **Actualizaciones de proyectos** — proyectos creados durante el período, o cuyo estado cambió en ese período.
- **Actividad de tareas** — tareas creadas durante el período, o cerradas (terminadas o canceladas) en ese período.
- **Actualizaciones de solicitudes** — solicitudes creadas durante el período, o cuyo estado cambió en ese período.

Cada tabla tiene una columna **Creado**. Lleva el día de creación cuando el elemento se creó dentro del período, y queda vacía para los elementos que solo cambiaron de estado.

Una línea de resumen sobre las tablas muestra los recuentos: actualizaciones de proyectos, tareas creadas, tareas cerradas y actualizaciones de solicitudes.

### Filtros

- **Fecha de inicio** y **Fecha de fin** (predeterminado: últimos 7 días)
- **Origen** (selección múltiple)
- **Categoría** (selección múltiple)
- **Flujo** (selección múltiple; limitado a categorías seleccionadas)
- **Tipos de tarea** (selección múltiple; se aplica a la tabla Actividad de tareas)

### Columnas de la tabla

**Actualizaciones de proyectos**: Nombre del proyecto (cliclable), Prioridad, Origen, Categoría, Flujo, Progreso, Estado, Creado

**Actividad de tareas**: Nombre de la tarea (cliclable), Tipo de tarea, Prioridad, Origen, Categoría, Flujo, Estado, Creado

**Actualizaciones de solicitudes**: Nombre de la solicitud (cliclable), Origen, Categoría, Flujo, Estado, Creado

Las exportaciones CSV y XLSX incluyen las mismas columnas, más una columna **Última modificación** después de **Creado**.

El orden predeterminado es por **Prioridad** (mayor primero). Al hacer clic en un nombre se abre el elemento.

### Exportaciones

- Exportación **CSV**
- Exportación **XLSX**

---

## Consejos
- **Mantenga los perfiles de colaboradores actualizados**: La capacidad se basa en la disponibilidad de colaboradores y estadísticas históricas de tiempo.
- **Use filtros de equipo**: Limite el alcance del informe a un departamento o función.
- **Revise el trabajo sin asignar**: Ayuda a detectar proyectos con asignaciones faltantes o responsables ausentes.
- **Informe semanal para reuniones de seguimiento**: Exporte el Informe semanal como XLSX y compártalo con los interesados para reuniones de estado.
